import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  List,
  Fab,
  useTheme,
  useMediaQuery,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Divider,
  Autocomplete
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Assignment as AssignmentIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, collections } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/common/MobileLayout';
import { getKoreanDate, normalizeDate } from '../utils/dateUtils';
import { 
  subscribeToEstimates, 
  createEstimate, 
  updateEstimate, 
  deleteEstimate 
} from '../api/estimates';

const EstimatesMobile = () => {
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [estimateToDelete, setEstimateToDelete] = useState(null);

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

  // 거래처 데이터 상태 추가
  const [vendors, setVendors] = useState([]);

  // 거래처 데이터 로드
  const loadVendors = async () => {
    try {
      const vendorsQuery = query(collection(db, collections.vendors), orderBy('name', 'asc'));
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

  // 견적 데이터 구독
  useEffect(() => {
    console.log('견적 데이터 구독 시작');
    
    if (!currentUser) {
      console.log('사용자 인증 없음, 견적 로드 중단');
      setEstimates([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const unsubscribe = subscribeToEstimates((estimatesData) => {
        console.log('견적 데이터 수신:', estimatesData.length, '개');
        setEstimates(estimatesData);
        setLoading(false);
      });

      return () => {
        console.log('견적 데이터 구독 해제');
        unsubscribe();
      };
    } catch (error) {
      console.error('견적 데이터 구독 설정 오류:', error);
      setSnackbar({ open: true, message: `견적 데이터 구독 설정에 실패했습니다: ${error.message}`, severity: 'error' });
      setLoading(false);
    }
  }, [currentUser]);

  // 거래처 데이터 로드
  useEffect(() => {
    loadVendors();
  }, []);

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
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // 견적 저장
  const handleSave = async () => {
    try {
      if (!currentUser) {
        setSnackbar({ open: true, message: '로그인이 필요합니다.', severity: 'error' });
        return;
      }

      if (!formData.requester.trim()) {
        setSnackbar({ open: true, message: '의뢰자를 입력해주세요.', severity: 'warning' });
        return;
      }

      if (editingEstimate) {
        // 수정
        await updateEstimate(editingEstimate.id, formData);
        setSnackbar({ open: true, message: '견적이 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        const estimateData = {
          ...formData,
          userId: currentUser.uid,
          createdAt: new Date()
        };
        
        await createEstimate(estimateData);
        setSnackbar({ open: true, message: '견적이 추가되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('견적 저장 오류:', error);
      setSnackbar({ open: true, message: `견적 저장에 실패했습니다: ${error.message}`, severity: 'error' });
    }
  };

  // 견적 삭제
  const handleDelete = (estimate) => {
    setEstimateToDelete(estimate);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteEstimate(estimateToDelete.id);
      setSnackbar({ open: true, message: '견적이 삭제되었습니다.', severity: 'success' });
      setDeleteDialogOpen(false);
      setEstimateToDelete(null);
    } catch (error) {
      console.error('견적 삭제 오류:', error);
      setSnackbar({ open: true, message: '견적 삭제에 실패했습니다.', severity: 'error' });
    }
  };

  // 검색 필터링
  const filteredEstimates = estimates.filter(estimate =>
    estimate.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.requester?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    estimate.requestContent?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 상태별 색상
  const getStatusColor = (status) => {
    switch (status) {
      case '제출완료': return 'success';
      case '제출대기': return 'warning';
      case '제출지연': return 'error';
      default: return 'default';
    }
  };

  const getContractStatusColor = (status) => {
    switch (status) {
      case '수주': return 'success';
      case '미수주': return 'default';
      default: return 'default';
    }
  };

  return (
    <MobileLayout>
      <Box sx={{ p: 2, backgroundColor: '#181a20', minHeight: '100vh' }}>
        {/* 헤더 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <IconButton 
            onClick={() => navigate(-1)}
            sx={{ color: '#fff', mr: 1 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <AssignmentIcon sx={{ color: '#ff9800', mr: 1 }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              견적 관리
            </Typography>
          </Box>
          <Chip 
            label={`${filteredEstimates.length}개`} 
            sx={{ backgroundColor: '#ff9800', color: '#fff' }} 
          />
        </Box>

        {/* 검색 */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="견적 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#2a2a2a',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ff9800' }
              },
              '& .MuiInputBase-input': { color: '#fff' }
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />
            }}
          />
        </Box>

        {/* 견적 목록 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography sx={{ color: '#fff' }}>로딩 중...</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredEstimates.map((estimate) => (
              <Card key={estimate.id} sx={{ mb: 2, backgroundColor: '#2a2a2a' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      {estimate.siteName || estimate.company || '제목 없음'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(estimate)}
                        sx={{ color: '#ff9800' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(estimate)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      <BusinessIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                      {estimate.company}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      의뢰자: {estimate.requester}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      접수일: {estimate.receptionDate}
                    </Typography>
                    {estimate.submissionDeadline && (
                      <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                        <ScheduleIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                        제출기한: {estimate.submissionDeadline}
                      </Typography>
                    )}
                  </Box>

                  {estimate.requestContent && (
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                      {estimate.requestContent}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={estimate.submissionStatus}
                      color={getStatusColor(estimate.submissionStatus)}
                      size="small"
                    />
                    <Chip
                      label={estimate.contractStatus}
                      color={getContractStatusColor(estimate.contractStatus)}
                      size="small"
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        )}

        {/* 견적이 없을 때 */}
        {!loading && filteredEstimates.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: '#ccc' }}>
              {searchTerm ? '검색 결과가 없습니다.' : '견적이 없습니다.'}
            </Typography>
          </Box>
        )}

        {/* 견적 추가 FAB */}
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => handleOpenDialog()}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            backgroundColor: '#ff9800',
            '&:hover': { backgroundColor: '#f57c00' }
          }}
        >
          <AddIcon />
        </Fab>

        {/* 견적 추가/수정 다이얼로그 */}
        <Dialog 
          open={dialogOpen} 
          onClose={handleCloseDialog}
          fullWidth
          maxWidth="sm"
          PaperProps={{
            sx: { backgroundColor: '#2a2a2a' }
          }}
        >
          <DialogTitle sx={{ color: '#fff', borderBottom: '1px solid #444' }}>
            {editingEstimate ? '견적 수정' : '견적 추가'}
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="접수일"
                  value={formData.receptionDate}
                  onChange={(e) => setFormData({ ...formData, receptionDate: e.target.value })}
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
              <Grid item xs={12} sm={8}>
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
                      label="의뢰자 (거래처 선택 또는 입력)"
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
              <Grid item xs={12} sm={4}>
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
              <Grid item xs={12} sm={8}>
                <Autocomplete
                  options={vendors.map(vendor => vendor.companyName).filter(company => company)}
                  value={formData.company}
                  onChange={(event, newValue) => setFormData({ ...formData, company: newValue || '' })}
                  freeSolo
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="회사명 (거래처 선택 또는 입력)"
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
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="제출기한"
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
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
              <Grid item xs={12}>
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
              <Grid item xs={12}>
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="제출기한"
                  value={formData.submissionDeadline}
                  onChange={(e) => setFormData({ ...formData, submissionDeadline: e.target.value })}
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
              <Grid item xs={12} sm={6}>
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
              <Grid item xs={12} sm={6}>
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
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
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
          <DialogActions sx={{ p: 2, borderTop: '1px solid #444' }}>
            <Button onClick={handleCloseDialog} sx={{ color: '#ccc' }}>
              취소
            </Button>
            <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: '#ff9800', '&:hover': { backgroundColor: '#f57c00' } }}>
              저장
            </Button>
          </DialogActions>
        </Dialog>

        {/* 삭제 확인 다이얼로그 */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          PaperProps={{
            sx: { backgroundColor: '#2a2a2a' }
          }}
        >
          <DialogTitle sx={{ color: '#fff' }}>
            견적 삭제
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Typography sx={{ color: '#fff' }}>
              "{estimateToDelete?.siteName || estimateToDelete?.company}" 견적을 삭제하시겠습니까?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ p: 2, borderTop: '1px solid #444' }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#ccc' }}>
              취소
            </Button>
            <Button onClick={confirmDelete} variant="contained" sx={{ backgroundColor: '#f44336', '&:hover': { backgroundColor: '#d32f2f' } }}>
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
          <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </MobileLayout>
  );
};

export default EstimatesMobile; 