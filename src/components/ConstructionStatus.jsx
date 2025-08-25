import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const ConstructionStatus = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    description: '',
    manager: '',
    budget: '',
  });

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      const sitesData = sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(sitesData);
      setLoading(false);
    } catch (error) {
      console.error('현장 데이터 로드 실패:', error);
      setError('현장 데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleOpenDialog = (site = null) => {
    if (site) {
      setSelectedSite(site);
      setFormData({
        name: site.name,
        location: site.location,
        startDate: site.startDate,
        endDate: site.endDate,
        status: site.status,
        description: site.description,
        manager: site.manager,
        budget: site.budget,
      });
    } else {
      setSelectedSite(null);
      setFormData({
        name: '',
        location: '',
        startDate: '',
        endDate: '',
        status: 'pending',
        description: '',
        manager: '',
        budget: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSite(null);
    setFormData({
      name: '',
      location: '',
      startDate: '',
      endDate: '',
      status: 'pending',
      description: '',
      manager: '',
      budget: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const siteData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (selectedSite) {
        await updateDoc(doc(db, 'sites', selectedSite.id), siteData);
      } else {
        siteData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sites'), siteData);
      }

      handleCloseDialog();
      loadSites();
    } catch (error) {
      console.error('현장 저장 실패:', error);
      setError('현장 정보를 저장하는데 실패했습니다.');
    }
  };

  const handleDelete = async (siteId) => {
    if (window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
        loadSites();
      } catch (error) {
        console.error('현장 삭제 실패:', error);
        setError('현장을 삭제하는데 실패했습니다.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '진행중';
      case 'completed':
        return '완료';
      case 'pending':
        return '대기중';
      default:
        return status;
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
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          현장관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          현장 추가
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {sites.map((site) => (
          <Grid item xs={12} md={6} lg={4} key={site.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {site.name}
                  </Typography>
                  <Chip
                    label={getStatusText(site.status)}
                    color={getStatusColor(site.status)}
                    size="small"
                  />
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {site.location}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {(() => {
                      try {
                        // Firestore Timestamp 객체인 경우
                        const startDate = site.startDate && typeof site.startDate === 'object' && site.startDate.toDate 
                          ? site.startDate.toDate() 
                          : new Date(site.startDate);
                        
                        const endDate = site.endDate && typeof site.endDate === 'object' && site.endDate.toDate 
                          ? site.endDate.toDate() 
                          : new Date(site.endDate);
                        
                        // Invalid Date 체크
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                          console.warn('Invalid date in ConstructionStatus:', { startDate: site.startDate, endDate: site.endDate });
                          return '날짜 정보 없음';
                        }
                        
                        return `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}`;
                      } catch (error) {
                        console.error('날짜 포맷팅 오류:', error, '원본 데이터:', { startDate: site.startDate, endDate: site.endDate });
                        return '날짜 정보 없음';
                      }
                    })()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    현장관리자: {site.manager}
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {site.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleOpenDialog(site)}>
                  수정
                </Button>
                <Button size="small" color="error" onClick={() => handleDelete(site.id)}>
                  삭제
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSite ? '현장 정보 수정' : '새 현장 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장명"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="위치"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="시작일"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="종료일"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="상태"
                  >
                    <MenuItem value="pending">대기중</MenuItem>
                    <MenuItem value="active">진행중</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장관리자"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="예산"
                  name="budget"
                  type="number"
                  value={formData.budget}
                  onChange={handleInputChange}
                  required
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
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedSite ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConstructionStatus; 