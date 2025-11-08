
import React, { useState, useEffect, startTransition } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery,
  InputAdornment,
  Tooltip,
  Autocomplete,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Sort as SortIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  FirstPage as FirstPageIcon,
  LastPage as LastPageIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, onSnapshot, getDocs as getDocsQuery } from 'firebase/firestore';
import { db, collections } from '../firebase';
import * as XLSX from 'xlsx';
import { getKoreanDate, normalizeDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Estimates = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 일정관리 체크 상태 업데이트 함수
  const updateScheduleCheckStatus = async (estimateId, estimateType, newStatus) => {
    try {
      const user = currentUser;
      if (!user) return;

      // 견적/입찰 ID 생성 (일정관리에서 사용하는 형식)
      const scheduleId = estimateType === '입찰' ? `bid_${estimateId}` : `estimate_${estimateId}`;
      
      // 해당 견적/입찰의 제출마감일 찾기
      const estimate = estimates.find(e => e.id === estimateId);
      if (!estimate || !estimate.submissionDeadline) return;

      const submissionDate = estimate.submissionDeadline;
      const checkKey = `${submissionDate}-${scheduleId}`;
      
      // 체크 상태 결정 (제출완료면 true, 아니면 false)
      const checked = newStatus === '제출완료';
      
      console.log('일정관리 체크 상태 업데이트:', {
        estimateId,
        estimateType,
        newStatus,
        scheduleId,
        submissionDate,
        checkKey,
        checked
      });

      // 기존 체크 데이터가 있는지 확인
      const existingCheckQuery = query(
        collection(db, 'scheduleChecks'),
        where('scheduleId', '==', scheduleId),
        where('date', '==', submissionDate),
        where('userId', '==', user.uid)
      );
      
      const existingCheckSnapshot = await getDocsQuery(existingCheckQuery);
      
      if (existingCheckSnapshot.docs.length > 0) {
        // 기존 데이터 업데이트
        const existingDoc = existingCheckSnapshot.docs[0];
        await updateDoc(doc(db, 'scheduleChecks', existingDoc.id), {
          checked: checked,
          updatedAt: new Date()
        });
        console.log('일정관리 체크 상태 업데이트 완료:', checkKey, checked);
      } else if (checked) {
        // 새 데이터 추가 (체크된 경우만)
        const checkData = {
          scheduleId: scheduleId,
          date: submissionDate,
          checked: checked,
          userId: user.uid,
          updatedAt: new Date()
        };
        await addDoc(collection(db, 'scheduleChecks'), checkData);
        console.log('일정관리 체크 상태 추가 완료:', checkKey, checked);
      }
    } catch (error) {
      console.error('일정관리 체크 상태 업데이트 실패:', error);
    }
  };

  // 상태 관리
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState('전체'); // 회사별 필터링 - 전체 기본값 (견적관리 페이지)
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState('전체'); // 제출상태 필터링
  const [sortField, setSortField] = useState('receptionDate'); // 접수일 순서대로 정렬
  const [sortDirection, setSortDirection] = useState('desc'); // 접수일 내림차순 (최신 접수순)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 스마트 카드 통계 계산
  const smartCardStats = React.useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    
    // 최근 30일간 견적 개수
    const recentEstimates = estimates.filter(estimate => {
      const receptionDate = new Date(estimate.receptionDate);
      return receptionDate >= thirtyDaysAgo;
    });
    
    // 현재 미제출 견적 개수 및 현장명 목록
    const pendingEstimates = estimates.filter(estimate => 
      estimate.submissionStatus === '제출대기' || estimate.submissionStatus === '미제출'
    );
    
    // 보류 상태 견적 개수
    const onHoldEstimates = estimates.filter(estimate => 
      estimate.submissionStatus === '보류'
    );
    
    // 미제출 현장명과 의뢰자 목록 (접수일 오래된 순으로 정렬)
    const pendingSiteRequesterPairs = pendingEstimates
      .filter(estimate => estimate.siteName && estimate.requester)
      .sort((a, b) => new Date(a.receptionDate) - new Date(b.receptionDate)) // 접수일 오래된 순
      .map(estimate => `${estimate.siteName} / ${estimate.requester}`)
      .filter((value, index, self) => self.indexOf(value) === index); // 중복 제거
    
    return {
      recentCount: recentEstimates.length,
      pendingCount: pendingEstimates.length,
      onHoldCount: onHoldEstimates.length,
      pendingSiteNames: pendingSiteRequesterPairs
    };
  }, [estimates]);

  // 의뢰자 데이터 상태
  const [requesters, setRequesters] = useState([]);
  
  // 미제출 현장 목록 확장 상태
  const [showAllPendingSites, setShowAllPendingSites] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    receptionDate: getKoreanDate(),
    type: '견적', // 견적 또는 입찰 구분
    requester: '',
    submissionMethod: '메일',
    customSubmissionMethod: '',
    company: '',
    siteName: '',
    requestContent: '',
    submissionDeadline: '',
    submissionStatus: '제출대기',
    notes: '',
    contractStatus: '미수주'
  });



  // 의뢰자 데이터 로드 (거래처관리, 현장관리에서 가져옴)
  const loadRequesters = async () => {
    try {
      console.log('=== 의뢰자 데이터 로드 시작 ===');
      
      // requesters 컬렉션에서 데이터 로드
      const requestersQuery = query(collection(db, 'requesters'), orderBy('name', 'asc'));
      const requestersSnapshot = await getDocs(requestersQuery);
      const requestersData = requestersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('의뢰자 데이터 로드 완료:', requestersData.length, '개');
      setRequesters(requestersData);
    } catch (error) {
      console.error('의뢰자 데이터 로드 오류:', error);
    }
  };

  // 견적 데이터 로드
  // 실시간 견적 데이터 구독
  useEffect(() => {
    console.log('견적 실시간 구독 시작');
    console.log('현재 사용자:', currentUser);
    
    if (!currentUser) {
      console.log('사용자 인증 없음, 견적 구독 중단');
      setEstimates([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // 실시간 구독 설정
    const estimatesQuery = query(
      collection(db, collections.estimates),
      orderBy(sortField, sortDirection)
    );
    
    console.log('견적 실시간 쿼리 생성:', estimatesQuery);
    
    const unsubscribe = onSnapshot(estimatesQuery, (snapshot) => {
      console.log('견적 실시간 업데이트:', snapshot.size, '개 문서');
      
      const estimatesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('견적 데이터 변환 완료:', estimatesData.length, '개');
      
      setEstimates(estimatesData);
      setLoading(false);
    }, (error) => {
      console.error('견적 실시간 구독 오류:', error);
      setSnackbar({ open: true, message: `견적 데이터를 불러오는데 실패했습니다: ${error.message}`, severity: 'error' });
      setLoading(false);
    });
    
    return () => {
      console.log('견적 실시간 구독 해제');
      unsubscribe();
    };
  }, [currentUser, sortField, sortDirection]);

  // 일정에서 견적 더블클릭으로 들어온 경우 해당 견적 검색
  useEffect(() => {
    if (location.state?.selectedEstimateId && estimates.length > 0) {
      const targetEstimate = estimates.find(estimate => estimate.id === location.state.selectedEstimateId);
      if (targetEstimate) {
        console.log('일정에서 선택된 견적 찾음:', targetEstimate);
        // 해당 견적의 현장명으로 검색어 설정
        setSearchTerm(targetEstimate.siteName || '');
        // location.state 초기화 (뒤로가기 시 중복 실행 방지)
        navigate(location.pathname, { replace: true });
      }
    }
  }, [estimates, location.state?.selectedEstimateId, navigate, location.pathname]);

  // 모바일 스와이프 뒤로가기 비활성화 (안전한 방법)
  useEffect(() => {
    if (isMobile) {
      let startY = 0;
      let startX = 0;
      let isScrolling = false;

      const handleTouchStart = (e) => {
        startY = e.touches[0].clientY;
        startX = e.touches[0].clientX;
        isScrolling = false;
      };

      const handleTouchMove = (e) => {
        if (!startY || !startX) return;

        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const diffY = Math.abs(currentY - startY);
        const diffX = Math.abs(currentX - startX);

        // 수직 스크롤이 수평 스와이프보다 크면 스크롤링으로 판단
        if (diffY > diffX && diffY > 10) {
          isScrolling = true;
        }

        // 수평 스와이프 방지 (스크롤링 중이 아닐 때만)
        if (!isScrolling && diffX > diffY && diffX > 50) {
          e.preventDefault();
        }
      };

      const handleTouchEnd = () => {
        startY = 0;
        startX = 0;
        isScrolling = false;
      };

      // 이벤트 리스너 등록
      document.addEventListener('touchstart', handleTouchStart, { passive: false });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd, { passive: false });

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile]);

  useEffect(() => {
        if (currentUser) {
      loadRequesters(); // 의뢰자 데이터도 함께 로드
    }
  }, [currentUser, sortField, sortDirection]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      receptionDate: getKoreanDate(),
      type: '견적',
      requester: '',
      submissionMethod: '메일',
      customSubmissionMethod: '',
      company: '',
      siteName: '',
      requestContent: '',
      submissionDeadline: '',
      submissionStatus: '제출대기',
      notes: '',
      contractStatus: '미수주'
    });
    setEditingEstimate(null);
  };

  // 다이얼로그 열기
  const handleOpenDialog = (estimate = null) => {
    console.log('=== 견적 다이얼로그 열기 ===');
    console.log('수정 모드인가?:', !!estimate);
    console.log('선택된 견적:', estimate);
    
    if (estimate) {
      const formDataToSet = {
        receptionDate: estimate.receptionDate || getKoreanDate(),
        type: estimate.type || '견적',
        requester: estimate.requester || '',
        submissionMethod: estimate.submissionMethod || '메일',
        customSubmissionMethod: estimate.customSubmissionMethod || '',
        company: estimate.company || '',
        siteName: estimate.siteName || '',
        requestContent: estimate.requestContent || '',
        submissionDeadline: estimate.submissionDeadline || '',
        submissionStatus: estimate.submissionStatus || '제출대기',
        notes: estimate.notes || '',
        contractStatus: estimate.contractStatus || '미수주'
      };
      console.log('설정할 formData:', formDataToSet);
      setFormData(formDataToSet);
      setEditingEstimate(estimate);
    } else {
      resetForm();
    }
    setDialogOpen(true);
    console.log('견적 다이얼로그 상태:', { dialogOpen: true, editingEstimate: estimate });
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // 견적 저장
  const handleSave = async () => {
    console.log('=== 견적 저장 시작 ===');
    console.log('formData 전체:', formData);
    console.log('formData.requester:', formData.requester);
    console.log('formData.company:', formData.company);
    console.log('formData.siteName:', formData.siteName);
    console.log('현재 사용자:', currentUser);
    
    try {
      if (!currentUser) {
        console.log('사용자 인증 오류');
        setSnackbar({ open: true, message: '로그인이 필요합니다.', severity: 'error' });
        return;
      }

      if (!formData.requester.trim()) {
        console.log('의뢰자 필수 입력 오류');
        setSnackbar({ open: true, message: '의뢰자를 입력해주세요.', severity: 'warning' });
        return;
      }

      console.log('견적 데이터 검증 완료, 저장 시작');

      // 1. 의뢰자와 회사명 데이터 처리
      await syncVendorData(formData.requester, formData.company);
      
      // 2. 의뢰자 데이터 다시 로드
      await loadRequesters();

      if (editingEstimate) {
        // 수정
        console.log('견적 수정 모드:', editingEstimate.id);
        console.log('수정 전 견적 데이터:', editingEstimate);
        console.log('수정 후 견적 데이터:', formData);
        console.log('타입 변경 확인:', {
          이전타입: editingEstimate.type,
          새로운타입: formData.type,
          변경됨: editingEstimate.type !== formData.type
        });
        
        // updatedAt 필드 추가
        const updateData = {
          ...formData,
          updatedAt: new Date()
        };
        
        console.log('Firestore에 업데이트할 데이터:', updateData);
        
        await updateDoc(doc(db, collections.estimates, editingEstimate.id), updateData);
        console.log('견적 수정 완료 - 실시간 업데이트 대기 중');
        
        // 실시간 업데이트 확인을 위한 추가 로깅
        console.log('=== 실시간 업데이트 확인 ===');
        console.log('수정된 견적 ID:', editingEstimate.id);
        console.log('수정된 데이터:', updateData);
        console.log('타입 변경:', editingEstimate.type, '->', formData.type);
        
        // 2. 현장관리 연동: 견적 상태 변경 시 현장 정보 업데이트
        await syncSiteData(formData.siteName, formData.submissionStatus, formData.contractStatus);
        
        setSnackbar({ open: true, message: '견적이 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        console.log('견적 추가 모드');
        const estimateData = {
          ...formData,
          userId: currentUser.uid,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        console.log('저장할 견적 데이터:', estimateData);
        
        const docRef = await addDoc(collection(db, collections.estimates), estimateData);
        console.log('견적 추가 완료, 문서 ID:', docRef.id);
        
        // 2. 현장관리 연동: 견적 추가 시 현장 정보 업데이트
        await syncSiteData(formData.siteName, formData.submissionStatus, formData.contractStatus);
        
        setSnackbar({ open: true, message: '견적이 추가되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('견적 저장 오류:', error);
      console.error('오류 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setSnackbar({ open: true, message: `견적 저장에 실패했습니다: ${error.message}`, severity: 'error' });
    }
  };

  // 견적페이지에서 거래처관리와 requesters 컬렉션에 저장
  const syncVendorData = async (requester, company) => {
    console.log('=== 견적 데이터 저장 ===');
    console.log('의뢰자(이름+직위):', requester);
    console.log('회사명:', company);
    
    if (requester && requester.trim()) {
      try {
        // 의뢰자에서 이름과 직위 분리 (괄호 안의 회사명 제거)
        let cleanRequester = requester.trim();
        const companyMatch = cleanRequester.match(/\(([^)]+)\)$/);
        if (companyMatch) {
          cleanRequester = cleanRequester.replace(/\([^)]+\)$/, '').trim();
        }
        
        const parts = cleanRequester.split(' ');
        const personName = parts[0];
        const title = parts.length >= 2 ? parts.slice(1).join(' ') : '';
        
        console.log('분리된 정보:', { 이름: personName, 직위: title, 회사명: company });
        
        // 1. 거래처관리(vendors)에 저장
        const vendorData = {
          name: personName,
          position: title,
          companyName: company && company.trim() ? company.trim() : '',
          source: 'estimates_page',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 거래처가 있는지 확인
        const existingVendorQuery = query(
          collection(db, 'vendors'),
          where('name', '==', personName)
        );
        const existingVendorSnapshot = await getDocs(existingVendorQuery);
        
        if (existingVendorSnapshot.empty) {
          console.log('새로운 거래처 추가:', vendorData);
          await addDoc(collection(db, 'vendors'), vendorData);
        } else {
          console.log('기존 거래처 업데이트:', vendorData);
          const existingVendorDoc = existingVendorSnapshot.docs[0];
          await updateDoc(doc(db, 'vendors', existingVendorDoc.id), {
            position: vendorData.position,
            companyName: vendorData.companyName,
            updatedAt: new Date()
          });
        }
        
        // 2. requesters 컬렉션에 저장
        const requesterData = {
          name: personName,
          title: title,
          fullName: cleanRequester,
          company: company && company.trim() ? company.trim() : '',
          source: 'estimates',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 의뢰자가 있는지 확인
        const existingRequesterQuery = query(
          collection(db, 'requesters'),
          where('name', '==', personName)
        );
        const existingRequesterSnapshot = await getDocs(existingRequesterQuery);
        
        if (existingRequesterSnapshot.empty) {
          console.log('새로운 의뢰자 추가:', requesterData);
          await addDoc(collection(db, 'requesters'), requesterData);
        } else {
          console.log('기존 의뢰자 업데이트:', requesterData);
          const existingRequesterDoc = existingRequesterSnapshot.docs[0];
          await updateDoc(doc(db, 'requesters', existingRequesterDoc.id), {
            title: title,
            fullName: cleanRequester,
            company: requesterData.company,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('의뢰자 데이터 저장 오류:', error);
      }
    }
  };

  // 현장관리 연동 함수: 견적 상태를 현장 정보에 반영
  const syncSiteData = async (siteName, submissionStatus, contractStatus) => {
    try {
      if (!siteName || !siteName.trim()) {
        console.log('현장명이 없어 현장 연동 건너뜀');
        return;
      }
      
      console.log('현장관리 연동 시작:', { siteName, submissionStatus, contractStatus });
      
      // 현장명으로 현장 찾기
      const siteQuery = query(
        collection(db, collections.sites),
        where('name', '==', siteName.trim())
      );
      const siteSnapshot = await getDocs(siteQuery);
      
      if (!siteSnapshot.empty) {
        const siteDoc = siteSnapshot.docs[0];
        const siteData = siteDoc.data();
        
        // 업데이트할 데이터 준비
        const updateData = {};
        
        // 제출상태 연동
        if (submissionStatus) {
          updateData.estimateStatus = submissionStatus;
          console.log('현장 제출상태 업데이트:', submissionStatus);
        }
        
        // 수주상태 연동
        if (contractStatus) {
          updateData.contractStatus = contractStatus;
          console.log('현장 수주상태 업데이트:', contractStatus);
        }
        
        // 업데이트할 데이터가 있으면 현장 정보 업데이트
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();
          await updateDoc(doc(db, collections.sites, siteDoc.id), updateData);
          console.log('현장 정보 업데이트 완료');
        }
      } else {
        console.log('현장을 찾을 수 없음:', siteName);
      }
      
      console.log('현장관리 연동 완료');
    } catch (error) {
      console.error('현장관리 연동 오류:', error);
      // 현장 연동 실패해도 견적 저장은 계속 진행
    }
  };

  // 견적 삭제
  const handleDelete = async (estimate) => {
    if (window.confirm(`"${estimate.siteName || estimate.company}" 견적을 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, collections.estimates, estimate.id));
        setSnackbar({ open: true, message: '견적이 삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('견적 삭제 오류:', error);
        setSnackbar({ open: true, message: '견적 삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };



  // 정렬 변경
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 제출상태 필터 핸들러 (토글 기능 포함)
  const handleSubmissionStatusFilter = (status) => {
    // 현재 필터와 같은 상태를 클릭하면 전체보기로 토글
    if (submissionStatusFilter === status) {
      setSubmissionStatusFilter('전체');
      console.log('제출상태 필터 토글: 전체보기');
    } else {
      setSubmissionStatusFilter(status);
      console.log('제출상태 필터 변경:', status);
    }
  };

  // 미제출 견적 필터 핸들러 (토글 기능 포함)
  const handlePendingFilter = () => {
    // 현재 미제출 필터가 적용되어 있으면 전체보기로 토글
    if (submissionStatusFilter === '제출대기') {
      setSubmissionStatusFilter('전체');
      console.log('미제출 필터 토글: 전체보기');
    } else {
      setSubmissionStatusFilter('제출대기');
      console.log('미제출 필터 적용');
    }
  };

  // 필터 초기화 핸들러
  const handleClearFilters = () => {
    setSearchTerm('');
    setCompanyFilter('전체');
    setSubmissionStatusFilter('전체');
    console.log('모든 필터 초기화');
  };

  // 검색어, 회사 필터, 제출상태 필터 또는 정렬 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, companyFilter, submissionStatusFilter, sortField, sortDirection]);

  // 검색 필터링 및 정렬
  const filteredEstimates = estimates.filter(estimate => {
    // 회사별 필터링
    const matchesCompany = companyFilter === '전체' || estimate.company === companyFilter;
    
    // 제출상태 필터링
    const matchesSubmissionStatus = submissionStatusFilter === '전체' || estimate.submissionStatus === submissionStatusFilter;
    
    // 검색어 필터링
    const matchesSearch = 
      estimate.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.requester?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.requestContent?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCompany && matchesSubmissionStatus && matchesSearch;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortField) {
      case 'receptionDate':
        // 접수일을 날짜로 변환하여 비교
        aValue = a.receptionDate ? new Date(a.receptionDate) : new Date(0);
        bValue = b.receptionDate ? new Date(b.receptionDate) : new Date(0);
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      case 'submissionDeadline':
        // 제출기한을 날짜로 변환하여 비교
        aValue = a.submissionDeadline ? new Date(a.submissionDeadline) : new Date(0);
        bValue = b.submissionDeadline ? new Date(b.submissionDeadline) : new Date(0);
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      case 'submissionStatus':
        aValue = a.submissionStatus || '';
        bValue = b.submissionStatus || '';
        break;
      case 'contractStatus':
        aValue = a.contractStatus || '';
        bValue = b.contractStatus || '';
        break;
      case 'siteName':
        aValue = a.siteName || '';
        bValue = b.siteName || '';
        break;
      case 'company':
        aValue = a.company || '';
        bValue = b.company || '';
        break;
      case 'type':
        aValue = a.type || '';
        bValue = b.type || '';
        break;
      default:
        // 기본값: 접수일 기준으로 내림차순 정렬 (최신 접수순)
        const receptionDateA = a.receptionDate ? new Date(a.receptionDate) : new Date(0);
        const receptionDateB = b.receptionDate ? new Date(b.receptionDate) : new Date(0);
        return receptionDateB - receptionDateA;
    }
    
    // 문자열 비교
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      const comparison = aValue.localeCompare(bValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    }
    
    // 숫자 비교
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    // 기본값: 접수일 기준으로 내림차순 정렬
    const receptionDateA = a.receptionDate ? new Date(a.receptionDate) : new Date(0);
    const receptionDateB = b.receptionDate ? new Date(b.receptionDate) : new Date(0);
    return receptionDateB - receptionDateA;
  });

  // 페이지네이션 계산
  const totalPages = Math.ceil(filteredEstimates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEstimates = filteredEstimates.slice(startIndex, endIndex);

  // 페이지 변경 함수
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // 페이지당 항목 수 변경 함수
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(parseInt(event.target.value));
    setCurrentPage(1); // 페이지당 항목 수가 변경되면 첫 페이지로 이동
  };

  // 페이지 번호 배열 생성
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // 전체 페이지가 5개 이하면 모든 페이지 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 주변의 페이지들만 표시
      const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };

  // 엑셀 다운로드 (ExcelJS 사용)
  const handleDownload = async () => {
    try {
      // ExcelJS 동적 import
      const ExcelJS = await import('exceljs');
      
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('견적목록');
      
      // 제목 행 추가 (A1:K1 병합)
      worksheet.mergeCells('A1:K1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = `천우건업(주) 견적목록 [${new Date().toLocaleDateString('ko-KR')}]`;
      titleCell.font = { size: 18, bold: true };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      titleCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      
      // 빈 행 추가
      const emptyRow = worksheet.getRow(2);
      emptyRow.height = 10;
      
      // 헤더 설정 (3행)
      const headerRow = worksheet.getRow(3);
      headerRow.height = 25;
      const headers = ['NO.', '접수일', '의뢰자', '제출방법', '회사명', '현장명', '요청내용', '제출기한', '제출여부', '비고', '수주여부'];
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { size: 12, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF4472C4' }
        };
        cell.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // 데이터 행 추가
      const data = filteredEstimates.length > 0 ? filteredEstimates.map((estimate, index) => ({
        'NO.': filteredEstimates.length - filteredEstimates.findIndex(e => e.id === estimate.id),
        '접수일': estimate.receptionDate || '',
        '의뢰자': estimate.requester || '',
        '제출방법': estimate.submissionMethod || '',
        '회사명': estimate.company || '',
        '현장명': estimate.siteName || '',
        '요청내용': estimate.requestContent || '',
        '제출기한': estimate.submissionDeadline || '',
        '제출여부': estimate.submissionStatus || '',
        '비고': estimate.notes || '',
        '수주여부': estimate.contractStatus || ''
      })) : [];
      
      data.forEach((row, index) => {
        const dataRow = worksheet.getRow(index + 4);
        dataRow.height = 20;
        
        const rowData = [
          row['NO.'] || '',
          row['접수일'] || '',
          row['의뢰자'] || '',
          row['제출방법'] || '',
          row['회사명'] || '',
          row['현장명'] || '',
          row['요청내용'] || '',
          row['제출기한'] || '',
          row['제출여부'] || '',
          row['비고'] || '',
          row['수주여부'] || ''
        ];
        
        rowData.forEach((value, colIndex) => {
          const cell = dataRow.getCell(colIndex + 1);
          cell.value = value;
          cell.font = { size: 10 };
          cell.alignment = { 
            horizontal: colIndex === 0 ? 'center' : 'left', 
            vertical: 'middle' 
          };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // 제출여부 컬럼 - 특별 스타일링
          if (colIndex === 8) {
            if (value === '제출완료') {
              cell.font = { size: 10, color: { argb: 'FF008000' }, bold: true };
            } else if (value === '제출대기') {
              cell.font = { size: 10, color: { argb: 'FFFF0000' } };
            }
          }
          
          // 수주여부 컬럼 - 특별 스타일링
          if (colIndex === 10) {
            if (value === '수주') {
              cell.font = { size: 10, color: { argb: 'FF008000' }, bold: true };
            } else if (value === '미수주') {
              cell.font = { size: 10, color: { argb: 'FFFF0000' } };
            }
          }
        });
      });
      
      // 컬럼 너비 설정
      worksheet.columns = [
        { width: 8 },   // NO.
        { width: 12 },  // 접수일
        { width: 15 },  // 의뢰자
        { width: 12 },  // 제출방법
        { width: 20 },  // 회사명
        { width: 25 },  // 현장명
        { width: 30 },  // 요청내용
        { width: 12 },  // 제출기한
        { width: 12 },  // 제출여부
        { width: 20 },  // 비고
        { width: 12 }   // 수주여부
      ];
      
      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const fileName = `견적목록_${new Date().toISOString().split('T')[0]}.xlsx`;
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // 메모리 정리
      URL.revokeObjectURL(url);
      
      setSnackbar({ open: true, message: '견적목록이 엑셀로 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  // 엑셀 업로드
  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        for (const row of jsonData) {
          try {
            const estimateData = {
              receptionDate: normalizeDate(row['접수일']) || getKoreanDate(),
              requester: row['의뢰자'] || '',
              submissionMethod: row['제출방법'] || '',
              company: row['회사명'] || '',
              siteName: row['현장명'] || '',
              requestContent: row['요청내용'] || '',
              submissionDeadline: normalizeDate(row['제출기한']) || '',
              submissionStatus: row['제출여부'] || '제출대기',
              notes: row['비고'] || '',
              contractStatus: row['수주여부'] || '미수주'
            };

            if (estimateData.requester) {
              // 엑셀 업로드 시에도 연동 기능 적용
              await syncVendorData(estimateData.requester, estimateData.company);
              await addDoc(collection(db, collections.estimates), estimateData);
              await syncSiteData(estimateData.siteName, estimateData.submissionStatus, estimateData.contractStatus);
              successCount++;
            }
          } catch (error) {
            console.error('행 업로드 오류:', error);
          }
        }

        setSnackbar({ 
          open: true, 
          message: `${successCount}개의 견적이 업로드되었습니다.`, 
          severity: 'success' 
        });
      } catch (error) {
        console.error('파일 업로드 오류:', error);
        setSnackbar({ open: true, message: '파일 업로드에 실패했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };



    return (
    <Box sx={{ 
      height: '100vh',
      bgcolor: 'background.default',
      position: 'relative',
      pt: isMobile ? 5.5 : 5.5,
      overflow: 'hidden'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: isMobile ? 2 : 3,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        <Box sx={{ 
          p: 1, 
          backgroundColor: '#1a1a1a', 
          color: '#fff',
          borderRadius: 2,
          boxShadow: 3,
          height: 'calc(100vh - 140px)',
          overflow: 'auto'
        }}>
      {/* 스마트 카드 */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5, width: '100%' }}>
        <Paper sx={{ 
          p: 1.5,
          bgcolor: '#232734', 
          border: '1px solid #333',
          borderRadius: 2,
          minWidth: 150,
          maxWidth: 200,
          flex: '0 0 auto'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AssignmentIcon sx={{ color: '#ff9800', fontSize: '1.2rem' }} />
            <Typography variant="body2" sx={{ color: '#bbb', fontSize: '0.9rem' }}>
              최근 30일간 견적
            </Typography>
          </Box>
          <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
            {smartCardStats.recentCount}개
          </Typography>
        </Paper>
        
        <Paper 
          onClick={handlePendingFilter}
          sx={{ 
            p: 1.5,
            bgcolor: submissionStatusFilter === '제출대기' ? '#2a2f3a' : '#232734',
            border: submissionStatusFilter === '제출대기' ? '1px solid #ef5350' : '1px solid #333',
            borderRadius: 2,
            minWidth: 200,
            flex: '0 0 auto',
            cursor: 'pointer',
            '&:hover': {
              bgcolor: submissionStatusFilter === '제출대기' ? '#2a2f3a' : '#2a2f3a',
              border: '1px solid #ef5350'
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AssignmentIcon sx={{ color: '#ef5350', fontSize: '1.2rem' }} />
            <Typography variant="body2" sx={{ color: '#bbb', fontSize: '0.9rem' }}>
              현재 미제출 견적
            </Typography>
            {submissionStatusFilter === '제출대기' && (
              <Typography variant="caption" sx={{ color: '#ef5350', fontSize: '0.7rem', fontWeight: 'bold' }}>
                (필터 적용됨)
              </Typography>
            )}
          </Box>
          <Typography variant="h4" sx={{ color: '#ef5350', fontWeight: 'bold' }}>
            {smartCardStats.pendingCount}개
          </Typography>
        </Paper>

        {/* 보류 견적 카드 */}
        {smartCardStats.onHoldCount > 0 && (
          <Paper 
            onClick={() => handleSubmissionStatusFilter('보류')}
            sx={{ 
              p: 1.5,
              bgcolor: submissionStatusFilter === '보류' ? '#2a2f3a' : '#232734',
              border: submissionStatusFilter === '보류' ? '1px solid #f44336' : '1px solid #333',
              borderRadius: 2,
              minWidth: 200,
              flex: '0 0 auto',
              cursor: 'pointer',
              '&:hover': {
                bgcolor: submissionStatusFilter === '보류' ? '#2a2f3a' : '#2a2f3a',
                border: '1px solid #f44336'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AssignmentIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />
              <Typography variant="body2" sx={{ color: '#bbb', fontSize: '0.9rem' }}>
                보류 중인 견적
              </Typography>
              {submissionStatusFilter === '보류' && (
                <Typography variant="caption" sx={{ color: '#f44336', fontSize: '0.7rem', fontWeight: 'bold' }}>
                  (필터 적용됨)
                </Typography>
              )}
            </Box>
            <Typography variant="h4" sx={{ color: '#f44336', fontWeight: 'bold' }}>
              {smartCardStats.onHoldCount}개
            </Typography>
          </Paper>
        )}

        {/* 미제출 현장명 목록 */}
        {smartCardStats.pendingSiteNames.length > 0 && (
          <Paper sx={{ 
            p: 1.5,
            bgcolor: '#232734', 
            border: '1px solid #333',
            borderRadius: 2,
            minWidth: 400,
            flex: 1,
            // 아이패드에서 숨김
            '@media (min-width: 768px) and (max-width: 1024px)': {
              display: 'none'
            },
            // 아이패드 Pro에서도 숨김
            '@media (min-width: 1024px) and (max-width: 1366px)': {
              display: 'none'
            }
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon sx={{ color: '#ef5350', fontSize: '1.2rem' }} />
                <Typography variant="body2" sx={{ color: '#bbb', fontSize: '0.9rem' }}>
                  미제출 현장/의뢰자 목록 
                  <Typography component="span" sx={{ color: '#ef5350', fontWeight: 'bold' }}>
                    ({smartCardStats.pendingSiteNames.length}개)
                  </Typography>
                </Typography>
              </Box>
              
              {/* 더보기 버튼 */}
              {smartCardStats.pendingSiteNames.length > 2 && (
                <Box
                  onClick={() => setShowAllPendingSites(!showAllPendingSites)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: 'rgba(239, 83, 80, 0.1)',
                    border: '1px solid rgba(239, 83, 80, 0.3)',
                    '&:hover': {
                      backgroundColor: 'rgba(239, 83, 80, 0.2)',
                    }
                  }}
                  title={showAllPendingSites ? "목록 축소" : "목록 확장"}
                >
                  <Typography variant="body2" sx={{ color: '#ef5350', fontWeight: 'bold', fontSize: '0.8rem' }}>
                    {showAllPendingSites ? '▲ 접기' : '▼ 더보기'}
                  </Typography>
                </Box>
              )}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
              {(showAllPendingSites ? smartCardStats.pendingSiteNames : smartCardStats.pendingSiteNames.slice(0, 2)).map((siteName, index) => (
                <Box
                  key={index}
                  onClick={() => {
                    // 클릭 시 해당 현장의 미제출 견적만 필터링
                    const siteNameOnly = siteName.split(' / ')[0];
                    setSearchTerm(siteNameOnly);
                    setSubmissionStatusFilter('제출대기');
                    console.log('현장 클릭으로 필터링:', siteNameOnly);
                  }}
                  onDoubleClick={() => {
                    // 더블클릭 시 현장명으로 검색
                    const siteNameOnly = siteName.split(' / ')[0];
                    setSearchTerm(siteNameOnly);
                    console.log('현장 더블클릭으로 검색어 설정:', siteNameOnly);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    p: 0.8,
                    borderRadius: 1,
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    }
                  }}
                  title="클릭: 미제출 필터, 더블클릭: 현장명 검색"
                >
                  <Typography variant="body2" sx={{ color: '#ef5350', fontWeight: 'bold', minWidth: '15px', fontSize: '0.9rem' }}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ef5350', fontWeight: 500, fontSize: '0.9rem' }}>
                    {siteName.split(' / ')[0]}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: '0.9rem' }}>
                    / {siteName.split(' / ')[1]}
                  </Typography>
                </Box>
              ))}
              
            </Box>
          </Paper>
        )}
      </Box>

      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: isMobile ? 1 : 2,
          flexWrap: isMobile ? 'wrap' : 'nowrap'
        }}>
          <AssignmentIcon sx={{ 
            fontSize: isMobile ? '1.5rem' : '2rem', 
            color: '#ff9800' 
          }} />
          <Typography variant={isMobile ? 'h4' : 'h3'} sx={{ 
            fontWeight: 700, 
            color: '#fff',
            fontSize: isMobile ? '1.5rem' : '2rem'
          }}>
            견적 관리
          </Typography>
          <Button
            variant="outlined"
            onClick={() => navigate('/estimate-analysis')}
            sx={{
              borderColor: '#f44336',
              color: '#fff',
              '&:hover': { borderColor: '#d32f2f' },
              ml: 2
            }}
          >
            Brief
          </Button>
          <Chip 
            label={`총 ${filteredEstimates.length}개`} 
            size={isMobile ? 'small' : 'medium'}
            sx={{ 
              backgroundColor: '#ff9800', 
              color: '#fff',
                fontSize: isMobile ? '0.75rem' : 'inherit',
              ml: 1
            }} 
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            component="label"
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#ff9800' }
            }}
          >
            업로드
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#ff9800' }
            }}
          >
            다운로드
          </Button>
          <Button
            variant="outlined"
            onClick={async () => {
              try {
                // 기존 데이터 연동 스크립트 실행
                const { syncExistingData } = await import('../scripts/syncExistingData.js');
                await syncExistingData();
                setSnackbar({ 
                  open: true, 
                  message: '기존 데이터 연동이 완료되었습니다.', 
                  severity: 'success' 
                });
                // 의뢰자 데이터 다시 로드
                await loadRequesters();
              } catch (error) {
                setSnackbar({ 
                  open: true, 
                  message: `기존 데이터 연동 실패: ${error.message}`, 
                  severity: 'error' 
                });
              }
            }}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#ff9800' }
            }}
          >
            기존 데이터 연동
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('견적 추가 버튼 클릭됨');
              console.log('이벤트 타겟:', e.target);
              console.log('현재 사용자:', currentUser);
              handleOpenDialog();
            }}
            sx={{
              backgroundColor: '#ff9800',
              '&:hover': { backgroundColor: '#f57c00' }
            }}
          >
            견적 추가
          </Button>
        </Box>
      </Box>

      {/* 검색 및 정렬 */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 1.5 }}>
        <TextField
          placeholder="견적 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#ff9800' }
            },
            '& .MuiInputBase-input': { color: '#fff' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  edge="end"
                  sx={{ 
                    color: '#666', 
                    '&:hover': { color: '#fff' },
                    pointerEvents: 'auto !important',
                    touchAction: 'manipulation !important',
                    minWidth: '44px',
                    minHeight: '44px'
                  }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        
        {/* 회사별 필터링 */}
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel sx={{ color: '#ccc' }}>회사</InputLabel>
          <Select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff9800' }
              }
            }}
          >
            <MenuItem value="전체">전체</MenuItem>
            <MenuItem value="종합건설">종합건설</MenuItem>
            <MenuItem value="기타">기타</MenuItem>
          </Select>
        </FormControl>

        {/* 제출상태 필터링 */}
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel sx={{ color: '#ccc' }}>제출상태</InputLabel>
          <Select
            value={submissionStatusFilter}
            onChange={(e) => setSubmissionStatusFilter(e.target.value)}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff9800' }
              }
            }}
          >
            <MenuItem value="전체">전체</MenuItem>
            <MenuItem value="제출대기">제출대기</MenuItem>
            <MenuItem value="제출완료">제출완료</MenuItem>
            <MenuItem value="보류">보류</MenuItem>
            <MenuItem value="제출지연">제출지연</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#ccc' }}>정렬</InputLabel>
          <Select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortField(field);
              setSortDirection(direction);
            }}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff9800' }
              }
            }}
          >
            <MenuItem value="receptionDate-desc">접수일 ↓</MenuItem>
            <MenuItem value="receptionDate-asc">접수일 ↑</MenuItem>
            <MenuItem value="submissionDeadline-desc">제출기한 ↓</MenuItem>
            <MenuItem value="submissionDeadline-asc">제출기한 ↑</MenuItem>
            <MenuItem value="submissionStatus-asc">제출상태 ↑</MenuItem>
            <MenuItem value="submissionStatus-desc">제출상태 ↓</MenuItem>
            <MenuItem value="contractStatus-asc">수주상태 ↑</MenuItem>
            <MenuItem value="contractStatus-desc">수주상태 ↓</MenuItem>
            <MenuItem value="siteName-asc">현장명 ↑</MenuItem>
            <MenuItem value="siteName-desc">현장명 ↓</MenuItem>
          </Select>
        </FormControl>

        {/* 필터 초기화 버튼 */}
        {(searchTerm || companyFilter !== '전체' || submissionStatusFilter !== '전체') && (
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { 
                borderColor: '#ff9800',
                backgroundColor: 'rgba(255, 152, 0, 0.1)'
              }
            }}
          >
            필터 초기화
          </Button>
        )}
      </Box>

      {/* 견적 테이블 */}
      <TableContainer component={Paper} sx={{ 
        backgroundColor: '#2a2a2a', 
        maxHeight: 'calc(100vh - 400px)',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#333', '& .MuiTableCell-root': { py: 0.8 } }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: 80 }}>NO.</TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }} 
                onClick={() => handleSort('receptionDate')}
              >
                접수일
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('type')}>
                타입
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('requester')}>
                의뢰자
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600,
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
              >
                제출방법
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('company')}>
                회사명
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('siteName')}>
                현장명
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>요청내용</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('submissionDeadline')}>
                제출기한
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('submissionStatus')}>
                제출상태
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('contractStatus')}>
                수주상태
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>비고</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: 120 }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentEstimates.map((estimate, index) => (
              <TableRow key={estimate.id} sx={{ '&:hover': { backgroundColor: '#333' }, '& .MuiTableCell-root': { py: 0.8 } }}>
                <TableCell sx={{ color: '#fff' }}>{filteredEstimates.length - filteredEstimates.findIndex(e => e.id === estimate.id)}</TableCell>
                <TableCell 
                  sx={{ 
                    color: '#fff',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}
                >
                  {estimate.receptionDate}
                </TableCell>
                <TableCell>
                  <Chip
                    label={estimate.type || '견적'}
                    color={estimate.type === '입찰' ? 'secondary' : 'primary'}
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{estimate.requester}</TableCell>
                <TableCell 
                  sx={{ 
                    color: '#fff',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}
                >
                  {estimate.submissionMethod}
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{estimate.company}</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 500,
                  maxWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {estimate.siteName && estimate.siteName.length > 15 
                    ? `${estimate.siteName.substring(0, 15)}...` 
                    : estimate.siteName}
                </TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.requestContent}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.submissionDeadline}</TableCell>
                <TableCell>
                  <Chip
                    label={estimate.submissionStatus}
                    color={estimate.submissionStatus === '제출완료' ? 'success' : 
                           estimate.submissionStatus === '보류' ? 'error' : 'warning'}
                    size="small"
                    onClick={async () => {
                      try {
                        let newStatus;
                        if (estimate.submissionStatus === '제출대기') {
                          newStatus = '제출완료';
                        } else if (estimate.submissionStatus === '제출완료') {
                          newStatus = '보류';
                        } else {
                          newStatus = '제출대기';
                        }
                        
                        const estimateRef = doc(db, 'estimates', estimate.id);
                        await updateDoc(estimateRef, {
                          submissionStatus: newStatus,
                          updatedAt: new Date()
                        });
                        
                        // 일정관리 체크 상태도 함께 업데이트
                        await updateScheduleCheckStatus(estimate.id, estimate.type, newStatus);
                        
                        // 로컬 상태 업데이트
                        setEstimates(prev => 
                          prev.map(e => 
                            e.id === estimate.id 
                              ? { ...e, submissionStatus: newStatus }
                              : e
                          )
                        );
                      } catch (error) {
                        console.error('견적 상태 업데이트 실패:', error);
                        alert('상태 업데이트에 실패했습니다.');
                      }
                    }}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                    <Chip
                      label={estimate.contractStatus}
                      color={estimate.contractStatus === '수주' ? 'success' : 'default'}
                      size="small"
                      onClick={async () => {
                        try {
                          const newStatus = estimate.contractStatus === '수주' ? '미수주' : '수주';
                          const estimateRef = doc(db, 'estimates', estimate.id);
                          await updateDoc(estimateRef, {
                            contractStatus: newStatus,
                            updatedAt: new Date()
                          });

                          // 수주로 변경 시 현장 등록 자동 생성
                          if (newStatus === '수주') {
                            try {
                              const siteName = estimate.siteName || estimate.name || '';
                              // 의뢰자에서 공백 이전만 소장명
                              const requester = (estimate.requester || estimate.client || '').toString();
                              const manager = requester.split(/\s+/)[0] || '';
                              const company = estimate.company || estimate.clientCompany || estimate.companyName || '';

                              // 중복 현장 확인
                              const sitesRef = collection(db, 'sites');
                              const existingSitesQuery = query(sitesRef, where('name', '==', siteName));
                              const existingSitesSnapshot = await getDocs(existingSitesQuery);
                              
                              if (existingSitesSnapshot.empty) {
                                // 현장이 존재하지 않을 때만 생성
                                await addDoc(sitesRef, {
                                  name: siteName,
                                  manager: manager,
                                  company: company,
                                  status: '미정',
                                  createdFromEstimateId: estimate.id,
                                  createdAt: new Date(),
                                  updatedAt: new Date()
                                });
                                console.log(`✅ 현장 자동 생성 완료: ${siteName}`);
                              } else {
                                console.log(`⚠️ 현장이 이미 존재합니다: ${siteName}`);
                              }
                            } catch (siteErr) {
                              console.warn('수주→현장 자동등록 실패:', siteErr);
                            }
                          }

                          // 로컬 상태 업데이트
                          setEstimates(prev => 
                            prev.map(e => 
                              e.id === estimate.id 
                                ? { ...e, contractStatus: newStatus }
                                : e
                            )
                          );
                        } catch (error) {
                          console.error('견적 수주상태 업데이트 실패:', error);
                          alert('수주상태 업데이트에 실패했습니다.');
                        }
                      }}
                      sx={{ cursor: 'pointer' }}
                    />
                </TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.notes}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenDialog(estimate);
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleOpenDialog(estimate);
                        }}
                        sx={{ 
                          color: '#ff9800',
                          pointerEvents: 'auto !important',
                          touchAction: 'manipulation !important',
                          minWidth: '44px',
                          minHeight: '44px'
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(estimate)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mt: 2, 
          p: 1.5,
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
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
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
              총 {filteredEstimates.length}개 중 {startIndex + 1}-{Math.min(endIndex, filteredEstimates.length)}개
            </Typography>
          </Box>

          {/* 페이지 네비게이션 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 첫 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              sx={{
                color: currentPage === 1 ? '#666' : '#ff9800',
                '&:hover': { backgroundColor: currentPage === 1 ? 'transparent' : '#ff9800' + '20' }
              }}
            >
              <FirstPageIcon />
            </IconButton>

            {/* 이전 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              sx={{
                color: currentPage === 1 ? '#666' : '#ff9800',
                '&:hover': { backgroundColor: currentPage === 1 ? 'transparent' : '#ff9800' + '20' }
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
                  backgroundColor: currentPage === page ? '#ff9800' : 'transparent',
                  color: currentPage === page ? '#fff' : '#ff9800',
                  borderColor: '#ff9800',
                  '&:hover': {
                    backgroundColor: currentPage === page ? '#f57c00' : '#ff9800' + '20'
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
                color: currentPage === totalPages ? '#666' : '#ff9800',
                '&:hover': { backgroundColor: currentPage === totalPages ? 'transparent' : '#ff9800' + '20' }
              }}
            >
              <NavigateNextIcon />
            </IconButton>

            {/* 마지막 페이지 버튼 */}
            <IconButton
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              sx={{
                color: currentPage === totalPages ? '#666' : '#ff9800',
                '&:hover': { backgroundColor: currentPage === totalPages ? 'transparent' : '#ff9800' + '20' }
              }}
            >
              <LastPageIcon />
            </IconButton>
          </Box>
        </Box>
      )}

      {/* 견적 추가/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { 
            backgroundColor: '#2a2a2a',
            pointerEvents: 'auto !important',
            touchAction: 'auto !important'
          }
        }}
        sx={{
          '& .MuiDialog-container': {
            pointerEvents: 'auto !important',
            touchAction: 'auto !important'
          },
          '& .MuiBackdrop-root': {
            pointerEvents: 'auto !important',
            touchAction: 'auto !important'
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          {editingEstimate ? '견적 수정' : '견적 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            {/* 1줄: 접수일, 타입, 의뢰자 */}
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="접수일"
                type="date"
                value={formData.receptionDate}
                onChange={(e) => setFormData({ ...formData, receptionDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            </Grid>
            <Grid item xs={6} md={1}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>타입</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    }
                  }}
                >
                  <MenuItem value="견적">견적</MenuItem>
                  <MenuItem value="입찰">입찰</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={requesters.map((requester, index) => {
                  // 이름과 직위만 표시 (회사명 제외)
                  let displayName = requester.name;
                  if (requester.title) displayName += ` ${requester.title}`;
                  return { 
                    label: displayName, 
                    value: displayName, 
                    id: requester.id || `requester-${index}`
                  };
                }).filter(option => option.label)}
                getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
                getOptionKey={(option) => option.id || option.value}
                isOptionEqualToValue={(option, value) => {
                  if (typeof option === 'string' && typeof value === 'string') {
                    return option === value;
                  }
                  if (typeof option === 'object' && typeof value === 'object') {
                    return option.label === value.label;
                  }
                  return false;
                }}
                value={formData.requester}
                onChange={(event, newValue) => {
                  console.log('=== 의뢰자 변경 ===');
                  console.log('새로운 값:', newValue);
                  const selectedValue = typeof newValue === 'string' ? newValue : newValue?.label || '';
                  setFormData({ ...formData, requester: selectedValue });
                  
                  // 선택된 의뢰자의 회사명도 자동으로 설정
                  if (newValue) {
                    const selectedRequester = requesters.find(requester => {
                      let displayName = requester.name;
                      if (requester.title) displayName += ` ${requester.title}`;
                      // newValue가 객체인 경우 label과 비교, 문자열인 경우 직접 비교
                      const compareValue = typeof newValue === 'string' ? newValue : newValue?.label || '';
                      return displayName === compareValue;
                    });
                    if (selectedRequester && selectedRequester.company) {
                      console.log('선택된 의뢰자의 회사명:', selectedRequester.company);
                      setFormData(prev => ({ ...prev, company: selectedRequester.company }));
                    }
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  console.log('=== 의뢰자 입력 변경 ===');
                  console.log('입력값:', newInputValue);
                  setFormData({ ...formData, requester: newInputValue || '' });
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="의뢰자 (이름 직위)"
                    placeholder="예: 홍길동 대리"
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#666' },
                        '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                      },
                      '& .MuiInputLabel-root': { color: '#ccc' },
                      '& .MuiInputBase-input': { color: '#fff' }
                    }}
                  />
                )}
                sx={{
                  '& .MuiAutocomplete-popupIndicator': { color: '#ccc' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#ccc' },
                  '& .MuiInputBase-root': { 
                    minWidth: '160px',
                    width: '100%'
                  }
                }}
              />
            </Grid>

            {/* 2줄: 제출방법, 회사명, 현장명 */}
            <Grid item xs={6} md={1}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>제출방법</InputLabel>
                <Select
                  value={formData.submissionMethod || '메일'}
                  onChange={(e) => {
                    console.log('=== 제출방법 변경 ===');
                    console.log('새로운 값:', e.target.value);
                    setFormData({ ...formData, submissionMethod: e.target.value });
                  }}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    }
                  }}
                >
                  <MenuItem value="메일">메일</MenuItem>
                  <MenuItem value="우편">우편</MenuItem>
                  <MenuItem value="직접">직접</MenuItem>
                  <MenuItem value="카톡">카톡</MenuItem>
                  <MenuItem value="메일/우편">메일/우편</MenuItem>
                  <MenuItem value="메일/카톡">메일/카톡</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {formData.submissionMethod === '기타' && (
              <Grid item xs={6} md={1}>
                <TextField
                  fullWidth
                  label="기타 제출방법"
                  value={formData.customSubmissionMethod || ''}
                  onChange={(e) => {
                    console.log('=== 기타 제출방법 변경 ===');
                    console.log('새로운 값:', e.target.value);
                    setFormData({ ...formData, customSubmissionMethod: e.target.value });
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </Grid>
            )}
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="회사명"
                value={formData.company}
                onChange={(e) => {
                  console.log('=== 회사명 변경 ===');
                  console.log('새로운 값:', e.target.value);
                  setFormData({ ...formData, company: e.target.value });
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="현장명"
                value={formData.siteName}
                onChange={(e) => {
                  console.log('=== 현장명 변경 ===');
                  console.log('새로운 값:', e.target.value);
                  setFormData({ ...formData, siteName: e.target.value });
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' },
                  minWidth: '500px',
                  width: '100%'
                }}
              />
            </Grid>

            {/* 3줄: 제출기한, 요청내용, 제출상태 */}
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="제출기한"
                type="date"
                value={formData.submissionDeadline}
                onChange={(e) => {
                  console.log('=== 제출기한 변경 ===');
                  console.log('새로운 값:', e.target.value);
                  setFormData({ ...formData, submissionDeadline: e.target.value });
                }}
                InputLabelProps={{ shrink: true }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth
                label="요청내용"
                value={formData.requestContent}
                onChange={(e) => {
                  console.log('=== 요청내용 변경 ===');
                  console.log('새로운 값:', e.target.value);
                  setFormData({ ...formData, requestContent: e.target.value });
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            </Grid>
            <Grid item xs={6} md={1}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>제출상태</InputLabel>
                <Select
                  value={formData.submissionStatus}
                  onChange={(e) => {
                    console.log('=== 제출상태 변경 ===');
                    console.log('새로운 값:', e.target.value);
                    setFormData({ ...formData, submissionStatus: e.target.value });
                  }}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    }
                  }}
                >
                  <MenuItem value="제출대기">제출대기</MenuItem>
                  <MenuItem value="제출완료">제출완료</MenuItem>
                  <MenuItem value="보류">보류</MenuItem>
                  <MenuItem value="제출지연">제출지연</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 4줄: 수주상태, 비고 */}
            <Grid item xs={6} md={1}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>수주상태</InputLabel>
                <Select
                  value={formData.contractStatus}
                  onChange={(e) => {
                    console.log('=== 수주상태 변경 ===');
                    console.log('새로운 값:', e.target.value);
                    setFormData({ ...formData, contractStatus: e.target.value });
                  }}
                  sx={{
                    color: '#fff',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                    }
                  }}
                >
                  <MenuItem value="미수주">미수주</MenuItem>
                  <MenuItem value="수주">수주</MenuItem>
                  <MenuItem value="미수주확정">미수주확정</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="비고"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#444' },
                    '&:hover fieldset': { borderColor: '#666' },
                    '&.Mui-focused fieldset': { borderColor: '#ff9800' }
                  },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ 
          p: 2,
          pointerEvents: 'auto !important',
          touchAction: 'manipulation !important'
        }}>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCloseDialog();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCloseDialog();
            }}
            sx={{ 
              color: '#ccc',
              pointerEvents: 'auto !important',
              touchAction: 'manipulation !important',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            취소
          </Button>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSave();
            }}
            variant="contained" 
            sx={{ 
              backgroundColor: '#ff9800', 
              '&:hover': { backgroundColor: '#f57c00' },
              pointerEvents: 'auto !important',
              touchAction: 'manipulation !important',
              minWidth: '44px',
              minHeight: '44px'
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
        </Box>
      </Container>
    </Box>
  );
};

export default Estimates; 