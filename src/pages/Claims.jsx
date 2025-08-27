import React, { useState, useEffect } from 'react';
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
  Tab
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
  LastPage as LastPageIcon
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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { syncClaimToProgress } from '../utils/integrationUtils';

const Claims = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  // 상태 관리
  const [claims, setClaims] = useState([]);
  const [filteredClaims, setFilteredClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    claimStatus: ''
  });
  const [sortBy, setSortBy] = useState('siteName');
  const [sortOrder, setSortOrder] = useState('asc');
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
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

  // 엑셀 다운로드 함수
  const handleDownloadExcel = () => {
    try {
      // 청구 데이터를 엑셀 형식으로 변환
      const excelData = filteredClaims.map((claim, index) => ({
        'NO.': index + 1,
        '현장명': claim.siteName || '',
        '차수': claim.sequence || '',
        '계약금액': claim.contractAmount ? Number(claim.contractAmount).toLocaleString() : '0',
        '잔액': claim.remainingAmount ? Number(claim.remainingAmount).toLocaleString() : '0',
        '기성율(%)': claim.progressRate ? `${claim.progressRate}%` : '0%',
        '청구금액': claim.claimAmount ? Number(claim.claimAmount).toLocaleString() : '0',
        '청구여부': getStatusLabel(claim.claimStatus),
        '비고': claim.notes || ''
      }));

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 컬럼 너비 설정
      const colWidths = [
        { wch: 5 },   // NO.
        { wch: 20 },  // 현장명
        { wch: 8 },   // 차수
        { wch: 15 },  // 계약금액
        { wch: 15 },  // 잔액
        { wch: 12 },  // 기성율
        { wch: 15 },  // 청구금액
        { wch: 12 },  // 청구여부
        { wch: 30 }   // 비고
      ];
      ws['!cols'] = colWidths;

      // 헤더 스타일 설정
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      // 숫자 컬럼 스타일 설정 (천단위 쉼표)
      const numberColumns = ['계약금액', '잔액', '청구금액'];
      numberColumns.forEach((colName, colIndex) => {
        const colLetter = XLSX.utils.encode_col(colIndex + 3); // 계약금액부터 시작
        for (let row = 1; row <= excelData.length; row++) {
          const cellAddress = `${colLetter}${row + 1}`;
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              alignment: { horizontal: 'right' },
              numFmt: '#,##0'
            };
          }
        }
      });

      // 워크시트를 워크북에 추가
      XLSX.utils.book_append_sheet(wb, ws, '청구현황');

      // 파일 다운로드
      const fileName = `청구현황_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSnackbar({ open: true, message: '청구현황이 엑셀로 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

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
                case '차수':
                  claim.sequence = value || '';
                  break;
                case '계약금액':
                  claim.contractAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '잔액':
                  claim.remainingAmount = value ? String(value).replace(/,/g, '') : '0';
                  break;
                case '기성율(%)':
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

  // 임시저장 관련 상태
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingData, setPendingData] = useState([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // 임시저장 관련 함수들
  const saveToLocalStorage = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      console.log(`${key} 로컬 저장 완료`);
    } catch (error) {
      console.error('로컬 저장 오류:', error);
    }
  };

  const loadFromLocalStorage = (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('로컬 로드 오류:', error);
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
    saveToLocalStorage('pendingClaims', [...pendingData, newPending]);
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
    claimAmount: '',
    claimStatus: 'X',
    notes: ''
  });

  // 월별 네비게이션 함수
  const getMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-');
    return `${parseInt(month)}월 청구예정리스트`;
  };

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
      const unsubscribe = subscribeToClaims((claims) => {
        console.log('Claims 데이터 수신:', claims.length, '개');
        setClaims(claims);
        setFilteredClaims(claims);
        setLoading(false);
      }, currentMonth);

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

  // 필터링 및 검색
  useEffect(() => {
    let filtered = claims;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(claim =>
        claim.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        claim.sequence?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 상태 필터링
    if (filters.claimStatus) {
      filtered = filtered.filter(claim => claim.claimStatus === filters.claimStatus);
    }

    // 정렬 (createdAt 기준으로 최신 입력순 정렬 추가)
    filtered.sort((a, b) => {
      // 먼저 createdAt 기준으로 최신 입력순 정렬
      const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
      const dateComparison = dateB - dateA;
      
      if (dateComparison !== 0) {
        return dateComparison;
      }
      
      // createdAt이 같으면 기존 정렬 기준 사용
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'claimAmount') {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredClaims(filtered);
    setCurrentPage(1);
  }, [claims, searchTerm, filters, sortBy, sortOrder]);

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
    
    // 청구완료된 차수는 건너뛰고 다음 차수 계산
    // 기성 데이터가 있으면 다음 차수, 없으면 1차
    const nextSequence = sortedList.length + 1;
    
    // 차수별 라벨 생성
    const sequenceLabels = ['1차', '2차', '3차', '4차', '5차', '6차', '7차', '8차', '9차', '10차'];
    return sequenceLabels[nextSequence - 1] || `${nextSequence}차`;
  };

  // 기성율 계산 함수 (총 기성금액 + 선급금 / 총 계약금액 * 100)
  const calculateProgressRate = (siteName) => {
    // 기성 데이터에서 해당 현장의 기성금액 합계 계산
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    // 기성 데이터에서 gisungAmount 또는 currentGisung 필드 사용
    const totalGisungAmount = siteGisungData.reduce((sum, gisung) => {
      const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
      return sum + amount;
    }, 0);
    
    const advanceAmount = Number(siteData.advance || 0); // 선급금
    const contractAmount = Number(siteData.contractAmount);
    
    if (contractAmount === 0) return 0;
    
    // 기성금액 + 선급금을 계약금액으로 나누어 기성율 계산
    const totalProgressAmount = totalGisungAmount + advanceAmount;
    const progressRate = (totalProgressAmount / contractAmount) * 100;
    
    return Math.round(progressRate);
  };

  // 계약금액 가져오기 함수
  const getContractAmount = (siteName) => {
    const siteData = sites.find(site => site.name === siteName);
    return Number(siteData?.contractAmount || 0);
  };

  // 계약금액 잔액 계산 함수
  const calculateRemainingAmount = (siteName) => {
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    // 총 기성금액 계산
    const totalGisungAmount = siteGisungData.reduce((sum, gisung) => {
      const amount = Number(gisung.gisungAmount || gisung.currentGisung || 0);
      return sum + amount;
    }, 0);
    
    const advanceAmount = Number(siteData.advance || 0); // 선급금
    const contractAmount = Number(siteData.contractAmount);
    
    // 계약금액 - (총 기성금액 + 선급금)
    const remainingAmount = contractAmount - (totalGisungAmount + advanceAmount);
    
    return Math.max(0, remainingAmount); // 음수 방지
  };

  // 현장 선택 시 자동 기입 함수
  const handleSiteSelect = (selectedSite) => {
    console.log('handleSiteSelect 호출됨:', selectedSite, typeof selectedSite);
    
    if (selectedSite && typeof selectedSite === 'object') {
      console.log('현장 객체 선택됨:', selectedSite.name);
      // 현장 객체를 선택한 경우에만 자동으로 정보 기입
      const progressRate = calculateProgressRate(selectedSite.name);
      const sequence = calculateSequence(selectedSite.name);
      setFormData(prev => ({
        ...prev,
        siteName: selectedSite.name || '',
        manager: selectedSite.manager || '',
        sequence: sequence,
        progressRate: progressRate.toString()
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
        setFormData(prev => ({
          ...prev,
          siteName: foundSite.name || '',
          manager: foundSite.manager || '',
          sequence: sequence,
          progressRate: progressRate.toString()
        }));
      } else {
        console.log('목록에 없는 현장, 직접 입력으로 처리:', selectedSite);
        // 목록에 없는 현장인 경우 현장명만 설정하고 나머지는 사용자가 직접 입력
        setFormData(prev => ({
          ...prev,
          siteName: selectedSite,
          manager: prev.manager, // 기존 값 유지
          sequence: prev.sequence, // 기존 값 유지
          progressRate: prev.progressRate // 기존 값 유지
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
      claimAmount: '',
      claimStatus: 'X',
      notes: ''
    });
  };

  // 청구예정 생성/수정
  const handleSubmit = async () => {
    try {
      // 오프라인 상태 체크
      if (!isOnline) {
        console.log('오프라인 상태 - 임시저장 실행');
        addToPendingData(formData);
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
        await updateClaim(editingClaim.id, formData);
        // 청구 → 기성 연동
        await syncClaimToProgress(formData.claimMonth, formData.siteName, formData.claimAmount);
        setSnackbar({
          open: true,
          message: '청구예정이 수정되었습니다.',
          severity: 'success'
        });
      } else {
        await createClaim(formData);
        // 청구 → 기성 연동
        await syncClaimToProgress(formData.claimMonth, formData.siteName, formData.claimAmount);
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
        addToPendingData(formData);
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
    setFormData({
      claimMonth: claim.claimMonth || currentMonth,
      siteName: claim.siteName || '',
      manager: claim.manager || '',
      sequence: claim.sequence || '',
      progressRate: claim.progressRate || '',
      claimAmount: claim.claimAmount || '',
      claimStatus: claim.claimStatus || 'X',
      notes: claim.notes || ''
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
    // 기성관리 페이지로 이동하면서 현장명과 월 정보 전달
    navigate('/progress', { 
      state: { 
        selectedSite: claim.siteName,
        selectedMonth: claim.claimMonth
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

  // 엑셀 다운로드 (새로운 테이블 양식)
  const handleExportExcel = () => {
    try {
      // 청구 데이터를 새로운 테이블 양식으로 변환
      const excelData = filteredClaims.map((claim, index) => ({
        'NO.': index + 1,
        '현장명': claim.siteName || '',
        '차수': claim.sequence || '',
        '계약금액': claim.contractAmount ? Number(claim.contractAmount).toLocaleString() : '0',
        '잔액': claim.remainingAmount ? Number(claim.remainingAmount).toLocaleString() : '0',
        '기성율(%)': claim.progressRate ? `${claim.progressRate}%` : '0%',
        '청구금액': claim.claimAmount ? Number(claim.claimAmount).toLocaleString() : '0',
        '청구여부': getStatusLabel(claim.claimStatus),
        '비고': claim.notes || ''
      }));

      // 워크북 생성
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // 컬럼 너비 설정
      const colWidths = [
        { wch: 5 },   // NO.
        { wch: 20 },  // 현장명
        { wch: 8 },   // 차수
        { wch: 15 },  // 계약금액
        { wch: 15 },  // 잔액
        { wch: 12 },  // 기성율
        { wch: 15 },  // 청구금액
        { wch: 12 },  // 청구여부
        { wch: 30 }   // 비고
      ];
      ws['!cols'] = colWidths;

      // 헤더 스타일 설정
      const headerRange = XLSX.utils.decode_range(ws['!ref']);
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '4472C4' } },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      }

      // 숫자 컬럼 스타일 설정 (천단위 쉼표)
      const numberColumns = ['계약금액', '잔액', '청구금액'];
      numberColumns.forEach((colName, colIndex) => {
        const colLetter = XLSX.utils.encode_col(colIndex + 3); // 계약금액부터 시작
        for (let row = 1; row <= excelData.length; row++) {
          const cellAddress = `${colLetter}${row + 1}`;
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              alignment: { horizontal: 'right' },
              numFmt: '#,##0'
            };
          }
        }
      });

      // 워크시트를 워크북에 추가
      XLSX.utils.book_append_sheet(wb, ws, '청구현황');

      // 파일 다운로드
      const fileName = `청구현황_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setSnackbar({ open: true, message: '청구현황이 엑셀로 다운로드되었습니다.', severity: 'success' });
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
                case '기성율(%)':
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

      // Firebase에서 상태 업데이트
      await updateClaim(claim.id, {
        ...claim,
        claimStatus: newStatus,
        updatedAt: new Date()
      });

      // 성공 메시지
      setSnackbar({
        open: true,
        message: `청구여부가 ${getStatusLabel(newStatus)}로 변경되었습니다.`,
        severity: 'success'
      });

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
      pt: { xs: '49px', md: '74px' } // 모바일에서 위로 10px 이동 (59px → 49px)
    }}>
      {/* 헤더와 스마트카드 */}
      <Box sx={{ mb: 3 }}>
        {isMobile ? (
          // 모바일 버전: 제목과 돌아가기 버튼을 한 줄에 배치
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
              📋 {getMonthLabel(currentMonth).replace('리스트', '')}
            </Typography>
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
        ) : (
          // PC 버전: 제목과 스마트카드 같은 줄
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h4" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                📋 {getMonthLabel(currentMonth)}
              </Typography>
              
              {/* 오른쪽: 스마트 카드 */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '80px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: '#90caf9' }}>{stats.total}</Typography>
                    <Typography variant="caption">전체</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '80px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: '#4caf50' }}>{stats.claimed}</Typography>
                    <Typography variant="caption">완료</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '80px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: '#f44336' }}>{stats.notClaimed}</Typography>
                    <Typography variant="caption">대기</Typography>
                  </CardContent>
                </Card>
                <Card sx={{ backgroundColor: '#444', color: 'white', minWidth: '100px' }}>
                  <CardContent sx={{ textAlign: 'center', p: 1 }}>
                    <Typography variant="h6" sx={{ color: '#ff9800' }}>
                      {formatAmount(stats.totalAmount)}
                    </Typography>
                    <Typography variant="caption">총액</Typography>
                  </CardContent>
                </Card>
              </Box>
            </Box>
            <Typography variant="body1" sx={{ color: '#ccc', mb: 3 }}>
              월별 청구예정을 관리하고 기성 등록과 연동하는 공간입니다.
            </Typography>
          </>
        )}
      </Box>

            {/* 검색 및 필터 - 모바일에서는 한 줄에 배치 */}
      <Paper sx={{ backgroundColor: '#2d3748', p: 2, mb: 3 }}>
        {isMobile ? (
          // 모바일: 검색창과 새청구 버튼을 한 줄에 배치
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              size="small"
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
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
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
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
                sx={{ width: '200px' }}
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
            
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold', minWidth: '80px', textAlign: 'center' }}>
              {getMonthLabel(currentMonth)}
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
              <Typography variant="body2" sx={{ color: 'white', px: 2, fontWeight: 'bold' }}>
                {getMonthLabel(currentMonth).replace('리스트', '')}
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
          <Table sx={{ minWidth: isMobile ? 900 : 'auto' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#444' }}>
                {isMobile ? (
                  <>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 60 }}>No.</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>현장명</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>청구금액</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>청구여부</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 60 }}>No.</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>청구월</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>현장명</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>소장/회사명</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>차수</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>계약금액</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>잔액</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>기성율(%)</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>청구금액</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>청구여부</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>비고</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>관리</TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {currentClaims.map((claim, index) => (
                  <TableRow key={claim.id} sx={{ '&:hover': { backgroundColor: '#444' } }}>
                    <TableCell sx={{ color: 'white' }}>{filteredClaims.length - filteredClaims.findIndex(c => c.id === claim.id)}</TableCell>
                    {isMobile ? (
                      <>
                        <TableCell sx={{ color: 'white' }}>{claim.siteName}</TableCell>
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
                        <TableCell sx={{ color: 'white' }}>{claim.siteName}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.manager}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.sequence}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatAmount(getContractAmount(claim.siteName))}</TableCell>
                        <TableCell sx={{ color: '#4caf50', fontWeight: 'bold' }}>{formatAmount(calculateRemainingAmount(claim.siteName))}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.progressRate}%</TableCell>
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
                        <TableCell sx={{ color: 'white' }}>{claim.notes}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="기성등록">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleProgressRegistration(claim)}
                                sx={{ 
                                  color: '#4caf50',
                                  borderColor: '#4caf50',
                                  fontSize: '0.75rem',
                                  py: 0.5,
                                  px: 1,
                                  minWidth: 'auto',
                                  height: '28px',
                                  '&:hover': {
                                    borderColor: '#45a049',
                                    backgroundColor: 'rgba(76, 175, 80, 0.1)'
                                  }
                                }}
                              >
                                기성등록
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
                ))}
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
                sx={{ 
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
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <TextField
                fullWidth
                label="기성율(%)"
                type="number"
                value={formData.progressRate}
                onChange={(e) => setFormData(prev => ({ ...prev, progressRate: e.target.value }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                size="small"
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
              <TextField
                fullWidth
                label="청구금액"
                type="number"
                value={formData.claimAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, claimAmount: e.target.value }))}
                InputProps={{
                  endAdornment: <InputAdornment position="end">원</InputAdornment>,
                }}
                size="small"
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: 'white' }
                }}
              />
              
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
                  sx={{ 
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
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="기성율(%)"
                  type="number"
                  value={formData.progressRate}
                  onChange={(e) => setFormData(prev => ({ ...prev, progressRate: e.target.value }))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
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
                  label="청구금액"
                  type="number"
                  value={formData.claimAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, claimAmount: e.target.value }))}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">원</InputAdornment>,
                  }}
                  sx={{ 
                    '& .MuiInputBase-root': { backgroundColor: '#444' },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: 'white' }
                  }}
                />
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