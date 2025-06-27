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
  MenuItem,
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
  AttachMoney as MoneyIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const VendorStatus = () => {
  const [vendors, setVendors] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    siteId: '',
    type: '시공',
    status: '진행중',
    contractAmount: '',
    progress: '0',
    startDate: '',
    endDate: '',
    manager: '',
    contact: '',
    workers: '',
    description: ''
  });

  useEffect(() => {
    fetchVendors();
    fetchSites();
  }, []);

  const fetchVendors = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'vendors'));
      const vendorList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorList);
    } catch (error) {
      console.error('Error fetching vendors:', error);
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

  const handleOpen = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData(vendor);
    } else {
      setEditingVendor(null);
      setFormData({
        name: '',
        siteId: '',
        type: '시공',
        status: '진행중',
        contractAmount: '',
        progress: '0',
        startDate: '',
        endDate: '',
        manager: '',
        contact: '',
        workers: '',
        description: ''
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingVendor(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVendor) {
        await updateDoc(doc(db, 'vendors', editingVendor.id), formData);
      } else {
        await addDoc(collection(db, 'vendors'), formData);
      }
      handleClose();
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleDelete = async (vendorId) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'vendors', vendorId));
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendor:', error);
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료':
        return 'success';
      case '진행중':
        return 'primary';
      case '대기':
        return 'warning';
      case '중단':
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
        <Typography variant="h4">협력업체 현황</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          협력업체 등록
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>업체명</TableCell>
              <TableCell>현장</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>계약금액</TableCell>
              <TableCell>진행률</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>작업인원</TableCell>
              <TableCell>작업기간</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>{getSiteName(vendor.siteId)}</TableCell>
                <TableCell>{vendor.type}</TableCell>
                <TableCell>
                  <Chip
                    label={vendor.status}
                    color={getStatusColor(vendor.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{vendor.contractAmount}원</TableCell>
                <TableCell>{vendor.progress}%</TableCell>
                <TableCell>{vendor.manager}</TableCell>
                <TableCell>{vendor.workers}명</TableCell>
                <TableCell>
                  {vendor.startDate} ~ {vendor.endDate}
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpen(vendor)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(vendor.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingVendor ? '협력업체 수정' : '새 협력업체 등록'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="업체명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
              <InputLabel>유형</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="유형"
              >
                <MenuItem value="시공">시공</MenuItem>
                <MenuItem value="자재">자재</MenuItem>
                <MenuItem value="장비">장비</MenuItem>
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
                <MenuItem value="대기">대기</MenuItem>
                <MenuItem value="중단">중단</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="계약금액"
              value={formData.contractAmount}
              onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
              margin="normal"
              required
              type="number"
            />
            <TextField
              fullWidth
              label="진행률"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
              margin="normal"
              required
              type="number"
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
            <TextField
              fullWidth
              label="연락처"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="작업인원"
              value={formData.workers}
              onChange={(e) => setFormData({ ...formData, workers: e.target.value })}
              margin="normal"
              required
              type="number"
            />
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
            {editingVendor ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VendorStatus; 