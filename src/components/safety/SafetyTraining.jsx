import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const SafetyTraining = () => {
  const [trainings, setTrainings] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTraining, setEditingTraining] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    date: '',
    type: '정기교육',
    instructor: '',
    participants: '',
    duration: '',
    status: '예정',
    description: '',
    location: '',
    materials: ''
  });

  useEffect(() => {
    fetchTrainings();
    fetchSites();
  }, []);

  const fetchTrainings = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'safety_trainings'));
      const trainingList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      trainingList.sort((a, b) => (new Date(b.date || 0)).getTime() - (new Date(a.date || 0)).getTime());
      setTrainings(trainingList);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    }
  };

  const fetchSites = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'sites'));
      const siteList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(siteList);
    } catch (error) {
      console.error('Error fetching sites:', error);
    }
  };

  const handleOpen = (training = null) => {
    if (training) {
      setEditingTraining(training);
      setFormData(training);
    } else {
      setEditingTraining(null);
      setFormData({
        title: '',
        siteId: '',
        date: '',
        type: '정기교육',
        instructor: '',
        participants: '',
        duration: '',
        status: '예정',
        description: '',
        location: '',
        materials: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTraining(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTraining) {
        await updateDoc(doc(db, 'safety_trainings', editingTraining.id), formData);
      } else {
        await addDoc(collection(db, 'safety_trainings'), formData);
      }
      handleClose();
      fetchTrainings();
    } catch (error) {
      console.error('Error saving training:', error);
    }
  };

  const handleDelete = async (trainingId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'safety_trainings', trainingId));
        fetchTrainings();
      } catch (error) {
        console.error('Error deleting training:', error);
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

  const getSiteName = (siteId) => {
    const site = sites.find(s => s.id === siteId);
    return site ? site.name : '미지정';
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">안전교육 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          교육 등록
        </Button>
      </Box>

      <Grid container spacing={3}>
        {trainings.map((training) => (
          <Grid item xs={12} md={6} lg={2} key={training.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {training.title}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(training)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(training.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  현장: {getSiteName(training.siteId)}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={training.status}
                    color={getStatusColor(training.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  일시: {training.date}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  유형: {training.type}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  강사: {training.instructor}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  참석자: {training.participants}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  소요시간: {training.duration}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTraining ? '교육 수정' : '새 교육 등록'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="제목"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>현장</InputLabel>
              <Select
                value={formData.siteId}
                onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                label="현장"
              >
                {sites.map((site) => (
                  <MenuItem key={site.id} value={site.id}>
                    {site.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="일시"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>유형</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="유형"
              >
                <MenuItem value="정기교육">정기교육</MenuItem>
                <MenuItem value="신규교육">신규교육</MenuItem>
                <MenuItem value="특별교육">특별교육</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="강사"
              value={formData.instructor}
              onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="참석자"
              value={formData.participants}
              onChange={(e) => setFormData({ ...formData, participants: e.target.value })}
              margin="normal"
              placeholder="쉼표로 구분하여 입력"
            />
            <TextField
              fullWidth
              label="소요시간"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              margin="normal"
              placeholder="예: 2시간"
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="예정">예정</MenuItem>
                <MenuItem value="진행중">진행중</MenuItem>
                <MenuItem value="완료">완료</MenuItem>
                <MenuItem value="취소">취소</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="장소"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="교육자료"
              value={formData.materials}
              onChange={(e) => setFormData({ ...formData, materials: e.target.value })}
              margin="normal"
              placeholder="교육자료 링크 또는 파일명"
            />
            <TextField
              fullWidth
              label="상세설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingTraining ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SafetyTraining; 