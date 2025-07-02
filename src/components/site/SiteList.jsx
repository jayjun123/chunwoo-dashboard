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
  useMediaQuery,
  useTheme
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const SiteList = () => {
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    status: '진행중',
    manager: '',
    budget: '',
    description: ''
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    fetchSites();
  }, []);

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

  const handleOpen = (site = null) => {
    if (site) {
      setEditingSite(site);
      setFormData(site);
    } else {
      setEditingSite(null);
      setFormData({
        name: '',
        location: '',
        startDate: '',
        endDate: '',
        status: '진행중',
        manager: '',
        budget: '',
        description: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingSite(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSite) {
        await updateDoc(doc(db, 'sites', editingSite.id), formData);
      } else {
        await addDoc(collection(db, 'sites'), formData);
      }
      handleClose();
      fetchSites();
    } catch (error) {
      console.error('Error saving site:', error);
    }
  };

  const handleDelete = async (siteId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
        fetchSites();
      } catch (error) {
        console.error('Error deleting site:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '진행중':
        return 'primary';
      case '완료':
        return 'success';
      case '중단':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3, ml: isMobile ? '4px' : 0, mt: isMobile ? '10px' : 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">현장 목록</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          현장 추가
        </Button>
      </Box>

      <Grid container spacing={3}>
        {sites.map((site) => (
          <Grid item xs={12} md={6} lg={4} key={site.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Typography variant="h6" gutterBottom>
                    {site.name}
                  </Typography>
                  <Box>
                    <IconButton size="small" onClick={() => handleOpen(site)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(site.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {site.location}
                </Typography>
                <Chip
                  label={site.status}
                  color={getStatusColor(site.status)}
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="textSecondary">
                  담당자: {site.manager}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  기간: {site.startDate} ~ {site.endDate}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  예산: {site.budget}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingSite ? '현장 정보 수정' : '새 현장 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="현장명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="위치"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="담당자"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              margin="normal"
              required
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
              label="예산"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="상태"
              select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              margin="normal"
              required
              SelectProps={{
                native: true
              }}
            >
              <option value="진행중">진행중</option>
              <option value="완료">완료</option>
              <option value="중단">중단</option>
            </TextField>
            <TextField
              fullWidth
              label="설명"
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
            {editingSite ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SiteList; 