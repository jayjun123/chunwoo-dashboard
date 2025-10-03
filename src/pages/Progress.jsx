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
  Clear as ClearIcon,
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
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import SearchableSiteSelect from '../components/common/SearchableSiteSelect';
import { syncProgressToCost } from '../utils/integrationUtils';
import { generateDocumentExcel } from '../utils/materialUploadUtils.jsx';

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
    <Paper sx={{ px: isMobile ? 1 : 2, py: isMobile ? 1 : 2, height: '100%', mt: isMobile ? '0px' : 0, position: 'relative', width: '100%', maxWidth: 'none' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%', maxWidth: 'none' }}>
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
  const navigate = useNavigate();
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
  const [searchTerm, setSearchTerm] = useState('');
  // 월 상태 관리
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  // 강제 리렌더링을 위한 상태
  const [forceUpdate, setForceUpdate] = useState(0);
  // 월 이동 함수
  const handlePrevMonth = () => {
    console.log('이전달 클릭 - 현재:', currentMonth);
    const newMonth = subMonths(currentMonth, 1);
    console.log('이전달 변경됨:', newMonth);
    setCurrentMonth(newMonth);
    // 즉시 데이터 재로드
    fetchProgress();
    fetchCosts();
    // 강제 리렌더링
    setForceUpdate(prev => prev + 1);
  };
  const handleNextMonth = () => {
    console.log('다음달 클릭 - 현재:', currentMonth);
    const newMonth = addMonths(currentMonth, 1);
    console.log('다음달 변경됨:', newMonth);
    setCurrentMonth(newMonth);
    // 즉시 데이터 재로드
    fetchProgress();
    fetchCosts();
    // 강제 리렌더링
    setForceUpdate(prev => prev + 1);
  };
  const handleThisMonth = () => {
    console.log('이번달 클릭');
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    setCurrentMonth(thisMonth);
    // 즉시 데이터 재로드
    fetchProgress();
    fetchCosts();
    // 강제 리렌더링
    setForceUpdate(prev => prev + 1);
  };
  // 월 텍스트
  const monthText = `${currentMonth.getFullYear()}년 ${String(currentMonth.getMonth() + 1).padStart(2, '0')}월`;
  const [sites, setSites] = useState([]);
  // 현장별 검색 상태 추가
  const [selectedSites, setSelectedSites] = useState([]);
  const [siteSearchTerm, setSiteSearchTerm] = useState('');
  const [filteredSiteId, setFilteredSiteId] = useState(null);
  const [filteredSiteName, setFilteredSiteName] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // 탭 상태 변화 추적
  useEffect(() => {
    console.log('탭 상태 변화:', { tab, statusView });
  }, [tab, statusView]);

  // URL 파라미터와 navigate state에서 siteId와 viewMode 읽기
  useEffect(() => {
    // 청구예정에서 navigate로 온 경우는 이 useEffect에서 처리하지 않음
    if (location.state && location.state.fromPage === 'claims') {
      console.log('🔍 청구예정에서 온 경우 - 이 useEffect에서 처리하지 않음');
      return;
    }
    
    const siteId = searchParams.get('siteId');
    const viewMode = searchParams.get('viewMode');
    const autoSelect = searchParams.get('autoSelect');
    
    console.log('🔍 URL 파라미터 확인:', { siteId, viewMode, autoSelect });
    console.log('🔍 navigate state 확인:', location.state);
    
    // 현장 선택 해제 상태를 추적하는 플래그
    const isClearingSelection = sessionStorage.getItem('clearingSiteSelection') === 'true';
    
    if (isClearingSelection) {
      // 현장 선택 해제 중이면 URL 파라미터를 무시
      console.log('🔍 현장 선택 해제 중 - URL 파라미터 무시');
      sessionStorage.removeItem('clearingSiteSelection');
      return;
    }
    
    // sites 배열이 로드된 후에만 처리
    if (sites.length === 0) {
      console.log('⏳ sites 배열이 아직 로드되지 않음. 대기 중...');
      return;
    }
    
    // SiteInfoPopup에서 온 경우 특별 처리
    if (location.state && location.state.fromSiteInfo && location.state.autoSelectSite) {
      console.log('🔍 SiteInfoPopup에서 온 경우 - 현장 자동 선택');
      const { selectedSiteId, selectedSiteName } = location.state;
      
      if (selectedSiteId && selectedSiteName) {
        setFilteredSiteId(selectedSiteId);
        setFilteredSiteName(selectedSiteName);
        setSelectedSites([selectedSiteName]);
        
        // 현장별 뷰로 강제 설정
        console.log('🔄 SiteInfoPopup에서 왔으므로 현장별 뷰로 강제 설정');
        setStatusView('site');
        setTab('gisung'); // 기성현황 탭으로 전환
        
        // 강제로 현장별 뷰 유지
        setTimeout(() => {
          if (statusView !== 'site' || tab !== 'gisung') {
            console.log('⚠️ 뷰가 덮어써짐. 강제로 현장별 뷰로 복원');
            setStatusView('site');
            setTab('gisung');
          }
        }, 100);
        
        return; // SiteInfoPopup에서 온 경우는 여기서 처리 완료
      }
    }
    
    // URL 파라미터 처리 (기존 로직)
    if (siteId) {
      setFilteredSiteId(siteId);
      // 해당 현장 정보 찾기
      const site = sites.find(s => s.id === siteId);
      if (site) {
        console.log('✅ URL 파라미터에서 현장 찾음:', site.name);
        setFilteredSiteName(site.name);
        setSelectedSites([site.name]);
        
        // 현장별 뷰로 강제 설정
        console.log('🔄 현장별 뷰로 강제 설정');
        setStatusView('site');
        setTab('gisung'); // 기성현황 탭으로 전환
        
        // 현장별 뷰 유지 강제
        setTimeout(() => {
          if (statusView !== 'site' || tab !== 'gisung') {
            console.log('⚠️ 뷰가 덮어써짐. 강제로 현장별 뷰로 복원');
            setStatusView('site');
            setTab('gisung');
          }
        }, 100);
      } else {
        console.log('⚠️ 현장을 찾을 수 없음:', siteId);
      }
    } else if (!siteId && selectedSites.length > 0 && !sessionStorage.getItem('userSelectedSite')) {
      // URL에 siteId가 없고, 사용자가 직접 선택한 현장이 아닌 경우에만 초기화
      console.log('🔍 URL에 siteId 없음 - 현장 선택 초기화');
      setSelectedSites([]);
      setFilteredSiteId(null);
      setFilteredSiteName('');
    }
  }, [searchParams, sites, location.state]);

  // 청구예정 페이지에서 전달받은 현장명과 월 정보 처리
  useEffect(() => {
    if (location.state && sites.length > 0) {
      const { selectedSite, selectedMonth, fromPage } = location.state;
      
      if (selectedSite) {
        // 현장명으로 현장 찾기
        const site = sites.find(s => s.name === selectedSite);
        if (site) {
          console.log('🔍 청구예정 useEffect에서 현장 설정:', site.name);
          setFilteredSiteId(site.id);
          setFilteredSiteName(site.name);
          setSelectedSites([site.name]);
          
          // 청구예정에서 왔으면 강제로 현장별 뷰 설정
          if (fromPage === 'claims') {
            console.log('🔄 청구예정에서 왔으므로 강제로 현장별 뷰 설정');
            setStatusView('site');
            setTab('gisung');
            
            // 강제로 현장별 뷰 유지 (다른 로직에 의해 덮어써지지 않도록)
            const checkAndRestoreView = () => {
              if (statusView !== 'site' || tab !== 'gisung') {
                console.log('⚠️ 뷰가 덮어써짐. 강제로 현장별 뷰로 복원');
                setStatusView('site');
                setTab('gisung');
              }
            };
            
            // 여러 번 체크하여 뷰 유지
            setTimeout(checkAndRestoreView, 100);
            setTimeout(checkAndRestoreView, 300);
            setTimeout(checkAndRestoreView, 500);
          }
        }
      }
      
      if (selectedMonth) {
        // 월 정보 파싱 (YYYY-MM 형식)
        const [year, month] = selectedMonth.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        setCurrentMonth(monthDate);
        console.log('✅ 청구예정 useEffect에서 월 설정:', monthDate);
      }
      
      // location state 초기화 (중복 실행 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sites, statusView, tab]);

  // 현장 검색 필터링
  const filteredSites = useMemo(() => {
    if (!siteSearchTerm) return sites;
    return sites.filter(site => 
      site.name.toLowerCase().includes(siteSearchTerm.toLowerCase())
    );
  }, [sites, siteSearchTerm]);

  // 초기 데이터 로딩 및 현장 선택 변경 시 데이터 재로드
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchProgress();
      await fetchSites();
      await fetchCosts();
    };
    loadInitialData();
  }, [selectedSites.length, forceUpdate]); // selectedSites.length만 의존성으로 사용

  // 탭 변경 시 데이터 재로드
  useEffect(() => {
    const reloadData = async () => {
      await fetchProgress();
      await fetchCosts();
    };
    reloadData();
  }, [tab, statusView, forceUpdate]); // 탭이나 뷰가 변경될 때마다 데이터 재로드

  // 월 변경 시 데이터 재로드
  useEffect(() => {
    const reloadData = async () => {
      await fetchProgress();
      await fetchCosts();
    };
    reloadData();
  }, [currentMonth, forceUpdate]); // currentMonth 객체 자체를 의존성으로 사용


  
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
        name: item?.name,
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
        // 실시간 구독으로 대체됨
      } catch (e) {
        console.error('기성 데이터 삭제 실패:', e);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  // 현장 선택 해제 함수
  const clearSiteSelection = () => {
    console.log('🔍 현장 선택 해제 버튼 클릭');
    
    // 현장 선택 해제 플래그 설정
    sessionStorage.setItem('clearingSiteSelection', 'true');
    
    setSelectedSites([]);
    setFilteredSiteId(null);
    setFilteredSiteName('');
    setSiteSearchTerm('');
    setSearchDropdownOpen(false);
    
    // URL에서 siteId와 viewMode 파라미터 제거
    const url = new URL(window.location);
    url.searchParams.delete('siteId');
    url.searchParams.delete('viewMode');
    window.history.replaceState({}, document.title, url.pathname);
    console.log('✅ URL 파라미터 제거 완료:', url.pathname);
    
    // 즉시 데이터 재로드
    fetchProgress();
    fetchCosts();
    // 강제 리렌더링
    setForceUpdate(prev => prev + 1);
  };

  // 계산
  const getTotalPayment = (payments) => {
    return payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  // 차트 데이터 계산 - 현장별 기성관리용
  const getSiteChartData = useMemo(() => {
    // 월별 뷰에서는 현장 선택과 관계없이 모든 현장 데이터 표시
    if (statusView === 'month') {
      return sites.map(site => {
        const siteName = site.name;
        // 기성 데이터에서 해당 현장의 데이터 필터링
        const siteGisungData = progressList.filter(item => item?.name === siteName);
        const totalContract = siteGisungData.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
        const totalGisung = siteGisungData
          .filter(item => item.claimStatus === '청구완료')
          .reduce((sum, item) => {
            if (item.payments) {
              return sum + item.payments.reduce((pSum, payment) => pSum + (parseFloat(payment.amount) || 0), 0);
            }
            return sum + (parseFloat(item.gisungAmount) || 0);
          }, 0);
        
        // 선급금을 기성금에 포함
        const siteData = sites.find(site => site.name === siteName);
        const advanceAmount = Number(siteData?.advance || 0);
        const totalWithAdvance = totalGisung + advanceAmount;
        
        // 지출 데이터에서 해당 현장의 데이터 필터링
        const siteCostData = allCostData.filter(cost => cost.site === siteName);
        
        // 자재비: 자재비, 부자재, 운반비
        const totalMaterial = siteCostData
          .filter(cost => ['자재비', '부자재', '운반비'].includes(cost.itemType))
          .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
        
        // 노무비: 노무비만
        const totalLabor = siteCostData
          .filter(cost => cost.itemType === '노무비')
          .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
        
        // 장비비: 스카이, 장비, 지게차, 곤도라
        const totalEquipment = siteCostData
          .filter(cost => ['스카이', '장비', '지게차', '곤도라'].includes(cost.itemType))
          .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
        
        // 경비: 유류비, 임대료, 식대, 월세
        const totalExpense = siteCostData
          .filter(cost => ['유류비', '임대료', '식대', '월세'].includes(cost.itemType))
          .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
        
        // 기타: RnD, 기타
        const totalEtc = siteCostData
          .filter(cost => ['RnD', '기타'].includes(cost.itemType))
          .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
        
        // 입금완료 금액 계산 (기성 데이터에서 paymentStatus가 '입금완료'인 항목들)
        const totalPaidGisung = siteGisungData
          .filter(item => item.paymentStatus === '입금완료')
          .reduce((sum, item) => sum + (parseFloat(item.gisungAmount) || 0), 0);
        
        const result = {
          name: siteName,
          '계약금': totalContract,
          '기성금': totalWithAdvance, // 선급금 포함
          '입금완료': totalPaidGisung,
          '자재비': totalMaterial,
          '노무비': totalLabor,
          '장비비': totalEquipment,
          '경비': totalExpense,
          '기타': totalEtc,
        };
        
        return result;
      });
    }
    
    // 현장별 뷰에서는 선택된 현장만 표시
    if (selectedSites.length === 0) return [];
    
    return selectedSites.map(siteName => {
      // 기성 데이터에서 해당 현장의 데이터 필터링
      const siteGisungData = progressList.filter(item => item.name === siteName);
      const totalContract = siteGisungData.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
      const totalGisung = siteGisungData
        .filter(item => item.claimStatus === '청구완료')
        .reduce((sum, item) => {
          if (item.payments) {
            return sum + item.payments.reduce((pSum, payment) => pSum + (parseFloat(payment.amount) || 0), 0);
          }
          return sum + (parseFloat(item.gisungAmount) || 0);
        }, 0);
      
      // 선급금을 기성금에 포함
      const siteData = sites.find(site => site.name === siteName);
      const advanceAmount = Number(siteData?.advance || 0);
      const totalWithAdvance = totalGisung + advanceAmount;
      
      // 지출 데이터에서 해당 현장의 데이터 필터링
      const siteCostData = allCostData.filter(cost => cost.site === siteName);
      
      // 자재비: 자재비, 부자재, 운반비
      const totalMaterial = siteCostData
        .filter(cost => ['자재비', '부자재', '운반비'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 노무비: 노무비만
      const totalLabor = siteCostData
        .filter(cost => cost.itemType === '노무비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 장비비: 스카이, 장비, 지게차, 곤도라
      const totalEquipment = siteCostData
        .filter(cost => ['스카이', '장비', '지게차', '곤도라'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 경비: 유류비, 임대료, 식대, 월세
      const totalExpense = siteCostData
        .filter(cost => ['유류비', '임대료', '식대', '월세'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 기타: RnD, 기타
      const totalEtc = siteCostData
        .filter(cost => ['RnD', '기타'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 입금완료 금액 계산 (기성 데이터에서 paymentStatus가 '입금완료'인 항목들)
      const totalPaidGisung = siteGisungData
        .filter(item => item.paymentStatus === '입금완료')
        .reduce((sum, item) => sum + (parseFloat(item.gisungAmount) || 0), 0);
      
      const result = {
        name: siteName,
        '계약금': totalContract,
        '기성금': totalWithAdvance, // 선급금 포함
        '입금완료': totalPaidGisung,
        '자재비': totalMaterial,
        '노무비': totalLabor,
        '장비비': totalEquipment,
        '경비': totalExpense,
        '기타': totalEtc,
      };
      
      return result;
    });
  }, [progressList, allCostData, selectedSites, statusView, sites]);

  // 차트 데이터 계산 - 월별 기성관리용
  const getMonthChartData = useMemo(() => {
    const monthData = [];
    
    // 현재 선택된 월을 기준으로 계산
    const currentYear = currentMonth.getFullYear();
    const currentMonthNum = currentMonth.getMonth() + 1;
    
    // 모바일에서는 현재 월이 속한 분기만 표시, PC에서는 전체 12개월 표시
    const quarterStartMonth = Math.floor((currentMonthNum - 1) / 3) * 3 + 1;
    const monthsToShow = isMobile ? 3 : 12;
    const startMonth = isMobile ? quarterStartMonth : 1;
    
    for (let i = 0; i < monthsToShow; i++) {
      const month = startMonth + i;
      const monthStr = `${currentYear}-${String(month).padStart(2, '0')}`;
      
      // 기성 데이터에서 해당 월의 데이터 필터링
      const monthGisungData = progressList.filter(item => {
        // gisungMonth가 있는 경우 (기성현황 데이터)
        if (item.gisungMonth) {
          return item.gisungMonth === monthStr;
        }
        // payments가 있는 경우 (기성관리 데이터)
        if (item.payments && item.payments.length > 0) {
          return item.payments.some(payment => {
            if (payment.date) {
              const paymentDate = new Date(payment.date);
              return paymentDate.getFullYear() === currentYear && 
                     paymentDate.getMonth() + 1 === month;
            }
            return false;
          });
        }
        // createdDate가 있는 경우
        if (item.createdDate) {
          const createdDate = new Date(item.createdDate);
          return createdDate.getFullYear() === currentYear && 
                 createdDate.getMonth() + 1 === month;
        }
        return false;
      });
      
      const totalContract = monthGisungData.reduce((sum, item) => sum + (parseFloat(item.contractAmount) || 0), 0);
      const totalGisung = monthGisungData
        .filter(item => item.claimStatus === '청구완료')
        .reduce((sum, item) => {
          if (item.payments) {
            return sum + item.payments.reduce((pSum, payment) => pSum + (parseFloat(payment.amount) || 0), 0);
          }
          return sum + (parseFloat(item.gisungAmount) || 0);
        }, 0);
      
      // 입금완료 금액 계산
      const totalPaidGisung = monthGisungData
        .filter(item => item.paymentStatus === '입금완료')
        .reduce((sum, item) => sum + (parseFloat(item.gisungAmount) || 0), 0);
      
      // 지출 데이터에서 해당 월의 데이터 필터링
      const monthCostData = allCostData.filter(cost => {
        if (cost.date) {
          const costDate = new Date(cost.date);
          return costDate.getFullYear() === currentYear && 
                 costDate.getMonth() + 1 === month;
        }
        return false;
      });
      
      // 자재비: 자재비, 부자재, 운반비
      const totalMaterial = monthCostData
        .filter(cost => ['자재비', '부자재', '운반비'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 노무비: 노무비만
      const totalLabor = monthCostData
        .filter(cost => cost.itemType === '노무비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 장비비: 스카이, 장비, 지게차, 곤도라
      const totalEquipment = monthCostData
        .filter(cost => ['스카이', '장비', '지게차', '곤도라'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 경비: 유류비, 임대료, 식대, 월세
      const totalExpense = monthCostData
        .filter(cost => ['유류비', '임대료', '식대', '월세'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      // 기타: RnD, 기타
      const totalEtc = monthCostData
        .filter(cost => ['RnD', '기타'].includes(cost.itemType))
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      monthData.push({
        name: `${month}월`,
        '기성금': totalGisung,
        '입금완료': totalPaidGisung,
        '자재비': totalMaterial,
        '노무비': totalLabor,
        '장비비': totalEquipment,
        '경비': totalExpense,
        '기타': totalEtc,
      });
    }
    
    console.log('월별 차트 데이터 계산 완료:', {
      currentYear,
      currentMonthNum,
      startMonth,
      monthsToShow,
      monthData
    });
    
    return monthData;
  }, [progressList, allCostData, currentMonth, isMobile]);

  // 필터링된 기성 데이터 - 현장별
  const getFilteredGisungData = useMemo(() => {
    // 월별 뷰에서는 현장 선택과 관계없이 모든 데이터 표시
    if (statusView === 'month') {
      console.log('월별 뷰 - 모든 기성 데이터 표시');
      return progressList;
    }
    
    // 현장별 뷰에서 현장이 선택되지 않은 경우 빈 배열 반환
    if (selectedSites.length === 0) {
      console.log('현장 미선택 - 기성 데이터 없음');
      return [];
    }
    
    // 전체선택인지 확인
    const isAllSelected = selectedSites.some(site => {
      if (typeof site === 'string') {
        return site === '전체선택' || site === 'all';
      }
      if (site && typeof site === 'object') {
        return site.name === '전체선택' || site.id === 'all';
      }
      return false;
    });
    
    if (isAllSelected) {
      console.log('전체선택 - 모든 기성 데이터 표시');
      return progressList; // 전체선택이 있으면 모든 데이터 표시
    }
    
    // 특정 현장이 선택된 경우 해당 현장만 필터링
    console.log('특정 현장 선택됨 - 기성 필터링 적용');
    return progressList.filter(item => {
      const isSelected = selectedSites.some(selectedSite => {
        // 문자열인 경우 (현장명)
        if (typeof selectedSite === 'string') {
          return item?.name === selectedSite || item.siteId === selectedSite;
        }
        // 객체인 경우 (현장 객체)
        if (selectedSite && typeof selectedSite === 'object') {
          return item?.name === selectedSite.name || item.siteId === selectedSite.id;
        }
        return false;
      });
      
      console.log('기성 데이터 체크:', {
        itemName: item?.name,
        itemSiteId: item.siteId,
        selectedSites: selectedSites,
        isSelected: isSelected
      });
      return isSelected;
    });
  }, [progressList, selectedSites, statusView]);

  // 필터링된 지출 데이터 - 현장별
  const getFilteredCostData = useMemo(() => {
    // 월별 뷰에서는 현장 선택과 관계없이 모든 데이터 표시
    if (statusView === 'month') {
      console.log('월별 뷰 - 모든 지출 데이터 표시');
      return allCostData;
    }
    
    // 현장별 뷰에서 현장이 선택되지 않은 경우 빈 배열 반환
    if (selectedSites.length === 0) {
      console.log('현장 미선택 - 지출 데이터 없음');
      return [];
    }
    
    // 전체선택인지 확인
    const isAllSelected = selectedSites.some(site => {
      if (typeof site === 'string') {
        return site === '전체선택' || site === 'all';
      }
      if (site && typeof site === 'object') {
        return site.name === '전체선택' || site.id === 'all';
      }
      return false;
    });
    
    if (isAllSelected) {
      console.log('전체선택 - 모든 지출 데이터 표시');
      return allCostData; // 전체선택이 있으면 모든 데이터 표시
    }
    
    // 특정 현장이 선택된 경우 해당 현장만 필터링
    console.log('특정 현장 선택됨 - 지출 필터링 적용');
    return allCostData.filter(cost => {
      const isSelected = selectedSites.some(selectedSite => {
        // 문자열인 경우 (현장명)
        if (typeof selectedSite === 'string') {
          return cost.site === selectedSite || cost.siteId === selectedSite;
        }
        // 객체인 경우 (현장 객체)
        if (selectedSite && typeof selectedSite === 'object') {
          return cost.site === selectedSite.name || cost.siteId === selectedSite.id;
        }
        return false;
      });
      
      console.log('지출 데이터 체크:', {
        costSite: cost.site,
        costSiteId: cost.siteId,
        selectedSites: selectedSites,
        isSelected: isSelected
      });
      return isSelected;
    });
  }, [allCostData, selectedSites, statusView]);

  // 필터링된 기성 데이터 - 월별
  const getFilteredGisungDataByMonth = useMemo(() => {
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    let filtered = progressList.filter(item => {
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

    // 검색어 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchLower) ||
        item.contractAmount?.toString().includes(searchLower) ||
        item.gisungAmount?.toString().includes(searchLower) ||
        item.claimStatus?.toLowerCase().includes(searchLower) ||
        item.paymentStatus?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [progressList, currentMonth, searchTerm]);

  // 필터링된 지출 데이터 - 월별
  const getFilteredCostDataByMonth = useMemo(() => {
    let filtered = allCostData.filter(cost => {
      if (cost.date) {
        const costDate = new Date(cost.date);
        return costDate.getFullYear() === currentMonth.getFullYear() && 
               costDate.getMonth() + 1 === currentMonth.getMonth() + 1;
      }
      return false;
    });

    // 검색어 필터링
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(cost => 
        cost.site?.toLowerCase().includes(searchLower) ||
        cost.itemType?.toLowerCase().includes(searchLower) ||
        cost.totalValue?.toString().includes(searchLower) ||
        cost.description?.toLowerCase().includes(searchLower) ||
        cost.paymentType?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [allCostData, currentMonth, searchTerm]);

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

  // 엑셀 다운로드 함수 구현 (기성금청구서 템플릿 사용)
  const handleExcelDownload = async () => {
    try {
      console.log('📊 Progress.jsx 엑셀 다운로드 시작');
      
      // progressList 유효성 검사
      if (!progressList || !Array.isArray(progressList)) {
        console.error('❌ progressList 데이터가 유효하지 않습니다:', progressList);
        alert('진행 현황 데이터를 불러올 수 없습니다.');
        return;
      }

      // selectedSites 유효성 검사
      let validSelectedSites = selectedSites;
      if (!validSelectedSites || !Array.isArray(validSelectedSites)) {
        console.warn('⚠️ selectedSites가 유효하지 않습니다:', validSelectedSites);
        // selectedSites가 없으면 빈 배열로 처리
        validSelectedSites = [];
      }

      // 필터링된 데이터 준비
      const filteredData = progressList
        .filter(row => {
          if (!row || typeof row !== 'object') {
            console.warn('⚠️ 유효하지 않은 행 데이터:', row);
            return false;
          }
          return validSelectedSites.length === 0 || validSelectedSites.includes(row.name);
        });

      if (filteredData.length === 0) {
        console.warn('⚠️ 다운로드할 데이터가 없습니다.');
        alert('다운로드할 데이터가 없습니다.');
        return;
      }

      // 첫 번째 현장 데이터로 기성금청구서 생성
      const firstRow = filteredData[0];
      if (!firstRow || typeof firstRow !== 'object') {
        console.error('❌ 첫 번째 행 데이터가 유효하지 않습니다:', firstRow);
        alert('현장 데이터가 유효하지 않습니다.');
        return;
      }

      const siteData = {
        name: firstRow.name || '현장명없음',
        contractAmount: Number(firstRow.contractAmount || 0),
        manager: firstRow.manager || '',
        company: firstRow.company || '',
        contractor: firstRow.company || '',
        startDate: firstRow.startDate || '',
        endDate: firstRow.endDate || '',
        advance: Number(firstRow.advance || 0)
      };
      
      const gisungData = Array.isArray(firstRow.payments) ? firstRow.payments : [];
      const siteItems = Array.isArray(firstRow.items) ? firstRow.items : [];
      
      console.log('🔍 Progress.jsx 디버깅:');
      console.log('📊 firstRow:', firstRow);
      console.log('📊 firstRow.items:', firstRow.items);
      console.log('📊 siteItems:', siteItems);
      console.log('📊 siteItems.length:', siteItems.length);
      
      // generateDocumentExcel 함수 존재 확인
      if (typeof generateDocumentExcel !== 'function') {
        console.error('❌ generateDocumentExcel 함수가 정의되지 않았습니다.');
        alert('기성금청구서 생성 함수를 찾을 수 없습니다.');
        return;
      }
      
      // 기성금청구서 생성 시작 메시지
      const templateTypeText = firstRow.templateType === 'L' ? 'LONG' : 'NEW';
      setLoadingMessage(`열심히 제작중에 있습니다.\n기성금청구서 [${templateTypeText}]을 생산하고 있습니다.`);
      
      // 기성금청구서 생성 (통합 함수 사용)
      const materialData = { items: siteItems };
      console.log('🚀 generateDocumentExcel 호출 시작');
      console.log('📊 siteData:', siteData);
      console.log('📊 materialData:', materialData);
      
      const result = await generateDocumentExcel(siteData, materialData, '기성금청구서');
      
      if (!result) {
        console.error('❌ generateDocumentExcel이 undefined를 반환했습니다.');
        alert('기성금청구서 생성에 실패했습니다.');
        return;
      }
      
      if (!result.success) {
        console.error('❌ 기성금청구서 생성 실패:', result.error);
        throw new Error(result.error || '기성금청구서 생성 실패');
      }
      
      console.log('✅ 기성금청구서 다운로드 완료');
      alert('기성금청구서가 다운로드되었습니다!');
    } catch (error) {
      console.error('❌ 기성금청구서 다운로드 실패:', error);
      console.error('❌ 오류 상세:', error.stack);
      
      // 사용자에게 더 친화적인 오류 메시지 제공
      let errorMessage = '기성금청구서 다운로드에 실패했습니다.';
      if (error.message.includes('템플릿')) {
        errorMessage = '템플릿 파일을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('Firebase')) {
        errorMessage = '데이터를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('Excel')) {
        errorMessage = '엑셀 파일 생성 중 오류가 발생했습니다. 다시 시도해주세요.';
      } else if (error.message.includes('Cannot read properties of undefined')) {
        errorMessage = '데이터 처리 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.';
      }
      
      alert(errorMessage + '\n\n오류: ' + error.message);
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

        {/* 기성관리/기성현황/지출 버튼들 */}
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
            onClick={() => {
              console.log('기성관리 탭 클릭 - 현재 탭:', tab);
              setTab('chart');
              // 즉시 데이터 재로드
              fetchProgress();
              fetchCosts();
              // 강제 리렌더링
              setForceUpdate(prev => prev + 1);
            }}
            variant={tab === 'chart' ? 'contained' : 'outlined'}
          >
            기성관리
          </Button>
          <Button 
            onClick={() => {
              console.log('기성현황 탭 클릭 - 현재 탭:', tab);
              setTab('gisung');
              // 즉시 데이터 재로드
              fetchProgress();
              fetchCosts();
              // 강제 리렌더링
              setForceUpdate(prev => prev + 1);
            }}
            variant={tab === 'gisung' ? 'contained' : 'outlined'}
          >
            기성현황
          </Button>
          <Button 
            onClick={() => {
              console.log('지출 탭 클릭 - 현재 탭:', tab);
              setTab('cost');
              // 즉시 데이터 재로드
              fetchProgress();
              fetchCosts();
              // 강제 리렌더링
              setForceUpdate(prev => prev + 1);
            }}
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
            onClick={() => {
              setStatusView('month');
              // 즉시 데이터 재로드
              fetchProgress();
              fetchCosts();
              // 강제 리렌더링
              setForceUpdate(prev => prev + 1);
            }}
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
            onClick={() => {
              setStatusView('site');
              // 즉시 데이터 재로드
              fetchProgress();
              fetchCosts();
              // 강제 리렌더링
              setForceUpdate(prev => prev + 1);
            }}
            variant={statusView === 'site' ? 'contained' : 'outlined'}
            color="success"
            sx={{ 
              px: isMobile ? 0.5 : 0.5, 
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
            <Typography 
              sx={{ 
                color: '#90caf9', 
                fontSize: isMobile ? '0.8rem' : '1rem', 
                fontWeight: 700, 
                mr: 1,
                cursor: 'pointer',
                '&:hover': {
                  textDecoration: 'underline',
                  color: '#64b5f6'
                }
              }}
              onClick={() => {
                console.log('선택 현장 클릭 - 모든 선택 해제');
                setSelectedSites([]);
              }}
            >
              선택 현장
            </Typography>
            {selectedSites.length > 0 && selectedSites.map(siteName => (
              <Box key={siteName} sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                <Checkbox
                  checked={selectedSites.includes(siteName)}
                  onChange={e => {
                    console.log('체크박스 변경:', { siteName, checked: e.target.checked, currentSelectedSites: selectedSites });
                    
                    if (e.target.checked) {
                      // 이미 선택된 상태이므로 아무 동작 안 함
                      return;
                    } else {
                      // 체크 해제 시 선택 해제
                      const newSelectedSites = selectedSites.filter(name => name !== siteName);
                      console.log('체크 해제 후 새로운 선택된 현장들:', newSelectedSites);
                      setSelectedSites(newSelectedSites);
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
          
          {/* 현장 선택 - 오른쪽 끝에 배치 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SearchableSiteSelect
              sites={filteredSites}
              value={selectedSites}
              onChange={(newValue) => {
                console.log('현장 선택됨:', newValue);
                const newSelectedSites = Array.isArray(newValue) ? newValue : (newValue ? [newValue] : []);
                setSelectedSites(newSelectedSites);
                
                // 현장 선택이 해제되면 URL 파라미터도 제거
                if (newSelectedSites.length === 0) {
                  console.log('🔍 현장 선택 해제 - URL 파라미터 제거');
                  
                  // 현장 선택 해제 플래그 설정
                  sessionStorage.setItem('clearingSiteSelection', 'true');
                  sessionStorage.removeItem('userSelectedSite'); // 사용자 선택 플래그 제거
                  
                  setFilteredSiteId(null);
                  setFilteredSiteName('');
                  // URL에서 siteId와 viewMode 파라미터 제거
                  const url = new URL(window.location);
                  url.searchParams.delete('siteId');
                  url.searchParams.delete('viewMode');
                  window.history.replaceState({}, document.title, url.pathname);
                  console.log('✅ URL 파라미터 제거 완료:', url.pathname);
                } else {
                  // 현장이 선택되면 사용자 선택 플래그 설정
                  sessionStorage.setItem('userSelectedSite', 'true');
                  console.log('✅ 사용자 현장 선택 플래그 설정');
                }
                
                // 강제 리렌더링만 수행 (불필요한 데이터 재로드 제거)
                setForceUpdate(prev => prev + 1);
              }}
              label="현장 선택"
              placeholder="현장명을 검색하세요"
              multiple={true}
              size="small"
              fullWidth={false}
              isMobile={isMobile}
              sx={{ 
                minWidth: isMobile ? '200px' : '300px',
                width: isMobile ? '200px' : '300px',
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': {
                    borderColor: '#444',
                  },
                  '&:hover fieldset': {
                    borderColor: '#666',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#3b82f6',
                  },
                },
                '& .MuiInputLabel-root': {
                  color: '#ccc',
                },
                '& .MuiInputBase-input': {
                  color: '#fff',
                },
              }}
            />
            {/* 현장 선택 해제 버튼 */}
            {selectedSites.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                onClick={clearSiteSelection}
                sx={{
                  borderColor: '#ef4444',
                  color: '#ef4444',
                  minWidth: 'auto',
                  px: 1,
                  '&:hover': {
                    borderColor: '#dc2626',
                    bgcolor: 'rgba(239, 68, 68, 0.1)'
                  }
                }}
              >
                해제
              </Button>
            )}
            
            {/* 돌아가기 버튼 */}
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                console.log('🔍 뒤로가기 버튼 클릭됨');
                console.log('🔍 location.state:', location.state);
                console.log('🔍 현재 statusView:', statusView);
                console.log('🔍 현재 tab:', tab);
                console.log('🔍 현재 selectedSites:', selectedSites);
                
                // 출발 페이지에 따라 적절한 곳으로 이동
                if (location.state && location.state.fromPage) {
                  switch (location.state.fromPage) {
                    case 'claims':
                      navigate('/claims');
                      console.log('✅ 청구예정 페이지로 돌아가기');
                      break;
                    case 'sites':
                      navigate('/sites');
                      console.log('✅ 현장관리 페이지로 돌아가기');
                      break;
                    default:
                      navigate(-1); // 기본값
                      console.log('✅ 기본 뒤로가기');
                  }
                } else {
                  // 기성현황 탭에서 현장이 선택된 경우 특별 처리
                  if (tab === 'gisung' && selectedSites.length > 0) {
                    console.log('✅ 기성현황 탭에서 현장 선택된 경우 - /sites로 이동');
                    navigate('/sites');
                  } else if (tab === 'gisung') {
                    // 기성현황 탭이지만 현장이 선택되지 않은 경우
                    console.log('✅ 기성현황 탭 (현장 미선택) - /sites로 이동');
                    navigate('/sites');
                  } else if (window.history.length > 1) {
                    console.log('✅ window.history.back() 실행');
                    window.history.back();
                  } else {
                    // 브라우저 referrer 정보 확인
                    try {
                      const referrer = document.referrer;
                      if (referrer && referrer.includes('/sites')) {
                        console.log('✅ referrer가 /sites - /sites로 이동');
                        navigate('/sites');
                      } else if (referrer && referrer.includes('/claims')) {
                        console.log('✅ referrer가 /claims - /claims로 이동');
                        navigate('/claims');
                      } else {
                        console.log('✅ 기본값 - /sites로 이동');
                        navigate('/sites');
                      }
                    } catch (error) {
                      console.log('✅ referrer 확인 실패 - /sites로 이동');
                      navigate('/sites');
                    }
                  }
                }
              }}
              sx={{
                borderColor: '#9c27b0',
                color: '#9c27b0',
                minWidth: 'auto',
                px: 1,
                ml: 1,
                '&:hover': {
                  borderColor: '#7b1fa2',
                  bgcolor: 'rgba(156, 39, 176, 0.1)'
                }
              }}
            >
              ← 돌아가기
            </Button>
          </Box>

        </Box>
      )}

      {/* 필터링된 현장 안내 메시지 */}
      {filteredSiteId && filteredSiteName && selectedSites.length > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 2, bgcolor: '#232b3b', color: '#90caf9', border: '1px solid #90caf9' }}
        >
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            📍 {filteredSiteName} 현장의 기성관리 데이터를 확인하고 있습니다.
          </Typography>
          {progressList.filter(item => item?.name === filteredSiteName).length === 0 && (
            <Typography variant="body2" sx={{ mt: 1, color: '#ff9800' }}>
              💡 이 현장에 대한 기성 데이터가 없습니다. "기성등록" 및 업로드를 통하여 현장 기성을 등록해주세요.
            </Typography>
          )}
        </Alert>
      )}

      {/* 월별/현장별 + 소분류 연동 분기 */}
      {statusView === 'month' && tab === 'chart' && (
        // 월별+기성관리 차트/데이터
        <Grid container spacing={1} alignItems="stretch" sx={{ mb: 3, width: '100%', px: isMobile ? 1 : 0, maxWidth: '100%' }}>
          {/* 모바일에서 차트 위 제목 */}
          {isMobile && (
            <Grid>
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
          <Grid sx={{ width: '100vw', maxWidth: '100vw' }}>
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
              <ResponsiveContainer width="100%" minWidth="100vw" height={isMobile ? 300 : 600} minHeight={isMobile ? 200 : 500} style={{ margin: '0 auto', display: 'flex', justifyContent: 'center', width: '100%', maxWidth: 'none' }}>
                <BarChart
                  data={getMonthChartData}
                  margin={{ top: 80, right: 20, left: isMobile ? 10 : 20, bottom: 20 }}
                  barCategoryGap="100%"
                  barSize={60}
                >
                  <XAxis dataKey="name" tick={{ fontSize: isMobile ? 14 : 16 }} />
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
                    tick={{ fontSize: isMobile ? 14 : 16 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: isMobile ? 18 : 22,
                      backgroundColor: '#2a2a2a',
                      border: '1px solid #333',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Box sx={{ 
                            p: 2, 
                            bgcolor: '#2a2a2a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            minWidth: '200px'
                          }}>
                            <Typography variant="subtitle2" sx={{ 
                              fontWeight: 'bold', 
                              mb: 1,
                              color: '#fff'
                            }}>
                              {label}
                            </Typography>
                            
                            {/* 기성금 섹션 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#43e97b', 
                                fontWeight: 'bold',
                                display: 'block',
                                mb: 0.5
                              }}>
                                [기성금]
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                기성금액: {data.기성금 ? data.기성금.toLocaleString() + '원' : '0원'}
                              </Typography>
                            </Box>

                            {/* 수입 섹션 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#2196f3', 
                                fontWeight: 'bold',
                                display: 'block',
                                mb: 0.5
                              }}>
                                -수입-
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                입금완료: {data.입금완료 ? data.입금완료.toLocaleString() + '원' : '0원'}
                              </Typography>
                            </Box>

                            {/* 지출 섹션 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#ef5350', 
                                fontWeight: 'bold',
                                display: 'block',
                                mb: 0.5
                              }}>
                                -지출-
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                자재비: {data.자재비 ? data.자재비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                노무비: {data.노무비 ? data.노무비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                장비비: {data.장비비 ? data.장비비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                경비: {data.경비 ? data.경비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                기타: {data.기타 ? data.기타.toLocaleString() + '원' : '0원'}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 14 : 16 }} />
                  <Bar dataKey="기성금" fill="#82ca9d">
                    <LabelList dataKey="기성금" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} fill="#fff" />
                  </Bar>
                  <Bar dataKey="입금완료" fill="#00bcd4">
                    <LabelList dataKey="입금완료" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={30} fill="#fff" />
                  </Bar>
                  <Bar dataKey="자재비" fill="#ff6b6b">
                    <LabelList dataKey="자재비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={10} fill="#fff" />
                  </Bar>
                  <Bar dataKey="노무비" fill="#ffc658">
                    <LabelList dataKey="노무비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={30} fill="#fff" />
                  </Bar>
                  <Bar dataKey="장비비" fill="#ff9f43">
                    <LabelList dataKey="장비비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={50} fill="#fff" />
                  </Bar>
                  <Bar dataKey="경비" fill="#4ecdc4">
                    <LabelList dataKey="경비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={70} fill="#fff" />
                  </Bar>
                  <Bar dataKey="기타" fill="#a084e8">
                    <LabelList dataKey="기타" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={90} fill="#fff" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ZoomableChart>
          </Grid>
        </Grid>
      )}
      {statusView === 'site' && tab === 'chart' && (
        // 현장별+기성관리 차트/데이터(선택된 현장만)
        <Grid container spacing={1} alignItems="stretch" sx={{ mb: 3, width: '100%', px: isMobile ? 1 : 0, maxWidth: '100%' }}>
          {/* 차트 전체 화면 */}
          <Grid sx={{ width: '100vw', maxWidth: '100vw' }}>
            <ZoomableChart 
              title="현장별 기성/지출 현황" 
              isMobile={isMobile}
            >
              <ResponsiveContainer width="100%" minWidth="100vw" height={isMobile ? 300 : 600} minHeight={isMobile ? 200 : 500} style={{ margin: 'flex', justifyContent: 'center', width: '100%', maxWidth: 'none' }}>
                <BarChart
                  data={getSiteChartData}
                  margin={{ top: 80, right: 20, left: 20, bottom: 20 }}
                  barCategoryGap="100%"
                  barSize={60}
                >
                  <XAxis dataKey="name" tick={{ fontSize: isMobile ? 14 : 16 }} />
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
                    tick={{ fontSize: isMobile ? 14 : 16 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      fontSize: isMobile ? 18 : 22,
                      backgroundColor: '#2a2a2a',
                      border: '1px solid #333',
                      color: '#fff',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <Box sx={{ 
                            p: 2, 
                            bgcolor: '#2a2a2a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            minWidth: '200px'
                          }}>
                            <Typography variant="subtitle2" sx={{ 
                              fontWeight: 'bold', 
                              mb: 1,
                              color: '#fff'
                            }}>
                              {label}
                            </Typography>
                            
                            {/* 기성금 섹션 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#43e97b', 
                                fontWeight: 'bold',
                                display: 'block',
                                mb: 0.5
                              }}>
                                [기성금]
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                기성금액: {data.기성금 ? data.기성금.toLocaleString() + '원' : '0원'}
                              </Typography>
                            </Box>

                            {/* 수입 섹션 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#2196f3', 
                                fontWeight: 'bold',
                                display: 'block',
                                mb: 0.5
                              }}>
                                -수입-
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                입금완료: {data.입금완료 ? data.입금완료.toLocaleString() + '원' : '0원'}
                              </Typography>
                            </Box>

                            {/* 지출 섹션 */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" sx={{ 
                                color: '#ef5350', 
                                fontWeight: 'bold',
                                display: 'block',
                                mb: 0.5
                              }}>
                                -지출-
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                자재비: {data.자재비 ? data.자재비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                노무비: {data.노무비 ? data.노무비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                장비비: {data.장비비 ? data.장비비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                경비: {data.경비 ? data.경비.toLocaleString() + '원' : '0원'}
                              </Typography>
                              <Typography variant="body2" sx={{ 
                                color: '#fff',
                                ml: 1
                              }}>
                                기타: {data.기타 ? data.기타.toLocaleString() + '원' : '0원'}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: isMobile ? 14 : 16 }} />
                  <Bar dataKey="기성금" fill="#82ca9d">
                    <LabelList dataKey="기성금" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} fill="#fff" />
                  </Bar>
                  <Bar dataKey="입금완료" fill="#00bcd4">
                    <LabelList dataKey="입금완료" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={30} fill="#fff" />
                  </Bar>
                  <Bar dataKey="자재비" fill="#ff6b6b">
                    <LabelList dataKey="자재비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={10} fill="#fff" />
                  </Bar>
                  <Bar dataKey="노무비" fill="#ffc658">
                    <LabelList dataKey="노무비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={30} fill="#fff" />
                  </Bar>
                  <Bar dataKey="장비비" fill="#ff9f43">
                    <LabelList dataKey="장비비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={50} fill="#fff" />
                  </Bar>
                  <Bar dataKey="경비" fill="#4ecdc4">
                    <LabelList dataKey="경비" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={70} fill="#fff" />
                  </Bar>
                  <Bar dataKey="기타" fill="#a084e8">
                    <LabelList dataKey="기타" position="top" formatter={v => v ? v.toLocaleString() + '원' : ''} fontSize={isMobile ? 16 : 18} offset={90} fill="#fff" />
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
          <TextField
            label="계약금액"
            value={formData.contractAmount ? Number(formData.contractAmount).toLocaleString() : ''}
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
                value={p.amount ? Number(p.amount).toLocaleString() : ''}
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