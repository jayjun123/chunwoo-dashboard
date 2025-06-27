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
  LinearProgress,
  Chip,
  useTheme,
  useMediaQuery,
  MenuItem,
  Checkbox,
  ListItemText,
  Tabs,
  Tab,
  Alert,
  FormControl,
  InputLabel,
  Select,
  ButtonGroup,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import GisungList from '../components/GisungList';
import GisungStatusTable from '../components/GisungStatusTable';
import GisungStatusPage from '../components/GisungStatusPage';
import * as XLSX from 'xlsx';
import Cost from './Cost';
import { useSearchParams } from 'react-router-dom';

const Progress = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  const [progressList, setProgressList] = useState([]);
  const [allCostData, setAllCostData] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    payments: [{ label: '1차 기성', amount: '' }],
  });
  const [tab, setTab] = useState(isMobile ? 'gisung' : 'chart');
  const [statusView, setStatusView] = useState('month'); // 'month' or 'site'
  // 월 상태 관리
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // 월 이동 함수
  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const handleThisMonth = () => setCurrentMonth(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  // 월 텍스트
  const monthText = `${currentMonth.getFullYear()}년 ${String(currentMonth.getMonth() + 1).padStart(2, '0')}월`;
  const [sites, setSites] = useState([]);
  // 현장별 검색 상태 추가
  const [selectedSites, setSelectedSites] = useState([]);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');

  // URL 파라미터에서 siteId 읽기
  useEffect(() => {
    const siteId = searchParams.get('siteId');
    if (siteId) {
      setFilteredSiteId(siteId);
      // 해당 현장 정보 찾기
      const site = sites.find(s => s.id === siteId);
      if (site) {
        setFilteredSiteName(site.name);
        setSelectedSites([site.name]);
        // 현장별 탭으로 자동 전환
        setStatusView('site');
        setTab('gisung'); // 기성현황 탭으로 전환
      }
    }
  }, [searchParams, sites]);

  // 현장 검색 필터링
  const filteredSites = useMemo(() => {
    if (!siteSearchTerm) return sites;
    return sites.filter(site => 
      site.name.toLowerCase().includes(siteSearchTerm.toLowerCase())
    );
  }, [sites, siteSearchTerm]);

  useEffect(() => {
    fetchProgress();
    fetchSites();
    fetchCosts();
  }, []);

  const fetchProgress = async () => {
    try {
      console.log('=== 기성 데이터 로드 시작 ===');
      
      // progress 컬렉션에서 데이터 가져오기
      const progressQuery = query(collection(db, 'progress'), orderBy('name'));
      const progressSnapshot = await getDocs(progressQuery);
      const progressData = progressSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // gisung 컬렉션에서도 데이터 가져오기
      const gisungQuery = query(collection(db, 'gisung'), orderBy('gisungMonth', 'desc'));
      const gisungSnapshot = await getDocs(gisungQuery);
      const gisungData = gisungSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // 두 데이터를 합쳐서 progressList에 저장
      const combinedData = [...progressData, ...gisungData];
      setProgressList(combinedData);
      
      console.log('기성 데이터 로드 완료:', {
        progress: progressData.length,
        gisung: gisungData.length,
        total: combinedData.length
      });
    } catch (e) {
      console.error('기성 데이터 조회 실패:', e);
      setProgressList([]);
    }
  };

  const fetchSites = async () => {
    try {
      console.log('=== 현장 데이터 로드 시작 ===');
      const snapshot = await getDocs(collection(db, 'sites'));
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(sitesData);
      console.log('현장 데이터 로드 완료:', sitesData.length);
    } catch (e) {
      console.error('현장 데이터 조회 실패:', e);
      setSites([]);
    }
  };

  const fetchCosts = async () => {
    try {
      console.log('=== 지출 데이터 로드 시작 ===');
      const snapshot = await getDocs(collection(db, 'costs'));
      const costsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllCostData(costsData);
      console.log('지출 데이터 로드 완료:', costsData.length);
    } catch (e) {
      console.error('지출 데이터 조회 실패:', e);
      setAllCostData([]);
    }
  };

  const handleOpen = (item = null) => {
    if (item) {
      setSelected(item);
      setFormData({
        name: item.name,
        contractAmount: item.contractAmount,
        payments: item.payments || [{ label: '1차 기성', amount: '' }],
      });
    } else {
      setSelected(null);
      setFormData({
        name: '',
        contractAmount: '',
        payments: [{ label: '1차 기성', amount: '' }],
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  const handleChangePayment = (idx, key, value) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.map((p, i) => i === idx ? { ...p, [key]: value } : p)
    }));
  };

  const handleAddPayment = () => {
    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, { label: `${prev.payments.length + 1}차 기성`, amount: '' }]
    }));
  };

  const handleRemovePayment = (idx) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async () => {
    try {
      if (selected) {
        await updateDoc(doc(db, 'progress', selected.id), formData);
      } else {
        await addDoc(collection(db, 'progress'), formData);
      }
      handleClose();
      fetchProgress();
    } catch (e) {
      console.error('기성 데이터 저장 실패:', e);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'progress', id));
        fetchProgress();
      } catch (e) {
        console.error('기성 데이터 삭제 실패:', e);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  // 계산
  const getTotalPayment = (payments) => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  // 차트 데이터 계산 - 현장별 기성관리용
  const getSiteChartData = useMemo(() => {
    if (selectedSites.length === 0) return [];
    
    return selectedSites.map(siteName => {
      // 기성 데이터에서 해당 현장의 데이터 필터링
      const siteGisungData = progressList.filter(item => item.name === siteName);
      const totalContract = siteGisungData.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
      const totalGisung = siteGisungData.reduce((sum, item) => {
        if (item.payments) {
          return sum + item.payments.reduce((pSum, payment) => pSum + (parseFloat(payment.amount) || 0), 0);
        }
        return sum + (parseFloat(item.gisungAmount) || 0);
      }, 0);
      
      // 지출 데이터에서 해당 현장의 데이터 필터링
      const siteCostData = allCostData.filter(cost => cost.site === siteName);
      const totalLabor = siteCostData
        .filter(cost => cost.itemType === '노무비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      const totalExpense = siteCostData
        .filter(cost => cost.itemType === '경비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      const totalEtc = siteCostData
        .filter(cost => cost.itemType === 'RnD' || cost.itemType === '기타')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      const result = {
        name: siteName,
        '계약금': totalContract,
        '기성금': totalGisung,
        '노무': totalLabor,
        '경비': totalExpense,
        '기타': totalEtc,
      };
      
      return result;
    });
  }, [progressList, allCostData, selectedSites]);

  // 차트 데이터 계산 - 월별 기성관리용
  const getMonthChartData = useMemo(() => {
    const monthData = [];
    
    for (let month = 1; month <= 12; month++) {
      const monthStr = `${currentMonth.getFullYear()}-${String(month).padStart(2, '0')}`;
      
      // 기성 데이터에서 해당 월의 데이터 필터링
      const monthGisungData = progressList.filter(item => {
        if (item.gisungMonth) {
          return item.gisungMonth === monthStr;
        }
        // payments가 있는 경우 날짜로 필터링
        if (item.payments && item.payments.length > 0) {
          return item.payments.some(payment => {
            if (payment.date) {
              const paymentDate = new Date(payment.date);
              return paymentDate.getFullYear() === currentMonth.getFullYear() && 
                     paymentDate.getMonth() + 1 === month;
            }
            return false;
          });
        }
        return false;
      });
      
      const totalContract = monthGisungData.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
      const totalGisung = monthGisungData.reduce((sum, item) => {
        if (item.payments) {
          return sum + item.payments.reduce((pSum, payment) => pSum + (parseFloat(payment.amount) || 0), 0);
        }
        return sum + (parseFloat(item.gisungAmount) || 0);
      }, 0);
      
      // 지출 데이터에서 해당 월의 데이터 필터링
      const monthCostData = allCostData.filter(cost => {
        if (cost.date) {
          const costDate = new Date(cost.date);
          return costDate.getFullYear() === currentMonth.getFullYear() && 
                 costDate.getMonth() + 1 === month;
        }
        return false;
      });
      
      const totalLabor = monthCostData
        .filter(cost => cost.itemType === '노무비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      const totalExpense = monthCostData
        .filter(cost => cost.itemType === '경비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      const totalEtc = monthCostData
        .filter(cost => cost.itemType === 'RnD' || cost.itemType === '기타')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      monthData.push({
        name: `${month}월`,
        '기성금': totalGisung,
        '노무': totalLabor,
        '경비': totalExpense,
        '기타': totalEtc,
      });
    }
    
    return monthData;
  }, [progressList, allCostData, currentMonth]);

  // 필터링된 기성 데이터 - 현장별
  const getFilteredGisungData = useMemo(() => {
    if (selectedSites.length === 0) return [];
    
    // progressList에서 gisung 컬렉션의 데이터만 필터링 (gisungMonth 필드가 있는 데이터)
    const gisungData = progressList.filter(item => item.gisungMonth);
    return gisungData.filter(item => selectedSites.includes(item.name));
  }, [progressList, selectedSites]);

  // 필터링된 지출 데이터 - 현장별
  const getFilteredCostData = useMemo(() => {
    if (selectedSites.length === 0) return [];
    return allCostData.filter(cost => selectedSites.includes(cost.site));
  }, [allCostData, selectedSites]);

  // 필터링된 기성 데이터 - 월별
  const getFilteredGisungDataByMonth = useMemo(() => {
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    return progressList.filter(item => {
      if (item.gisungMonth) {
        return item.gisungMonth === monthStr;
      }
      if (item.payments && item.payments.length > 0) {
        return item.payments.some(payment => {
          if (payment.date) {
            const paymentDate = new Date(payment.date);
            return paymentDate.getFullYear() === currentMonth.getFullYear() && 
                   paymentDate.getMonth() + 1 === currentMonth.getMonth() + 1;
          }
          return false;
        });
      }
      return false;
    });
  }, [progressList, currentMonth]);

  // 필터링된 지출 데이터 - 월별
  const getFilteredCostDataByMonth = useMemo(() => {
    return allCostData.filter(cost => {
      if (cost.date) {
        const costDate = new Date(cost.date);
        return costDate.getFullYear() === currentMonth.getFullYear() && 
               costDate.getMonth() + 1 === currentMonth.getMonth() + 1;
      }
      return false;
    });
  }, [allCostData, currentMonth]);

  // 전체 진행률 계산
  const totalProgress = Math.round(
    progressList.reduce((sum, item) => sum + getTotalPayment(item.payments || []), 0) / (progressList.length || 1)
  );
  // 도넛 차트 데이터
  const donutData = [
    { name: '진행', value: totalProgress },
    { name: '잔여', value: 100 - totalProgress }
  ];
  const COLORS = ['#1976d2', '#232733'];

  // 엑셀 다운로드 함수 구현
  const handleExcelDownload = () => {
    try {
      // 차트 데이터 준비
      const chartData = progressList
        .filter(row => selectedSites.length === 0 || selectedSites.includes(row.name))
        .map(row => {
          const contract = parseFloat(row.contractAmount) || 0;
          const totalPayment = getTotalPayment(row.payments || []);
          return {
            '현장명': row.name,
            '계약금액': contract,
            ...Object.fromEntries((row.payments || []).map((p, i) => [p.label, parseFloat(p.amount) || 0])),
            '잔액': contract - totalPayment,
            '진행률': `${Math.round((totalPayment / contract) * 100)}%`
          };
        });

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(chartData);
      XLSX.utils.book_append_sheet(wb, ws, '기성현황');

      // 파일 저장
      XLSX.writeFile(wb, `기성현황_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  // 현장별 검색 UI 개선
  const SiteSearch = () => (
    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: isMobile ? 1 : 2, flexWrap: 'wrap' }}>
      <Typography sx={{ color: '#fff', fontWeight: 600, display: isMobile ? 'none' : 'block' }}>현장 선택:</Typography>
      <FormControl sx={{ minWidth: isMobile ? 200 : 300 }}>
        <InputLabel sx={{ color: '#fff', fontSize: isMobile ? '0.8rem' : 'inherit' }}>현장명 검색</InputLabel>
        <Select
          value=""
          onChange={(e) => {
            const selectedSiteName = e.target.value;
            if (selectedSiteName && !selectedSites.includes(selectedSiteName)) {
              if (selectedSites.length >= 4) {
                alert('현장은 최대 4개까지 선택할 수 있습니다.');
                return;
              }
              setSelectedSites([...selectedSites, selectedSiteName]);
            }
          }}
          displayEmpty
          size={isMobile ? 'small' : 'medium'}
          sx={{ 
            bgcolor: '#232b3b', 
            color: '#fff',
            fontSize: isMobile ? '0.8rem' : 'inherit',
            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
            '& .MuiSelect-icon': { color: '#fff' }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                bgcolor: '#232b3b',
                '& .MuiMenuItem-root': {
                  color: '#fff',
                  fontSize: isMobile ? '0.8rem' : 'inherit',
                  '&:hover': { bgcolor: '#2c3446' },
                  '&.Mui-selected': { bgcolor: '#1976d2' }
                }
              }
            }
          }}
        >
          {filteredSites.map(site => (
            <MenuItem key={site.id} value={site.name} disabled={selectedSites.includes(site.name)}>
              {site.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, flexWrap: 'wrap' }}>
        {selectedSites.map(siteName => (
          <Box key={siteName} sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? 0.5 : 1, 
            bgcolor: '#2c3446', 
            px: isMobile ? 1 : 2, 
            py: isMobile ? 0.5 : 1, 
            borderRadius: 1 
          }}>
            <Typography sx={{ 
              color: '#fff', 
              fontSize: isMobile ? '0.7rem' : '0.9rem' 
            }}>
              {siteName}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setSelectedSites(selectedSites.filter(name => name !== siteName))}
              sx={{ color: '#ff6b6b', p: isMobile ? 0.25 : 0.5 }}
            >
              <DeleteIcon fontSize={isMobile ? 'small' : 'small'} />
            </IconButton>
          </Box>
        ))}
      </Box>
      {selectedSites.length >= 4 && (
        <Typography sx={{ color: '#ff9800', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
          현장은 최대 4개까지 선택할 수 있습니다.
        </Typography>
      )}
    </Box>
  );

  return (
    <Box sx={{ 
      p: isMobile ? 2 : 3, 
      width: 'calc(100vw - 60px)', 
      maxWidth: 'calc(100vw - 60px)', 
      ml: '-20px',
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '0px' : 'auto'
    }}>
      {/* 기성관리, 기성현황, 지출 탭 버튼들 */}
      {isMobile ? (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mr: '-50px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', flex: 1 }}>
            <ButtonGroup variant="outlined" size="small">
              <Button 
                onClick={() => setTab('gisung')}
                variant={tab === 'gisung' ? 'contained' : 'outlined'}
                sx={{ fontSize: '0.75rem', px: 1 }}
              >
                기성현황
              </Button>
              <Button 
                onClick={() => setTab('cost')}
                variant={tab === 'cost' ? 'contained' : 'outlined'}
                sx={{ fontSize: '0.75rem', px: 1 }}
              >
                지출
              </Button>
            </ButtonGroup>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', flex: 1 }}>
            <ButtonGroup variant="outlined" size="small">
              <Button 
                onClick={() => setStatusView('month')}
                variant={statusView === 'month' ? 'contained' : 'outlined'}
                sx={{ fontSize: '0.75rem', px: 1 }}
              >
                월별
              </Button>
              <Button 
                onClick={() => setStatusView('site')}
                variant={statusView === 'site' ? 'contained' : 'outlined'}
                sx={{ fontSize: '0.75rem', px: 1 }}
              >
                현장별
              </Button>
            </ButtonGroup>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 3 }}>
          {/* 왼쪽: 기성관리/기성현황/지출 */}
          <ButtonGroup variant="outlined" size="medium">
            <Button 
              onClick={() => setTab('chart')}
              variant={tab === 'chart' ? 'contained' : 'outlined'}
              sx={{ px: 2 }}
            >
              기성관리
            </Button>
            <Button 
              onClick={() => setTab('gisung')}
              variant={tab === 'gisung' ? 'contained' : 'outlined'}
              sx={{ px: 2 }}
            >
              기성현황
            </Button>
            <Button 
              onClick={() => setTab('cost')}
              variant={tab === 'cost' ? 'contained' : 'outlined'}
              sx={{ px: 2 }}
            >
              지출
            </Button>
          </ButtonGroup>
          {/* 오른쪽: 월별/현장별 */}
          <ButtonGroup variant="outlined" size="medium">
            <Button 
              onClick={() => setStatusView('month')}
              variant={statusView === 'month' ? 'contained' : 'outlined'}
              sx={{ px: 2 }}
            >
              월별
            </Button>
            <Button 
              onClick={() => setStatusView('site')}
              variant={statusView === 'site' ? 'contained' : 'outlined'}
              sx={{ px: 2 }}
            >
              현장별
            </Button>
          </ButtonGroup>
        </Box>
      )}

      {/* 월별탭에서만 월 네비게이션 버튼 노출 (기성현황, 지출 모두) */}
      {statusView === 'month' && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          mb: 2, 
          gap: isMobile ? 1 : 2,
          mr: isMobile ? '-50px' : 'auto'
        }}>
          <Button 
            variant="outlined" 
            onClick={handlePrevMonth}
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontSize: isMobile ? '0.75rem' : 'inherit' }}
          >
            이전달
          </Button>
          <Typography 
            sx={{ 
              fontWeight: 700, 
              color: '#90caf9', 
              cursor: 'pointer',
              px: isMobile ? 1 : 2,
              py: isMobile ? 0.5 : 1,
              borderRadius: 1,
              fontSize: isMobile ? '0.8rem' : 'inherit',
              '&:hover': { bgcolor: '#232b3b' }
            }}
            onClick={handleThisMonth}
          >
            {monthText}
          </Typography>
          <Button 
            variant="outlined" 
            onClick={handleNextMonth}
            size={isMobile ? 'small' : 'medium'}
            sx={{ fontSize: isMobile ? '0.75rem' : 'inherit' }}
          >
            다음달
          </Button>
        </Box>
      )}

      {/* 현장별탭에서만 현장검색 체크박스 노출 */}
      {statusView === 'site' && (
        <SiteSearch />
      )}

      {/* 필터링된 현장 안내 메시지 */}
      {filteredSiteId && filteredSiteName && (
        <Alert 
          severity="info" 
          sx={{ mb: 2, bgcolor: '#232b3b', color: '#90caf9', border: '1px solid #90caf9' }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            📍 {filteredSiteName} 현장의 기성관리 데이터를 확인하고 있습니다.
          </Typography>
          {progressList.filter(item => item.name === filteredSiteName).length === 0 && (
            <Typography variant="body2" sx={{ mt: 1, color: '#ff9800' }}>
              💡 이 현장에 대한 기성 데이터가 없습니다. "기성 등록" 버튼을 클릭하여 현장 기성을 등록해주세요.
            </Typography>
          )}
        </Alert>
      )}

      {/* 월별/현장별 + 소분류 연동 분기 */}
      {!isMobile && statusView === 'month' && tab === 'chart' && (
        // 월별+기성관리 차트/데이터
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3, width: '100vw', maxWidth: '100vw', margin: 0 }}>
          {/* 차트 전체 화면 */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>{currentMonth.getFullYear()}년 월별 기성 및 지출 현황</Typography>
              <ResponsiveContainer width="100%" height={500} minWidth={1200} minHeight={400}>
                <BarChart
                  data={getMonthChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barCategoryGap={24}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="기성금" fill="#82ca9d">
                    <LabelList dataKey="기성금" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                  <Bar dataKey="노무" fill="#ffc658">
                    <LabelList dataKey="노무" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                  <Bar dataKey="경비" fill="#ff6b6b">
                    <LabelList dataKey="경비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                  <Bar dataKey="기타" fill="#a084e8">
                    <LabelList dataKey="기타" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
      {!isMobile && statusView === 'site' && tab === 'chart' && (
        // 현장별+기성관리 차트/데이터(선택된 현장만)
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3, width: '100vw', maxWidth: '100vw', margin: 0 }}>
          {/* 차트 전체 화면 */}
          <Grid item xs={12}>
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>현장별 기성/지출 현황</Typography>
              <ResponsiveContainer width="100%" height={500} minWidth={1200} minHeight={400}>
                <BarChart
                  data={getSiteChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barCategoryGap={24}
                >
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="기성금" fill="#82ca9d">
                    <LabelList dataKey="기성금" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                  <Bar dataKey="노무" fill="#ffc658">
                    <LabelList dataKey="노무" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                  <Bar dataKey="경비" fill="#ff6b6b">
                    <LabelList dataKey="경비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                  <Bar dataKey="기타" fill="#a084e8">
                    <LabelList dataKey="기타" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
      {statusView === 'month' && tab === 'gisung' && (
        <GisungStatusPage 
          viewType="month" 
          currentMonth={currentMonth}
          monthText={monthText}
        />
      )}
      {statusView === 'site' && tab === 'gisung' && (
        <GisungStatusPage 
          viewType="site" 
          selectedSites={selectedSites}
        />
      )}
      {statusView === 'month' && tab === 'cost' && (
        <Cost 
          viewType="month"
          currentMonth={currentMonth}
          monthText={monthText}
          filteredData={getFilteredCostDataByMonth}
        />
      )}
      {statusView === 'site' && tab === 'cost' && (
        <Cost 
          viewType="site"
          selectedSites={selectedSites}
          filteredData={getFilteredCostData}
        />
      )}

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? '기성 수정' : '기성 등록'}</DialogTitle>
        <DialogContent>
          {/* 현장명(공사명) 오토컴플릿/드롭다운: 현장관리 데이터 연동 */}
          <TextField
            select
            label="공사명"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          >
            {filteredSites.map(site => (
              <MenuItem key={site.id} value={site.name}>{site.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="계약금액"
            value={formData.contractAmount}
            onChange={e => setFormData({ ...formData, contractAmount: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          {formData.payments.map((p, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label={p.label}
                value={p.amount}
                onChange={e => handleChangePayment(idx, 'amount', e.target.value.replace(/[^0-9]/g, ''))}
                fullWidth
              />
              <IconButton onClick={() => handleRemovePayment(idx)} disabled={formData.payments.length === 1}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button onClick={handleAddPayment} startIcon={<AddIcon />} sx={{ mt: 1 }}>
            차수 추가
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Progress; 