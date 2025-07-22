import React, { useState, useEffect } from 'react';
import '../styles/Estimates.css';
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
  Tooltip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  FilterList as FilterIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { 
  subscribeToEstimates, 
  createEstimate, 
  updateEstimate, 
  deleteEstimate,
  getEstimateStats
} from '../api/estimates';
import * as XLSX from 'xlsx';

const Estimates = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 상태 관리
  const [estimates, setEstimates] = useState([]);
  const [filteredEstimates, setFilteredEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    submissionStatus: '',
    contractStatus: ''
  });
  const [sortBy, setSortBy] = useState('receptionDate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    pending: 0,
    contracted: 0,
    notContracted: 0
  });

  // 폼 데이터
  const [formData, setFormData] = useState({
    receptionDate: new Date().toISOString().split('T')[0],
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

  // 실시간 데이터 구독
  useEffect(() => {
    const unsubscribe = subscribeToEstimates((estimates) => {
      setEstimates(estimates);
      setFilteredEstimates(estimates);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 통계 데이터 로드
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await getEstimateStats();
        setStats(statsData);
      } catch (error) {
        console.error('통계 로드 실패:', error);
      }
    };
    loadStats();
  }, [estimates]);

  // 필터링 및 검색
  useEffect(() => {
    let filtered = estimates;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(estimate =>
        estimate.requester?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estimate.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estimate.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        estimate.requestContent?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // 상태 필터링
    if (filters.submissionStatus) {
      filtered = filtered.filter(estimate => estimate.submissionStatus === filters.submissionStatus);
    }
    if (filters.contractStatus) {
      filtered = filtered.filter(estimate => estimate.contractStatus === filters.contractStatus);
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      if (sortBy === 'receptionDate' || sortBy === 'submissionDeadline') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredEstimates(filtered);
    setPage(0);
  }, [estimates, searchTerm, filters, sortBy, sortOrder]);

  // 폼 데이터 초기화
  const resetForm = () => {
    setFormData({
      receptionDate: new Date().toISOString().split('T')[0],
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
  };

  // 견적요청 생성/수정
  const handleSubmit = async () => {
    try {
      if (editingEstimate) {
        await updateEstimate(editingEstimate.id, formData);
        setSnackbar({
          open: true,
          message: '견적요청이 수정되었습니다.',
          severity: 'success'
        });
      } else {
        await createEstimate(formData);
        setSnackbar({
          open: true,
          message: '견적요청이 생성되었습니다.',
          severity: 'success'
        });
      }
      setDialogOpen(false);
      setEditingEstimate(null);
      resetForm();
    } catch (error) {
      setSnackbar({
        open: true,
        message: '견적요청 저장에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 제출여부/수주여부만 빠른 수정
  const handleQuickUpdate = async (estimateId, field, value) => {
    try {
      await updateEstimate(estimateId, { [field]: value });
      setSnackbar({
        open: true,
        message: '상태가 업데이트되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: '상태 업데이트에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 견적요청 삭제
  const handleDelete = async () => {
    try {
      await deleteEstimate(estimateToDelete.id);
      setSnackbar({
        open: true,
        message: '견적요청이 삭제되었습니다.',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: '견적요청 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 수정 다이얼로그 열기
  const handleEdit = (estimate) => {
    setEditingEstimate(estimate);
    setFormData({
      receptionDate: estimate.receptionDate || new Date().toISOString().split('T')[0],
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
    setDialogOpen(true);
  };

  // 삭제 다이얼로그 열기
  const handleDeleteClick = (estimate) => {
    setEstimateToDelete(estimate);
    setDeleteDialogOpen(true);
  };

  // 엑셀 다운로드
  const handleExportExcel = () => {
    const exportData = filteredEstimates.map((estimate, index) => ({
      'No.': page * rowsPerPage + index + 1,
      '접수일': estimate.receptionDate,
      '의뢰자': estimate.requester,
      '제출방법': estimate.submissionMethod,
      '회사명': estimate.company,
      '현장명': estimate.siteName,
      '요청내용': estimate.requestContent,
      '제출기한': estimate.submissionDeadline,
      '제출여부': estimate.submissionStatus,
      '비고': estimate.notes,
      '수주여부': estimate.contractStatus
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '견적요청');
    XLSX.writeFile(wb, `견적요청_${new Date().toISOString().split('T')[0]}.xlsx`);
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
          const estimateData = {
            receptionDate: row['접수일'] || new Date().toISOString().split('T')[0],
            requester: row['의뢰자'] || '',
            submissionMethod: row['제출방법'] || '',
            company: row['회사명'] || '',
            siteName: row['현장명'] || '',
            requestContent: row['요청내용'] || '',
            submissionDeadline: row['제출기한'] || '',
            submissionStatus: row['제출여부'] || '제출대기',
            notes: row['비고'] || '',
            contractStatus: row['수주여부'] || '미수주'
          };
          await createEstimate(estimateData);
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
      case '제출완료': return 'success';
      case '제출대기': return 'warning';
      case '수주': return 'success';
      case '미수주': return 'error';
      default: return 'default';
    }
  };

  // 모바일용 간단한 데이터
  const getMobileData = (estimate) => ({
    receptionDate: estimate.receptionDate,
    requester: estimate.requester,
    siteName: estimate.siteName,
    submissionDeadline: estimate.submissionDeadline,
    submissionStatus: estimate.submissionStatus
  });

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      backgroundColor: '#181a20', 
      minHeight: '100vh',
      color: 'white',
      p: { xs: 1, md: 3 },
      pt: { xs: '44px', md: 8 } // 모바일에서 위로 20px 이동 (64px → 44px)
    }}>
      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        {isMobile ? (
          // 모바일 버전: 제목과 돌아가기 버튼을 한 줄에 배치
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
              🧮 견적요청
            </Typography>
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
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
          // PC 버전: 제목과 스마트 카드를 같은 줄에 배치
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
            {/* 제목 영역 */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ color: '#90caf9', mb: 2, fontWeight: 'bold' }}>
                🧮 견적요청
              </Typography>
              <Typography variant="body1" sx={{ color: '#ccc' }}>
                견적요청을 관리하고 추적하는 공간입니다.
              </Typography>
            </Box>
            
            {/* PC 통계 카드 - 오른쪽 배치 */}
            <Box sx={{ display: 'flex', gap: 1, ml: 3 }}>
              <Card sx={{ backgroundColor: '#2d3748', color: 'white', minWidth: 80 }}>
                <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="h6" sx={{ color: '#90caf9' }}>{stats.total}</Typography>
                  <Typography variant="caption">전체</Typography>
                </CardContent>
              </Card>
              <Card sx={{ backgroundColor: '#2d3748', color: 'white', minWidth: 80 }}>
                <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="h6" sx={{ color: '#4caf50' }}>{stats.submitted}</Typography>
                  <Typography variant="caption">제출완료</Typography>
                </CardContent>
              </Card>
              <Card sx={{ backgroundColor: '#2d3748', color: 'white', minWidth: 80 }}>
                <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="h6" sx={{ color: '#ff9800' }}>{stats.pending}</Typography>
                  <Typography variant="caption">제출대기</Typography>
                </CardContent>
              </Card>
              <Card sx={{ backgroundColor: '#2d3748', color: 'white', minWidth: 80 }}>
                <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="h6" sx={{ color: '#4caf50' }}>{stats.contracted}</Typography>
                  <Typography variant="caption">수주</Typography>
                </CardContent>
              </Card>
              <Card sx={{ backgroundColor: '#2d3748', color: 'white', minWidth: 80 }}>
                <CardContent sx={{ textAlign: 'center', p: 1.5 }}>
                  <Typography variant="h6" sx={{ color: '#f44336' }}>{stats.notContracted}</Typography>
                  <Typography variant="caption">미수주</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </Box>

      {/* 검색, 필터 및 액션 버튼 - 모바일에서는 한 줄에 배치 */}
      <Paper sx={{ backgroundColor: '#2d3748', p: 2, mb: 3 }}>
        {isMobile ? (
          // 모바일: 검색창과 새견적요청 버튼을 한 줄에 배치
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              placeholder="검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
                sx: { 
                  backgroundColor: '#444',
                  '& input': { color: 'white' }
                }
              }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditingEstimate(null);
                resetForm();
                setDialogOpen(true);
              }}
              sx={{ 
                backgroundColor: '#4caf50',
                height: '40px',
                minWidth: '120px',
                fontSize: '14px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              새견적요청
            </Button>
          </Box>
        ) : (
          // PC: 기존 레이아웃 유지
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                placeholder="검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />,
                  sx: { 
                    backgroundColor: '#444',
                    '& input': { color: 'white' }
                  }
                }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>제출여부</InputLabel>
                <Select
                  value={filters.submissionStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, submissionStatus: e.target.value }))}
                  sx={{ 
                    backgroundColor: '#444',
                    minWidth: 200,
                    '& .MuiSelect-select': { 
                      color: 'white',
                      padding: '8px 16px',
                      fontSize: '14px'
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
                  <MenuItem value="">전체</MenuItem>
                  <MenuItem value="제출완료">제출완료</MenuItem>
                  <MenuItem value="제출대기">제출대기</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={3}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>수주여부</InputLabel>
                <Select
                  value={filters.contractStatus}
                  onChange={(e) => setFilters(prev => ({ ...prev, contractStatus: e.target.value }))}
                  sx={{ 
                    backgroundColor: '#444',
                    minWidth: 200,
                  '& .MuiSelect-select': { 
                    color: 'white',
                    padding: '8px 16px',
                    fontSize: '14px'
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
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="수주">수주</MenuItem>
                <MenuItem value="미수주">미수주</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              {!isMobile && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportExcel}
                    sx={{ color: '#90caf9', borderColor: '#90caf9' }}
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
                      sx={{ color: '#90caf9', borderColor: '#90caf9' }}
                    >
                      엑셀 업로드
                    </Button>
                  </label>
                </>
              )}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditingEstimate(null);
                  resetForm();
                  setDialogOpen(true);
                }}
                sx={{ 
                  backgroundColor: '#4caf50',
                  height: isMobile ? '40px' : '48px',
                  minWidth: isMobile ? '120px' : 'auto',
                  fontSize: isMobile ? '14px' : '16px',
                  fontWeight: 'bold'
                }}
              >
                새 견적요청
              </Button>
            </Box>
          </Grid>
        </Grid>
        )}
      </Paper>

      {/* 모바일 필터 섹션 */}
      {isMobile && (
        <Paper sx={{ backgroundColor: '#2d3748', p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel sx={{ color: '#ccc', fontSize: '12px' }}>제출여부</InputLabel>
              <Select
                value={filters.submissionStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, submissionStatus: e.target.value }))}
                sx={{ 
                  backgroundColor: '#444',
                  '& .MuiSelect-select': { 
                    color: 'white',
                    fontSize: '12px',
                    py: 0.5
                  }
                }}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="제출완료">제출완료</MenuItem>
                <MenuItem value="제출대기">제출대기</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ flex: 1 }}>
              <InputLabel sx={{ color: '#ccc', fontSize: '12px' }}>수주여부</InputLabel>
              <Select
                value={filters.contractStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, contractStatus: e.target.value }))}
                sx={{ 
                  backgroundColor: '#444',
                  '& .MuiSelect-select': { 
                    color: 'white',
                    fontSize: '12px',
                    py: 0.5
                  }
                }}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value="수주">수주</MenuItem>
                <MenuItem value="미수주">미수주</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>
      )}

      {/* 테이블 */}
      <Paper sx={{ backgroundColor: '#2d3748', overflow: 'hidden' }}>
        <TableContainer sx={{ 
          maxHeight: isMobile ? 'calc(100vh - 300px)' : 'calc(100vh - 400px)',
          overflowX: isMobile ? 'auto' : 'hidden'
        }}>
          <Table sx={{ minWidth: isMobile ? 800 : 'auto' }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#444' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 60 }}>No.</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>접수일</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>의뢰자</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>제출방법</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>회사명</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 120 }}>현장명</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 150 }}>요청내용</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>제출기한</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>제출여부</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>비고</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 80 }}>수주여부</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold', minWidth: 100 }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredEstimates
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((estimate, index) => (
                  <TableRow key={estimate.id} sx={{ '&:hover': { backgroundColor: '#444' } }}>
                    <TableCell sx={{ color: 'white' }}>{page * rowsPerPage + index + 1}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.receptionDate}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.requester}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.submissionMethod}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.company}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.siteName}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.requestContent}</TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.submissionDeadline}</TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={estimate.submissionStatus || '제출대기'}
                          onChange={(e) => handleQuickUpdate(estimate.id, 'submissionStatus', e.target.value)}
                          sx={{ 
                            backgroundColor: '#444',
                            '& .MuiSelect-select': { 
                              color: 'white',
                              fontSize: '0.75rem',
                              py: 0.5
                            }
                          }}
                        >
                          <MenuItem value="제출대기">제출대기</MenuItem>
                          <MenuItem value="제출완료">제출완료</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell sx={{ color: 'white' }}>{estimate.notes}</TableCell>
                    <TableCell>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={estimate.contractStatus || '미수주'}
                          onChange={(e) => handleQuickUpdate(estimate.id, 'contractStatus', e.target.value)}
                          sx={{ 
                            backgroundColor: '#444',
                            '& .MuiSelect-select': { 
                              color: 'white',
                              fontSize: '0.75rem',
                              py: 0.5
                            }
                          }}
                        >
                          <MenuItem value="미수주">미수주</MenuItem>
                          <MenuItem value="수주">수주</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="수정">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(estimate)}
                            sx={{ color: '#90caf9' }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="삭제">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(estimate)}
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
        <TablePagination
          component="div"
          count={filteredEstimates.length}
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

      {/* 견적요청 생성/수정 다이얼로그 */}
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
          {editingEstimate ? '견적요청 수정' : '새 견적요청'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="접수일"
                type="date"
                value={formData.receptionDate}
                onChange={(e) => setFormData(prev => ({ ...prev, receptionDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                disabled={false}
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
                label="의뢰자"
                value={formData.requester}
                onChange={(e) => setFormData(prev => ({ ...prev, requester: e.target.value }))}
                disabled={false}
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
                label="제출방법"
                value={formData.submissionMethod}
                onChange={(e) => setFormData(prev => ({ ...prev, submissionMethod: e.target.value }))}
                disabled={false}
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
                label="회사명"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                disabled={false}
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
                label="현장명"
                value={formData.siteName}
                onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                disabled={false}
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
                label="제출기한"
                type="date"
                value={formData.submissionDeadline}
                onChange={(e) => setFormData(prev => ({ ...prev, submissionDeadline: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                disabled={false}
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
                label="요청내용"
                multiline
                rows={isMobile ? 4 : 3}
                value={formData.requestContent}
                onChange={(e) => setFormData(prev => ({ ...prev, requestContent: e.target.value }))}
                disabled={false}
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { 
                    color: 'white',
                    fontSize: isMobile ? '16px' : '14px'
                  }
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>제출여부</InputLabel>
                <Select
                  value={formData.submissionStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, submissionStatus: e.target.value }))}
                  sx={{ 
                    backgroundColor: '#444',
                    '& .MuiSelect-select': { color: 'white' }
                  }}
                >
                  <MenuItem value="제출대기">제출대기</MenuItem>
                  <MenuItem value="제출완료">제출완료</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#ccc' }}>수주여부</InputLabel>
                <Select
                  value={formData.contractStatus}
                  onChange={(e) => setFormData(prev => ({ ...prev, contractStatus: e.target.value }))}
                  sx={{ 
                    backgroundColor: '#444',
                    '& .MuiSelect-select': { color: 'white' }
                  }}
                >
                  <MenuItem value="미수주">미수주</MenuItem>
                  <MenuItem value="수주">수주</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {editingEstimate && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ backgroundColor: '#1e3a8a', color: '#93c5fd' }}>
                  <Typography variant="body2">
                    모든 정보를 수정할 수 있습니다. 변경사항을 저장하려면 '수정' 버튼을 클릭하세요.
                  </Typography>
                </Alert>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={isMobile ? 3 : 2}
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                disabled={false}
                sx={{ 
                  '& .MuiInputBase-root': { backgroundColor: '#444' },
                  '& .MuiInputLabel-root': { color: '#ccc' },
                  '& .MuiInputBase-input': { 
                    color: 'white',
                    fontSize: isMobile ? '16px' : '14px'
                  }
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
            {editingEstimate ? '수정' : '생성'}
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
        <DialogTitle>견적요청 삭제</DialogTitle>
        <DialogContent>
          <Typography>
            "{estimateToDelete?.siteName}" 견적요청을 삭제하시겠습니까?
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

export default Estimates; 