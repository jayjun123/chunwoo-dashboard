import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel, Card, CardContent, Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, useMediaQuery } from '@mui/material';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// Firestore 연동 예시
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { exportToExcel, exportReportToPDF } from '../utils/exportUtils';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import koLocale from 'date-fns/locale/ko';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// API 키 검증 함수
const validateOpenAIKey = (apiKey) => {
  if (!apiKey) {
    return { valid: false, error: 'OpenAI API 키가 설정되지 않았습니다.' };
  }
  if (apiKey === 'sk-your-actual-openai-api-key-here' || apiKey === 'your_openai_api_key_here') {
    return { valid: false, error: 'OpenAI API 키가 기본값으로 설정되어 있습니다. 실제 API 키를 입력해주세요.' };
  }
  if (!apiKey.startsWith('sk-')) {
    return { valid: false, error: 'OpenAI API 키 형식이 올바르지 않습니다. (sk-로 시작해야 합니다)' };
  }
  return { valid: true };
};

const fetchReportData = async (site, period) => {
  // 샘플: 실제 Firestore 구조에 맞게 쿼리 수정 필요
  // 기간 계산
  const now = new Date();
  let startDate, endDate;
  if (period === 'week') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    endDate = now;
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = now;
  }
  // 예시: progress 컬렉션에서 site, date로 필터
  const q = query(
    collection(db, 'progress'),
    where('siteId', '==', site),
    where('date', '>=', startDate.toISOString().slice(0, 10)),
    where('date', '<=', endDate.toISOString().slice(0, 10))
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data());
};

const getAISummary = async (data, setSummaryCallback = null) => {
  if (!data.length) return '데이터가 없습니다.';
  
  // API 키 검증
  const keyValidation = validateOpenAIKey(OPENAI_API_KEY);
  if (!keyValidation.valid) {
    const errorMsg = `OpenAI API 키 오류: ${keyValidation.error}\n\n.env 파일 또는 넷틀리파이 환경변수에서 VITE_OPENAI_API_KEY를 확인해주세요.`;
    if (setSummaryCallback) setSummaryCallback(errorMsg);
    return errorMsg;
  }
  
  const prompt = `다음은 건설 현장 데이터입니다. 주요 이슈와 요약을 5줄 이내로 한글로 작성해줘.\n${JSON.stringify(data)}`;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: '너는 건설 현장 보고서 요약 전문가야.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        const errorMsg = 'OpenAI API 키가 유효하지 않습니다. 올바른 API 키를 설정해주세요.';
        if (setSummaryCallback) setSummaryCallback(errorMsg);
        return errorMsg;
      } else if (response.status === 429) {
        const errorMsg = '⚠️ API 호출 한도를 초과했습니다.\n\n무료 계정: 3회/분\n유료 계정: 더 높은 한도\n\n1분 후 다시 시도해주세요.';
        if (setSummaryCallback) setSummaryCallback(errorMsg);
        return errorMsg;
      } else {
        const errorMsg = `API 호출 실패 (${response.status}): ${errorData.error?.message || '알 수 없는 오류'}`;
        if (setSummaryCallback) setSummaryCallback(errorMsg);
        return errorMsg;
      }
    }
    
    const result = await response.json();
    const summaryText = result.choices?.[0]?.message?.content?.trim() || 'AI 요약 실패';
    if (setSummaryCallback) setSummaryCallback(summaryText);
    return summaryText;
  } catch (e) {
    console.error('OpenAI API 호출 오류:', e);
    const errorMsg = `AI 요약 중 오류 발생: ${e.message}`;
    if (setSummaryCallback) setSummaryCallback(errorMsg);
    return errorMsg;
  }
};

const Reports = () => {
  const isMobile = useMediaQuery('(max-width:900px)');
  const [sites, setSites] = useState([]);
  const [site, setSite] = useState('');
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [rateLimitCooldown, setRateLimitCooldown] = useState(false);

  // API 키 상태 확인 (개발용)
  useEffect(() => {
    const keyValidation = validateOpenAIKey(OPENAI_API_KEY);
    if (!keyValidation.valid) {
      console.warn('OpenAI API 키 상태:', keyValidation.error);
    } else {
      console.log('OpenAI API 키가 정상적으로 설정되었습니다.');
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setSites(sitesData);
      if (sitesData.length > 0 && !site) {
        setSite(sitesData[0].id);
      }
    });
    return () => unsubscribe();
  }, [site]);

  useEffect(() => {
    if (site) {
      handleLoad();
    }
    // eslint-disable-next-line
  }, [site, period]);

  const handleLoad = async () => {
    setLoading(true);
    const reportData = await fetchReportData(site, period);
    setData(reportData);
    const aiSummary = await getAISummary(reportData, setSummary);
    setSummary(aiSummary);
    setLoading(false);
  };

  const handleAISummary = async () => {
    setAiLoading(true);
    const aiSummary = await getAISummary(data, setSummary);
    
    // 429 오류 시 rate limit cooldown 설정
    if (aiSummary.includes('API 호출 한도를 초과했습니다')) {
      setRateLimitCooldown(true);
      setTimeout(() => setRateLimitCooldown(false), 60000); // 60초 후 재활성화
    }
    
    setSummary(aiSummary);
    setAiLoading(false);
  };

  const handleAICustomPrompt = async () => {
    if (!prompt.trim()) return;
    
    // API 키 검증
    const keyValidation = validateOpenAIKey(OPENAI_API_KEY);
    if (!keyValidation.valid) {
      setSummary(`OpenAI API 키 오류: ${keyValidation.error}\n\n.env 파일 또는 넷틀리파이 환경변수에서 VITE_OPENAI_API_KEY를 확인해주세요.`);
      return;
    }
    
    setAiLoading(true);
    const userPrompt = `${prompt}\n\n아래는 참고 데이터입니다.\n${JSON.stringify(data)}`;
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: '너는 건설 현장 보고서 요약 및 분석 전문가야.' },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 700,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setSummary('OpenAI API 키가 유효하지 않습니다. 올바른 API 키를 설정해주세요.');
        } else if (response.status === 429) {
          setRateLimitCooldown(true);
          setTimeout(() => setRateLimitCooldown(false), 60000); // 60초 후 재활성화
          setSummary('⚠️ API 호출 한도를 초과했습니다.\n\n무료 계정: 3회/분\n유료 계정: 더 높은 한도\n\n1분 후 다시 시도해주세요.');
        } else {
          setSummary(`API 호출 실패 (${response.status}): ${errorData.error?.message || '알 수 없는 오류'}`);
        }
        return;
      }
      
      const result = await response.json();
      setSummary(result.choices?.[0]?.message?.content?.trim() || 'AI 분석 실패');
    } catch (e) {
      console.error('OpenAI API 호출 오류:', e);
      setSummary(`AI 분석 중 오류 발생: ${e.message}`);
    }
    setAiLoading(false);
  };

  // 필터링된 데이터
  const filteredData = data.filter(row => {
    // 키워드
    if (keyword && !(row.description?.includes(keyword) || row.type?.includes(keyword))) return false;
    // 날짜
    if (startDate && new Date(row.date) < new Date(startDate)) return false;
    if (endDate && new Date(row.date) > new Date(endDate)) return false;
    // 유형
    if (typeFilter && row.type !== typeFilter) return false;
    return true;
  });

  // 차트 데이터 변환 예시
  const chartData = filteredData.reduce((acc, cur) => {
    const found = acc.find(d => d.date === cur.date);
    if (found) {
      found[cur.type] = (found[cur.type] || 0) + (cur.amount || 1);
    } else {
      acc.push({ date: cur.date, [cur.type]: cur.amount || 1 });
    }
    return acc;
  }, []);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('건설 현장 보고서', 14, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`현장: ${sites.find(s => s.id === site)?.name || '전체'}`, 14, 28);
    doc.text(`기간: ${period === 'week' ? '1주' : '1달'}`, 14, 36);
    doc.text('AI 요약/분석:', 14, 46);
    doc.setFont('helvetica', 'italic');
    doc.text(summary || '-', 14, 54, { maxWidth: 180 });
    doc.setFont('helvetica', 'normal');
    // 표
    autoTable(doc, {
      startY: 62,
      head: [['날짜', '유형', '금액', '설명']],
      body: filteredData.map(row => [row.date, row.type, row.amount ? row.amount.toLocaleString() + '원' : '', row.description || '']),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [25, 118, 210] },
      margin: { left: 14, right: 14 },
    });
    doc.save('report.pdf');
  };

  const handleExportExcel = () => {
    // 요약 시트
    const summarySheet = [
      ['현장', sites.find(s => s.id === site)?.name || '전체'],
      ['기간', period === 'week' ? '1주' : '1달'],
      ['AI 요약/분석', summary || '-'],
    ];
    // 데이터 시트
    const dataSheet = [
      ['날짜', '유형', '금액', '설명'],
      ...filteredData.map(row => [row.date, row.type, row.amount, row.description || ''])
    ];
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet);
    const wsData = XLSX.utils.aoa_to_sheet(dataSheet);
    XLSX.utils.book_append_sheet(wb, wsSummary, '요약');
    XLSX.utils.book_append_sheet(wb, wsData, '데이터');
    XLSX.writeFile(wb, 'report.xlsx');
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 65px - 51px)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: '65px',
      left: 0,
      right: 0,
      bottom: '51px',
      overflow: 'hidden',
      overflowX: 'hidden',
      zIndex: 1000,
      bgcolor: '#1a1d21'
    }}>
      {isMobile ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%', 
          flexDirection: 'column',
          p: 3,
          textAlign: 'center'
        }}>
          <Typography variant="h4" sx={{ mb: 3, color: '#90caf9' }}>
            📱 모바일 제한 안내
          </Typography>
          <Box sx={{ 
            p: 3, 
            bgcolor: '#232b3b', 
            borderRadius: 2, 
            border: '1px solid #90caf9',
            maxWidth: '400px'
          }}>
            <Typography variant="body1" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 2 }}>
              보고서 기능
            </Typography>
            <Typography variant="body2" sx={{ color: '#bbb', lineHeight: 1.6, mb: 2 }}>
              보고서 생성, PDF/엑셀 다운로드, AI 분석 기능이 모바일에서 제한됩니다.
            </Typography>
            <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
              PC로 접속하여 이용해 주세요.
            </Typography>
          </Box>
        </Box>
      ) : (
        <>
          {/* 헤더 */}
          <Card sx={{ mb: 2, background: 'linear-gradient(90deg, #1976d2 60%, #232634 100%)', color: '#fff' }}>
            <CardContent sx={{ py: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Typography variant="h5" fontWeight={800}>건설 현장 보고서</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, border: '2px solid #1565c0', boxShadow: 3, '&:hover': { bgcolor: '#1565c0' }, borderRadius: 2, px: 3, py: 1.2, minWidth: 100 }}
                    size="large"
                    onClick={handleLoad}
                  >
                    새로고침
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, border: '2px solid #1565c0', boxShadow: 3, '&:hover': { bgcolor: '#1565c0' }, borderRadius: 2, px: 3, py: 1.2, minWidth: 100 }}
                    size="large"
                    onClick={() => setPreviewOpen(true)}
                  >
                    PDF 미리보기
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, border: '2px solid #1565c0', boxShadow: 3, '&:hover': { bgcolor: '#1565c0' }, borderRadius: 2, px: 3, py: 1.2, minWidth: 100 }}
                    size="large"
                    onClick={handleExportPDF}
                  >
                    PDF 저장
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, border: '2px solid #1565c0', boxShadow: 3, '&:hover': { bgcolor: '#1565c0' }, borderRadius: 2, px: 3, py: 1.2, minWidth: 100 }}
                    size="large"
                    onClick={handleExportExcel}
                  >
                    엑셀
                  </Button>
                  <Button
                    variant="contained"
                    sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, border: '2px solid #1565c0', boxShadow: 3, '&:hover': { bgcolor: '#1565c0' }, borderRadius: 2, px: 3, py: 1.2, minWidth: 120 }}
                    size="large"
                    onClick={handleAISummary}
                    disabled={aiLoading || rateLimitCooldown}
                  >
                    {aiLoading ? 'AI 요약 중...' : rateLimitCooldown ? '1분 대기 중...' : 'AI 요약생성'}
                  </Button>
                </Box>
              </Box>
              {/* 4단계: 검색/필터 UI */}
              <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 1 }}>
                <TextField
                  value={keyword ?? ''}
                  onChange={e => setKeyword(e.target.value)}
                  placeholder="키워드 검색"
                  size="small"
                  sx={{ borderRadius: 1, minWidth: 160 }}
                />
                <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={koLocale}>
                  <DatePicker
                    label="시작일"
                    value={startDate ?? null}
                    onChange={setStartDate}
                    renderInput={(params) => <TextField {...params} size="small" sx={{ borderRadius: 1, minWidth: 120 }} />}
                  />
                  <DatePicker
                    label="종료일"
                    value={endDate ?? null}
                    onChange={setEndDate}
                    renderInput={(params) => <TextField {...params} size="small" sx={{ borderRadius: 1, minWidth: 120 }} />}
                  />
                </LocalizationProvider>
                <FormControl size="small" sx={{ minWidth: 120, borderRadius: 1 }}>
                  <InputLabel>유형</InputLabel>
                  <Select value={typeFilter ?? ''} label="유형" onChange={e => setTypeFilter(e.target.value)}>
                    <MenuItem value="">전체</MenuItem>
                    {[...new Set(data.map(row => row.type))].filter(Boolean).map(type => (
                      <MenuItem key={type} value={type}>{type}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              {/* 자유어 입력칸 옆에는 AI 분석 버튼만 */}
              <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mt: 2, mb: 2 }}>
                <TextField
                  value={prompt ?? ''}
                  onChange={e => setPrompt(e.target.value)}
                  placeholder="AI에게 자유롭게 질문해보세요"
                  size="small"
                  sx={{ borderRadius: 1, minWidth: 300, maxWidth: 420, flex: '0 0 380px' }}
                  disabled={aiLoading}
                />
                <Button
                  variant="contained"
                  sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, boxShadow: 2, '&:hover': { bgcolor: '#1565c0' }, borderRadius: 2, px: 2, py: 1, minWidth: 80 }}
                  onClick={handleAICustomPrompt}
                  disabled={aiLoading || rateLimitCooldown}
                >
                  {aiLoading ? 'AI 분석 중...' : rateLimitCooldown ? '1분 대기 중...' : 'AI 분석'}
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 2단 레이아웃 */}
          <Box sx={{ display: 'flex', gap: 2, height: 'calc(100% - 80px)' }}>
            {/* 왼쪽 패널 */}
            <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loading ? (
                <Box sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Box>
              ) : (
                <>
                  <Card sx={{ flex: 1, overflow: 'auto' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>AI 요약</Typography>
                      <Typography sx={{ whiteSpace: 'pre-line', color: '#1976d2', fontWeight: 600, fontSize: '0.9rem' }}>{summary}</Typography>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1, overflow: 'auto' }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 1 }}>상세 데이터</Typography>
                      <Box component="ul" sx={{ pl: 2, fontSize: '0.85rem' }}>
                        {data.map((row, idx) => (
                          <li key={idx}>{row.date} | {row.type} | {row.amount ? row.amount.toLocaleString() + '원' : row.description}</li>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </>
              )}
            </Box>

            {/* 오른쪽 패널 */}
            <Box sx={{ width: '50%' }}>
              <Card sx={{ height: '100%', overflow: 'auto' }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>기성/일정 차트</Typography>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="기성" fill="#1976d2" />
                      <Bar dataKey="일정" fill="#4FC3F7" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* 미리보기 Dialog */}
          <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle>보고서 미리보기</DialogTitle>
            <DialogContent dividers>
              {/* 여기에 미리보기 내용이 들어갑니다. */}
              <Typography variant="h6">현장: {sites.find(s => s.id === site)?.name}</Typography>
              <Typography variant="subtitle1">기간: {period === 'week' ? '최근 1주' : '최근 1달'}</Typography>
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="h6" sx={{ mb: 1 }}>AI 요약</Typography>
              <Typography sx={{ whiteSpace: 'pre-line', color: '#1976d2', fontWeight: 600, fontSize: '0.9rem', mb: 2 }}>{summary}</Typography>
              
              <Typography variant="h6" sx={{ mb: 1 }}>상세 데이터</Typography>
              <Box component="ul" sx={{ pl: 2, fontSize: '0.85rem', mb: 2 }}>
                {data.map((row, idx) => (
                  <li key={idx}>{row.date} | {row.type} | {row.amount ? row.amount.toLocaleString() + '원' : row.description}</li>
                ))}
              </Box>
              
              <Typography variant="h6" sx={{ mb: 2 }}>기성/일정 차트</Typography>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="기성" fill="#1976d2" />
                  <Bar dataKey="일정" fill="#4FC3F7" />
                </BarChart>
              </ResponsiveContainer>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setPreviewOpen(false)}>닫기</Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default Reports;
