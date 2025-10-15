import React, { useState, useEffect, useRef, useMemo } from 'react';
import '../styles/Claims.css';
import {
  Box,
  Typography,
  Paper,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Grid,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  TablePagination,
  InputAdornment,
  Tooltip,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Assignment as AssignmentIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { 
  subscribeToClaims, 
  createClaim, 
  updateClaim, 
  deleteClaim,
  getClaimStats,
  checkProgressAndUpdateClaim
} from '../api/claims';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import SearchableSiteSelect from '../components/common/SearchableSiteSelect';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { syncClaimToProgress } from '../utils/integrationUtils';

const Claims = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  // 상태 관리
  const [claims, setClaims] = useState([]);
  const [allClaims, setAllClaims] = useState([]); // 모든 월의 데이터
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    claimStatus: '',
    searchAll: false // 전체 검색 여부
  });
  const [sortBy, setSortBy] = useState('number');
  const [sortOrder, setSortOrder] = useState('asc');
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [skipPageReset, setSkipPageReset] = useState(false);
  const [skipSorting, setSkipSorting] = useState(false);
  const savedPageRef = useRef(1);
  const recentlyUpdatedRef = useRef(new Set());
  const [fixedNumbers, setFixedNumbers] = useState(new Map()); // 고정 번호 저장
  const [stats, setStats] = useState({
    total: 0,
    claimed: 0,
    notClaimed: 0,
    totalAmount: 0
  });

  // 월별 네비게이션
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });



  // 엑셀 업로드 함수
  const handleUploadExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 헤더 제거하고 데이터만 추출
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        // 데이터 검증 및 변환
        const processedData = rows
          .filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ''))
          .map(row => {
            const claim = {};
            headers.forEach((header, index) => {
              const value = row[index];
              switch (header) {
                case '현장명':
                  claim.siteName = value || '';
                  break;
                case '소장/회사명':
                  claim.manager = value || '';
                  break;
                case '차수':
                  claim.sequence = value || '';
                  break;
                case '계약금액':
                  claim.contractAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '잔액':
                  claim.remainingAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '청구 전 기성율(%)':
                  claim.progressRate = value ? String(value).replace('%', '') : '0';
                  break;
                case '청구금액':
                  claim.claimAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '청구여부':
                  claim.claimStatus = getStatusFromLabel(value);
                  break;
                case '비고':
                  claim.notes = value || '';
                  break;
              }
            });
            return claim;
          });

        console.log('업로드된 데이터:', processedData);
        setSnackbar({ open: true, message: `${processedData.length}개의 청구 데이터가 업로드되었습니다.`, severity: 'success' });

        // 여기서 실제 데이터베이스 업데이트 로직을 추가할 수 있습니다
        // await updateClaimsFromExcel(processedData);

      } catch (error) {
        console.error('엑셀 업로드 오류:', error);
        setSnackbar({ open: true, message: '엑셀 업로드에 실패했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 청구상태 라벨을 상태값으로 변환
  const getStatusFromLabel = (label) => {
    switch (label) {
      case '청구완료': return 'O';
      case '청구대기': return 'X';
      case '이월': return '이월';
      default: return 'X';
    }
  };

  // 현장 데이터
  const [sites, setSites] = useState([]);
  const [gisungData, setGisungData] = useState([]);
  const [paymentStatusMap, setPaymentStatusMap] = useState({});

  // 임시저장 관련 상태
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingData, setPendingData] = useState([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // 임시저장 관련 함수들 (Firestore 사용)
  const saveToFirestore = async (key, data) => {
    if (!currentUser?.uid) return;
    
    try {
      const userDataRef = doc(db, 'userTempData', currentUser.uid);
      await setDoc(userDataRef, {
        [key]: data,
        updatedAt: new Date()
      }, { merge: true });
      console.log(`${key} Firestore 저장 완료`);
    } catch (error) {
      console.error('Firestore 저장 오류:', error);
    }
  };

  const loadFromFirestore = async (key) => {
    if (!currentUser?.uid) return null;
    
    try {
      const userDataRef = doc(db, 'userTempData', currentUser.uid);
      const userDataDoc = await getDoc(userDataRef);
      
      if (userDataDoc.exists()) {
        const data = userDataDoc.data();
        return data[key] || null;
      }
      return null;
    } catch (error) {
      console.error('Firestore 로드 오류:', error);
      return null;
    }
  };

  const addToPendingData = (data) => {
    const newPending = {
      id: `temp_${Date.now()}`,
      ...data,
      timestamp: new Date().toISOString(),
      type: 'claim'
    };
    setPendingData(prev => [...prev, newPending]);
    saveToFirestore('pendingClaims', [...pendingData, newPending]);
  };

  const syncPendingData = async () => {
    if (!isOnline || pendingData.length === 0) return;

    try {
      const successData = [];
      const failedData = [];

      for (const data of pendingData) {
        try {
          await createClaim(data);
          successData.push(data.id);
          console.log('임시저장 데이터 동기화 성공:', data.id);
        } catch (error) {
          console.error('임시저장 데이터 동기화 실패:', error);
          failedData.push(data);
        }
      }

      // 성공한 데이터는 pendingData에서 제거
      if (successData.length > 0) {
        const remainingData = pendingData.filter(data => !successData.includes(data.id));
        setPendingData(remainingData);
        saveToLocalStorage('pendingClaims', remainingData);
        setSnackbar({
          open: true,
          message: `${successData.length}개의 임시저장 데이터가 동기화되었습니다.`,
          severity: 'success'
        });
      }

      // 실패한 데이터는 다시 시도할 수 있도록 유지
      if (failedData.length > 0) {
        setSnackbar({
          open: true,
          message: `${failedData.length}개의 데이터 동기화에 실패했습니다.`,
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('임시저장 데이터 동기화 오류:', error);
    }
  };

  // 폼 데이터
  const [formData, setFormData] = useState({
    claimMonth: currentMonth,
    siteName: '',
    manager: '',
    sequence: '',
    progressRate: '',
    totalGisungAmount: '',
    claimAmount: '',
    claimStatus: 'X',
    notes: '',
    isException: false, // 예외 항목 여부
    exceptionAmount: '' // 예외 금액
  });

  // 월별 네비게이션 함수
  const getMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${String(parseInt(month)).padStart(2, '0')}월 청구예정LIST`;
  };

  // 네비게이션용 간단한 월 표시
  const getNavigationMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${year}년 ${String(parseInt(month)).padStart(2, '0')}월`;
  };

  // 월별 청구대기 개수 계산 (실시간 업데이트) - 모든 월 표시
  const monthlyPendingCounts = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const monthlyCounts = {};
    
    // 1월부터 12월까지 모두 초기화 (0으로 시작)
    for (let i = 1; i <= 12; i++) {
      const monthStr = `${currentYear}-${String(i).padStart(2, '0')}`;
      monthlyCounts[monthStr] = 0;
    }
    
    // 모든 월의 데이터에서 청구대기 상태인 항목들만 카운트 (청구완료와 이월 제외)
    allClaims.forEach(claim => {
      if (claim.claimMonth) {
        // 청구완료와 이월이 아닌 모든 항목을 청구대기로 카운트
        if (claim.claimStatus !== 'O' && claim.claimStatus !== '청구완료' && claim.claimStatus !== '이월') {
          if (monthlyCounts.hasOwnProperty(claim.claimMonth)) {
            monthlyCounts[claim.claimMonth]++;
          }
        }
      }
    });
    
    console.log('월별 청구대기 개수:', monthlyCounts);
    console.log('전체 allClaims 데이터 샘플:', allClaims.slice(0, 3).map(c => ({
      siteName: c.siteName,
      claimMonth: c.claimMonth,
      claimStatus: c.claimStatus
    })));
    console.log('청구대기 상태별 개수:', {
      'X': allClaims.filter(c => c.claimStatus === 'X').length,
      '청구대기': allClaims.filter(c => c.claimStatus === '청구대기').length,
      'O': allClaims.filter(c => c.claimStatus === 'O').length,
      '청구완료': allClaims.filter(c => c.claimStatus === '청구완료').length,
      '이월': allClaims.filter(c => c.claimStatus === '이월').length
    });
    
    return monthlyCounts;
  }, [allClaims]);

  // 월 변경 시 현재 월 데이터 필터링
  useEffect(() => {
    if (currentMonth && allClaims.length > 0) {
      console.log('월 변경됨:', currentMonth);
      const currentMonthClaims = allClaims.filter(claim => claim.claimMonth === currentMonth);
      console.log(`📊 현재 월 (${currentMonth}) 데이터:`, currentMonthClaims.length, '개');
      setClaims(currentMonthClaims);
      setFilteredClaims(currentMonthClaims);
    }
  }, [currentMonth, allClaims]);

  const getPreviousMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getNextMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // 모바일 스와이프 뒤로가기 비활성화 (안전한 방법)
  useEffect(() => {
    if (isMobile) {
      let startX = 0;
      let startY = 0;
      let isSwiping = false;
      
      const handleTouchStart = (e) => {
        // 버튼이나 입력 필드에서는 스와이프 방지하지 않음
        const target = e.target;
        if (target.tagName === 'BUTTON' || 
            target.tagName === 'INPUT' || 
            target.tagName === 'TEXTAREA' ||
            target.closest('button') ||
            target.closest('input') ||
            target.closest('textarea') ||
            target.closest('[role="button"]') ||
            target.closest('.MuiButton-root') ||
            target.closest('.MuiIconButton-root') ||
            target.closest('.MuiAutocomplete-root')) {
          return;
        }
        
        if (e.touches.length === 1) {
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
          isSwiping = false;
        }
      };
      
      const handleTouchMove = (e) => {
        if (!startX || !startY) return;
        
        const deltaX = e.touches[0].clientX - startX;
        const deltaY = e.touches[0].clientY - startY;
        
        // 좌우 스와이프가 상하보다 크고, 충분한 거리를 이동했을 때만 방지
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
          isSwiping = true;
          e.preventDefault();
        }
      };
      
      const handleTouchEnd = () => {
        startX = 0;
        startY = 0;
        isSwiping = false;
      };
      
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: true });
      
      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile]);

  // 실시간 데이터 구독
  useEffect(() => {
    console.log('Claims 컴포넌트 마운트됨, currentMonth:', currentMonth);
    setLoading(true);
    
    try {
      console.log('subscribeToClaims 함수 호출 시작');
      const unsubscribe = subscribeToClaims((allClaims) => {
        console.log(`📊 모든 Claims 데이터 수신:`, allClaims.length, '개');
        console.log('📋 수신된 데이터:', allClaims.map(c => ({
          id: c.id,
          siteName: c.siteName,
          claimMonth: c.claimMonth,
          sequence: c.sequence,
          claimAmount: c.claimAmount,
          claimStatus: c.claimStatus,
          isCarryover: c.isCarryover,
          carryoverFrom: c.carryoverFrom
        })));
        
        // 모든 데이터 저장
        setAllClaims(allClaims);
        
        // 현재 월의 데이터만 필터링
        const currentMonthClaims = allClaims.filter(claim => claim.claimMonth === currentMonth);
        console.log(`📊 현재 월 (${currentMonth}) 데이터:`, currentMonthClaims.length, '개');
        console.log('📊 현재 월 청구금액들:', currentMonthClaims.map(c => ({
          siteName: c.siteName,
          sequence: c.sequence,
          claimAmount: c.claimAmount
        })));
        
        // 부드러운 업데이트를 위해 상태 업데이트를 배치로 처리
        setClaims(prevClaims => {
          // 데이터가 실제로 변경되었는지 확인
          const hasChanges = JSON.stringify(prevClaims) !== JSON.stringify(currentMonthClaims);
          if (!hasChanges) {
            console.log('📊 데이터 변경 없음 - 상태 업데이트 스킵');
            return prevClaims;
          }
          console.log('📊 데이터 변경 감지 - 상태 업데이트');
          return currentMonthClaims;
        });
        
        setFilteredClaims(prevFiltered => {
          // 데이터가 실제로 변경되었는지 확인
          const hasChanges = JSON.stringify(prevFiltered) !== JSON.stringify(currentMonthClaims);
          if (!hasChanges) {
            return prevFiltered;
          }
          return currentMonthClaims;
        });
        
        setLoading(false);
      }, null); // null을 전달하여 모든 데이터 가져오기

      console.log('subscribeToClaims 함수 호출 완료, unsubscribe 함수 반환됨');

      return () => {
        console.log('Claims 컴포넌트 언마운트됨');
        unsubscribe();
      };
    } catch (error) {
      console.error('Claims 데이터 구독 중 오류 발생:', error);
      setLoading(false);
    }
  }, [currentMonth]); // currentMonth 문자열을 직접 의존성으로 사용

  // 현장 데이터 로드
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sites'));
        const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('🏗️ 현장 데이터 로드 완료:', sitesData.length, '개');
        console.log('🏗️ 현장 목록:', sitesData.map(s => ({
          name: s.name,
          manager: s.manager,
          company: s.company,
          companyName: s.companyName
        })));
        setSites(sitesData);
      } catch (error) {
        console.error('현장 데이터 로드 실패:', error);
      }
    };
    fetchSites();
  }, []);

  // 기성 데이터 로드
  useEffect(() => {
    const fetchGisungData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'gisung'));
        const gisungData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGisungData(gisungData);
      } catch (error) {
        console.error('기성 데이터 로드 실패:', error);
      }
    };
    fetchGisungData();
  }, []);

  // 정산완료 현장 데이터 로드
  useEffect(() => {
    const loadPaymentStatus = async () => {
      try {
        // 현장별 입금 상태 맵 생성
        const paymentMap = {};
        
        sites.forEach(site => {
          // 현장명 매칭 (정확한 매칭과 부분 매칭 모두 시도)
          const siteGisungData = gisungData.filter(g => {
            const exactMatch = g.name === site.name;
            const partialMatch = g.name && site.name && g.name.includes(site.name);
            return exactMatch || partialMatch;
          });
          
          if (siteGisungData.length === 0) {
            paymentMap[site.name] = { isFullyPaid: false, totalGisung: 0, paidGisung: 0, paymentRate: 0 };
            return;
          }
          
          // 해당 현장의 모든 기성 데이터 확인
          const totalGisung = siteGisungData.reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
          const paidGisung = siteGisungData
            .filter(g => g.paymentStatus === '입금완료')
            .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
          
          // 선급금도 고려
          const advanceAmount = Number(site.advance) || 0;
          const totalWithAdvance = totalGisung + advanceAmount;
          
          // 잔액 계산 (계약금액 - 선급금 - 입금완료된 기성)
          const contractAmount = Number(site.contractAmount) || 0;
          const balance = contractAmount - advanceAmount - paidGisung;
          
          // 정산완료 조건: 잔액이 0이고 입금완료 칩이 있는 경우
          const hasPaidGisung = siteGisungData.some(g => g.paymentStatus === '입금완료');
          const isFullyPaid = balance <= 0 && hasPaidGisung;
          
          // 입금률 계산 (참고용)
          const paymentRate = totalWithAdvance > 0 ? ((paidGisung + advanceAmount) / totalWithAdvance) * 100 : 0;
          
          paymentMap[site.name] = {
            isFullyPaid,
            totalGisung: totalWithAdvance,
            paidGisung: paidGisung + advanceAmount,
            paymentRate: Math.round(paymentRate),
            balance: balance,
            contractAmount: contractAmount
          };
        });
        
        setPaymentStatusMap(paymentMap);
      } catch (error) {
        console.error('입금 상태 확인 실패:', error);
      }
    };

    if (sites.length > 0 && gisungData.length > 0) {
      loadPaymentStatus();
    }
  }, [sites, gisungData]);

  // 통계 데이터 로드
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await getClaimStats(currentMonth);
        setStats(statsData);
      } catch (error) {
        console.error('통계 로드 실패:', error);
      }
    };
    loadStats();
  }, [claims, currentMonth]);

  // 필터링 및 검색 (claims 데이터 변경 시에도 실시간 업데이트)
  useEffect(() => {
    // 검색은 전체 월에서 하되, 결과는 현재 월 데이터에서 필터링
    let filtered = claims;

    // 검색어 필터링 (전체 월에서 검색하여 해당 월로 이동)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      
      // 전체 월에서 검색어에 맞는 모든 청구 데이터를 찾기
      const allMatchingClaims = allClaims.filter(claim => {
        // 현장명 검색
        const siteNameMatch = claim.siteName?.toLowerCase().includes(searchLower);
        
        // 소장명 검색
        const managerMatch = claim.manager?.toLowerCase().includes(searchLower);
        
        // 회사명 검색 (현장관리에서 가져온 회사명도 포함)
        const siteInfo = getSiteInfo(claim.siteName);
        const companyMatch = siteInfo.company?.toLowerCase().includes(searchLower);
        
        // 차수 검색
        const sequenceMatch = claim.sequence?.toLowerCase().includes(searchLower);
        
        return siteNameMatch || managerMatch || companyMatch || sequenceMatch;
      });
      
      // 검색 결과가 있으면 해당 월로 이동
      if (allMatchingClaims.length > 0) {
        // 가장 최근 월의 데이터를 찾아서 해당 월로 이동
        const latestMonth = allMatchingClaims
          .map(claim => claim.claimMonth)
          .sort()
          .pop(); // 가장 최근 월
        
        if (latestMonth && latestMonth !== currentMonth) {
          setCurrentMonth(latestMonth);
        }
        
        // 해당 월의 검색 결과만 표시
        filtered = allMatchingClaims.filter(claim => claim.claimMonth === latestMonth);
      } else {
        // 검색 결과가 없으면 빈 배열
        filtered = [];
      }
    }

    // 상태 필터링
    if (filters.claimStatus) {
      filtered = filtered.filter(claim => claim.claimStatus === filters.claimStatus);
    }

    // 정렬 (청구여부 변경 시에도 번호순 정렬 유지)
    if (!skipSorting) {
      filtered.sort((a, b) => {
        // 정렬 기준에 따른 값 비교
        let aValue, bValue;
        
        switch (sortBy) {
          case 'number':
            // 고정 번호로 정렬
            aValue = fixedNumbers.get(a.id) || 999999;
            bValue = fixedNumbers.get(b.id) || 999999;
            break;
          case 'siteName':
            aValue = a.siteName || '';
            bValue = b.siteName || '';
            break;
          case 'sequence':
            aValue = a.sequence || '';
            bValue = b.sequence || '';
            break;
          case 'claimAmount':
            aValue = parseFloat(a.claimAmount) || 0;
            bValue = parseFloat(b.claimAmount) || 0;
            break;
          case 'claimStatus':
            // 청구여부 정렬: 청구대기(X) > 청구완료(O) > 이월
            const statusOrder = { 'X': 1, 'O': 2, '이월': 3 };
            aValue = statusOrder[a.claimStatus] || 4;
            bValue = statusOrder[b.claimStatus] || 4;
            break;
          default:
            // 기본값은 고정 번호 (번호순)
            aValue = fixedNumbers.get(a.id) || 999999;
            bValue = fixedNumbers.get(b.id) || 999999;
        }
        
        // 숫자 비교
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // 문자열 비교
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }
        
        // 날짜 비교
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        }
        
        // 기본 비교
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    } else {
      // 청구여부 변경 시에도 번호순 정렬은 유지
      console.log('🔄 청구여부 변경 - 번호순 정렬 유지');
      filtered.sort((a, b) => {
        const aValue = fixedNumbers.get(a.id) || 999999;
        const bValue = fixedNumbers.get(b.id) || 999999;
        return aValue - bValue; // 항상 오름차순 (번호순)
      });
      setSkipSorting(false); // 플래그 리셋
    }

    setFilteredClaims(filtered);
    
    // 고정 번호 설정 (새로운 항목에만 번호 할당)
    setFixedNumbers(prevFixedNumbers => {
      const newFixedNumbers = new Map(prevFixedNumbers);
      let nextNumber = 1;
      
      // 기존 번호가 있는 항목들의 최대 번호 찾기
      for (const [_, number] of newFixedNumbers) {
        if (number >= nextNumber) {
          nextNumber = number + 1;
        }
      }
      
      // 새로운 항목들에 번호 할당
      filtered.forEach(claim => {
        if (!newFixedNumbers.has(claim.id)) {
          newFixedNumbers.set(claim.id, nextNumber++);
          console.log(`🔢 새 항목에 번호 할당: ${claim.siteName} → ${nextNumber - 1}번`);
        }
      });
      
      return newFixedNumbers;
    });
    
    // 칩 클릭이 아닌 경우에만 페이지 리셋
    if (!skipPageReset) {
      setCurrentPage(1);
    } else {
      // 저장된 페이지로 복원
      const savedPage = savedPageRef.current;
      console.log(`📄 저장된 페이지로 복원: ${savedPage}`);
      setCurrentPage(savedPage);
      setSkipPageReset(false); // 플래그 리셋
    }
  }, [claims, allClaims, currentMonth, searchTerm, filters, sortBy, sortOrder]);


  // 폼 데이터 초기화
  // 차수 계산 함수 - 기성 데이터 기반으로 올바른 차수 계산
  const calculateSequence = (siteName) => {
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    
    if (siteGisungData.length === 0) return '1차';
    
    // 같은 현장의 기성 데이터를 등록 순서대로 정렬
    const sortedList = siteGisungData.sort((a, b) => {
      const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0);
      const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0);
      return dateA - dateB;
    });
    
    // 전체 기성 데이터 개수 + 1로 차수 계산
    const nextSequence = sortedList.length + 1;
    
    // 차수별 라벨 생성
    const sequenceLabels = ['1차', '2차', '3차', '4차', '5차', '6차', '7차', '8차', '9차', '10차'];
    return sequenceLabels[nextSequence - 1] || `${nextSequence}차`;
  };

  // 현장 정보 가져오기 (소장명/회사명)
  const getSiteInfo = (siteName) => {
    // 정확한 매칭 먼저 시도
    let site = sites.find(s => s.name === siteName);
    
    // 정확한 매칭이 안 되면 부분 매칭 시도
    if (!site) {
      // "대구교대 인문사회관 창호교체" -> "대구교대" 또는 "대구교대 인문사회관"으로 찾기
      const parts = siteName.split(' ');
      for (let i = 1; i <= parts.length; i++) {
        const partialName = parts.slice(0, i).join(' ');
        site = sites.find(s => s.name === partialName || s.name.includes(partialName));
        if (site) break;
      }
    }
    
    if (!site) {
      console.log(`🔍 현장 정보 없음: ${siteName}`);
      return { manager: '', company: '' };
    }
    
    // 모든 가능한 회사명 필드 확인 (companyName 우선)
    const company = site.companyName || site.company || site.contractor || site.client || '';
    
    console.log(`🔍 현장 정보 조회: ${siteName}`, {
      foundSite: site.name,
      manager: site.manager,
      company: site.company,
      companyName: site.companyName,
      contractor: site.contractor,
      client: site.client,
      finalCompany: company,
      allFields: Object.keys(site)
    });
    
    return {
      manager: site.manager || '',
      company: company
    };
  };

  // 소장명/회사명을 함께 표시하는 함수
  const getDisplaySiteName = (siteName) => {
    const siteInfo = getSiteInfo(siteName);
    const { manager, company } = siteInfo;
    
    // 소장명과 회사명을 모두 표시 (둘 중 하나라도 있으면)
    if (manager && company) {
      return `${manager} / ${company}`;
    } else if (manager) {
      return `${manager} /`;
    } else if (company) {
      return `/ ${company}`;
    } else {
      return '';
    }
  };

  // 기성율 계산 함수 (총 기성금액 + 선급금 / 총 계약금액 * 100)
  const calculateProgressRate = (siteName) => {
    // 기성 데이터에서 해당 현장의 기성금액 합계 계산
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    // 기성 데이터에서 gisungAmount 또는 currentGisung 필드 사용 (예외 항목 제외)
    const totalGisungAmount = siteGisungData
      .filter(gisung => !gisung.isException)
      .reduce((sum, gisung) => {
        const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
        return sum + amount;
      }, 0);
    
    const advanceAmount = Number(siteData.advance || 0); // 선급금
    const contractAmount = Number(siteData.contractAmount);
    
    if (contractAmount === 0) return 0;
    
    // 기성금액 + 선급금을 계약금액으로 나누어 기성율 계산
    const totalProgressAmount = totalGisungAmount + advanceAmount;
    const progressRate = (totalProgressAmount / contractAmount) * 100;
    
    console.log(`📊 기성율 계산 - ${siteName}:`, {
      totalGisungAmount,
      advanceAmount,
      contractAmount,
      totalProgressAmount,
      progressRate: Math.round(progressRate)
    });
    
    return Math.round(progressRate);
  };

  // 계약금액 가져오기 함수
  const getContractAmount = (siteName) => {
    const siteData = sites.find(site => site.name === siteName);
    return Number(siteData?.contractAmount || 0);
  };

  // 계약금액 잔액 계산 함수 (기성현황 페이지와 동일한 로직)
  const calculateRemainingAmount = (siteName) => {
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    // 입금완료된 기성금액만 계산 (예외 항목 제외) - 기성현황 페이지와 동일
    const totalPaidAmount = siteGisungData
      .filter(gisung => gisung.paymentStatus === '입금완료' && !gisung.isException)
      .reduce((sum, gisung) => {
        const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
        return sum + amount;
      }, 0);
    
    // 현재 청구예정인 금액도 포함 (청구리스트에서) - 예외 항목 제외
    const currentClaimAmount = claims
      .filter(claim => claim.siteName === siteName && claim.claimStatus === 'X' && !claim.isException)
      .reduce((sum, claim) => sum + (Number(claim.claimAmount) || 0), 0);
    
    // 현재 편집 중인 청구예정이 예외 항목이면 해당 금액을 0으로 처리
    let currentEditingClaimAmount = 0;
    if (formData.siteName === siteName && formData.claimAmount && !formData.isException) {
      currentEditingClaimAmount = Number(formData.claimAmount) || 0;
    }
    
    const advanceAmount = Number(siteData.advance || 0); // 선급금
    const contractAmount = Number(siteData.contractAmount);
    
    // 계약금액 - 선급금 - 입금완료금액 - 현재 청구예정 금액 - 현재 편집 중인 청구예정 금액
    const remainingAmount = contractAmount - advanceAmount - totalPaidAmount - currentClaimAmount - currentEditingClaimAmount;
    
    // 디버깅을 위한 로그 추가
    console.log(`🔍 잔액 계산 (입금완료 기준) - ${siteName}:`, {
      contractAmount,
      advanceAmount,
      totalPaidAmount,
      currentClaimAmount,
      currentEditingClaimAmount,
      isException: formData.isException,
      calculatedBalance: remainingAmount
    });
    
    return Math.max(0, remainingAmount); // 음수 방지
  };

  // 청구금액 기준 잔액 계산 함수 (기성현황 페이지와 동일한 로직)
  const calculateBalanceByClaimAmount = (siteName, claimAmount, isException = false) => {
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    const contractAmount = Number(siteData.contractAmount);
    const claimAmountNum = Number(claimAmount || 0);
    
    // 입금완료된 기성금 총합 계산 (예외 항목 제외) - 기성현황 페이지와 동일
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const totalPaidAmount = siteGisungData
      .filter(gisung => gisung.paymentStatus === '입금완료' && !gisung.isException)
      .reduce((sum, gisung) => {
        const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
        return sum + amount;
      }, 0);
    
    // 청구예정인 기성금 총합 계산 (예외 항목 제외)
    const pendingGisungAmount = siteGisungData
      .filter(gisung => gisung.claimStatus !== '청구완료' && !gisung.isException)
      .reduce((sum, gisung) => {
        const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
        return sum + amount;
      }, 0);
    
    const advanceAmount = Number(siteData.advance || 0);
    
    // 예외처리된 청구금액은 잔액 계산에서 제외
    const effectiveClaimAmount = isException ? 0 : claimAmountNum;
    
    // 계약금액 - 선급금 - 입금완료금액 - 청구예정 기성금 - 현재 청구금액
    const balance = contractAmount - advanceAmount - totalPaidAmount - pendingGisungAmount - effectiveClaimAmount;
    
    console.log(`💰 청구금액 기준 잔액 계산 (입금완료 기준) - ${siteName}:`, {
      contractAmount,
      advanceAmount,
      totalPaidAmount,
      pendingGisungAmount,
      claimAmount: claimAmountNum,
      isException,
      effectiveClaimAmount,
      calculatedBalance: balance
    });
    
    return Math.max(0, balance); // 음수 방지
  };

  // 누계기성금액 계산 함수 (입금완료 기준, 선급금 포함)
  const calculateTotalGisungAmount = (siteName) => {
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    // 입금완료된 기성금의 총합 계산 (예외 항목 제외) - 기성현황 페이지와 동일
    const totalPaidAmount = siteGisungData
      .filter(gisung => gisung.paymentStatus === '입금완료' && !gisung.isException)
      .reduce((sum, gisung) => {
        const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
        return sum + amount;
      }, 0);
    
    // 선급금 추가
    const advanceAmount = Number(siteData?.advance || 0);
    const totalWithAdvance = totalPaidAmount + advanceAmount;
    
    console.log(`📊 누계기성금액 계산 (입금완료 기준, 선급금 포함) - ${siteName}:`, {
      totalPaidAmount,
      advanceAmount,
      totalWithAdvance,
      입금완료기성개수: siteGisungData.filter(gisung => gisung.paymentStatus === '입금완료').length
    });
    
    return totalWithAdvance;
  };

  // 특정 차수의 기성금액 계산 함수
  const calculateGisungAmountBySequence = (siteName, sequence) => {
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const matchingGisung = siteGisungData.find(gisung => gisung.sequence === sequence);
    
    if (matchingGisung) {
      const amount = Number(matchingGisung.gisungAmount || matchingGisung.currentGisung || 0);
      console.log(`📊 차수별 기성금액 계산 - ${siteName} ${sequence}:`, {
        gisungAmount: matchingGisung.gisungAmount,
        currentGisung: matchingGisung.currentGisung,
        calculatedAmount: amount
      });
      return amount;
    }
    
    return 0;
  };

  // 현장 선택 시 자동 기입 함수
  const handleSiteSelect = (selectedSite) => {
    console.log('handleSiteSelect 호출됨:', selectedSite, typeof selectedSite);
    
    if (selectedSite && typeof selectedSite === 'object') {
      console.log('현장 객체 선택됨:', selectedSite.name);
      // 현장 객체를 선택한 경우에만 자동으로 정보 기입
      const progressRate = calculateProgressRate(selectedSite.name);
      const sequence = calculateSequence(selectedSite.name);
      const totalGisungAmount = calculateTotalGisungAmount(selectedSite.name);
        setFormData(prev => ({
          ...prev,
          siteName: selectedSite.name || '',
          manager: selectedSite.manager || '',
          sequence: sequence,
          progressRate: progressRate.toString(),
          totalGisungAmount: Math.ceil(totalGisungAmount).toString()
        }));
    } else if (typeof selectedSite === 'string') {
      console.log('문자열 입력됨:', selectedSite);
      // 문자열인 경우 (직접 입력 또는 선택)
      // 해당 현장이 목록에 있는지 확인
      const foundSite = sites.find(site => site.name === selectedSite);
      if (foundSite) {
        console.log('목록에서 현장 찾음:', foundSite.name);
        // 목록에 있는 현장인 경우 자동으로 정보 기입
        const progressRate = calculateProgressRate(foundSite.name);
        const sequence = calculateSequence(foundSite.name);
        const totalGisungAmount = calculateTotalGisungAmount(foundSite.name);
        setFormData(prev => ({
          ...prev,
          siteName: foundSite.name || '',
          manager: foundSite.manager || '',
          sequence: sequence,
          progressRate: progressRate.toString(),
          totalGisungAmount: Math.ceil(totalGisungAmount).toString()
        }));
      } else {
        console.log('목록에 없는 현장, 직접 입력으로 처리:', selectedSite);
        // 목록에 없는 현장인 경우 현장명만 설정하고 나머지는 사용자가 직접 입력
        setFormData(prev => ({
          ...prev,
          siteName: selectedSite,
          manager: prev.manager, // 기존 값 유지
          sequence: prev.sequence, // 기존 값 유지
          progressRate: prev.progressRate, // 기존 값 유지
          totalGisungAmount: prev.totalGisungAmount // 기존 값 유지
        }));
      }
    } else {
      console.log('기타 경우:', selectedSite);
    }
  };

  const resetForm = () => {
    setFormData({
      claimMonth: currentMonth,
      siteName: '',
      manager: '',
      sequence: '',
      progressRate: '',
      totalGisungAmount: '',
      claimAmount: '',
      claimStatus: 'X',
      notes: '',
      isException: false, // 예외 항목 여부 초기화
      exceptionAmount: '' // 예외 금액 초기화
    });
  };

  // 청구예정 생성/수정
  const handleSubmit = async () => {
    try {
      console.log('=== 청구예정 저장 시작 ===');
      console.log('현재 formData:', formData);
      
      // 입력 데이터 검증
      if (!formData.siteName) {
        setSnackbar({
          open: true,
          message: '현장명은 필수 입력 항목입니다.',
          severity: 'error'
        });
        return;
      }

      // 청구금액 처리 (0이어도 허용)
      let claimAmount = Number(formData.claimAmount) || 0;
      
      // 청구금액을 올림 처리
      claimAmount = Math.ceil(claimAmount);

      // 잔액 실시간 계산 (입금완료 기준으로 계산)
      const contractAmount = Math.ceil(Number(getContractAmount(formData.siteName)) || 0);
      const totalGisungAmount = Math.ceil(Number(formData.totalGisungAmount) || 0);
      const claimStatus = formData.claimStatus || 'X';
      
      let calculatedBalance;
      if (claimStatus === 'O') {
        // 청구완료: 계약금액 - 누계기성금액(입금완료 기준) - 금회청구금액
        calculatedBalance = Math.max(0, Math.ceil(contractAmount - totalGisungAmount - claimAmount));
      } else {
        // 청구대기: 계약금액 - 누계기성금액(입금완료 기준)
        calculatedBalance = Math.max(0, Math.ceil(contractAmount - totalGisungAmount));
      }

      // 저장할 데이터 준비 (사용자 입력 내용 확실히 반영)
      const claimData = {
        claimMonth: formData.claimMonth || currentMonth,
        siteName: formData.siteName,
        manager: formData.manager || '',
        sequence: formData.sequence || '',
        progressRate: formData.progressRate || 0,
        claimAmount: claimAmount,
        balance: calculatedBalance, // 실시간 계산된 잔액 저장
        claimStatus: formData.claimStatus || 'X',
        notes: formData.notes || '',
        isException: formData.isException || false, // 예외 항목 여부 저장
        exceptionAmount: formData.isException ? claimAmount : 0, // 예외 금액 저장
        createdAt: editingClaim ? editingClaim.createdAt : new Date(),
        updatedAt: new Date()
      };
      
      console.log('=== 청구금액 수정 디버깅 ===');
      console.log('원본 formData.claimAmount:', formData.claimAmount);
      console.log('계산된 claimAmount:', claimAmount);
      console.log('editingClaim?.claimAmount:', editingClaim?.claimAmount);
      console.log('저장할 claimData:', claimData);

      // 오프라인 상태 체크
      if (!isOnline) {
        console.log('오프라인 상태 - 임시저장 실행');
        addToPendingData(claimData);
        setSnackbar({ 
          open: true, 
          message: '오프라인 상태입니다. 데이터가 임시저장되었습니다. 온라인 복구 시 자동으로 동기화됩니다.', 
          severity: 'info' 
        });
        
        setDialogOpen(false);
        setEditingClaim(null);
        resetForm();
        return;
      }

      // 온라인 상태 - 정상 저장
      if (editingClaim) {
        console.log('=== 청구예정 수정 시작 ===');
        console.log('수정할 ID:', editingClaim.id);
        console.log('수정할 데이터:', claimData);
        
        await updateClaim(editingClaim.id, claimData);
        console.log('청구예정 수정 완료 - 실시간 업데이트 대기 중');
        
        // 청구 → 기성 연동
        await syncClaimToProgress(claimData.claimMonth, claimData.siteName, claimData.claimAmount);
        setSnackbar({
          open: true,
          message: '청구예정이 수정되었습니다.',
          severity: 'success'
        });
      } else {
        console.log('=== 청구예정 생성 시작 ===');
        console.log('생성할 데이터:', claimData);
        
        await createClaim(claimData);
        console.log('청구예정 생성 완료 - 실시간 업데이트 대기 중');
        
        // 청구 → 기성 연동
        await syncClaimToProgress(claimData.claimMonth, claimData.siteName, claimData.claimAmount);
        setSnackbar({
          open: true,
          message: '청구예정이 생성되었습니다.',
          severity: 'success'
        });
      }
      setDialogOpen(false);
      setEditingClaim(null);
      resetForm();
    } catch (error) {
      console.error('청구예정 저장 오류:', error);
      
      // 오류 발생 시에도 임시저장 시도
      if (autoSaveEnabled) {
        console.log('오류 발생 - 임시저장 시도');
        addToPendingData(claimData);
        setSnackbar({ 
          open: true, 
          message: `저장에 실패했습니다. 데이터가 임시저장되었습니다. 오류: ${error.message}`, 
          severity: 'warning' 
        });
      } else {
        setSnackbar({
          open: true,
          message: '청구예정 저장에 실패했습니다.',
          severity: 'error'
        });
      }
    }
  };

  // 청구예정 삭제
  const handleDelete = async () => {
    try {
      await deleteClaim(claimToDelete.id);
      
      // 삭제된 항목의 고정 번호 제거
      setFixedNumbers(prevFixedNumbers => {
        const newFixedNumbers = new Map(prevFixedNumbers);
        newFixedNumbers.delete(claimToDelete.id);
        console.log(`🗑️ 삭제된 항목의 고정 번호 제거: ${claimToDelete.siteName}`);
        return newFixedNumbers;
      });
      
      setSnackbar({
        open: true,
        message: '청구예정이 삭제되었습니다.',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setClaimToDelete(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '청구예정 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 수정 다이얼로그 열기
  const handleEdit = (claim) => {
    setEditingClaim(claim);
    
    // 누계기성금액 계산
    const totalGisungAmount = calculateTotalGisungAmount(claim.siteName);
    
    setFormData({
      claimMonth: claim.claimMonth || currentMonth,
      siteName: claim.siteName || '',
      manager: claim.manager || '',
      sequence: claim.sequence || '',
      progressRate: claim.progressRate || '',
      claimAmount: claim.claimAmount || '',
      claimStatus: claim.claimStatus || 'X',
      notes: claim.notes || '',
      isException: claim.isException || false, // 예외 항목 여부 로드
      exceptionAmount: claim.exceptionAmount || '', // 예외 금액 로드
      totalGisungAmount: Math.ceil(totalGisungAmount).toString() // 누계기성금액 계산하여 설정
    });
    setDialogOpen(true);
  };

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (claim) => {
    setClaimToDelete(claim);
    setDeleteDialogOpen(true);
  };

  // 기성등록 버튼 클릭
  const handleProgressRegistration = (claim) => {
    // 기존 경로인 /progress로 이동 (안전한 방법)
    navigate('/progress', { 
      state: { 
        selectedSite: claim.siteName,
        selectedMonth: claim.claimMonth,
        fromPage: 'claims' // 출발 페이지 정보 추가
      }
    });
  };

  // 기성 등록 상태 확인
  const checkProgressStatus = async (claim) => {
    try {
      await checkProgressAndUpdateClaim(claim.claimMonth, claim.siteName);
      setSnackbar({
        open: true,
        message: '기성 등록 상태를 확인했습니다.',
        severity: 'info'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '기성 등록 상태 확인에 실패했습니다.',
        severity: 'error'
      });
    }
  };


  // 엑셀 다운로드 (ExcelJS 버전)
  const handleExportExcel = async () => {
    try {
      // ExcelJS 동적 import
      const ExcelJS = await import('exceljs');
      
      // 현재 월 정보 추출
      const [year, month] = currentMonth.split('-');
      const monthText = `${year}년 ${month}월`;
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('청구예정목록');

      // 제목 행 추가 (A1:J1 병합)
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `${monthText} 청구예정목록`;
      titleCell.font = { name: '맑은 고딕', size: 16, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE3F2FD' }
      };

      // 헤더 행
      const headers = ['NO.', '현장명', '소장/회사명', '차수', '계약금액', '잔액', '청구 전 기성율(%)', '청구금액', '청구여부', '비고'];
      const headerRow = worksheet.addRow(headers);
      
      // 헤더 스타일링
      headerRow.eachCell((cell, colNumber) => {
        cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1976D2' }
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });

      // 데이터 행들 추가
      filteredClaims.forEach((claim, index) => {
        const contractAmount = getContractAmount(claim.siteName) ? Number(getContractAmount(claim.siteName)) : 0;
        const remainingAmount = calculateBalanceByClaimAmount(claim.siteName, claim.claimAmount, claim.isException) ? Number(calculateBalanceByClaimAmount(claim.siteName, claim.claimAmount, claim.isException)) : 0;
        const progressRate = claim.progressRate ? Number(claim.progressRate) : 0;
        const claimAmount = claim.claimAmount ? Number(claim.claimAmount) : 0;
        
        // 천단위 쉼표 포맷팅 함수
        const formatNumber = (num) => {
          return num.toLocaleString('ko-KR');
        };
        
        const row = worksheet.addRow([
          fixedNumbers.get(claim.id) || 'N/A', // NO. (고정 번호)
          claim.siteName || '', // 현장명
          claim.manager || '', // 소장/회사명
          claim.sequence || '', // 차수
          formatNumber(contractAmount), // 계약금액 (천단위 쉼표 포함)
          formatNumber(remainingAmount), // 잔액 (천단위 쉼표 포함)
          progressRate, // 청구 전 기성율(%) (숫자)
          formatNumber(claimAmount), // 청구금액 (천단위 쉼표 포함)
          getStatusLabel(claim.claimStatus), // 청구여부
          claim.notes || '' // 비고
        ]);
        
        // 데이터 행 스타일링
        row.eachCell((cell, colNumber) => {
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
      });
      
      // 컬럼 너비 설정
      worksheet.columns = [
        { width: 8 },   // NO.
        { width: 35 },  // 현장명
        { width: 15 },  // 소장/회사명
        { width: 8 },   // 차수
        { width: 15 },  // 계약금액
        { width: 15 },  // 잔액
        { width: 15 },  // 청구 전 기성율(%)
        { width: 15 },  // 청구금액
        { width: 12 },  // 청구여부
        { width: 20 }   // 비고
      ];
      
      // 행 높이 설정
      worksheet.getRow(1).height = 30; // 제목 행 높이
      worksheet.getRow(2).height = 25; // 헤더 행 높이
      
      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName = `${monthText}_청구예정목록_${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 메모리 정리
      URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: '청구예정목록이 엑셀로 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  // 엑셀 업로드 (새로운 테이블 양식)
  const handleImportExcel = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 헤더 제거하고 데이터만 추출
        const headers = jsonData[0];
        const rows = jsonData.slice(1);

        // 데이터 검증 및 변환
        const processedData = rows
          .filter(row => row.length > 0 && row.some(cell => cell !== null && cell !== ''))
          .map(row => {
            const claim = {};
            headers.forEach((header, index) => {
              const value = row[index];
              switch (header) {
                case '현장명':
                  claim.siteName = value || '';
                  break;
                case '차수':
                  claim.sequence = value || '';
                  break;
                case '계약금액':
                  claim.contractAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '잔액':
                  claim.remainingAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '청구 전 기성율(%)':
                  claim.progressRate = value ? String(value).replace('%', '') : '0';
                  break;
                case '청구금액':
                  claim.claimAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '청구여부':
                  claim.claimStatus = getStatusFromLabel(value);
                  break;
                case '비고':
                  claim.notes = value || '';
                  break;
              }
            });
            return claim;
          });

        console.log('업로드된 데이터:', processedData);
        setSnackbar({ open: true, message: `${processedData.length}개의 청구 데이터가 업로드되었습니다.`, severity: 'success' });

        // 여기서 실제 데이터베이스 업데이트 로직을 추가할 수 있습니다
        // await updateClaimsFromExcel(processedData);

      } catch (error) {
        console.error('엑셀 업로드 오류:', error);
        setSnackbar({ open: true, message: '엑셀 업로드에 실패했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case 'O': return 'success';      // 청구완료: 초록색
      case 'X': return 'warning';      // 청구대기: 주황색
      case '이월': return 'error';     // 이월: 빨간색
      default: return 'default';
    }
  };

  // 청구여부 상태 변경 함수
  const handleClaimStatusChange = async (claim) => {
    try {
      // 현재 상태에 따라 다음 상태로 변경
      let newStatus;
      switch (claim.claimStatus) {
        case 'X':
          newStatus = 'O';
          break;
        case 'O':
          newStatus = '이월';
          break;
        case '이월':
          newStatus = 'X';
          break;
        default:
          newStatus = 'X';
      }

      console.log(`🔄 청구여부 상태 변경: ${claim.siteName} - ${claim.claimStatus} → ${newStatus}`);

      // 현재 페이지 저장 및 플래그 설정
      savedPageRef.current = currentPage;
      setSkipPageReset(true);
      console.log(`📄 현재 페이지 저장: ${currentPage}`);

      // 낙관적 업데이트: UI를 먼저 업데이트 (즉시 반영)
      const updatedClaim = {
        ...claim,
        claimStatus: newStatus,
        updatedAt: new Date(),
        isUpdating: true // 업데이트 중 플래그 추가
      };

      // 로컬 상태 즉시 업데이트 (위치 유지, 페이지네이션 유지)
      setClaims(prevClaims => 
        prevClaims.map(c => c.id === claim.id ? updatedClaim : c)
      );
      setFilteredClaims(prevFiltered => 
        prevFiltered.map(c => c.id === claim.id ? updatedClaim : c)
      );
      
      // 정렬 건너뛰기 플래그 설정 (원래 위치 유지)
      setSkipSorting(true);
      
      // 최근 업데이트된 현장 ID 저장 (시각적 피드백용)
      recentlyUpdatedRef.current.add(claim.id);
      
      // 페이지네이션 상태 유지 (현재 페이지 그대로 유지)
      console.log(`📄 현재 페이지 유지: ${currentPage}`);

      // 백그라운드에서 Firebase 업데이트
      updateClaim(claim.id, updatedClaim).then(() => {
        console.log(`✅ Firebase 업데이트 성공: ${claim.siteName}`);
        // 성공 시 isUpdating 플래그 제거 (정렬은 건너뛰기)
        setSkipSorting(true);
        setClaims(prevClaims => 
          prevClaims.map(c => c.id === claim.id ? { ...c, isUpdating: false } : c)
        );
        setFilteredClaims(prevFiltered => 
          prevFiltered.map(c => c.id === claim.id ? { ...c, isUpdating: false } : c)
        );
        console.log(`🔄 isUpdating 플래그 제거 완료: ${claim.siteName}`);
        
        // 3초 후 시각적 피드백 제거
        setTimeout(() => {
          recentlyUpdatedRef.current.delete(claim.id);
        }, 3000);
      }).catch(error => {
        console.error('Firebase 업데이트 실패:', error);
        // 실패 시 원래 상태로 롤백하고 isUpdating 플래그도 제거 (정렬은 건너뛰기)
        setSkipSorting(true);
        setClaims(prevClaims => 
          prevClaims.map(c => c.id === claim.id ? { ...claim, isUpdating: false } : c)
        );
        setFilteredClaims(prevFiltered => 
          prevFiltered.map(c => c.id === claim.id ? { ...claim, isUpdating: false } : c)
        );
        setSnackbar({
          open: true,
          message: '청구여부 변경에 실패했습니다.',
          severity: 'error'
        });
        console.log(`🔄 실패 시 isUpdating 플래그 제거 완료: ${claim.siteName}`);
        
        // 실패 시에도 시각적 피드백 제거
        recentlyUpdatedRef.current.delete(claim.id);
      });

      // 이월로 변경된 경우 다음달 청구예정에 이월 항목 추가
      if (newStatus === '이월') {
        console.log(`🔄 이월 항목 추가 시작: ${claim.siteName}`);
        try {
          await addCarryoverToNextMonth(claim);
          console.log(`✅ 이월 항목 추가 성공: ${claim.siteName}`);
        } catch (error) {
          console.error('❌ 이월 항목 추가 실패:', error);
          console.error('❌ 에러 상세:', error.message, error.stack);
          // 이월 항목 추가 실패 시에도 원래 항목은 이월 상태로 유지
          setSnackbar({
            open: true,
            message: `이월 항목 추가에 실패했습니다: ${error.message}`,
            severity: 'error'
          });
        }
      }
      
      // 이월에서 청구대기로 변경된 경우 다음달 이월 데이터 삭제
      if (claim.claimStatus === '이월' && newStatus === 'X') {
        console.log(`🗑️ 이월에서 청구대기로 변경 - 다음달 이월 데이터 삭제 시작: ${claim.siteName}`);
        try {
          await deleteCarryoverFromNextMonth(claim);
          console.log(`✅ 다음달 이월 데이터 삭제 성공: ${claim.siteName}`);
        } catch (error) {
          console.error('❌ 다음달 이월 데이터 삭제 실패:', error);
          console.error('❌ 에러 상세:', error.message, error.stack);
          // 삭제 실패 시에도 원래 항목은 청구대기 상태로 유지
          setSnackbar({
            open: true,
            message: `이월 데이터 삭제에 실패했습니다: ${error.message}`,
            severity: 'error'
          });
        }
      }

      // 성공 메시지
      if (newStatus === '이월') {
        setSnackbar({
          open: true,
          message: `청구여부가 이월로 변경되었습니다. 다음달에 복제된 항목이 생성되었습니다.`,
          severity: 'success'
        });
      } else if (claim.claimStatus === '이월' && newStatus === 'X') {
        setSnackbar({
          open: true,
          message: `청구여부가 청구대기로 변경되었습니다. 다음달 이월 데이터가 삭제되었습니다.`,
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: `청구여부가 ${getStatusLabel(newStatus)}로 변경되었습니다.`,
          severity: 'success'
        });
      }

    } catch (error) {
      console.error('청구여부 상태 변경 실패:', error);
      setSnackbar({
        open: true,
        message: '청구여부 변경에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 상태 라벨 가져오기
  const getStatusLabel = (status) => {
    switch (status) {
      case 'O': return '청구완료';
      case 'X': return '청구대기';
      case '이월': return '이월';
      default: return '청구대기';
    }
  };


  // 다음달 이월 데이터 삭제
  const deleteCarryoverFromNextMonth = async (claim) => {
    try {
      console.log(`🗑️ 다음달 이월 데이터 삭제 시작`);
      console.log(`📋 원본 항목 데이터:`, claim);
      console.log(`📅 현재 항목 월: ${claim.claimMonth}`);
      
      // 현재 항목의 월에서 다음달 계산
      const [year, month] = claim.claimMonth.split('-').map(Number);
      let nextYear = year;
      let nextMonth = month + 1;
      
      // 12월을 넘어가면 다음 해 1월로
      if (nextMonth > 12) {
        nextYear += 1;
        nextMonth = 1;
      }
      
      const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
      console.log(`📅 삭제할 다음달: "${nextMonthStr}"`);
      
      // 다음달의 이월 항목 찾기
      const { getDocs, collection, query, where, deleteDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const carryoverQuery = query(
        collection(db, 'claims'),
        where('siteName', '==', claim.siteName),
        where('claimMonth', '==', nextMonthStr),
        where('sequence', '==', claim.sequence),
        where('isCarryover', '==', true)
      );
      
      const carryoverSnapshot = await getDocs(carryoverQuery);
      
      if (carryoverSnapshot.empty) {
        console.log(`⚠️ ${nextMonthStr}에 삭제할 이월 항목이 없습니다.`);
        return;
      }
      
      // 이월 항목들 삭제
      const deletePromises = carryoverSnapshot.docs.map(doc => {
        console.log(`🗑️ 이월 항목 삭제: ${doc.id}`);
        return deleteDoc(doc.ref);
      });
      
      await Promise.all(deletePromises);
      console.log(`✅ ${nextMonthStr}의 이월 항목 ${carryoverSnapshot.docs.length}개 삭제 완료`);
      
    } catch (error) {
      console.error('❌ 이월 데이터 삭제 실패:', error);
      throw error;
    }
  };

  // 다음달 청구예정에 이월 항목 추가
  const addCarryoverToNextMonth = async (claim) => {
    try {
      console.log(`🔄 다음달 청구예정에 이월 항목 추가 시작`);
      console.log(`📋 원본 항목 데이터:`, claim);
      console.log(`📅 현재 항목 월: ${claim.claimMonth}`);
      
      // 현재 항목의 월에서 다음달 계산 (단순한 월 증가 방식)
      const [year, month] = claim.claimMonth.split('-').map(Number);
      console.log(`📅 파싱된 년월: ${year}년 ${month}월`);
      console.log(`📅 원본 claimMonth: "${claim.claimMonth}"`);
      
      // 단순하게 월만 증가
      let nextYear = year;
      let nextMonth = month + 1;
      
      console.log(`📅 계산 전: ${nextYear}년 ${nextMonth}월`);
      
      // 12월을 넘어가면 다음 해 1월로
      if (nextMonth > 12) {
        nextYear += 1;
        nextMonth = 1;
        console.log(`📅 12월 초과로 인한 연도 증가: ${nextYear}년 ${nextMonth}월`);
      }
      
      const nextMonthStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
      console.log(`📅 최종 계산된 다음달: "${nextMonthStr}"`);
      
      // 이미 해당 월에 이월 항목이 있는지 확인
      const { getDocs, collection, query, where } = await import('firebase/firestore');
      const { db } = await import('../firebase');
      
      const existingQuery = query(
        collection(db, 'claims'),
        where('siteName', '==', claim.siteName),
        where('claimMonth', '==', nextMonthStr),
        where('sequence', '==', claim.sequence),
        where('isCarryover', '==', true)
      );
      
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        console.log(`⚠️ 이미 ${nextMonthStr}에 이월 항목이 존재합니다.`);
        setSnackbar({
          open: true,
          message: `${nextMonthStr}에 이미 이월 항목이 존재합니다.`,
          severity: 'warning'
        });
        return;
      }
      
      // 이월 항목 데이터 생성
      const carryoverData = {
        siteName: claim.siteName,
        claimMonth: nextMonthStr,
        claimAmount: claim.claimAmount,
        sequence: claim.sequence,
        manager: claim.manager || '', // 관리자 정보 복사
        progressRate: claim.progressRate || 0, // 진행률 정보 복사
        claimStatus: 'X', // 청구대기로 시작
        isCarryover: true, // 이월 항목 표시
        carryoverFrom: claim.claimMonth, // 이월된 원본 월
        carryoverDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(`📝 이월 항목 데이터:`, carryoverData);
      
      // Firebase에 이월 항목 추가
      const { addDoc } = await import('firebase/firestore');
      
      const docRef = await addDoc(collection(db, 'claims'), carryoverData);
      
      console.log(`✅ 다음달 청구예정에 이월 항목 추가 완료: ${claim.siteName}`);
      console.log(`📄 생성된 문서 ID: ${docRef.id}`);
      console.log(`📊 저장된 데이터:`, carryoverData);
      
      // 성공 메시지
      setSnackbar({
        open: true,
        message: `${nextMonthStr} 청구예정에 복제된 항목이 생성되었습니다.`,
        severity: 'success'
      });
      
    } catch (error) {
      console.error('❌ 다음달 청구예정 이월 항목 추가 실패:', error);
      setSnackbar({
        open: true,
        message: `이월 항목 추가에 실패했습니다: ${error.message}`,
        severity: 'error'
      });
    }
  };

  // 금액 포맷팅 (정수로 표시)
  const formatAmount = (amount) => {
    if (!amount) return '0';
    // 정수로 변환 후 포맷팅
    const integerAmount = Math.round(Number(amount));
    return new Intl.NumberFormat('ko-KR').format(integerAmount);
  };

  // 페이지네이션 핸들러
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(Number(event.target.value));
    setCurrentPage(1);
  };

  // 정렬 핸들러
  const handleSort = (column) => {
    if (sortBy === column) {
      // 같은 컬럼 클릭 시 오름차순/내림차순 토글
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 다른 컬럼 클릭 시 해당 컬럼으로 정렬 (기본 오름차순)
      setSortBy(column);
      setSortOrder('asc');
    }
    setCurrentPage(1); // 정렬 변경 시 첫 페이지로 이동
  };

  // 정렬 아이콘 표시 함수
  const getSortIcon = (column) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredClaims.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClaims = filteredClaims.slice(startIndex, endIndex);

  console.log('Claims 렌더링, loading:', loading, 'claims:', claims.length);
  
  // 로딩 상태가 1초 이상 지속되면 강제로 해제
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        console.log('로딩 타임아웃, 강제로 로딩 상태 해제');
        setLoading(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    return (
      <Box sx={{ 
        backgroundColor: '#181a20', 
        minHeight: '100vh',
        color: 'white',
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h4" sx={{ color: '#90caf9', mb: 2 }}>
          청구 관리
        </Typography>
        <Typography>로딩 중...</Typography>
        <Typography variant="body2" sx={{ color: '#ccc', mt: 2 }}>
          데이터를 불러오는 중입니다. 잠시만 기다려주세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      backgroundColor: '#181a20', 
      minHeight: '100vh',
      color: 'white',
      p: { xs: 1, md: 3 },
      pt: { xs: '49px', md: '74px' }, // 모바일에서 위로 10px 이동 (59px → 49px)
      // 스마트폰에서만 적용
      '@media (max-width: 767px)': {
        bgcolor: '#f5f5f5',
        color: '#333',
        p: 2,
        pt: 2
      }
    }}>
      {/* 스마트폰 전용 안내 메시지 */}
      <Box sx={{
        display: 'none',
        // 스마트폰에서만 표시
        '@media (max-width: 767px)': {
          display: 'block',
          bgcolor: 'white',
          borderRadius: '12px',
          p: 3,
          mb: 3,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          border: '2px solid #ff9800'
        }
      }}>
        <Typography variant="h6" sx={{ 
          color: '#ff9800', 
          fontWeight: 'bold', 
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
          📋 복잡한 청구 관리 기능
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          이 페이지는 복잡한 청구 관리와 데이터 분석 기능을 포함하고 있어 스마트폰에서 사용하기 어렵습니다.
        </Typography>
        <Typography variant="body2" sx={{ color: '#666', mb: 2 }}>
          더 나은 사용 경험을 위해 웹 브라우저나 태블릿에서 이용해 주세요.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/schedule')}
          sx={{
            bgcolor: '#2E7D32',
            '&:hover': { bgcolor: '#1B5E20' }
          }}
        >
          일정 관리로 돌아가기
        </Button>
      </Box>

      {/* 헤더와 스마트카드 */}
      <Box sx={{ 
        mb: 3,
        // 스마트폰에서 숨김
        '@media (max-width: 767px)': {
          display: 'none'
        }
      }}>
        {isMobile ? (
          // 모바일 버전: 제목과 돌아가기 버튼을 한 줄에 배치
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                📋 {getMonthLabel(currentMonth).replace('LIST', '')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/schedule')}
                sx={{ 
                  color: '#90caf9', 
                  borderColor: '#90caf9',
                  minWidth: 'auto',
                  px: 2
                }}
              >
                돌아가기
              </Button>
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 3 }}>
              <Typography variant="body1" sx={{ color: '#ccc', textAlign: 'center' }}>
                월별 청구예정을 관리하고 기성 등록과 연동하는 공간입니다.
              </Typography>
              
              {/* 월별 청구대기 개수 표시 (모바일) */}
              <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                {(() => {
                  // 월별로 정렬하여 일관된 순서 유지
                  return Object.entries(monthlyPendingCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([monthStr, count]) => {
                      const [year, month] = monthStr.split('-');
                      const isCurrentMonth = monthStr === currentMonth;
                      return (
                        <Box
                          key={monthStr}
                          onClick={() => setCurrentMonth(monthStr)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1.2,
                            py: 0.6,
                            borderRadius: 0.8,
                            backgroundColor: isCurrentMonth ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: isCurrentMonth ? '1px solid #90caf9' : '1px solid transparent',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: isCurrentMonth ? 'rgba(144, 202, 249, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                              transform: 'scale(1.05)'
                            }
                          }}
                        >
                          <Typography variant="body2" sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {parseInt(month)}월
                          </Typography>
                          <Typography variant="body2" sx={{ color: count > 0 ? '#ff9800' : '#90caf9', fontSize: '0.8rem', fontWeight: 'bold' }}>
                            {count}
                          </Typography>
                        </Box>
                      );
                    });
                })()}
              </Box>
            </Box>
          </Box>
        ) : (
          // PC 버전: 제목과 스마트카드 같은 줄
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                📋 {getMonthLabel(currentMonth)}
              </Typography>
              
              {/* 오른쪽: 스마트 카드 */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '120px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 0 }}>
                    <Typography variant="h5" sx={{ color: '#90caf9', fontWeight: 'bold', mb: 0.5, pt: '10px' }}>{stats.total}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>전체</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '120px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 0 }}>
                    <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold', mb: 0.5, pt: '10px' }}>{stats.claimed}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>완료</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '120px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 0 }}>
                    <Typography variant="h5" sx={{ color: '#f44336', fontWeight: 'bold', mb: 0.5, pt: '10px' }}>{stats.notClaimed}</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>이월</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '180px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 0 }}>
                    <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 'bold', mb: 0.5, pt: '10px' }}>
                      {formatAmount(stats.totalAmount)}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>총액</Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body1" sx={{ color: '#ccc' }}>
                월별 청구예정을 관리하고 기성 등록과 연동하는 공간입니다.
              </Typography>
              
              {/* 월별 청구대기 개수 표시 (설명 텍스트와 같은 라인, 오른쪽 정렬) */}
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {(() => {
                  // 월별로 정렬하여 일관된 순서 유지
                  return Object.entries(monthlyPendingCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([monthStr, count]) => {
                      const [year, month] = monthStr.split('-');
                      const isCurrentMonth = monthStr === currentMonth;
                      return (
                        <Box
                          key={monthStr}
                          onClick={() => setCurrentMonth(monthStr)}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.8,
                            px: 1.5,
                            py: 0.8,
                            borderRadius: 1.5,
                            backgroundColor: isCurrentMonth ? 'rgba(144, 202, 249, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                            border: isCurrentMonth ? '1px solid #90caf9' : '1px solid transparent',
                            transition: 'all 0.3s ease',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: isCurrentMonth ? 'rgba(144, 202, 249, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                            }
                          }}
                        >
                          <Typography variant="body1" sx={{ color: isCurrentMonth ? '#90caf9' : '#ccc', fontWeight: 'bold' }}>
                            {parseInt(month)}월 {count > 0 && <span style={{ color: '#ff4444' }}>{count}</span>}
                          </Typography>
                        </Box>
                      );
                    });
                })()}
              </Box>
            </Box>
          </>
        )}
      </Box>

            {/* 검색 및 필터 - 모바일에서는 한 줄에 배치 */}
      <Paper sx={{ backgroundColor: '#2d3748', p: 2, mb: 2 }}>
        {isMobile ? (
          // 모바일: 검색창과 새청구 버튼을 한 줄에 배치
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder={filters.searchAll ? "전체 월에서 검색..." : "현재 월에서 검색..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
                endAdornment: (
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm('')}
                    sx={{ color: '#666', mr: 0.5 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                ),
                sx: { 
                  backgroundColor: '#444',
                  height: '40px',
                  '& input': { 
                    color: 'white',
                    height: '40px',
                    padding: '8px 16px'
                  },
                  '& .MuiOutlinedInput-root': {
                    height: '40px',
                    '& fieldset': {
                      borderColor: '#666'
                    },
                    '&:hover fieldset': {
                      borderColor: '#888'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#90caf9'
                    }
                  }
                }
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingClaim(null);
                resetForm();
                setDialogOpen(true);
              }}
              sx={{ 
                backgroundColor: '#4caf50',
                height: '40px',
                minWidth: '100px',
                fontSize: '14px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              새청구
            </Button>
          </Box>
        ) : (
          // PC: 기존 레이아웃 유지
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {/* 왼쪽: 검색과 필터 */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                placeholder={filters.searchAll ? "전체 월에서 검색..." : "현재 월에서 검색..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
                  endAdornment: (
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm('')}
                      sx={{ color: '#666', mr: 0.5 }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  ),
                  sx: { 
                    backgroundColor: '#444',
                    height: '40px',
                    '& input': { 
                      color: 'white',
                      height: '40px',
                      padding: '8px 16px'
                    },
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      '& fieldset': {
                        borderColor: '#666'
                      },
                      '&:hover fieldset': {
                        borderColor: '#888'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#90caf9'
                      }
                    }
                  }
                }}
                sx={{ width: '250px' }}
              />
              <FormControl size="small" sx={{ width: '150px' }}>
                <InputLabel sx={{ color: '#ccc' }}>청구여부</InputLabel>
                <Select
                  value={filters.claimStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, claimStatus: e.target.value }))}
                  sx={{ 
                    backgroundColor: '#444',
                    height: '40px',
                    '& .MuiSelect-select': { 
                      color: 'white',
                      height: '40px',
                      padding: '8px 16px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center'
                    },
                    '& .MuiOutlinedInput-root': {
                      height: '40px',
                      '& fieldset': {
                        borderColor: '#666'
                      },
                      '&:hover fieldset': {
                        borderColor: '#888'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#90caf9'
                      }
                    }
                  }}
                >
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="O">청구완료</MenuItem>
                  <MenuItem value="X">청구대기</MenuItem>
                  <MenuItem value="이월">이월</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.searchAll}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchAll: e.target.checked }))}
                    sx={{
                      color: '#90caf9',
                      '&.Mui-checked': {
                        color: '#90caf9',
                      },
                    }}
                  />
                }
                label={
                  <Typography sx={{ color: '#ccc', fontSize: '14px' }}>
                    전체 검색
                  </Typography>
                }
              />
            </Box>

            {/* 중앙: 액션 버튼들 */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleExportExcel}
                size="small"
                sx={{ 
                  color: '#90caf9', 
                  borderColor: '#90caf9',
                  height: '40px',
                  fontSize: '14px'
                }}
              >
                엑셀 다운로드
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ display: 'none' }}
                id="excel-upload"
              />
              <label htmlFor="excel-upload">
                <Button
                  variant="outlined"
                  startIcon={<UploadIcon />}
                  component="span"
                  size="small"
                  sx={{ 
                    color: '#90caf9', 
                    borderColor: '#90caf9',
                    height: '40px',
                    fontSize: '14px'
                  }}
                >
                  엑셀 업로드
                </Button>
              </label>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingClaim(null);
                  resetForm();
                  setDialogOpen(true);
                }}
                size="small"
                sx={{ 
                  backgroundColor: '#4caf50',
                  height: '40px',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                새 청구예정
              </Button>
            </Box>

            {/* 오른쪽 끝: 월별 네비게이션 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentMonth(getPreviousMonth(currentMonth))}
                sx={{ 
                  color: '#90caf9', 
                  borderColor: '#90caf9',
                  '&:hover': { borderColor: '#64b5f6' },
                  minWidth: '50px',
                  height: '40px',
                  fontSize: '14px'
                }}
              >
              이전
            </Button>
            
            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 'bold', minWidth: '80px', textAlign: 'center', fontSize: '1.1rem' }}>
              {getNavigationMonthLabel(currentMonth)}
            </Typography>
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCurrentMonth(getNextMonth(currentMonth))}
              sx={{ 
                color: '#90caf9', 
                borderColor: '#90caf9',
                '&:hover': { borderColor: '#64b5f6' },
                minWidth: '50px',
                height: '40px',
                fontSize: '14px'
              }}
            >
              다음
            </Button>
          </Box>
        </Box>
        )}
      </Paper>

      {/* 모바일 필터 및 월 네비게이션 */}
      {isMobile && (
        <Paper sx={{ backgroundColor: '#2d3748', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* 청구여부 드롭다운 */}
            <FormControl size="small" fullWidth>
              <InputLabel sx={{ color: '#ccc', fontSize: '12px' }}>청구여부</InputLabel>
              <Select
                value={filters.claimStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, claimStatus: e.target.value }))}
                sx={{ 
                  backgroundColor: '#444',
                  height: '40px',
                  '& .MuiSelect-select': { 
                    color: 'white',
                    fontSize: '12px',
                    height: '40px',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center'
                  },
                  '& .MuiOutlinedInput-root': {
                    height: '40px',
                    '& fieldset': {
                      borderColor: '#666'
                    },
                    '&:hover fieldset': {
                      borderColor: '#888'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#90caf9'
                    }
                  }
                }}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="O">청구완료</MenuItem>
                <MenuItem value="X">청구대기</MenuItem>
                <MenuItem value="이월">이월</MenuItem>
              </Select>
            </FormControl>
            
            {/* 전체 검색 체크박스 */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={filters.searchAll}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchAll: e.target.checked }))}
                  sx={{
                    color: '#90caf9',
                    '&.Mui-checked': {
                      color: '#90caf9',
                    },
                  }}
                />
              }
              label={
                <Typography sx={{ color: '#ccc', fontSize: '12px' }}>
                  전체 검색
                </Typography>
              }
            />
            
            {/* 월 네비게이션 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentMonth(getPreviousMonth(currentMonth))}
                sx={{ 
                  color: '#90caf9', 
                  borderColor: '#90caf9',
                  minWidth: '50px',
                  fontSize: '12px',
                  height: '40px'
                }}
              >
                이전
              </Button>
              <Typography variant="body1" sx={{ color: 'white', px: 2, fontWeight: 'bold', fontSize: '1.1rem' }}>
                {getNavigationMonthLabel(currentMonth)}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setCurrentMonth(getNextMonth(currentMonth))}
                sx={{ 
                  color: '#90caf9', 
                  borderColor: '#90caf9',
                  minWidth: '50px',
                  fontSize: '12px',
                  height: '40px'
                }}
              >
                다음
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* 테이블 */}
      <Paper sx={{ backgroundColor: '#2d3748', overflow: 'hidden' }}>
        <TableContainer sx={{ 
          maxHeight: isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 400px)',
          overflowX: isMobile ? 'auto' : 'hidden'
        }}>
          <Table size="small" sx={{ minWidth: isMobile ? 900 : 'auto' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#444' }}>
                {isMobile ? (
                  <>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 60, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('number')}
                    >
                      No. {getSortIcon('number')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 120, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('siteName')}
                    >
                      현장명 {getSortIcon('siteName')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 120, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('claimAmount')}
                    >
                      청구금액 {getSortIcon('claimAmount')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 100, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('claimStatus')}
                    >
                      청구여부 {getSortIcon('claimStatus')}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 60, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('number')}
                    >
                      No. {getSortIcon('number')}
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100, py: 0.5 }}>청구월</TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 320, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('siteName')}
                    >
                      현장명 {getSortIcon('siteName')}
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 60, py: 0.5 }}>소장/회사명</TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 80, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('sequence')}
                    >
                      차수 {getSortIcon('sequence')}
                    </TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120, py: 0.5 }}>계약금액</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120, py: 0.5 }}>잔액</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80, py: 0.5 }}>청구 전 기성율(%)</TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 120, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('claimAmount')}
                    >
                      청구금액 {getSortIcon('claimAmount')}
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        color: 'white', 
                        fontWeight: 'bold', 
                        minWidth: 100, 
                        py: 0.5,
                        cursor: 'pointer',
                        '&:hover': { backgroundColor: '#555' }
                      }}
                      onClick={() => handleSort('claimStatus')}
                    >
                      청구여부 {getSortIcon('claimStatus')}
                    </TableCell>
                    <TableCell sx={{ 
                      color: 'white', 
                      fontWeight: 'bold', 
                      minWidth: 100,
                      py: 0.5,
                      // 아이패드에서 숨김
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        display: 'none'
                      }
                    }}>비고</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100, py: 0.5 }}>관리</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentClaims.map((claim, index) => {
                const isRecentlyUpdated = recentlyUpdatedRef.current.has(claim.id);
                return (
                  <TableRow 
                    key={claim.id} 
                    sx={{ 
                      '&:hover': { backgroundColor: '#444' }, 
                      '& td': { py: 0.5 },
                      // 최근 업데이트된 현장 하이라이트
                      ...(isRecentlyUpdated && {
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderLeft: '4px solid #4caf50',
                        animation: 'pulse 2s ease-in-out',
                        '@keyframes pulse': {
                          '0%': { backgroundColor: 'rgba(76, 175, 80, 0.2)' },
                          '50%': { backgroundColor: 'rgba(76, 175, 80, 0.1)' },
                          '100%': { backgroundColor: 'rgba(76, 175, 80, 0.1)' }
                        }
                      })
                    }}
                  >
                    <TableCell sx={{ color: 'white' }}>{fixedNumbers.get(claim.id) || 'N/A'}</TableCell>
                    {isMobile ? (
                      <>
                        <TableCell sx={{ color: 'white' }}>
                          {claim.siteName}
                          {claim.isCarryover && (
                            <Typography
                              component="span"
                              sx={{
                                ml: 1,
                                color: '#ff9800',
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                              }}
                              title={`${claim.carryoverFrom}에서 이월됨`}
                            >
                              (이월됨)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: '#ff6b6b', fontWeight: 'bold' }}>{formatAmount(claim.claimAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(claim.claimStatus)}
                            color={getStatusColor(claim.claimStatus)}
                            size="small"
                            onClick={() => handleClaimStatusChange(claim)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8,
                                transform: 'scale(1.05)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ color: 'white' }}>{claim.claimMonth}</TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          <span style={{
                            // 아이패드에서 현장명 앞 6글자만 표시
                            '@media (min-width: 768px) and (max-width: 1024px)': {
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '80px'
                            }
                          }}>
                            {claim.siteName && claim.siteName.length > 16 ? 
                              `${claim.siteName.substring(0, 16)}...` : 
                              claim.siteName
                            }
                          </span>
                          {claim.isCarryover && (
                            <Typography
                              component="span"
                              sx={{
                                ml: 1,
                                color: '#ff9800',
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                              }}
                              title={`${claim.carryoverFrom}에서 이월됨`}
                            >
                              (이월됨)
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {(() => {
                            if (claim.manager) {
                              // claim.manager에 회사명이 포함되어 있는지 확인 (슬래시가 있으면)
                              if (claim.manager.includes('/')) {
                                return claim.manager; // 이미 소장명/회사명 형태면 그대로 표시
                              } else {
                                // 소장명만 있으면 현장관리에서 회사명 가져와서 합치기
                                const siteInfo = getSiteInfo(claim.siteName);
                                if (siteInfo.company) {
                                  return `${claim.manager} / ${siteInfo.company}`;
                                } else {
                                  return claim.manager; // 회사명이 없으면 소장명만
                                }
                              }
                            } else {
                              // claim.manager가 없으면 현장관리에서 가져오기
                              return getDisplaySiteName(claim.siteName);
                            }
                          })()}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.sequence}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatAmount(getContractAmount(claim.siteName))}</TableCell>
                        <TableCell sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                          {(() => {
                            // 청구여부에 따른 잔액 계산
                            const contractAmount = getContractAmount(claim.siteName);
                            const totalGisungAmount = calculateTotalGisungAmount(claim.siteName);
                            const claimAmount = Number(claim.claimAmount) || 0;
                            
                            let balance;
                            if (claim.claimStatus === 'O') {
                              // 청구완료: 계약금액 - 누계기성금액 - 금회청구금액
                              balance = contractAmount - totalGisungAmount - claimAmount;
                            } else {
                              // 청구대기: 계약금액 - 누계기성금액
                              balance = contractAmount - totalGisungAmount;
                            }
                            
                            return formatAmount(Math.max(0, Math.ceil(balance)));
                          })()}
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{calculateProgressRate(claim.siteName)}%</TableCell>
                        <TableCell sx={{ color: '#ff6b6b', fontWeight: 'bold' }}>{formatAmount(claim.claimAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(claim.claimStatus)}
                            color={getStatusColor(claim.claimStatus)}
                            size="small"
                            onClick={() => handleClaimStatusChange(claim)}
                            sx={{
                              cursor: 'pointer',
                              '&:hover': {
                                opacity: 0.8,
                                transform: 'scale(1.05)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ 
                          color: 'white',
                          // 아이패드에서 숨김
                          '@media (min-width: 768px) and (max-width: 1024px)': {
                            display: 'none'
                          }
                        }}>{claim.notes}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="기성등록">
                              <Button
                                variant="text"
                                size="small"
                                onClick={() => handleProgressRegistration(claim)}
                                sx={{ 
                                  color: '#4caf50',
                                  fontSize: '1.2rem',
                                  fontWeight: 'bold',
                                  minWidth: '32px',
                                  width: '32px',
                                  height: '32px',
                                  '&:hover': {
                                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                                  }
                                }}
                              >
                                +
                              </Button>
                            </Tooltip>
                            <Tooltip title="수정">
                              <IconButton
                                size="small"
                                onClick={() => handleEdit(claim)}
                                sx={{ color: '#90caf9' }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="삭제">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(claim)}
                                sx={{ color: '#f44336' }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 커스텀 페이지네이션 */}
        {totalPages > 1 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mt: 3, 
            p: 2, 
            backgroundColor: '#2a2a2a',
            borderRadius: 1
          }}>
            {/* 페이지당 항목 수 선택 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
                페이지당:
              </Typography>
              <FormControl size="small" sx={{ minWidth: 80 }}>
                <Select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    }
                  }}
                >
                  <MenuItem value={5}>5개</MenuItem>
                  <MenuItem value={10}>10개</MenuItem>
                  <MenuItem value={20}>20개</MenuItem>
                  <MenuItem value={50}>50개</MenuItem>
                </Select>
              </FormControl>
              <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
                총 {filteredClaims.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredClaims.length)}개
              </Typography>
            </Box>

            {/* 페이지 네비게이션 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 첫 페이지 버튼 */}
              <IconButton
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                sx={{
                  color: currentPage === 1 ? '#666' : '#90caf9',
                  '&:hover': { backgroundColor: currentPage === 1 ? 'transparent' : '#90caf9' + '20' }
                }}
              >
                <FirstPageIcon />
              </IconButton>

              {/* 이전 페이지 버튼 */}
              <IconButton
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                sx={{
                  color: currentPage === 1 ? '#666' : '#90caf9',
                  '&:hover': { backgroundColor: currentPage === 1 ? 'transparent' : '#90caf9' + '20' }
                }}
              >
                <NavigateBeforeIcon />
              </IconButton>

              {/* 페이지 번호들 */}
              {getPageNumbers().map((page) => (
                <Button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  variant={currentPage === page ? 'contained' : 'outlined'}
                  sx={{
                    minWidth: 40,
                    height: 40,
                    backgroundColor: currentPage === page ? '#90caf9' : 'transparent',
                    color: currentPage === page ? '#fff' : '#90caf9',
                    borderColor: '#90caf9',
                    '&:hover': {
                      backgroundColor: currentPage === page ? '#42a5f5' : '#90caf9' + '20'
                    }
                  }}
                >
                  {page}
                </Button>
              ))}

              {/* 다음 페이지 버튼 */}
              <IconButton
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                sx={{
                  color: currentPage === totalPages ? '#666' : '#90caf9',
                  '&:hover': { backgroundColor: currentPage === totalPages ? 'transparent' : '#90caf9' + '20' }
                }}
              >
                <NavigateNextIcon />
              </IconButton>

              {/* 마지막 페이지 버튼 */}
              <IconButton
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                sx={{
                  color: currentPage === totalPages ? '#666' : '#90caf9',
                  '&:hover': { backgroundColor: currentPage === totalPages ? 'transparent' : '#90caf9' + '20' }
                }}
              >
                <LastPageIcon />
              </IconButton>
            </Box>
          </Box>
        )}
      </Paper>

      {/* 청구예정 생성/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth={isMobile ? "xs" : "md"}
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { 
            backgroundColor: '#2d3748', 
            color: 'white',
            ...(isMobile && {
              margin: 0,
              borderRadius: 0,
              height: '100vh'
            })
          }
        }}
      >
        <DialogTitle sx={{ ...(isMobile && { borderBottom: '1px solid #555', pb: 1 }) }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant={isMobile ? "h6" : "h5"}>
              {editingClaim ? '청구예정 수정' : '새 청구예정'}
            </Typography>
            {isMobile && (
              <IconButton onClick={() => setDialogOpen(false)} sx={{ color: '#ccc' }}>
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ ...(isMobile && { p: 2 }) }}>
          {isMobile ? (
            // 모바일 레이아웃
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="청구월"
                type="month"
                value={formData.claimMonth}
                onChange={(e) => setFormData(prev => ({ ...prev, claimMonth: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <SearchableSiteSelect
                sites={sites}
                value={formData.siteName}
                onChange={handleSiteSelect}
                label="현장명"
                placeholder="현장명을 검색하세요"
                size="small"
                isMobile={isMobile}
                excludeFullyPaidSites={true}
                paymentStatusMap={paymentStatusMap}
                sx={{ 
                  width: '250px', // 현장명 입력칸 너비를 250px로 설정
                  '& .MuiOutlinedInput-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <TextField
                fullWidth
                label="소장/회사명"
                value={formData.manager}
                onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                size="small"
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <TextField
                fullWidth
                label="차수"
                value={formData.sequence}
                onChange={(e) => setFormData(prev => ({ ...prev, sequence: e.target.value }))}
                size="small"
                sx={{ 
                  width: '150px', // 차수 입력부분 너비를 150px로 설정
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <TextField
                fullWidth
                label="계약금액"
                value={formData.siteName ? Math.ceil(Number(getContractAmount(formData.siteName))).toLocaleString() : ''}
                InputProps={{
                  endAdornment: <InputAdornment position="end">원</InputAdornment>,
                  readOnly: true,
                }}
                size="small"
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#333' },
                  '& .MuiInputLabel-root': { color: '#999' },
                  '& .MuiInputBase-input': { color: '#ccc' }
                }}
              />
              
              <Box sx={{ display: 'flex', gap: 1, width: '100%' }}>
                <TextField
                  label="기성율(%)"
                  type="number"
                  value={formData.progressRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, progressRate: e.target.value }))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  size="small"
                  sx={{ 
                    flex: 1,
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
                
                <TextField
                  label="누계기성금액"
                  value={formData.totalGisungAmount ? Math.ceil(Number(formData.totalGisungAmount)).toLocaleString() : ''}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">원</InputAdornment>,
                    readOnly: true,
                  }}
                  size="small"
                  sx={{ 
                    flex: 2,
                    '& .MuiInputBase-root': { backgroundColor: '#333' },
                    '& .MuiInputLabel-root': { color: '#999' },
                    '& .MuiInputBase-input': { color: '#ccc' }
                  }}
                />
                
                <TextField
                  label="잔액"
                  value={(() => {
                    if (!formData.siteName) return '';
                    const contractAmount = Number(getContractAmount(formData.siteName)) || 0;
                    const totalGisungAmount = Number(formData.totalGisungAmount) || 0;
                    const claimAmount = Number(formData.claimAmount) || 0;
                    const claimStatus = formData.claimStatus || 'X';
                    
                    // 청구여부에 따른 잔액 계산
                    let balance;
                    if (claimStatus === 'O') {
                      // 청구완료: 계약금액 - 누계기성금액 - 금회청구금액
                      balance = contractAmount - totalGisungAmount - claimAmount;
                    } else {
                      // 청구대기: 계약금액 - 누계기성금액
                      balance = contractAmount - totalGisungAmount;
                    }
                    
                    return Math.max(0, Math.ceil(balance)).toLocaleString();
                  })()}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">원</InputAdornment>,
                    readOnly: true,
                  }}
                  size="small"
                  sx={{ 
                    flex: 2,
                    '& .MuiInputBase-root': { backgroundColor: '#333' },
                    '& .MuiInputLabel-root': { color: '#999' },
                    '& .MuiInputBase-input': { color: '#ccc' }
                  }}
                />
                
                <TextField
                  label="청구금액"
                  value={formData.claimAmount ? Math.ceil(Number(formData.claimAmount)).toLocaleString() : ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, '');
                    if (!isNaN(value) || value === '') {
                      setFormData(prev => ({ ...prev, claimAmount: value }));
                    }
                  }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">원</InputAdornment>,
                  }}
                  size="small"
                  sx={{ 
                    flex: 2,
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Box>
              
              <FormControl size="small" sx={{ width: '150px' }}>
                <InputLabel sx={{ color: '#ccc' }}>청구여부</InputLabel>
                <Select
                  value={formData.claimStatus || 'X'}
                  onChange={(e) => setFormData(prev => ({ ...prev, claimStatus: e.target.value }))}
                  sx={{ 
                    backgroundColor: '#444',
                    '& .MuiSelect-select': { 
                      color: 'white',
                      padding: '8px 16px',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center'
                    },
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#666'
                      },
                      '&:hover fieldset': {
                        borderColor: '#888'
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#90caf9'
                      }
                    }
                  }}
                >
                  <MenuItem value="X">청구대기</MenuItem>
                  <MenuItem value="O">청구완료</MenuItem>
                  <MenuItem value="이월">이월</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                size="small"
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.isException}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      isException: e.target.checked,
                      exceptionAmount: e.target.checked ? formData.claimAmount : ''
                    }))}
                    sx={{ color: '#ff6b6b' }}
                  />
                }
                label={
                  <Typography sx={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    ⚠️ 예외 항목 (계약금액과 분리 관리)
                  </Typography>
                }
                sx={{ 
                  '& .MuiFormControlLabel-label': { 
                    color: '#ff6b6b',
                    fontWeight: 'bold'
                  }
                }}
              />
            </Box>
          ) : (
            // 데스크톱 레이아웃
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="청구월"
                  type="month"
                  value={formData.claimMonth}
                  onChange={(e) => setFormData(prev => ({ ...prev, claimMonth: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  sx={{ 
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <SearchableSiteSelect
                  sites={sites}
                  value={formData.siteName}
                  onChange={handleSiteSelect}
                  label="현장명"
                  placeholder="현장명을 검색하세요"
                  size="medium"
                  isMobile={isMobile}
                  excludeFullyPaidSites={true}
                  paymentStatusMap={paymentStatusMap}
                  sx={{ 
                    width: '250px', // 현장명 입력칸 너비를 250px로 설정
                    '& .MuiOutlinedInput-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="소장/회사명"
                  value={formData.manager}
                  onChange={(e) => setFormData(prev => ({ ...prev, manager: e.target.value }))}
                  sx={{ 
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="차수"
                  value={formData.sequence}
                  onChange={(e) => setFormData(prev => ({ ...prev, sequence: e.target.value }))}
                  sx={{ 
                    width: '150px', // 차수 입력부분 너비를 150px로 설정
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="계약금액"
                  value={formData.siteName ? Math.ceil(Number(getContractAmount(formData.siteName))).toLocaleString() : ''}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">원</InputAdornment>,
                    readOnly: true,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': { backgroundColor: '#333' },
                    '& .MuiInputLabel-root': { color: '#999' },
                    '& .MuiInputBase-input': { color: '#ccc' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                  <TextField
                    label="기성율(%)"
                    type="number"
                    value={formData.progressRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, progressRate: e.target.value }))}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    }}
                    sx={{ 
                      flex: 1,
                      '& .MuiInputBase-root': { backgroundColor: '#444' },
                      '& .MuiInputLabel-root': { color: '#ccc' },
                      '& .MuiInputBase-input': { color: 'white' }
                    }}
                  />
                  
                  <TextField
                    label="누계기성금액"
                    value={formData.totalGisungAmount ? Math.ceil(Number(formData.totalGisungAmount)).toLocaleString() : ''}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      readOnly: true,
                    }}
                    sx={{ 
                      flex: 2,
                      '& .MuiInputBase-root': { backgroundColor: '#333' },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiInputBase-input': { color: '#ccc' }
                    }}
                  />
                  
                  <TextField
                    label="잔액"
                    value={(() => {
                      if (!formData.siteName) return '';
                      const contractAmount = Number(getContractAmount(formData.siteName)) || 0;
                      const totalGisungAmount = Number(formData.totalGisungAmount) || 0;
                      const claimAmount = Number(formData.claimAmount) || 0;
                      const claimStatus = formData.claimStatus || 'X';
                      
                      // 청구여부에 따른 잔액 계산
                      let balance;
                      if (claimStatus === 'O') {
                        // 청구완료: 계약금액 - 누계기성금액 - 금회청구금액
                        balance = contractAmount - totalGisungAmount - claimAmount;
                      } else {
                        // 청구대기: 계약금액 - 누계기성금액
                        balance = contractAmount - totalGisungAmount;
                      }
                      
                      return Math.max(0, Math.ceil(balance)).toLocaleString();
                    })()}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">원</InputAdornment>,
                      readOnly: true,
                    }}
                    sx={{ 
                      flex: 2,
                      '& .MuiInputBase-root': { backgroundColor: '#333' },
                      '& .MuiInputLabel-root': { color: '#999' },
                      '& .MuiInputBase-input': { color: '#ccc' }
                    }}
                  />
                  
                  <TextField
                    label="청구금액"
                    value={formData.claimAmount ? Math.ceil(Number(formData.claimAmount)).toLocaleString() : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/,/g, '');
                      if (!isNaN(value) || value === '') {
                        setFormData(prev => ({ ...prev, claimAmount: value }));
                      }
                    }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">원</InputAdornment>,
                    }}
                    sx={{ 
                      flex: 2,
                      '& .MuiInputBase-root': { backgroundColor: '#444' },
                      '& .MuiInputLabel-root': { color: '#ccc' },
                      '& .MuiInputBase-input': { color: 'white' }
                    }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#ccc' }}>청구여부</InputLabel>
                  <Select
                    value={formData.claimStatus || 'X'}
                    onChange={(e) => setFormData(prev => ({ ...prev, claimStatus: e.target.value }))}
                    sx={{ 
                      backgroundColor: '#444',
                      '& .MuiSelect-select': { 
                        color: 'white',
                        padding: '8px 16px',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center'
                      },
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': {
                          borderColor: '#666'
                        },
                        '&:hover fieldset': {
                          borderColor: '#888'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#90caf9'
                        }
                      }
                    }}
                  >
                    <MenuItem value="X">청구대기</MenuItem>
                    <MenuItem value="O">청구완료</MenuItem>
                    <MenuItem value="이월">이월</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="비고"
                  multiline
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  sx={{ 
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.isException}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        isException: e.target.checked,
                        exceptionAmount: e.target.checked ? formData.claimAmount : ''
                      }))}
                      sx={{ color: '#ff6b6b' }}
                    />
                  }
                  label={
                    <Typography sx={{ color: '#ff6b6b', fontWeight: 'bold', fontSize: '1rem' }}>
                      ⚠️ 예외 항목 (계약금액과 분리 관리)
                    </Typography>
                  }
                  sx={{ 
                    '& .MuiFormControlLabel-label': { 
                      color: '#ff6b6b',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ ...(isMobile && { p: 2, borderTop: '1px solid #555' }) }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#ccc' }}>
            취소
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ backgroundColor: '#4caf50' }}>
            {editingClaim ? '수정' : '생성'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => setDeleteDialogOpen(false)}
        PaperProps={{
          sx: { backgroundColor: '#2d3748', color: 'white' }
        }}
      >
        <DialogTitle>청구예정 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            "{claimToDelete?.siteName}" 청구예정을 삭제하시겠습니까?
          </Typography>
          <Typography sx={{ color: '#f44336', mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#ccc' }}>
            취소
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Claims; 