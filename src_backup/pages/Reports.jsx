import React, { useEffect, useState } from 'react';
import { Box, Button, Typography, Select, MenuItem, FormControl, InputLabel, Card, CardContent, Divider, CircularProgress } from '@mui/material';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
// Firestore 연동 예시
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

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

const getAISummary = async (data) => {
  // 실제 OpenAI 연동 필요, 샘플은 단순 요약
  if (!data.length) return '데이터가 없습니다.';
  return `총 ${data.length}건의 데이터가 있습니다.\n주요 내용: ${data.map(d => d.description || d.title || '').join(', ')}`;
};

const Reports = () => {
  const [site, setSite] = useState('siteA');
  const [period, setPeriod] = useState('week');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleLoad();
    // eslint-disable-next-line
  }, [site, period]);

  const handleLoad = async () => {
    setLoading(true);
    const reportData = await fetchReportData(site, period);
    setData(reportData);
    const aiSummary = await getAISummary(reportData);
    setSummary(aiSummary);
    setLoading(false);
  };

  // 차트 데이터 변환 예시
  const chartData = data.reduce((acc, cur) => {
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
    doc.text('보고서', 10, 10);
    doc.text(`현장: ${site}`, 10, 20);
    doc.text(`기간: ${period === 'week' ? '1주' : '1달'}`, 10, 30);
    doc.text('요약:', 10, 40);
    doc.text(summary, 10, 50);
    data.forEach((row, idx) => {
      doc.text(`${row.date} | ${row.type} | ${row.amount || row.description || ''}`, 10, 60 + idx * 10);
    });
    doc.save('report.pdf');
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, 'report.xlsx');
  };

  return (
    <Box sx={{ p: 4, maxWidth: 1000, margin: '0 auto' }}>
      <Card sx={{ mb: 3, background: 'linear-gradient(90deg, #1976d2 60%, #232634 100%)', color: '#fff' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" fontWeight={800}>건설 현장 보고서</Typography>
          </Box>
          <Divider sx={{ my: 2, borderColor: '#90caf9' }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl>
              <InputLabel sx={{ color: '#fff' }}>현장</InputLabel>
              <Select value={site} label="현장" onChange={e => setSite(e.target.value)} sx={{ color: '#fff', minWidth: 120 }}>
                <MenuItem value="siteA">현장A</MenuItem>
                <MenuItem value="siteB">현장B</MenuItem>
              </Select>
            </FormControl>
            <FormControl>
              <InputLabel sx={{ color: '#fff' }}>기간</InputLabel>
              <Select value={period} label="기간" onChange={e => setPeriod(e.target.value)} sx={{ color: '#fff', minWidth: 120 }}>
                <MenuItem value="week">1주</MenuItem>
                <MenuItem value="month">1달</MenuItem>
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleLoad}>새로고침</Button>
            <Button variant="outlined" onClick={handleExportPDF}>PDF</Button>
            <Button variant="outlined" onClick={handleExportExcel}>엑셀</Button>
          </Box>
        </CardContent>
      </Card>
      {loading ? (
        <Box sx={{ textAlign: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>AI 요약</Typography>
              <Typography sx={{ whiteSpace: 'pre-line', color: '#1976d2', fontWeight: 600 }}>{summary}</Typography>
            </CardContent>
          </Card>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>기성/일정 차트</Typography>
              <ResponsiveContainer width="100%" height={300}>
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
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>상세 데이터</Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                {data.map((row, idx) => (
                  <li key={idx}>{row.date} | {row.type} | {row.amount ? row.amount.toLocaleString() + '원' : row.description}</li>
                ))}
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
};

export default Reports;
