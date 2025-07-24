import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
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
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';

const SiteManagement = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    manager: '',
    phone: '',
    email: '',
    status: 'active',
    startDate: '',
    endDate: '',
    description: '',
  });

  const statusOptions = [
    { value: 'active', label: '진행중', color: 'success' },
    { value: 'pending', label: '대기중', color: 'warning' },
    { value: 'completed', label: '완료', color: 'info' },
    { value: 'suspended', label: '중단', color: 'error' },
  ];

  const getEstimateStatusColor = (status) => {
    if (!status) return '#757575';
    
    switch (status) {
      case '제출':
        return '#43a047';
      case '미제출':
        return '#f44336';
      case '예정':
        return '#2e7d32';
      case '미정':
        return '#d32f2f';
      case '입찰':
        return '#ff9800';
      case '현설':
        return '#2196f3';
      case '기타':
        return '#9c27b0';
      default:
        return '#757575';
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const sitesQuery = query(
        collection(db, 'sites'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(sitesQuery);
      const sitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSites(sitesData);
    } catch (error) {
      console.error('현장 목록 조회 실패:', error);
      setError('현장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (site = null) => {
    if (site) {
      setSelectedSite(site);
      setFormData({
        name: site.name,
        address: site.address,
        manager: site.manager,
        phone: site.phone,
        email: site.email,
        status: site.status,
        startDate: site.startDate,
        endDate: site.endDate,
        description: site.description,
      });
    } else {
      setSelectedSite(null);
      setFormData({
        name: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
        status: 'active',
        startDate: '',
        endDate: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSite(null);
    setFormData({
      name: '',
      address: '',
      manager: '',
      phone: '',
      email: '',
      status: 'active',
      startDate: '',
      endDate: '',
      description: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 확인 다이얼로그
    const action = selectedSite ? '수정' : '등록';
    const confirmMessage = selectedSite 
      ? `현장을 수정하시겠습니까?` 
      : `현장을 등록하시겠습니까?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const siteData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (selectedSite) {
        // 현장 정보 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), siteData);
      } else {
        // 새 현장 추가
        siteData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sites'), siteData);
      }

      handleCloseDialog();
      fetchSites();
      
      // 성공 메시지 - 현장명과 계획 포함
      const statusLabel = statusOptions.find(option => option.value === formData.status)?.label || '진행중';
      const successMessage = selectedSite 
        ? `${formData.name} [${statusLabel}] 현장수정 완료했습니다.`
        : `${formData.name} [${statusLabel}] 현장등록 완료했습니다.`;
      
      alert(successMessage);
      
      // 입력칸 초기화
      setFormData({
        name: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
        status: 'active',
        startDate: '',
        endDate: '',
        description: '',
      });
    } catch (error) {
      console.error('현장 저장 실패:', error);
      const failMessage = selectedSite 
        ? '현장 수정에 실패했습니다.'
        : '현장 등록에 실패했습니다.';
      alert(failMessage);
      setError(failMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteDoc(doc(db, 'sites', siteId));
      fetchSites();
    } catch (error) {
      console.error('현장 삭제 실패:', error);
      setError('현장 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      p: isMobile ? 0 : 3,
      m: 0,
      ml: isMobile ? '30px' : 0,
      boxSizing: 'border-box',
      mt: isMobile ? 0 : '130px'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          현장 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          새 현장 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #e0e0e0' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>현장명</TableCell>
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>주소</TableCell>}
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>담당자</TableCell>
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>연락처</TableCell>}
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>상태</TableCell>
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>견적</TableCell>
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>시작일</TableCell>}
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>종료일</TableCell>}
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.name}</TableCell>
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.address}</TableCell>}
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.manager}</TableCell>
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.phone}</TableCell>}
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>
                  <Chip
                    label={statusOptions.find(option => option.value === site.status)?.label}
                    color={statusOptions.find(option => option.value === site.status)?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>
                  {site.estimateStatus && (
                    <Chip
                      label={site.estimateStatus}
                      size="small"
                      sx={{
                        backgroundColor: getEstimateStatusColor(site.estimateStatus),
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                      title={`견적 상태: ${site.estimateStatus}`}
                    />
                  )}
                </TableCell>
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.startDate}</TableCell>}
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.endDate}</TableCell>}
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/sites/${site.id}`)}
                  >
                    <LocationIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(site)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(site.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sites.length === 0 && (
              <TableRow>
                <TableCell colSpan={isMobile ? 5 : 9} align="center" sx={{ height: '60px', verticalAlign: 'middle' }}>
                  등록된 현장이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedSite ? '현장 정보 수정' : '새 현장 등록'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장명"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="주소"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="담당자"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="연락처"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="이메일"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="상태"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="시작일"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="종료일"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '저장'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default SiteManagement; 