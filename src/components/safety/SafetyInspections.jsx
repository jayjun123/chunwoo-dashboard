import React, { useState, useEffect } from 'react';
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
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  School as SchoolIcon,
  Report as ReportIcon,
  Photo as PhotoIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';

const SafetyInspections = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({
    type: '정기점검',
    siteId: '',
    title: '',
    date: '',
    inspector: '',
    status: '예정',
    findings: '',
    actions: '',
    location: '',
    description: '',
    photos: []
  });
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 현장 목록 로드
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      setSites(sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // 안전 점검 목록 로드 (날짜 최신순)
      const inspectionsSnapshot = await getDocs(collection(db, 'safetyInspections'));
      const inspectionsList = inspectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      inspectionsList.sort((a, b) => (new Date(b.date || 0)).getTime() - (new Date(a.date || 0)).getTime());
      setInspections(inspectionsList);

      // 안전 교육 목록 로드 (날짜 최신순)
      const trainingsSnapshot = await getDocs(collection(db, 'safetyTrainings'));
      const trainingsList = trainingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      trainingsList.sort((a, b) => (new Date(b.date || 0)).getTime() - (new Date(a.date || 0)).getTime());
      setTrainings(trainingsList);

      // 안전 사고 목록 로드 (날짜 최신순)
      const accidentsSnapshot = await getDocs(collection(db, 'safetyAccidents'));
      const accidentsList = accidentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      accidentsList.sort((a, b) => (new Date(b.date || 0)).getTime() - (new Date(a.date || 0)).getTime());
      setAccidents(accidentsList);

      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setError('데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleOpenDialog = (item = null) => {
    if (item) {
      setSelectedItem(item);
      setFormData({
        type: item.type,
        siteId: item.siteId,
        title: item.title,
        date: item.date,
        inspector: item.inspector,
        status: item.status,
        findings: item.findings || '',
        actions: item.actions || '',
        location: item.location || '',
        description: item.description || '',
        photos: item.photos || []
      });
    } else {
      setSelectedItem(null);
      setFormData({
        type: '정기점검',
        siteId: '',
        title: '',
        date: '',
        inspector: '',
        status: '예정',
        findings: '',
        actions: '',
        location: '',
        description: '',
        photos: []
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedItem(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingPhotos(true);

    try {
      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `safety_photos/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file, {
          customMetadata: {
            userId: currentUser.uid,
            uploadedAt: new Date().toISOString(),
            type: 'safety_inspection_photo'
          }
        });
        const downloadURL = await getDownloadURL(storageRef);
        return {
          url: downloadURL,
          name: file.name,
          timestamp: Date.now()
        };
      });

      const uploadedPhotos = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedPhotos]
      }));
    } catch (error) {
      console.error('사진 업로드 실패:', error);
      setError('사진 업로드에 실패했습니다.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const itemData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      let collectionName;
      switch (formData.type) {
        case '정기점검':
          collectionName = 'safetyInspections';
          break;
        case '특별점검':
          collectionName = 'safetyInspections';
          break;
        case '긴급점검':
          collectionName = 'safetyInspections';
          break;
        case '기타':
          collectionName = 'safetyInspections';
          break;
        default:
          collectionName = 'safetyInspections';
      }

      if (selectedItem) {
        await updateDoc(doc(db, collectionName, selectedItem.id), itemData);
      } else {
        itemData.createdAt = new Date().toISOString();
        await addDoc(collection(db, collectionName), itemData);
      }

      handleCloseDialog();
      loadData();
    } catch (error) {
      console.error('데이터 저장 실패:', error);
      setError('데이터를 저장하는데 실패했습니다.');
    }
  };

  const handleDelete = async (item, type) => {
    if (window.confirm('정말로 이 항목을 삭제하시겠습니까?')) {
      try {
        let collectionName;
        switch (type) {
          case '정기점검':
            collectionName = 'safetyInspections';
            break;
          case '특별점검':
            collectionName = 'safetyInspections';
            break;
          case '긴급점검':
            collectionName = 'safetyInspections';
            break;
          case '기타':
            collectionName = 'safetyInspections';
            break;
          default:
            collectionName = 'safetyInspections';
        }

        await deleteDoc(doc(db, collectionName, item.id));
        loadData();
      } catch (error) {
        console.error('삭제 실패:', error);
        setError('항목을 삭제하는데 실패했습니다.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료':
        return 'success';
      case '진행중':
        return 'primary';
      case '예정':
        return 'info';
      case '취소':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case '완료':
        return '완료';
      case '진행중':
        return '진행중';
      case '예정':
        return '예정';
      case '취소':
        return '취소';
      default:
        return status;
    }
  };

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site?.name : '미지정';
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
          안전관리
        </Typography>
        <Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ mr: 1 }}
          >
            점검 등록
          </Button>
          <Button
            variant="contained"
            startIcon={<SchoolIcon />}
            onClick={() => handleOpenDialog(null, 'training')}
            sx={{ mr: 1 }}
          >
            안전교육 추가
          </Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<WarningIcon />}
            onClick={() => handleOpenDialog(null, 'accident')}
          >
            사고기록 추가
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="안전점검" />
          <Tab label="안전교육" />
          <Tab label="사고기록" />
        </Tabs>
      </Paper>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedItem ? '안전 점검 수정' : '새 안전 점검 등록'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="제목"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>현장</InputLabel>
                <Select
                  name="siteId"
                  value={formData.siteId}
                  onChange={handleInputChange}
                  label="현장"
                  required
                >
                  {sites.map(site => (
                    <MenuItem key={site.id} value={site.id}>
                      {site?.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="점검일"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleInputChange}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="점검자"
                name="inspector"
                value={formData.inspector}
                onChange={handleInputChange}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>상태</InputLabel>
                <Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  label="상태"
                >
                  <MenuItem value="예정">예정</MenuItem>
                  <MenuItem value="진행중">진행중</MenuItem>
                  <MenuItem value="완료">완료</MenuItem>
                  <MenuItem value="취소">취소</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="장소"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="발견사항"
                name="findings"
                value={formData.findings}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="조치사항"
                name="actions"
                value={formData.actions}
                onChange={handleInputChange}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ mb: 2 }}>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="photo-upload"
                  type="file"
                  multiple
                  onChange={handlePhotoUpload}
                />
                <label htmlFor="photo-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<PhotoIcon />}
                    disabled={uploadingPhotos}
                  >
                    사진 첨부
                  </Button>
                </label>
              </Box>
              <Grid container spacing={2}>
                {formData.photos.map((photo, index) => (
                  <Grid item xs={12} sm={6} md={4} key={photo.timestamp}>
                    <Card>
                      <CardContent>
                        <img
                          src={photo.url}
                          alt={photo.name}
                          style={{ width: '100%', height: 200, objectFit: 'cover' }}
                        />
                      </CardContent>
                      <CardActions>
                        <IconButton
                          size="small"
                          onClick={() => handleRemovePhoto(index)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={uploadingPhotos}
          >
            {selectedItem ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {activeTab === 0 && (
        <Grid container spacing={3}>
          {inspections.map(inspection => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={inspection.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {inspection.title}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    현장: {getSiteName(inspection.siteId)}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    점검일: {inspection.date}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    점검자: {inspection.inspector}
                  </Typography>
                  <Chip
                    label={getStatusText(inspection.status)}
                    color={getStatusColor(inspection.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(inspection)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(inspection, inspection.type)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Grid container spacing={3}>
          {trainings.map(training => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={training.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {training.title}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    현장: {getSiteName(training.siteId)}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    교육일: {training.date}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    강사: {training.instructor}
                  </Typography>
                  <Chip
                    label={getStatusText(training.status)}
                    color={getStatusColor(training.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(training)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(training, 'training')}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {accidents.map(accident => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={accident.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {accident.title}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    현장: {getSiteName(accident.siteId)}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    발생일: {accident.date}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    보고자: {accident.reporter}
                  </Typography>
                  <Chip
                    label={getStatusText(accident.status)}
                    color={getStatusColor(accident.status)}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
                <CardActions>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(accident)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(accident, 'accident')}
                  >
                    <DeleteIcon />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default SafetyInspections; 