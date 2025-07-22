import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
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
  Search as SearchIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    companyName: '',
    bidDate: '',
    siteName: '',
    amount: '',
    item: '',
    quantity: '',
    note: ''
  });
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchVendors();
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

  const handleOpen = (vendor = null) => {
    if (vendor) {
      setEditingVendor(vendor);
      setFormData({
        companyName: vendor.companyName || '',
        bidDate: vendor.bidDate || '',
        siteName: vendor.siteName || '',
        amount: vendor.amount || '',
        item: vendor.item || '',
        quantity: vendor.quantity || '',
        note: vendor.note || ''
      });
    } else {
      setEditingVendor(null);
      setFormData({
        companyName: '',
        bidDate: '',
        siteName: '',
        amount: '',
        item: '',
        quantity: '',
        note: ''
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

  const handleDownload = () => {
    const data = vendors.map((vendor, index) => ({
      'NO.': index + 1,
      '업체명': vendor.companyName || '',
      '낙찰일': vendor.bidDate || '',
      '현장명': vendor.siteName || '',
      '금액': vendor.amount || '',
      '품목': vendor.item || '',
      '물량': vendor.quantity || '',
      '비고': vendor.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '입찰현황');
    XLSX.writeFile(wb, `입찰현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Box sx={{ p: 3, marginTop: '64px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">입찰현황</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setShowSearch(!showSearch)}>
            <SearchIcon />
          </IconButton>
          <IconButton onClick={handleDownload}>
            <DownloadIcon />
          </IconButton>
          <IconButton onClick={() => handleOpen()}>
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {showSearch && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            placeholder="검색어를 입력하세요..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>업체명</TableCell>
              <TableCell>낙찰일</TableCell>
              <TableCell>현장명</TableCell>
              <TableCell>금액</TableCell>
              <TableCell>품목</TableCell>
              <TableCell>물량</TableCell>
              <TableCell>비고</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors
              .filter(vendor => 
                !searchTerm || 
                vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.item?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.companyName}</TableCell>
                <TableCell>{vendor.bidDate}</TableCell>
                <TableCell>{vendor.siteName}</TableCell>
                <TableCell>{vendor.amount}</TableCell>
                <TableCell>{vendor.item}</TableCell>
                <TableCell>{vendor.quantity}</TableCell>
                <TableCell>{vendor.note}</TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(vendor)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(vendor.id)}>
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
          {editingVendor ? '거래처 수정' : '거래처 등록'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="업체명"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="낙찰일"
              type="date"
              value={formData.bidDate}
              onChange={(e) => setFormData({ ...formData, bidDate: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="현장명"
              value={formData.siteName}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="금액"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="품목"
              value={formData.item}
              onChange={(e) => setFormData({ ...formData, item: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="물량"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="비고"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              margin="normal"
              multiline
              rows={2}
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

export default Vendors; 