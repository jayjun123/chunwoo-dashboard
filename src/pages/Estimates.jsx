import React, { useState, useEffect, startTransition } from 'react';
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
  Autocomplete
} from '@mui/material';
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
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
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

  // 상태 관리
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('receptionDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 의뢰자 데이터 상태
  const [requesters, setRequesters] = useState([]);

  // 폼 데이터
  const [formData, setFormData] = useState({
    receptionDate: getKoreanDate(),
    requester: '',
    submissionMethod: '',
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
  const loadEstimates = async () => {
    console.log('견적 데이터 로드 시작');
    console.log('현재 사용자:', currentUser);
    
    if (!currentUser) {
      console.log('사용자 인증 없음, 견적 로드 중단');
      setEstimates([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // 임시로 모든 견적 데이터 로드 (userId 필터링 제거)
      const estimatesQuery = query(
        collection(db, collections.estimates)
      );
      console.log('견적 쿼리 생성:', estimatesQuery);
      
      const querySnapshot = await getDocs(estimatesQuery);
      console.log('견적 쿼리 결과:', querySnapshot.size, '개 문서');
      
      const estimatesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('견적 데이터 변환 완료:', estimatesData.length, '개');
      
      // 클라이언트에서 정렬
      const sortedEstimates = estimatesData.sort((a, b) => {
        const aValue = a[sortField] || '';
        const bValue = b[sortField] || '';
        
        if (sortDirection === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
      
      setEstimates(sortedEstimates);
    } catch (error) {
      console.error('견적 데이터 로드 오류:', error);
      console.error('오류 상세:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setSnackbar({ open: true, message: `견적 데이터를 불러오는데 실패했습니다: ${error.message}`, severity: 'error' });
    } finally {
      setLoading(false);
      console.log('견적 데이터 로드 완료');
    }
  };

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
      loadEstimates();
      loadRequesters(); // 의뢰자 데이터도 함께 로드
    }
  }, [currentUser, sortField, sortDirection]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      receptionDate: getKoreanDate(),
      requester: '',
      submissionMethod: '',
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
        requester: estimate.requester || '',
        submissionMethod: estimate.submissionMethod || '',
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
        await updateDoc(doc(db, collections.estimates, editingEstimate.id), formData);
        console.log('견적 수정 완료');
        
        // 2. 현장관리 연동: 견적 상태 변경 시 현장 정보 업데이트
        await syncSiteData(formData.siteName, formData.submissionStatus, formData.contractStatus);
        
        setSnackbar({ open: true, message: '견적이 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        console.log('견적 추가 모드');
        const estimateData = {
          ...formData,
          userId: currentUser.uid,
          createdAt: new Date()
        };
        console.log('저장할 견적 데이터:', estimateData);
        
        const docRef = await addDoc(collection(db, collections.estimates), estimateData);
        console.log('견적 추가 완료, 문서 ID:', docRef.id);
        
        // 2. 현장관리 연동: 견적 추가 시 현장 정보 업데이트
        await syncSiteData(formData.siteName, formData.submissionStatus, formData.contractStatus);
        
        setSnackbar({ open: true, message: '견적이 추가되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
      loadEstimates();
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
        loadEstimates();
      } catch (error) {
        console.error('견적 삭제 오류:', error);
        setSnackbar({ open: true, message: '견적 삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 수주 버튼 클릭 함수
  const handleAwardContract = async (estimate) => {
    try {
      setSnackbar({ open: true, message: '현장관리로 이동합니다.', severity: 'success' });
      
      // 현장관리(뉴사이트)의 해당 현장 상세페이지로 즉시 이동
      if (estimate.siteName) {
        // startTransition으로 네비게이션을 감싸서 Suspense 오류 방지
        startTransition(() => {
          navigate(`/sites/${encodeURIComponent(estimate.siteName)}`);
        });
      } else {
        // 현장명이 없으면 일반 현장관리 페이지로 이동
        startTransition(() => {
          navigate('/sites');
        });
      }
    } catch (error) {
      console.error('수주 버튼 클릭 오류:', error);
      setSnackbar({ open: true, message: '이동에 실패했습니다.', severity: 'error' });
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

  // 검색어 변경 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 검색 필터링
  const filteredEstimates = estimates.filter(estimate =>
    estimate.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.requester?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.requestContent?.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
    // createdAt 기준으로 내림차순 정렬 (최신 입력순)
    const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
    const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
    return dateB - dateA;
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

  // 엑셀 다운로드
  const handleDownload = () => {
    // 데이터가 없어도 기본 헤더를 포함한 데이터 생성
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
    })) : [
      {
        'NO.': '',
        '접수일': '',
        '의뢰자': '',
        '제출방법': '',
        '회사명': '',
        '현장명': '',
        '요청내용': '',
        '제출기한': '',
        '제출여부': '',
        '비고': '',
        '수주여부': ''
      }
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    
    // 테두리 스타일 설정
    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cell_address]) {
          ws[cell_address] = { v: '', t: 's' };
        }
        ws[cell_address].s = {
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } }
          }
        };
      }
    }
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '견적목록');
    XLSX.writeFile(wb, `견적목록_${new Date().toISOString().split('T')[0]}.xlsx`);
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
        loadEstimates();
      } catch (error) {
        console.error('파일 업로드 오류:', error);
        setSnackbar({ open: true, message: '파일 업로드에 실패했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };



  return (
    <Box sx={{ p: 3, backgroundColor: '#1a1a1a', color: '#fff', marginTop: '64px' }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AssignmentIcon sx={{ fontSize: '2rem', color: '#ff9800' }} />
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff' }}>
            견적 관리
          </Typography>
          <Chip 
            label={`총 ${filteredEstimates.length}개`} 
            sx={{ backgroundColor: '#ff9800', color: '#fff' }} 
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
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
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
            )
          }}
        />
        
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
            <MenuItem value="siteName-asc">현장명 ↑</MenuItem>
            <MenuItem value="siteName-desc">현장명 ↓</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 견적 테이블 */}
      <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#333' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: 80 }}>NO.</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('receptionDate')}>
                접수일 <SortIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>의뢰자</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>제출방법</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('company')}>
                회사명 <SortIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('siteName')}>
                현장명 <SortIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>요청내용</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('submissionDeadline')}>
                제출기한 <SortIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>제출상태</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>수주상태</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>비고</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: 120 }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {currentEstimates.map((estimate, index) => (
              <TableRow key={estimate.id} sx={{ '&:hover': { backgroundColor: '#333' } }}>
                <TableCell sx={{ color: '#fff' }}>{filteredEstimates.length - filteredEstimates.findIndex(e => e.id === estimate.id)}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.receptionDate}</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{estimate.requester}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.submissionMethod}</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{estimate.company}</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{estimate.siteName}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.requestContent}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.submissionDeadline}</TableCell>
                <TableCell>
                  <Chip
                    label={estimate.submissionStatus}
                    color={estimate.submissionStatus === '제출완료' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={estimate.contractStatus}
                    color={estimate.contractStatus === '수주' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ color: '#fff' }}>{estimate.notes}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(estimate)}
                        sx={{ color: '#ff9800' }}
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
                    <Tooltip title="수주">
                      <IconButton
                        size="small"
                        onClick={() => handleAwardContract(estimate)}
                        sx={{ 
                          color: estimate.contractStatus === '수주' ? '#4caf50' : '#90caf9',
                          backgroundColor: estimate.contractStatus === '수주' ? '#4caf50' + '20' : 'transparent'
                        }}
                      >
                        <CheckCircleIcon fontSize="small" />
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
          sx: { backgroundColor: '#2a2a2a' }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          {editingEstimate ? '견적 수정' : '견적 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
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
            <Grid item xs={6} md={2}>
              <Autocomplete
                options={requesters.map(requester => {
                  // 이름, 직위, 회사명을 모두 표시하여 동명이인 구분
                  let displayName = requester.name;
                  if (requester.title) displayName += ` ${requester.title}`;
                  if (requester.company) displayName += ` (${requester.company})`;
                  return displayName;
                }).filter(name => name)}
                value={formData.requester}
                onChange={(event, newValue) => {
                  console.log('=== 의뢰자 변경 ===');
                  console.log('새로운 값:', newValue);
                  setFormData({ ...formData, requester: newValue || '' });
                  
                  // 선택된 의뢰자의 회사명도 자동으로 설정
                  if (newValue) {
                    const selectedRequester = requesters.find(requester => {
                      let displayName = requester.name;
                      if (requester.title) displayName += ` ${requester.title}`;
                      if (requester.company) displayName += ` (${requester.company})`;
                      return displayName === newValue;
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
                  '& .MuiAutocomplete-clearIndicator': { color: '#ccc' }
                }}
              />
            </Grid>
            <Grid item xs={6} md={1}>
              <TextField
                fullWidth
                label="제출방법"
                value={formData.submissionMethod}
                onChange={(e) => {
                  console.log('=== 제출방법 변경 ===');
                  console.log('새로운 값:', e.target.value);
                  setFormData({ ...formData, submissionMethod: e.target.value });
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
            <Grid item xs={12} md={4}>
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
                  '& .MuiInputBase-input': { color: '#fff' }
                }}
              />
            </Grid>
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
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="요청내용"
                value={formData.requestContent}
                onChange={(e) => {
                  console.log('=== 요청내용 변경 ===');
                  console.log('새로운 값:', e.target.value);
                  setFormData({ ...formData, requestContent: e.target.value });
                }}
                multiline
                rows={3}
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
                  <MenuItem value="제출지연">제출지연</MenuItem>
                </Select>
              </FormControl>
            </Grid>
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
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                label="비고"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={2}
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
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#ccc' }}>
            취소
          </Button>
          <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#f57c00' } }}>
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
  );
};

export default Estimates; 