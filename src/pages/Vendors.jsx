import React, { useState, useEffect } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
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
  Download as DownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const Vendors = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [formData, setFormData] = useState({
    siteName: '',
    date: '',
    name: '',
    type: '',
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

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
        siteName: vendor.siteName || '',
        date: vendor.date || '',
        name: vendor.name || '',
        type: vendor.type || '',
        description: vendor.description || ''
      });
    } else {
      setEditingVendor(null);
      setFormData({
        siteName: '',
        date: '',
        name: '',
        type: '',
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

  const handleExcelDownload = () => {
    // 엑셀 다운로드 로직
    const csvContent = [
      ['현장명', '낙찰일', '업체명', '분류', '비고'],
      ...vendors.map(vendor => [
        vendor.siteName || '',
        vendor.date || '',
        vendor.name || '',
        vendor.type || '',
        vendor.description || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `거래처현황_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSearch = () => {
    setSearchOpen(!searchOpen);
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box sx={{ p: { xs: 0, md: 3 }, pt: { xs: 0, md: 8 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">거래처현황</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            variant="outlined"
            onClick={handleSearch}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <SearchIcon />
          </IconButton>
          <IconButton
            variant="outlined"
            onClick={handleExcelDownload}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <DownloadIcon />
          </IconButton>
          <IconButton
            variant="contained"
            onClick={() => handleOpen()}
            sx={{ 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <AddIcon />
          </IconButton>
        </Box>
      </Box>

      {searchOpen && (
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="검색어 입력"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="현장명, 업체명, 분류로 검색"
            variant="outlined"
            size="small"
          />
        </Box>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>현장명</TableCell>
              {!isMobile && <TableCell>낙찰일</TableCell>}
              <TableCell>업체명</TableCell>
              {!isMobile && <TableCell>분류</TableCell>}
              <TableCell>비고</TableCell>
              {!isMobile && <TableCell>관리</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.siteName}</TableCell>
                {!isMobile && <TableCell>{vendor.date}</TableCell>}
                <TableCell>{vendor.name}</TableCell>
                {!isMobile && <TableCell>{vendor.type}</TableCell>}
                <TableCell>{vendor.description}</TableCell>
                {!isMobile && (
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(vendor)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(vendor.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                )}
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
              label="현장명"
              value={formData.siteName}
              onChange={(e) => setFormData({ ...formData, siteName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="낙찰일"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="업체명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <FormControl fullWidth margin="normal" required>
              <InputLabel>분류</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="분류"
              >
                <MenuItem value="시공">시공</MenuItem>
                <MenuItem value="자재">자재</MenuItem>
                <MenuItem value="장비">장비</MenuItem>
                <MenuItem value="기타">기타</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="비고"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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