import React, { useState, useEffect } from 'react';
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
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { db, collections } from '../firebase';
import * as XLSX from 'xlsx';
import { getKoreanDate, normalizeDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { migrateEstimatesUserId } from '../scripts/migrateEstimatesUserId';

const Estimates = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();

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

  // 거래처 데이터 상태 추가
  const [vendors, setVendors] = useState([]);

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

  // 거래처 데이터 로드
  const loadVendors = async () => {
    try {
      const vendorsQuery = query(collection(db, collections.vendors), orderBy('companyName', 'asc'));
      const querySnapshot = await getDocs(vendorsQuery);
      const vendorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorsData);
    } catch (error) {
      console.error('거래처 데이터 로드 오류:', error);
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
      loadVendors(); // 거래처 데이터도 함께 로드
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
    console.log('견적 다이얼로그 열기:', estimate ? '수정 모드' : '추가 모드');
    
    if (estimate) {
      setFormData({
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
      });
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
    console.log('견적 저장 시작:', formData);
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

      // 1. 거래처 연동: 의뢰자와 회사명을 vendors 컬렉션에 자동 추가
      await syncVendorData(formData.requester, formData.company);

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

  // 거래처 연동 함수: 의뢰자와 회사명을 vendors 컬렉션에 자동 추가
  const syncVendorData = async (requester, company) => {
    try {
      console.log('거래처 연동 시작:', { requester, company });
      
      // 1. 의뢰자 연동
      if (requester && requester.trim()) {
        const requesterQuery = query(
          collection(db, collections.vendors),
          where('name', '==', requester.trim())
        );
        const requesterSnapshot = await getDocs(requesterQuery);
        
        if (requesterSnapshot.empty) {
          console.log('의뢰자를 거래처에 추가:', requester);
          await addDoc(collection(db, collections.vendors), {
            name: requester.trim(),
            companyName: company || '',
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          console.log('의뢰자가 이미 거래처에 존재함:', requester);
        }
      }
      
      // 2. 회사명 연동 (의뢰자와 다른 경우)
      if (company && company.trim() && company.trim() !== requester?.trim()) {
        const companyQuery = query(
          collection(db, collections.vendors),
          where('companyName', '==', company.trim())
        );
        const companySnapshot = await getDocs(companyQuery);
        
        if (companySnapshot.empty) {
          console.log('회사명을 거래처에 추가:', company);
          await addDoc(collection(db, collections.vendors), {
            name: company.trim(),
            companyName: company.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        } else {
          console.log('회사명이 이미 거래처에 존재함:', company);
        }
      }
      
      console.log('거래처 연동 완료');
    } catch (error) {
      console.error('거래처 연동 오류:', error);
      // 거래처 연동 실패해도 견적 저장은 계속 진행
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

  // 정렬 변경
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 검색 필터링
  const filteredEstimates = estimates.filter(estimate =>
    estimate.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.requester?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.requestContent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 엑셀 다운로드
  const handleDownload = () => {
    const data = filteredEstimates.map((estimate, index) => ({
      'NO.': index + 1,
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
    }));

    const ws = XLSX.utils.json_to_sheet(data);
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
          <Button
            variant="outlined"
            onClick={async () => {
              if (currentUser) {
                try {
                  const count = await migrateEstimatesUserId(currentUser.uid);
                  setSnackbar({ 
                    open: true, 
                    message: `${count}개의 견적 데이터에 userId가 추가되었습니다.`, 
                    severity: 'success' 
                  });
                  loadEstimates(); // 데이터 다시 로드
                } catch (error) {
                  setSnackbar({ 
                    open: true, 
                    message: `마이그레이션 실패: ${error.message}`, 
                    severity: 'error' 
                  });
                }
              }
            }}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#ff9800' }
            }}
          >
            데이터 마이그레이션
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
            {filteredEstimates.map((estimate, index) => (
              <TableRow key={estimate.id} sx={{ '&:hover': { backgroundColor: '#333' } }}>
                <TableCell sx={{ color: '#fff' }}>{index + 1}</TableCell>
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
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
                options={vendors.map(vendor => vendor.name).filter(name => name)}
                value={formData.requester}
                onChange={(event, newValue) => {
                  setFormData({ ...formData, requester: newValue || '' });
                  // 선택된 거래처의 회사명도 자동으로 설정
                  if (newValue) {
                    const selectedVendor = vendors.find(vendor => vendor.name === newValue);
                    if (selectedVendor && selectedVendor.companyName) {
                      setFormData(prev => ({ ...prev, company: selectedVendor.companyName }));
                    }
                  }
                }}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="의뢰자"
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
                onChange={(e) => setFormData({ ...formData, submissionMethod: e.target.value })}
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
                options={vendors.map(vendor => vendor.companyName)}
                value={formData.company}
                onChange={(event, newValue) => setFormData({ ...formData, company: newValue || '' })}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="회사명"
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="현장명"
                value={formData.siteName}
                onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
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
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="제출기한"
                type="date"
                value={formData.submissionDeadline}
                onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, requestContent: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, submissionStatus: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, contractStatus: e.target.value })}
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