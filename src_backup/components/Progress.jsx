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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const Progress = () => {
  const [progressItems, setProgressItems] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    category: '공사',
    status: '진행중',
    progress: 0,
    startDate: '',
    endDate: '',
    description: '',
    manager: '',
    priority: '보통',
    dependencies: []
  });

  useEffect(() => {
    fetchProgressItems();
    fetchSites();
  }, []);

  const fetchProgressItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'progress'));
      const progressList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProgressItems(progressList);
    } catch (error) {
      console.error('Error fetching progress items:', error);
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

  const handleOpen = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        siteId: '',
        category: '공사',
        status: '진행중',
        progress: 0,
        startDate: '',
        endDate: '',
        description: '',
        manager: '',
        priority: '보통',
        dependencies: []
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'progress', editingItem.id), formData);
      } else {
        await addDoc(collection(db, 'progress'), formData);
      }
      handleClose();
      fetchProgressItems();
    } catch (error) {
      console.error('Error saving progress item:', error);
    }
  };

  const handleDelete = async (itemId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'progress', itemId));
        fetchProgressItems();
      } catch (error) {
        console.error('Error deleting progress item:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료':
        return 'success';
      case '진행중':
        return 'primary';
      case '지연':
        return 'error';
      case '대기':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case '높음':
        return 'error';
      case '보통':
        return 'warning';
      case '낮음':
        return 'success';
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
        <Typography variant="h4">진행 상황</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          진행 항목 추가
        </Button>
      </Box>

      <Grid container spacing={3}>
        {progressItems.map((item) => (
          <Grid item xs={12} key={item.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">{item.title}</Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(item)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  현장: {getSiteName(item.siteId)}
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={item.priority}
                    color={getPriorityColor(item.priority)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={item.category}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    진행률
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    {item.progress}%
                  </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                  담당자: {item.manager}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  기간: {item.startDate} ~ {item.endDate}
                </Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>
                  {item.description}
                </Typography>
                {item.dependencies && item.dependencies.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      의존 항목
                    </Typography>
                    {item.dependencies.map((dep, index) => (
                      <Chip
                        key={index}
                        label={dep}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? '진행 항목 수정' : '새 진행 항목 추가'}
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
            <FormControl fullWidth margin="normal" required>
              <InputLabel>분류</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="분류"
              >
                <MenuItem value="공사">공사</MenuItem>
                <MenuItem value="설계">설계</MenuItem>
                <MenuItem value="인허가">인허가</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="진행중">진행중</MenuItem>
                <MenuItem value="완료">완료</MenuItem>
                <MenuItem value="지연">지연</MenuItem>
                <MenuItem value="대기">대기</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="진행률"
              type="number"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              margin="normal"
              required
              InputProps={{
                inputProps: { min: 0, max: 100 }
              }}
            />
            <TextField
              fullWidth
              label="시작일"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="종료일"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="담당자"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>우선순위</InputLabel>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                label="우선순위"
              >
                <MenuItem value="높음">높음</MenuItem>
                <MenuItem value="보통">보통</MenuItem>
                <MenuItem value="낮음">낮음</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="설명"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={4}
            />
            <TextField
              fullWidth
              label="의존 항목"
              value={formData.dependencies.join(', ')}
              onChange={(e) => setFormData({ ...formData, dependencies: e.target.value.split(',').map(item => item.trim()) })}
              margin="normal"
              placeholder="쉼표로 구분하여 입력"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingItem ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Progress; 