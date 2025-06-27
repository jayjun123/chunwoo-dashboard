import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
  IconButton,
  Chip,
  useTheme,
  useMediaQuery,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const Vendors = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [vendors, setVendors] = useState([]);
  const [open, setOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    type: '건설업체',
    contact: '',
    email: '',
    address: '',
    status: '활성',
    contractDate: '',
    lastOrder: '',
    contractAmount: '',
    progress: '0',
    manager: '',
    workers: '',
    description: '',
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      const q = query(
        collection(db, 'vendors'),
        orderBy('contractDate', 'desc')
      );
      const querySnapshot = await getDocs(q);
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
      setSelectedVendor(vendor);
      setFormData({
        ...vendor,
        contractDate: vendor.contractDate || format(new Date(), 'yyyy-MM-dd'),
        lastOrder: vendor.lastOrder || format(new Date(), 'yyyy-MM-dd'),
      });
    } else {
      setSelectedVendor(null);
      setFormData({
        name: '',
        category: '',
        type: '건설업체',
        contact: '',
        email: '',
        address: '',
        status: '활성',
        contractDate: format(new Date(), 'yyyy-MM-dd'),
        lastOrder: format(new Date(), 'yyyy-MM-dd'),
        contractAmount: '',
        progress: '0',
        manager: '',
        workers: '',
        description: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedVendor(null);
  };

  const handleSubmit = async () => {
    try {
      if (selectedVendor) {
        await updateDoc(doc(db, 'vendors', selectedVendor.id), formData);
      } else {
        await addDoc(collection(db, 'vendors'), formData);
      }
      handleClose();
      fetchVendors();
    } catch (error) {
      console.error('Error saving vendor:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'vendors', id));
        fetchVendors();
      } catch (error) {
        console.error('Error deleting vendor:', error);
      }
    }
  };

  const handleExportExcel = () => {
    const data = vendors.map(vendor => ({
      '업체명': vendor.name,
      '분류': vendor.category,
      '유형': vendor.type,
      '연락처': vendor.contact,
      '이메일': vendor.email,
      '주소': vendor.address,
      '상태': vendor.status,
      '계약일': vendor.contractDate,
      '최근주문': vendor.lastOrder,
      '계약금액': vendor.contractAmount,
      '진행률': vendor.progress,
      '담당자': vendor.manager,
      '작업인원': vendor.workers,
      '비고': vendor.description,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '거래처현황');
    XLSX.writeFile(wb, '거래처현황.xlsx');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '활성': return 'success';
      case '비활성': return 'warning';
      case '계약종료': return 'error';
      default: return 'default';
    }
  };

  const categories = ['철근', '콘크리트', '안전장비', '토목', '기타'];
  const types = ['건설업체', 'AL관급업체', 'PL관급업체'];
  const statuses = ['활성', '비활성', '계약종료'];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">거래처 현황</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
          >
            거래처 등록
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>업체명</TableCell>
              <TableCell>분류</TableCell>
              <TableCell>유형</TableCell>
              <TableCell>연락처</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>계약일</TableCell>
              <TableCell>계약금액</TableCell>
              <TableCell>진행률</TableCell>
              <TableCell>담당자</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {vendors.map((vendor) => (
              <TableRow key={vendor.id}>
                <TableCell>{vendor.name}</TableCell>
                <TableCell>{vendor.category}</TableCell>
                <TableCell>{vendor.type}</TableCell>
                <TableCell>{vendor.contact}</TableCell>
                <TableCell>{vendor.email}</TableCell>
                <TableCell>
                  <Chip
                    label={vendor.status}
                    color={getStatusColor(vendor.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{vendor.contractDate}</TableCell>
                <TableCell>{vendor.contractAmount}</TableCell>
                <TableCell>{vendor.progress}%</TableCell>
                <TableCell>{vendor.manager}</TableCell>
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

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedVendor ? '거래처 수정' : '거래처 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="업체명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>분류</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                label="분류"
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>유형</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="유형"
              >
                {types.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="연락처"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              fullWidth
            />
            <TextField
              label="이메일"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>상태</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="상태"
              >
                {statuses.map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="계약일"
              type="date"
              value={formData.contractDate}
              onChange={(e) => setFormData({ ...formData, contractDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="계약금액"
              value={formData.contractAmount}
              onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
              fullWidth
            />
            <TextField
              label="진행률"
              type="number"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
              fullWidth
              InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            />
            <TextField
              label="담당자"
              value={formData.manager}
              onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
              fullWidth
            />
            <TextField
              label="작업인원"
              value={formData.workers}
              onChange={(e) => setFormData({ ...formData, workers: e.target.value })}
              fullWidth
            />
            <TextField
              label="비고"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedVendor ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vendors; 