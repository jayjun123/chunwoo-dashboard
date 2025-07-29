import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  InputAdornment,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  CloudDownload as CloudDownloadIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { format, addMonths, subMonths } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';
import GisungList from '../components/GisungList';
import GisungStatusTable from '../components/GisungStatusTable';
import GisungStatusPage from '../components/GisungStatusPage';
import * as XLSX from 'xlsx';
import Cost from './Cost';
import { useSearchParams, useLocation } from 'react-router-dom';
import SearchableSiteSelect from '../components/common/SearchableSiteSelect';
import { syncProgressToCost } from '../utils/integrationUtils';

// 핀치 줌 훅
const usePinchZoom = () => {
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const lastDistance = useRef(0);
  const lastCenter = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      isPinching.current = true;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      lastDistance.current = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      lastCenter.current = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching.current) {
      e.preventDefault();
      
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const currentDistance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      const currentCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
      
      if (lastDistance.current > 0) {
        const newScale = scale * (currentDistance / lastDistance.current);
        setScale(Math.max(0.5, Math.min(3, newScale)));
        
        // 줌 중일 때는 패닝을 제한하여 더 자연스러운 동작
        if (Math.abs(currentDistance - lastDistance.current) > 5) {
          const deltaX = currentCenter.x - lastCenter.current.x;
          const deltaY = currentCenter.y - lastCenter.current.y;
          
          setTranslateX(prev => prev + deltaX * 0.5);
          setTranslateY(prev => prev + deltaY * 0.5);
        }
      }
      
      lastDistance.current = currentDistance;
      lastCenter.current = currentCenter;
    }
  };

  const handleTouchEnd = () => {
    isPinching.current = false;
    lastDistance.current = 0;
  };

  const resetZoom = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  return {
    scale,
    translateX,
    translateY,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom
  };
};

// 줌 가능한 차트 래퍼 컴포넌트
const ZoomableChart = ({ children, title, isMobile }) => {
  const { scale, translateX, translateY, handleTouchStart, handleTouchMove, handleTouchEnd, resetZoom } = usePinchZoom();
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (!isMobile || !chartContainerRef.current) {
      return;
    }

    const chartContainer = chartContainerRef.current;
    chartContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
    chartContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
    chartContainer.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      chartContainer.removeEventListener('touchstart', handleTouchStart);
      chartContainer.removeEventListener('touchmove', handleTouchMove);
      chartContainer.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <Paper sx={{ px: isMobile ? 3 : 3, py: isMobile ? 1 : 3, height: '100%', mt: isMobile ? '0px' : 0, position: 'relative' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontSize: isMobile ? '1rem' : 'inherit' }}>{title}</Typography>
        {isMobile && scale !== 1 && (
          <Typography 
            variant="caption" 
            sx={{ 
              cursor: 'pointer', 
              color: 'primary.main',
              textDecoration: 'underline'
            }}
            onClick={resetZoom}
          >
            원래 크기
          </Typography>
        )}
      </Box>
      <Box 
        ref={chartContainerRef}
        className="zoomable-chart-container"
        sx={{ 
          height: 'calc(100% - 60px)',
          overflow: 'hidden',
          position: 'relative',
          touchAction: 'none'
        }}
      >
        <Box
          sx={{
            transform: isMobile ? `scale(${scale}) translate(${translateX}px, ${translateY}px)` : 'none',
            transformOrigin: 'center center',
            transition: isMobile ? 'none' : 'transform 0.3s ease',
            height: '100%',
            width: '100%'
          }}
        >
          {children}
        </Box>
      </Box>
    </Paper>
  );
};

const Progress = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [progressList, setProgressList] = useState([]);
  const [allCostData, setAllCostData] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    payments: [{ label: '1차 기성', amount: '' }],
  });
  const [tab, setTab] = useState('chart');
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
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

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

  // 청구예정 페이지에서 전달받은 현장명과 월 정보 처리
  useEffect(() => {
    if (location.state) {
      const { selectedSite, selectedMonth } = location.state;
      
      if (selectedSite) {
        // 현장명으로 현장 찾기
        const site = sites.find(s => s.name === selectedSite);
        if (site) {
          setFilteredSiteId(site.id);
          setFilteredSiteName(site.name);
          setSelectedSites([site.name]);
          setStatusView('site');
          setTab('gisung');
        }
      }
      
      if (selectedMonth) {
        // 월 정보 파싱 (YYYY-MM 형식)
        const [year, month] = selectedMonth.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        setCurrentMonth(monthDate);
      }
      
      // location state 초기화 (중복 실행 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sites]);

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
      
      // 기성 등록 후 청구예정 상태 업데이트
      await updateClaimStatus(formData.name, currentMonth);
      
      // 기성 → 지출 연동
      if (formData.payments && formData.payments.length > 0) {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        await syncProgressToCost(formData.name, monthStr, formData.payments);
      }
      
      handleClose();
      fetchProgress();
    } catch (e) {
      console.error('기성 데이터 저장 실패:', e);
      alert('저장에 실패했습니다.');
    }
  };

  // 청구예정 상태 업데이트 함수
  const updateClaimStatus = async (siteName, month) => {
    try {
      const monthStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      
      // 해당 현장과 월의 청구예정 찾기
      const claimQuery = query(
        collection(db, 'claims'),
        where('siteName', '==', siteName),
        where('claimMonth', '==', monthStr)
      );
      
      const claimSnapshot = await getDocs(claimQuery);
      
      if (!claimSnapshot.empty) {
        const claimDoc = claimSnapshot.docs[0];
        // 청구여부를 'O'로 업데이트
        await updateDoc(doc(db, 'claims', claimDoc.id), {
          claimStatus: 'O',
          updatedAt: new Date()
        });
        console.log('청구예정 상태가 업데이트되었습니다:', siteName, monthStr);
      }
    } catch (error) {
      console.error('청구예정 상태 업데이트 실패:', error);
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
    
    // 모바일에서는 현재 월이 속한 분기만 표시, PC에서는 전체 12개월 표시
    const currentMonthNum = currentMonth.getMonth() + 1;
    const quarterStartMonth = Math.floor((currentMonthNum - 1) / 3) * 3 + 1;
    const monthsToShow = isMobile ? 3 : 12;
    const startMonth = isMobile ? quarterStartMonth : 1;
    
    for (let i = 0; i < monthsToShow; i++) {
      const month = startMonth + i;
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
  }, [progressList, allCostData, currentMonth, isMobile]);

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



  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  // 각 주요 입력창에 대해 useRef 선언 및 연결
  const inputRef1 = useRef();
  const inputRef2 = useRef();

  return (
    <Box sx={{ 
      p: isMobile ? 0 : 3, 
      width: isMobile ? '100%' : 'calc(100% - 20px)', 
      maxWidth: isMobile ? '100%' : 'calc(100% - 20px)', 
      mx: isMobile ? 0 : '10px',
      mt: isMobile ? '30px' : '50px'
    }}>
      {/* 기성관리, 기성현황, 지출 탭 버튼들 - 모바일에서도 보이게 복구 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3, 
        gap: isMobile ? 1 : 3,
        width: '100%',
        flexDirection: isMobile ? 'column' : 'row',
        mt: isMobile ? '15px' : 0
      }}>
        {/* 왼쪽: 기성관리/기성현황/지출 */}
        <ButtonGroup 
          variant="outlined" 
          size={isMobile ? 'small' : 'medium'}
          sx={{ 
            flex: isMobile ? 1 : 'auto',
            height: isMobile ? '32px' : 'auto',
            width: isMobile ? '100%' : 'auto',
            '& .MuiButton-root': {
              flex: isMobile ? 1 : 'auto',
              minWidth: isMobile ? 0 : 'auto',
              px: isMobile ? 0.5 : 2,
              fontSize: isMobile ? '0.7rem' : 'inherit',
              whiteSpace: 'nowrap',
              lineHeight: 1,
              py: isMobile ? 0.5 : 1,
              height: isMobile ? '32px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }}
        >
          <Button 
            onClick={() => setTab('chart')}
            variant={tab === 'chart' ? 'contained' : 'outlined'}
          >
            기성관리
          </Button>
          <Button 
            onClick={() => setTab('gisung')}
            variant={tab === 'gisung' ? 'contained' : 'outlined'}
          >
            기성현황
          </Button>
          <Button 
            onClick={() => setTab('cost')}
            variant={tab === 'cost' ? 'contained' : 'outlined'}
          >
            지출
          </Button>
        </ButtonGroup>
        {/* 오른쪽: 월별/현장별 */}
        <ButtonGroup 
          variant="outlined" 
          size={isMobile ? 'small' : 'medium'}
          color="success"
          sx={{ 
            flex: isMobile ? 1 : 'auto',
            width: isMobile ? '100%' : 'auto',
            height: isMobile ? '32px' : 'auto',
            '& .MuiButton-root': {
              flex: isMobile ? 1 : 'auto',
              minWidth: isMobile ? 0 : '100px',
              height: isMobile ? '32px' : 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }
          }}
        >
          <Button 
            onClick={() => setStatusView('month')}
            variant={statusView === 'month' ? 'contained' : 'outlined'}
            color="success"
            sx={{ 
              px: isMobile ? 0.5 : 1, 
              fontSize: isMobile ? '0.7rem' : 'inherit',
              flex: isMobile ? 1 : 'auto'
            }}
          >
            월별
          </Button>
          <Button 
            onClick={() => setStatusView('site')}
            variant={statusView === 'site' ? 'contained' : 'outlined'}
            color="success"
            sx={{ 
              px: isMobile ? 0.5 : 1, 
              fontSize: isMobile ? '0.7rem' : 'inherit',
              flex: isMobile ? 1 : 'auto'
            }}
          >
            현장별
          </Button>
        </ButtonGroup>
      </Box>

      {/* 월별탭에서만 월 네비게이션 버튼 노출 (기성현황, 지출 모두) - 모바일에서도 보이게 복구 */}
      {statusView === 'month' && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          mb: 2, 
          gap: isMobile ? 1 : 2,
          width: '100%'
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

      {/* 현장별탭에서만 현장검색 체크박스 노출 - 모바일에서도 보이게 복구 */}
      {statusView === 'site' && (tab === 'chart' || tab === 'gisung' || tab === 'cost') && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, ml: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
          {/* 선택 현장 리스트 (가로, 체크박스 포함) */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
            <Checkbox checked disabled sx={{ p: isMobile ? 0.2 : 0.5, color: '#90caf9' }} />
            <Typography sx={{ color: '#90caf9', fontSize: isMobile ? '0.8rem' : '1rem', fontWeight: 700, mr: 1 }}>
              선택 현장
            </Typography>
            {selectedSites.length > 0 && selectedSites.map(siteName => (
              <Box key={siteName} sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <Checkbox
                  checked={selectedSites.includes(siteName)}
                  onChange={e => {
                    if (e.target.checked) {
                      // 이미 선택된 상태이므로 아무 동작 안 함
                      return;
                    } else {
                      // 체크 해제 시 선택 해제
                      setSelectedSites(selectedSites.filter(name => name !== siteName));
                    }
                  }}
                  sx={{ p: isMobile ? 0.2 : 0.5, color: '#90caf9' }}
                />
                <Typography sx={{ color: '#fff', fontSize: isMobile ? '0.8rem' : '1rem', maxWidth: isMobile ? 60 : 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {siteName.length > (isMobile ? 8 : 10) ? siteName.slice(0, isMobile ? 8 : 10) + '...' : siteName}
                </Typography>
              </Box>
            ))}
            {selectedSites.length === 0 && (
              <Typography sx={{ color: '#bbb', fontSize: isMobile ? '0.8rem' : '1rem' }}>없음</Typography>
            )}
          </Box>
          
          {/* 현장명 검색 드롭다운 */}
          <Box sx={{ minWidth: isMobile ? 200 : 300 }}>
            <SearchableSiteSelect
              sites={sites}
              value=""
              onChange={(selectedSite) => {
                // selectedSite가 객체인 경우 name만 추출
                const siteName = typeof selectedSite === 'string' ? selectedSite : selectedSite?.name;
                if (siteName && !selectedSites.includes(siteName)) {
                  if (selectedSites.length >= 4) {
                    alert('현장은 최대 4개까지 선택할 수 있습니다.');
                    return;
                  }
                  setSelectedSites([...selectedSites, siteName]);
                }
              }}
              label=""
              placeholder="현장명 검색..."
              size="small"
              isMobile={isMobile}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  py: isMobile ? 0.5 : 1,
                }
              }}
            />
          </Box>

        </Box>
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
      {statusView === 'month' && tab === 'chart' && (
        // 월별+기성관리 차트/데이터
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3, width: '100%' }}>
          {/* 모바일에서 차트 위 제목 */}
          {isMobile && (
            <Grid item xs={12}>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontSize: '1.08rem', 
                  color: '#90caf9',
                  textAlign: 'center',
                  width: '100%',
                  mt: 2,
                  ml: '20px'
                }}
              >
                {currentMonth.getFullYear()}년 {Math.floor((currentMonth.getMonth()) / 3) + 1}분기 기성현황
              </Typography>
            </Grid>
          )}
          {/* 차트 전체 화면 */}
          <Grid item xs={12}>
            <ZoomableChart title={isMobile 
              ? `${currentMonth.getFullYear()}년 ${Math.floor((currentMonth.getMonth()) / 3) + 1}분기`
              : `${currentMonth.getFullYear()}년 월별 기성 및 지출 현황`
            } isMobile={isMobile}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  {isMobile && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: '80px', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => {
                          const currentQuarter = Math.floor((currentMonth.getMonth()) / 3);
                          const prevQuarter = currentQuarter - 1;
                          const prevYear = currentMonth.getFullYear();
                          const newYear = prevQuarter < 0 ? prevYear - 1 : prevYear;
                          const newQuarter = prevQuarter < 0 ? 3 : prevQuarter;
                          const newMonth = newQuarter * 3; // 분기 시작 월 (0-based)
                          setCurrentMonth(new Date(newYear, newMonth, 1));
                        }}
                        sx={{ fontSize: '0.65rem', px: 0.2, py: 0.2, minWidth: 32, width: 'auto' }}
                      >
                        이전
                      </Button>
                      <Typography 
                        sx={{ 
                          fontWeight: 700, 
                          color: '#90caf9', 
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.8rem',
                          bgcolor: '#232b3b',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {Math.floor((currentMonth.getMonth()) / 3) + 1}분기
                      </Typography>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => {
                          const currentQuarter = Math.floor((currentMonth.getMonth()) / 3);
                          const nextQuarter = currentQuarter + 1;
                          const nextYear = currentMonth.getFullYear();
                          const newYear = nextQuarter > 3 ? nextYear + 1 : nextYear;
                          const newQuarter = nextQuarter > 3 ? 0 : nextQuarter;
                          const newMonth = newQuarter * 3; // 분기 시작 월 (0-based)
                          setCurrentMonth(new Date(nextYear, newMonth, 1));
                        }}
                        sx={{ fontSize: '0.65rem', px: 0.2, py: 0.2, minWidth: 32, width: 'auto' }}
                      >
                        다음
                      </Button>
                    </Box>
                  )}
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={isMobile ? 300 : 500} minWidth={isMobile ? 320 : 1390} minHeight={isMobile ? 200 : 400} style={{ margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
                <BarChart
                  data={getMonthChartData}
                  margin={{ top: 20, right: 30, left: isMobile ? 0 : 20, bottom: 20 }}
                  barCategoryGap={24}
                >
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => {
                      if (value >= 100000000) {
                        return `${(value / 100000000).toFixed(1)}억`;
                      } else if (value >= 10000) {
                        return `${(value / 10000).toFixed(0)}만원`;
                      } else {
                        return value.toLocaleString();
                      }
                    }}
                    tick={{ fontSize: isMobile ? 12 : 14 }}
                  />
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
            </ZoomableChart>
          </Grid>
        </Grid>
      )}
      {statusView === 'site' && tab === 'chart' && (
        // 현장별+기성관리 차트/데이터(선택된 현장만)
        <Grid container spacing={2} alignItems="stretch" sx={{ mb: 3, width: '100%' }}>
          {/* 차트 전체 화면 */}
          <Grid item xs={12}>
            <ZoomableChart title="현장별 기성/지출 현황" isMobile={isMobile}>
              <ResponsiveContainer width="100%" height={isMobile ? 300 : 500} minWidth={isMobile ? 360 : 1390} minHeight={isMobile ? 200 : 400} style={{ margin: '0 auto', display: 'flex', justifyContent: 'center' }}>
                <BarChart
                  data={getSiteChartData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                  barCategoryGap={24}
                >
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => {
                      if (value >= 100000000) {
                        return `${(value / 100000000).toFixed(1)}억`;
                      } else if (value >= 10000) {
                        return `${(value / 10000).toFixed(0)}만원`;
                      } else {
                        return value.toLocaleString();
                      }
                    }}
                    tick={{ fontSize: isMobile ? 12 : 14 }}
                  />
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
            </ZoomableChart>
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
          {/* 현장명(공사명) 검색 드롭다운: 현장관리 데이터 연동 */}
          <SearchableSiteSelect
            sites={filteredSites}
            value={formData.name}
            onChange={(newValue) => setFormData({ ...formData, name: newValue })}
            label="공사명"
            placeholder="현장명을 검색하세요"
            fullWidth
            isMobile={isMobile}
            sx={{ mb: 2 }}
          />
          <TextField
            label="계약금액"
            value={formData.contractAmount}
            onChange={e => setFormData({ ...formData, contractAmount: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
            inputRef={inputRef2}
            onFocus={scrollFocus(inputRef2)}
          />
          {formData.payments.map((p, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label={p.label}
                value={p.amount}
                onChange={e => handleChangePayment(idx, 'amount', e.target.value.replace(/[^0-9]/g, ''))}
                fullWidth
                onFocus={() => {
                  setTimeout(() => {
                    const element = document.querySelector(`input[value="${p.amount}"]`);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 300);
                }}
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