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

const SafetyIncidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    siteId: '',
    date: '',
    type: '사고',
    severity: '중간',
    status: '조사중',
    description: '',
    location: '',
    injured: '',
    cause: '',
    measures: ''
  });

  useEffect(() => {
    fetchIncidents();
    fetchSites();
  }, []);

  const fetchIncidents = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'safety_incidents'));
      const incidentList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setIncidents(incidentList);
    } catch (error) {
      console.error('Error fetching incidents:', error);
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

  const handleOpen = (incident = null) => {
    if (incident) {
      setEditingIncident(incident);
      setFormData(incident);
    } else {
      setEditingIncident(null);
      setFormData({
        title: '',
        siteId: '',
        date: '',
        type: '사고',
        severity: '중간',
        status: '조사중',
        description: '',
        location: '',
        injured: '',
        cause: '',
        measures: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingIncident(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingIncident) {
        await updateDoc(doc(db, 'safety_incidents', editingIncident.id), formData);
      } else {
        await addDoc(collection(db, 'safety_incidents'), formData);
      }
      handleClose();
      fetchIncidents();
    } catch (error) {
      console.error('Error saving incident:', error);
    }
  };

  const handleDelete = async (incidentId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'safety_incidents', incidentId));
        fetchIncidents();
      } catch (error) {
        console.error('Error deleting incident:', error);
      }
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case '심각':
        return 'error';
      case '중간':
        return 'warning';
      case '경미':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료':
        return 'success';
      case '조사중':
        return 'primary';
      case '보고':
        return 'info';
      case '조치중':
        return 'warning';
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
        <Typography variant="h4">안전사고 관리</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          사고 등록
        </Button>
      </Box>

      <Grid container spacing={3}>
        {incidents.map((incident) => (
          <Grid item xs={12} md={6} lg={2} key={incident.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {incident.title}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(incident)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(incident.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  현장: {getSiteName(incident.siteId)}
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={incident.severity}
                    color={getSeverityColor(incident.severity)}
                    size="small"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={incident.status}
                    color={getStatusColor(incident.status)}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary">
                  발생일: {incident.date}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  유형: {incident.type}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  장소: {incident.location}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  부상자: {incident.injured}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIncident ? '사고 수정' : '새 사고 등록'}
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
              label="발생일"
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
                <MenuItem value="사고">사고</MenuItem>
                <MenuItem value="거의사고">거의사고</MenuItem>
                <MenuItem value="위험상황">위험상황</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>심각도</InputLabel>
              <Select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                label="심각도"
              >
                <MenuItem value="심각">심각</MenuItem>
                <MenuItem value="중간">중간</MenuItem>
                <MenuItem value="경미">경미</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" required>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                <MenuItem value="조사중">조사중</MenuItem>
                <MenuItem value="조치중">조치중</MenuItem>
                <MenuItem value="보고">보고</MenuItem>
                <MenuItem value="완료">완료</MenuItem>
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
              label="부상자"
              value={formData.injured}
              onChange={(e) => setFormData({ ...formData, injured: e.target.value })}
              margin="normal"
            />
            <TextField
              fullWidth
              label="원인"
              value={formData.cause}
              onChange={(e) => setFormData({ ...formData, cause: e.target.value })}
              margin="normal"
              multiline
              rows={2}
            />
            <TextField
              fullWidth
              label="조치사항"
              value={formData.measures}
              onChange={(e) => setFormData({ ...formData, measures: e.target.value })}
              margin="normal"
              multiline
              rows={2}
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
            {editingIncident ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SafetyIncidents; 