import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  MenuItem,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  Computer as ComputerIcon,
} from '@mui/icons-material';
import { format, addMonths, subMonths, parseISO, getMonth, getYear } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';
import { useSearchParams } from 'react-router-dom';

const Progress = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  
  // 데이터 상태
  const [gisungData, setGisungData] = useState([]); // 기성 데이터
  const [costData, setCostData] = useState([]); // 지출 데이터
  const [sites, setSites] = useState([]); // 현장 목록
  
  // UI 상태
  const [tab, setTab] = useState('chart'); // chart, gisung, cost
  const [statusView, setStatusView] = useState('month'); // month, site
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedSites, setSelectedSites] = useState([]);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [clickedSite, setClickedSite] = useState(null); // 클릭된 현장 상태 추가
  
  // 다이얼로그 상태
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    payments: [{ label: '1차 기성', amount: '' }],
  });

  // URL 파라미터 처리
  useEffect(() => {
    const siteId = searchParams.get('siteId');
    if (siteId) {
      const site = sites.find(s => s.id === siteId);
      if (site) {
        setSelectedSites([site.name]);
        setStatusView('site');
        setTab('gisung');
      }
    }
  }, [searchParams, sites]);

  // 데이터 로드
  useEffect(() => {
    fetchGisungData();
    fetchCostData();
    fetchSites();
  }, []);

  const fetchGisungData = async () => {
    try {
      // progress 컬렉션
      const progressQuery = query(collection(db, 'progress'), orderBy('name'));
      const progressSnapshot = await getDocs(progressQuery);
      const progressData = progressSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        type: 'progress'
      }));
      
      // gisung 컬렉션
      const gisungQuery = query(collection(db, 'gisung'), orderBy('gisungMonth', 'desc'));
      const gisungSnapshot = await getDocs(gisungQuery);
      const gisungData = gisungSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        type: 'gisung'
      }));
      
      setGisungData([...progressData, ...gisungData]);
    } catch (e) {
      console.error('기성 데이터 조회 실패:', e);
      setGisungData([]);
    }
  };

  const fetchCostData = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'costs'));
      const costsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCostData(costsData);
    } catch (e) {
      console.error('지출 데이터 조회 실패:', e);
      setCostData([]);
    }
  };

  const fetchSites = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sites'));
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(sitesData);
    } catch (e) {
      console.error('현장 데이터 조회 실패:', e);
      setSites([]);
    }
  };

  // 현장명 클릭 핸들러
  const handleSiteClick = (siteName) => {
    setClickedSite(clickedSite === siteName ? null : siteName);
  };

  // 필터링된 현장 목록
  const filteredSites = useMemo(() => {
    if (!siteSearchTerm) return sites;
    return sites.filter(site => 
      site.name.toLowerCase().includes(siteSearchTerm.toLowerCase())
    );
  }, [sites, siteSearchTerm]);

  // 월별 데이터 필터링
  const monthlyData = useMemo(() => {
    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth() + 1;
    
    // 기성 데이터 필터링
    const filteredGisung = gisungData.filter(item => {
      if (item.type === 'progress') return true;
      if (item.gisungMonth) {
        const gisungDate = parseISO(item.gisungMonth);
        return getYear(gisungDate) === currentYear && getMonth(gisungDate) + 1 === currentMonthNum;
      }
      return false;
    });
    
    // 지출 데이터 필터링
    const filteredCost = costData.filter(item => {
      if (item.useDate) {
        const costDate = parseISO(item.useDate);
        return getYear(costDate) === currentYear && getMonth(costDate) + 1 === currentMonthNum;
      }
      return false;
    });
    
    return { gisung: filteredGisung, cost: filteredCost };
  }, [gisungData, costData, currentMonth]);

  // 현장별 데이터 필터링
  const siteData = useMemo(() => {
    if (selectedSites.length === 0) {
      return { gisung: [], cost: [] }; // 현장이 선택되지 않으면 빈 배열 반환
    }
    
    // 기성 데이터 필터링
    const filteredGisung = gisungData.filter(item => 
      selectedSites.includes(item.siteName || item.name)
    );
    
    // 지출 데이터 필터링
    const filteredCost = costData.filter(item => 
      selectedSites.includes(item.siteName)
    );
    
    return { gisung: filteredGisung, cost: filteredCost };
  }, [gisungData, costData, selectedSites]);

  // 현재 표시할 데이터 결정
  const currentData = useMemo(() => {
    if (statusView === 'month') {
      return monthlyData;
    } else {
      return siteData;
    }
  }, [statusView, monthlyData, siteData]);

  // 차트 데이터 생성
  const getChartData = (data, type) => {
    if (type === 'month') {
      if (isMobile) {
        // 모바일: 해당 월만
        const currentYear = currentMonth.getFullYear();
        const currentMonthNum = currentMonth.getMonth() + 1;
        
        const monthData = {
          month: `${currentMonthNum}월`,
          계약금: 0,
          기성금: 0,
          노무: 0,
          경비: 0,
          기타: 0
        };
        
        // 해당 월의 기성 데이터
        const monthGisung = gisungData.filter(item => {
          if (item.type === 'progress') return true;
          if (item.gisungMonth) {
            const date = parseISO(item.gisungMonth);
            return getYear(date) === currentYear && getMonth(date) + 1 === currentMonthNum;
          }
          return false;
        });
        
        // 해당 월의 지출 데이터
        const monthCost = costData.filter(item => {
          if (item.useDate) {
            const date = parseISO(item.useDate);
            return getYear(date) === currentYear && getMonth(date) + 1 === currentMonthNum;
          }
          return false;
        });
        
        // 데이터 집계
        monthGisung.forEach(item => {
          if (item.contractAmount) monthData.계약금 += parseFloat(item.contractAmount) || 0;
          if (item.payments) {
            const totalPayment = item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            monthData.기성금 += totalPayment;
          }
        });
        
        monthCost.forEach(item => {
          const amount = parseFloat(item.amount) || 0;
          switch (item.category) {
            case '노무': monthData.노무 += amount; break;
            case '경비': monthData.경비 += amount; break;
            case '기타': monthData.기타 += amount; break;
            default: monthData.기타 += amount;
          }
        });
        
        return [monthData];
      } else {
        // PC/태블릿: 1-12월 전체
        const monthlyChartData = [];
        for (let month = 1; month <= 12; month++) {
          const monthData = {
            month: `${month}월`,
            계약금: 0,
            기성금: 0,
            노무: 0,
            경비: 0,
            기타: 0
          };
          
          // 해당 월의 기성 데이터
          const monthGisung = gisungData.filter(item => {
            if (item.type === 'progress') return true;
            if (item.gisungMonth) {
              const date = parseISO(item.gisungMonth);
              return getYear(date) === currentMonth.getFullYear() && getMonth(date) + 1 === month;
            }
            return false;
          });
          
          // 해당 월의 지출 데이터
          const monthCost = costData.filter(item => {
            if (item.useDate) {
              const date = parseISO(item.useDate);
              return getYear(date) === currentMonth.getFullYear() && getMonth(date) + 1 === month;
            }
            return false;
          });
          
          // 데이터 집계
          monthGisung.forEach(item => {
            if (item.contractAmount) monthData.계약금 += parseFloat(item.contractAmount) || 0;
            if (item.payments) {
              const totalPayment = item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
              monthData.기성금 += totalPayment;
            }
          });
          
          monthCost.forEach(item => {
            const amount = parseFloat(item.amount) || 0;
            switch (item.category) {
              case '노무': monthData.노무 += amount; break;
              case '경비': monthData.경비 += amount; break;
              case '기타': monthData.기타 += amount; break;
              default: monthData.기타 += amount;
            }
          });
          
          monthlyChartData.push(monthData);
        }
        return monthlyChartData;
      }
    } else {
      // 현장별 차트 데이터
      if (selectedSites.length === 0) return [];
      
      // 모바일에서는 최대 2개 현장만
      const sitesToShow = isMobile ? selectedSites.slice(0, 2) : selectedSites;
      
      return sitesToShow.map(siteName => {
        const siteGisung = data.gisung.filter(item => 
          (item.siteName || item.name) === siteName
        );
        const siteCost = data.cost.filter(item => 
          item.siteName === siteName
        );
        
        const siteData = {
          name: siteName,
          계약금: 0,
          기성금: 0,
          노무: 0,
          경비: 0,
          기타: 0
        };
        
        // 기성 데이터 집계
        siteGisung.forEach(item => {
          if (item.contractAmount) siteData.계약금 += parseFloat(item.contractAmount) || 0;
          if (item.payments) {
            const totalPayment = item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            siteData.기성금 += totalPayment;
          }
        });
        
        // 지출 데이터 집계
        siteCost.forEach(item => {
          const amount = parseFloat(item.amount) || 0;
          switch (item.category) {
            case '노무': siteData.노무 += amount; break;
            case '경비': siteData.경비 += amount; break;
            case '기타': siteData.기타 += amount; break;
            default: siteData.기타 += amount;
          }
        });
        
        return siteData;
      });
    }
  };

  // 스마트박스 데이터 계산
  const getSmartBoxData = () => {
    const data = currentData;
    const totalContract = data.gisung.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
    const totalGisung = data.gisung.reduce((sum, item) => {
      if (item.payments) {
        return sum + item.payments.reduce((pSum, p) => pSum + (parseFloat(p.amount) || 0), 0);
      }
      return sum;
    }, 0);
    const totalCost = data.cost.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    return {
      title: statusView === 'month' ? `${monthText} 요약` : `선택된 현장 요약`,
      contract: totalContract,
      gisung: totalGisung,
      cost: totalCost,
      progress: totalContract > 0 ? Math.round((totalGisung / totalContract) * 100) : 0
    };
  };

  // 월 이동 함수
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleThisMonth = () => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const monthText = `${currentMonth.getFullYear()}년 ${String(currentMonth.getMonth() + 1).padStart(2, '0')}월`;

  // 엑셀 다운로드
  const handleExcelDownload = () => {
    const chartData = getChartData(currentData, statusView);
    
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, ws, '기성현황');
    XLSX.writeFile(wb, `기성현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 현장 검색 컴포넌트
  const SiteSearch = () => (
    <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
      <TextField
        label="현장 검색"
        value={siteSearchTerm}
        onChange={(e) => setSiteSearchTerm(e.target.value)}
        sx={{ minWidth: 200 }}
      />
      <FormControl sx={{ minWidth: 300 }}>
        <InputLabel>현장 선택</InputLabel>
        <Select
          multiple
          value={selectedSites}
          onChange={(e) => {
            const newSelected = e.target.value;
            // 모바일에서는 최대 2개만 선택 가능
            if (isMobile && newSelected.length > 2) {
              alert('모바일에서는 최대 2개 현장만 선택할 수 있습니다.');
              return;
            }
            setSelectedSites(newSelected);
          }}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {filteredSites.map(site => (
            <MenuItem key={site.id} value={site.name}>
              <Checkbox checked={selectedSites.includes(site.name)} />
              <ListItemText primary={site.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {!isMobile && (
        <Button 
          variant="contained" 
          onClick={handleExcelDownload}
          startIcon={<CloudDownloadIcon />}
        >
          엑셀로 저장
        </Button>
      )}
    </Box>
  );

  // PC용 현장 검색 컴포넌트 (오른쪽 정렬)
  const PCSiteSearch = () => (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      <TextField
        label="현장 검색"
        value={siteSearchTerm}
        onChange={(e) => setSiteSearchTerm(e.target.value)}
        sx={{ minWidth: 200 }}
      />
      <FormControl sx={{ minWidth: 300 }}>
        <InputLabel>현장 선택</InputLabel>
        <Select
          multiple
          value={selectedSites}
          onChange={(e) => setSelectedSites(e.target.value)}
          renderValue={(selected) => (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {selected.map((value) => (
                <Chip key={value} label={value} size="small" />
              ))}
            </Box>
          )}
        >
          {filteredSites.map(site => (
            <MenuItem key={site.id} value={site.name}>
              <Checkbox checked={selectedSites.includes(site.name)} />
              <ListItemText primary={site.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );

  // 스마트박스 컴포넌트
  const SmartBox = () => {
    const data = getSmartBoxData();
    return (
      <Card sx={{ 
        mb: 2, 
        background: isMobile ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
        color: 'white',
        boxShadow: isMobile ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 20px rgba(0,0,0,0.1)',
        border: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none'
      }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: isMobile ? '#e94560' : 'white' }}>
            {data.title}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ opacity: 0.8, color: isMobile ? '#a8a8a8' : 'rgba(255,255,255,0.8)' }}>계약금액</Typography>
              <Typography variant="h6" sx={{ color: isMobile ? '#00d4aa' : 'white' }}>{data.contract.toLocaleString()}원</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ opacity: 0.8, color: isMobile ? '#a8a8a8' : 'rgba(255,255,255,0.8)' }}>기성금</Typography>
              <Typography variant="h6" sx={{ color: isMobile ? '#ff6b6b' : 'white' }}>{data.gisung.toLocaleString()}원</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ opacity: 0.8, color: isMobile ? '#a8a8a8' : 'rgba(255,255,255,0.8)' }}>지출</Typography>
              <Typography variant="h6" sx={{ color: isMobile ? '#feca57' : 'white' }}>{data.cost.toLocaleString()}원</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" sx={{ opacity: 0.8, color: isMobile ? '#a8a8a8' : 'rgba(255,255,255,0.8)' }}>진행률</Typography>
              <Typography variant="h6" sx={{ color: isMobile ? '#48dbfb' : 'white' }}>{data.progress}%</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ p: isMobile ? 2 : 3 }}>
      {/* 1줄: 월별/현장별 */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button 
          variant={statusView === 'month' ? 'contained' : 'outlined'} 
          onClick={() => setStatusView('month')}
          sx={isMobile ? {
            background: statusView === 'month' ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'transparent',
            color: statusView === 'month' ? '#e94560' : '#666',
            border: statusView === 'month' ? '1px solid #e94560' : '1px solid #333',
            '&:hover': {
              background: statusView === 'month' ? 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)' : 'rgba(255,255,255,0.1)'
            }
          } : {}}
        >
          월별
        </Button>
        <Button 
          variant={statusView === 'site' ? 'contained' : 'outlined'} 
          onClick={() => setStatusView('site')}
          sx={isMobile ? {
            background: statusView === 'site' ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' : 'transparent',
            color: statusView === 'site' ? '#e94560' : '#666',
            border: statusView === 'site' ? '1px solid #e94560' : '1px solid #333',
            '&:hover': {
              background: statusView === 'site' ? 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)' : 'rgba(255,255,255,0.1)'
            }
          } : {}}
        >
          현장별
        </Button>
        <Box sx={{ flex: 1 }} />
        {statusView === 'month' && !isMobile && (
          <>
            <Button size="small" onClick={handlePrevMonth}>이전달</Button>
            <Button size="small" onClick={handleThisMonth}>이번달</Button>
            <Button size="small" onClick={handleNextMonth}>다음달</Button>
            <Typography sx={{ ml: 2, fontWeight: 700 }}>{monthText}</Typography>
          </>
        )}
        {statusView === 'site' && !isMobile && <PCSiteSearch />}
      </Box>

      {/* 2줄: 달력네비게이션 또는 현장 검색선택 */}
      {statusView === 'month' && isMobile && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'center' }}>
          <Button 
            size="small" 
            onClick={handlePrevMonth}
            sx={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              color: 'white',
              border: '1px solid #e94560',
              '&:hover': {
                background: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)'
              }
            }}
          >
            이전달
          </Button>
          <Typography sx={{ fontWeight: 700, px: 2, color: 'white' }}>{monthText}</Typography>
          <Button 
            size="small" 
            onClick={handleNextMonth}
            sx={{
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              color: 'white',
              border: '1px solid #e94560',
              '&:hover': {
                background: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)'
              }
            }}
          >
            다음달
          </Button>
        </Box>
      )}
      {statusView === 'site' && isMobile && <SiteSearch />}

      {/* 3줄: 기성관리/기성현황/지출 버튼 (PC/태블릿에서만) */}
      {!isMobile && (
        <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button variant={tab === 'chart' ? 'contained' : 'outlined'} onClick={() => setTab('chart')}>기성관리</Button>
          <Button variant={tab === 'gisung' ? 'contained' : 'outlined'} onClick={() => setTab('gisung')}>기성현황</Button>
          <Button variant={tab === 'cost' ? 'contained' : 'outlined'} onClick={() => setTab('cost')}>지출</Button>
          <Box sx={{ flex: 1 }} />
          {statusView === 'site' && (
            <Button 
              variant="contained" 
              onClick={handleExcelDownload}
              startIcon={<CloudDownloadIcon />}
            >
              엑셀로 저장
            </Button>
          )}
        </Box>
      )}

      {/* 4줄: 스마트박스 (모바일에서만) */}
      {isMobile && <SmartBox />}

      {/* 5줄: 차트 */}
      {statusView === 'month' && tab === 'chart' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            {isMobile ? `${monthText} 기성 및 지출 현황` : '월별 기성 및 지출 현황'}
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getChartData(monthlyData, 'month')}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString() + '원'} />
              <Legend />
              <Bar dataKey="계약금" fill="#1976d2" />
              <Bar dataKey="기성금" fill="#42a5f5" />
              <Bar dataKey="노무" fill="#66bb6a" />
              <Bar dataKey="경비" fill="#ffa726" />
              <Bar dataKey="기타" fill="#ef5350" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {statusView === 'site' && tab === 'chart' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>현장별 기성 및 지출 현황</Typography>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={getChartData(siteData, 'site')}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => value.toLocaleString() + '원'} />
              <Legend />
              <Bar dataKey="계약금" fill="#1976d2" />
              <Bar dataKey="기성금" fill="#42a5f5" />
              <Bar dataKey="노무" fill="#66bb6a" />
              <Bar dataKey="경비" fill="#ffa726" />
              <Bar dataKey="기타" fill="#ef5350" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* PC/태블릿에서만 표시되는 테이블들 */}
      {!isMobile && statusView === 'month' && tab === 'gisung' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{monthText} 기성현황</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>현장명</TableCell>
                  <TableCell>계약금액</TableCell>
                  <TableCell>기성금</TableCell>
                  <TableCell>기성월</TableCell>
                  <TableCell>진행률</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentData.gisung.map((item, index) => {
                  const siteName = item.siteName || item.name;
                  const isClicked = clickedSite === siteName;
                  const contractAmount = parseFloat(item.contractAmount || 0);
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <Button
                          onClick={() => handleSiteClick(siteName)}
                          sx={{
                            textTransform: 'none',
                            color: isClicked ? '#1976d2' : 'inherit',
                            fontWeight: isClicked ? 'bold' : 'normal',
                            textDecoration: isClicked ? 'underline' : 'none',
                            '&:hover': {
                              backgroundColor: 'transparent',
                              textDecoration: 'underline'
                            }
                          }}
                        >
                          {siteName}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {isClicked ? contractAmount.toLocaleString() + '원' : '클릭하여 확인'}
                      </TableCell>
                      <TableCell>
                        {item.payments ? 
                          item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString() + '원' : 
                          '0원'
                        }
                      </TableCell>
                      <TableCell>{item.gisungMonth ? format(parseISO(item.gisungMonth), 'yyyy-MM') : '-'}</TableCell>
                      <TableCell>
                        {item.contractAmount && item.payments ? 
                          `${Math.round((item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / parseFloat(item.contractAmount)) * 100)}%` : 
                          '0%'
                        }
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {!isMobile && statusView === 'site' && tab === 'gisung' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>현장별 기성현황</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>현장명</TableCell>
                  <TableCell>계약금액</TableCell>
                  <TableCell>기성금</TableCell>
                  <TableCell>기성월</TableCell>
                  <TableCell>진행률</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      현장을 선택해주세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.gisung.map((item, index) => {
                    const siteName = item.siteName || item.name;
                    const isClicked = clickedSite === siteName;
                    const contractAmount = parseFloat(item.contractAmount || 0);
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <Button
                            onClick={() => handleSiteClick(siteName)}
                            sx={{
                              textTransform: 'none',
                              color: isClicked ? '#1976d2' : 'inherit',
                              fontWeight: isClicked ? 'bold' : 'normal',
                              textDecoration: isClicked ? 'underline' : 'none',
                              '&:hover': {
                                backgroundColor: 'transparent',
                                textDecoration: 'underline'
                              }
                            }}
                          >
                            {siteName}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {isClicked ? contractAmount.toLocaleString() + '원' : '클릭하여 확인'}
                        </TableCell>
                        <TableCell>
                          {item.payments ? 
                            item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString() + '원' : 
                            '0원'
                          }
                        </TableCell>
                        <TableCell>{item.gisungMonth ? format(parseISO(item.gisungMonth), 'yyyy-MM') : '-'}</TableCell>
                        <TableCell>
                          {item.contractAmount && item.payments ? 
                            `${Math.round((item.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) / parseFloat(item.contractAmount)) * 100)}%` : 
                            '0%'
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {!isMobile && statusView === 'month' && tab === 'cost' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>{monthText} 지출현황</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>현장명</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>금액</TableCell>
                  <TableCell>사용날짜</TableCell>
                  <TableCell>비고</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentData.cost.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.siteName}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{parseFloat(item.amount || 0).toLocaleString()}원</TableCell>
                    <TableCell>{item.useDate ? format(parseISO(item.useDate), 'yyyy-MM-dd') : '-'}</TableCell>
                    <TableCell>{item.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {!isMobile && statusView === 'site' && tab === 'cost' && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>현장별 지출현황</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>현장명</TableCell>
                  <TableCell>카테고리</TableCell>
                  <TableCell>금액</TableCell>
                  <TableCell>사용날짜</TableCell>
                  <TableCell>비고</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedSites.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      현장을 선택해주세요.
                    </TableCell>
                  </TableRow>
                ) : (
                  currentData.cost.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.siteName}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{parseFloat(item.amount || 0).toLocaleString()}원</TableCell>
                      <TableCell>{item.useDate ? format(parseISO(item.useDate), 'yyyy-MM-dd') : '-'}</TableCell>
                      <TableCell>{item.note || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* 모바일에서 기성현황/지출 접근 시 안내 메시지 */}
      {isMobile && (tab === 'gisung' || tab === 'cost') && (
        <Alert 
          severity="info" 
          icon={<ComputerIcon />}
          sx={{ mt: 2 }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            PC로 확인 및 등록해주세요
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            기성현황 및 지출 상세 내역은 PC에서 확인하실 수 있습니다.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default Progress; 