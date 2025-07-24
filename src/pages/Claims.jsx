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
  Assignment as AssignmentIcon
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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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

  // 현장 데이터
  const [sites, setSites] = useState([]);
  const [gisungData, setGisungData] = useState([]);

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
  }, [currentMonth]);

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

    // 정렬
    filtered.sort((a, b) => {
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
    setPage(0);
  }, [claims, searchTerm, filters, sortBy, sortOrder]);

  // 폼 데이터 초기화
  // 차수 계산 함수
  const calculateSequence = (siteName) => {
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    
    if (siteGisungData.length === 0) return '1차';
    
    // 같은 현장의 기성 데이터를 등록 순서대로 정렬
    const sortedList = siteGisungData.sort((a, b) => {
      const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0);
      const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0);
      return dateA - dateB;
    });
    
    // 다음 차수 계산
    return `${sortedList.length + 1}차`;
  };

  // 기성율 계산 함수 (총 기성금액 / 총 계약금액 * 100)
  const calculateProgressRate = (siteName) => {
    // 기성 데이터에서 해당 현장의 기성금액 합계 계산
    const siteGisungData = gisungData.filter(gisung => gisung.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    const totalGisungAmount = siteGisungData.reduce((sum, gisung) => sum + Number(gisung.gisungAmount || 0), 0);
    const contractAmount = Number(siteData.contractAmount);
    
    if (contractAmount === 0) return 0;
    
    return Math.round((totalGisungAmount / contractAmount) * 100);
  };

  // 현장 선택 시 자동 기입 함수
  const handleSiteSelect = (selectedSite) => {
    if (selectedSite && typeof selectedSite === 'object') {
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
      // 문자열인 경우 해당 현장을 찾아서 정보 기입
      const foundSite = sites.find(site => site.name === selectedSite);
      if (foundSite) {
        const progressRate = calculateProgressRate(foundSite.name);
        const sequence = calculateSequence(foundSite.name);
        setFormData(prev => ({
          ...prev,
          siteName: foundSite.name || '',
          manager: foundSite.manager || '',
          sequence: sequence,
          progressRate: progressRate.toString()
        }));
      }
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
      if (editingClaim) {
        await updateClaim(editingClaim.id, formData);
        setSnackbar({
          open: true,
          message: '청구예정이 수정되었습니다.',
          severity: 'success'
        });
      } else {
        await createClaim(formData);
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
      setSnackbar({
        open: true,
        message: '청구예정 저장에 실패했습니다.',
        severity: 'error'
      });
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

  // 엑셀 다운로드
  const handleExportExcel = () => {
    const exportData = filteredClaims.map((claim, index) => ({
      'No.': page * rowsPerPage + index + 1,
      '청구월': claim.claimMonth,
      '현장명': claim.siteName,
      '소장': claim.manager,
      '차수': claim.sequence,
      '기성율(%)': claim.progressRate,
      '청구금액': claim.claimAmount,
      '청구여부': claim.claimStatus,
      '비고': claim.notes
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '청구예정');
    XLSX.writeFile(wb, `청구예정_${currentMonth}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 엑셀 업로드
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 데이터 변환 및 저장
        for (const row of jsonData) {
          const claimData = {
            claimMonth: row['청구월'] || currentMonth,
            siteName: row['현장명'] || '',
            manager: row['소장'] || '',
            sequence: row['차수'] || '',
            progressRate: row['기성율(%)'] || '',
            claimAmount: row['청구금액'] || '',
            claimStatus: row['청구여부'] || 'X',
            notes: row['비고'] || ''
          };
          await createClaim(claimData);
        }

        setSnackbar({
          open: true,
          message: '엑셀 데이터가 성공적으로 업로드되었습니다.',
          severity: 'success'
        });
      } catch (error) {
        setSnackbar({
          open: true,
          message: '엑셀 업로드에 실패했습니다.',
          severity: 'error'
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case 'O': return 'success';
      case 'X': return 'error';
      default: return 'default';
    }
  };

  // 금액 포맷팅
  const formatAmount = (amount) => {
    if (!amount) return '0';
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

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
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>소장</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>차수</TableCell>
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
              {filteredClaims
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((claim, index) => (
                  <TableRow key={claim.id} sx={{ '&:hover': { backgroundColor: '#444' } }}>
                    <TableCell sx={{ color: 'white' }}>{page * rowsPerPage + index + 1}</TableCell>
                    {isMobile ? (
                      <>
                        <TableCell sx={{ color: 'white' }}>{claim.siteName}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatAmount(claim.claimAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={claim.claimStatus}
                            color={getStatusColor(claim.claimStatus)}
                            size="small"
                          />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell sx={{ color: 'white' }}>{claim.claimMonth}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.siteName}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.manager}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.sequence}</TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.progressRate}%</TableCell>
                        <TableCell sx={{ color: 'white' }}>{formatAmount(claim.claimAmount)}</TableCell>
                        <TableCell>
                          <Chip
                            label={claim.claimStatus}
                            color={getStatusColor(claim.claimStatus)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>{claim.notes}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="기성등록">
                              <IconButton
                                size="small"
                                onClick={() => handleProgressRegistration(claim)}
                                sx={{ color: '#4caf50' }}
                              >
                                <AssignmentIcon fontSize="small" />
                              </IconButton>
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
        
        {/* 페이지네이션 */}
        <TablePagination
          component="div"
          count={filteredClaims.length}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          sx={{ 
            color: 'white',
            '& .MuiTablePagination-select': { color: 'white' },
            '& .MuiTablePagination-selectIcon': { color: 'white' }
          }}
        />
      </Paper>

      {/* 청구예정 생성/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#2d3748', color: 'white' }
        }}
      >
        <DialogTitle>
          {editingClaim ? '청구예정 수정' : '새 청구예정'}
        </DialogTitle>
        <DialogContent>
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
                label="소장"
                value={formData.manager}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#333' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#aaa' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="차수"
                value={formData.sequence}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#333' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#aaa' }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="기성율(%)"
                type="number"
                value={formData.progressRate}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#333' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { color: '#aaa' }
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
        </DialogContent>
        <DialogActions>
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