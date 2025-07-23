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
  Download as DownloadIcon,
  Upload as UploadIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sortField, setSortField] = useState('bidDate');
  const [sortDirection, setSortDirection] = useState('desc');

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

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // 데이터 매핑 및 변환
        const vendorsToAdd = jsonData.map(row => ({
          companyName: row['업체명'] || row['companyName'] || '',
          bidDate: row['낙찰일'] || row['bidDate'] || '',
          siteName: row['현장명'] || row['siteName'] || '',
          amount: row['금액'] || row['amount'] || '',
          item: row['품목'] || row['item'] || '',
          quantity: row['물량'] || row['quantity'] || '',
          note: row['비고'] || row['note'] || ''
        })).filter(vendor => vendor.companyName && vendor.siteName); // 필수 필드가 있는 데이터만

        // Firestore에 데이터 추가
        for (const vendor of vendorsToAdd) {
          await addDoc(collection(db, 'vendors'), vendor);
        }

        alert(`${vendorsToAdd.length}개의 입찰현황 데이터가 성공적으로 업로드되었습니다.`);
        fetchVendors();
        setUploadDialogOpen(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('파일 업로드 오류:', error);
      alert('파일 업로드 중 오류가 발생했습니다.');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedVendors = () => {
    const filteredVendors = vendors.filter(vendor => 
      !searchTerm || 
      vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.item?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filteredVendors.sort((a, b) => {
      let aValue = a[sortField] || '';
      let bValue = b[sortField] || '';

      // 숫자 필드 처리 (금액, 물량)
      if (sortField === 'amount' || sortField === 'quantity') {
        aValue = parseFloat(aValue.replace(/[^\d.-]/g, '')) || 0;
        bValue = parseFloat(bValue.replace(/[^\d.-]/g, '')) || 0;
      }

      // 날짜 필드 처리
      if (sortField === 'bidDate') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  return (
    <Box sx={{ p: 3, marginTop: '64px' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">입찰현황</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton onClick={() => setShowSearch(!showSearch)}>
            <SearchIcon />
          </IconButton>
          <IconButton onClick={() => setUploadDialogOpen(true)}>
            <UploadIcon />
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
              <TableCell 
                onClick={() => handleSort('companyName')}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  업체명
                  {sortField === 'companyName' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => handleSort('bidDate')}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  낙찰일
                  {sortField === 'bidDate' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => handleSort('siteName')}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  현장명
                  {sortField === 'siteName' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => handleSort('amount')}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  금액
                  {sortField === 'amount' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => handleSort('item')}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  품목
                  {sortField === 'item' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell 
                onClick={() => handleSort('quantity')}
                sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'rgba(0,0,0,0.04)' } }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  물량
                  {sortField === 'quantity' && (
                    sortDirection === 'asc' ? <ArrowUpwardIcon fontSize="small" /> : <ArrowDownwardIcon fontSize="small" />
                  )}
                </Box>
              </TableCell>
              <TableCell>비고</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getSortedVendors().map((vendor) => (
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

      {/* 파일 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>입찰현황 파일 업로드</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Excel 파일을 업로드하여 입찰현황 데이터를 일괄 등록할 수 있습니다.
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              지원 형식: .xlsx, .xls<br/>
              필수 컬럼: 업체명, 현장명<br/>
              선택 컬럼: 낙찰일, 금액, 품목, 물량, 비고
            </Typography>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="upload-file"
              type="file"
              onChange={handleFileUpload}
            />
            <label htmlFor="upload-file">
              <Button
                variant="contained"
                component="span"
                startIcon={<UploadIcon />}
                fullWidth
              >
                파일 선택
              </Button>
            </label>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>취소</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Vendors; 