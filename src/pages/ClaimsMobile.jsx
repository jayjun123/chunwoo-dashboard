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
  Divider
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
  ArrowBack as ArrowBackIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../components/common/MobileLayout';
import { subscribeToClaims, createClaim, updateClaim, deleteClaim } from '../api/claims';

const ClaimsMobile = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // 상태 관리
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [claimToDelete, setClaimToDelete] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // 청구 데이터 로드
  useEffect(() => {
    console.log('청구 데이터 구독 시작, currentMonth:', currentMonth);
    setLoading(true);
    
    try {
      const unsubscribe = subscribeToClaims((claims) => {
        console.log('청구 데이터 수신:', claims.length, '개');
        setClaims(claims);
        setLoading(false);
      }, currentMonth);

      return () => {
        console.log('청구 데이터 구독 해제');
        unsubscribe();
      };
    } catch (error) {
      console.error('청구 데이터 구독 중 오류 발생:', error);
      setLoading(false);
    }
  }, [currentMonth]);

  // 폼 초기화
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
    setEditingClaim(null);
  };

  // 다이얼로그 열기
  const handleOpenDialog = (claim = null) => {
    if (claim) {
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
      setEditingClaim(claim);
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

  // 청구 저장
  const handleSave = async () => {
    try {
      if (!currentUser) {
        setSnackbar({ open: true, message: '로그인이 필요합니다.', severity: 'error' });
        return;
      }

      if (!formData.siteName.trim()) {
        setSnackbar({ open: true, message: '현장명을 입력해주세요.', severity: 'warning' });
        return;
      }

      if (editingClaim) {
        // 수정
        await updateClaim(editingClaim.id, formData);
        setSnackbar({ open: true, message: '청구예정이 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        await createClaim(formData);
        setSnackbar({ open: true, message: '청구예정이 생성되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
    } catch (error) {
      console.error('청구 저장 오류:', error);
      setSnackbar({ open: true, message: `청구 저장에 실패했습니다: ${error.message}`, severity: 'error' });
    }
  };

  // 청구 삭제
  const handleDelete = (claim) => {
    setClaimToDelete(claim);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteClaim(claimToDelete.id);
      setSnackbar({ open: true, message: '청구예정이 삭제되었습니다.', severity: 'success' });
      setDeleteDialogOpen(false);
      setClaimToDelete(null);
    } catch (error) {
      console.error('청구 삭제 오류:', error);
      setSnackbar({ open: true, message: '청구 삭제에 실패했습니다.', severity: 'error' });
    }
  };

  // 검색 필터링
  const filteredClaims = claims.filter(claim =>
    claim.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.manager?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.sequence?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  // 월 변경
  const handleMonthChange = (direction) => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      if (month === 1) {
        newYear = year - 1;
        newMonth = 12;
      } else {
        newMonth = month - 1;
      }
    } else {
      if (month === 12) {
        newYear = year + 1;
        newMonth = 1;
      } else {
        newMonth = month + 1;
      }
    }

    setCurrentMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
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
            <AssignmentIcon sx={{ color: '#ef4444', mr: 1 }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
              청구 관리
            </Typography>
          </Box>
          <Chip 
            label={`${filteredClaims.length}개`} 
            sx={{ backgroundColor: '#ef4444', color: '#fff' }} 
          />
        </Box>

        {/* 월 선택 */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <IconButton 
            onClick={() => handleMonthChange('prev')}
            sx={{ color: '#fff' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
            {currentMonth.split('-')[0]}년 {currentMonth.split('-')[1]}월
          </Typography>
          <IconButton 
            onClick={() => handleMonthChange('next')}
            sx={{ color: '#fff' }}
          >
            <ArrowBackIcon sx={{ transform: 'rotate(180deg)' }} />
          </IconButton>
        </Box>

        {/* 검색 */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            placeholder="청구 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: '#2a2a2a',
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#ef4444' }
              },
              '& .MuiInputBase-input': { color: '#fff' }
            }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: '#666', mr: 1 }} />
            }}
          />
        </Box>

        {/* 청구 목록 */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <Typography sx={{ color: '#fff' }}>로딩 중...</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {filteredClaims.map((claim) => (
              <Card key={claim.id} sx={{ mb: 2, backgroundColor: '#2a2a2a' }}>
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 600 }}>
                      {claim.siteName || '제목 없음'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(claim)}
                        sx={{ color: '#ef4444' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(claim)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      <BusinessIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                      소장/회사명: {claim.manager}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      차수: {claim.sequence}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      기성율: {claim.progressRate}%
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 0.5 }}>
                      <MoneyIcon sx={{ fontSize: '0.8rem', mr: 0.5 }} />
                      청구금액: {formatAmount(claim.claimAmount)}원
                    </Typography>
                  </Box>

                  {claim.notes && (
                    <Typography variant="body2" sx={{ color: '#ccc', mb: 1 }}>
                      {claim.notes}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Chip
                      label={claim.claimStatus === 'O' ? '청구완료' : '청구대기'}
                      color={getStatusColor(claim.claimStatus)}
                      size="small"
                      onClick={() => {}} // 명시적으로 빈 함수 추가
                    />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </List>
        )}

        {/* 청구가 없을 때 */}
        {!loading && filteredClaims.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography sx={{ color: '#ccc' }}>
              {searchTerm ? '검색 결과가 없습니다.' : '청구예정이 없습니다.'}
            </Typography>
          </Box>
        )}

        {/* 청구 추가 FAB */}
        <Fab
          color="primary"
          aria-label="add"
          onClick={() => handleOpenDialog()}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
            backgroundColor: '#ef4444',
            '&:hover': { backgroundColor: '#dc2626' }
          }}
        >
          <AddIcon />
        </Fab>

        {/* 청구 추가/수정 다이얼로그 */}
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
            {editingClaim ? '청구예정 수정' : '청구예정 추가'}
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="청구월"
                  value={formData.claimMonth}
                  onChange={(e) => setFormData({ ...formData, claimMonth: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="현장명"
                  value={formData.siteName}
                  onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                                 <TextField
                   fullWidth
                   label="소장/회사명"
                   value={formData.manager}
                   onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                   sx={{
                     '& .MuiOutlinedInput-root': {
                       '& fieldset': { borderColor: '#444' },
                       '&:hover fieldset': { borderColor: '#666' },
                       '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                     },
                     '& .MuiInputLabel-root': { color: '#ccc' },
                     '& .MuiInputBase-input': { color: '#fff' }
                   }}
                 />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="차수"
                  value={formData.sequence}
                  onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="기성율 (%)"
                  value={formData.progressRate}
                  onChange={(e) => setFormData({ ...formData, progressRate: e.target.value })}
                  type="number"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="청구금액"
                  value={formData.claimAmount}
                  onChange={(e) => setFormData({ ...formData, claimAmount: e.target.value })}
                  type="number"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                    },
                    '& .MuiInputLabel-root': { color: '#ccc' },
                    '& .MuiInputBase-input': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#ccc' }}>청구상태</InputLabel>
                  <Select
                    value={formData.claimStatus}
                    onChange={(e) => setFormData({ ...formData, claimStatus: e.target.value })}
                    sx={{
                      color: '#fff',
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#444' },
                        '&:hover fieldset': { borderColor: '#666' },
                        '&.Mui-focused fieldset': { borderColor: '#ef4444' }
                      }
                    }}
                  >
                    <MenuItem value="X">청구대기</MenuItem>
                    <MenuItem value="O">청구완료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="비고"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  multiline
                  rows={3}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#444' },
                      '&:hover fieldset': { borderColor: '#666' },
                      '&.Mui-focused fieldset': { borderColor: '#ef4444' }
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
            <Button onClick={handleSave} variant="contained" sx={{ backgroundColor: '#ef4444', '&:hover': { backgroundColor: '#dc2626' } }}>
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
            청구예정 삭제
          </DialogTitle>
          <DialogContent sx={{ p: 2 }}>
            <Typography sx={{ color: '#fff' }}>
              "{claimToDelete?.siteName}" 청구예정을 삭제하시겠습니까?
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

export default ClaimsMobile; 