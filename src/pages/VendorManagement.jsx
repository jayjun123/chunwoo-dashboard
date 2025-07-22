import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Sort as SortIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const VendorManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 전화번호 포맷팅 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 포맷팅
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  // 사업자번호 포맷팅 함수
  const formatBusinessNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^\d]/g, '');
    
    // 길이에 따라 포맷팅 (000-00-00000)
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 5) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 10) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
    }
  };

  // 상태 관리
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    phone: '',
    email: '',
    companyName: '',
    businessNumber: '',
    address: '',
    note: ''
  });

  // 거래처 데이터 로드
  const loadVendors = async () => {
    try {
      setLoading(true);
      const vendorsQuery = query(collection(db, 'vendorManagement'), orderBy(sortField, sortDirection));
      const querySnapshot = await getDocs(vendorsQuery);
      const vendorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorsData);
    } catch (error) {
      console.error('거래처 데이터 로드 오류:', error);
      setSnackbar({ open: true, message: '거래처 데이터를 불러오는데 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [sortField, sortDirection]);

  // 폼 초기화
  const resetForm = () => {
    setFormData({
      name: '',
      position: '',
      phone: '',
      email: '',
      companyName: '',
      businessNumber: '',
      address: '',
      note: ''
    });
    setEditingVendor(null);
  };

  // 다이얼로그 열기
  const handleOpenDialog = (vendor = null) => {
    if (vendor) {
      setFormData(vendor);
      setEditingVendor(vendor);
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  // 다이얼로그 닫기
  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  // 거래처 저장
  const handleSave = async () => {
    try {
      if (!formData.name.trim() && !formData.companyName.trim()) {
        setSnackbar({ open: true, message: '이름 또는 회사명 중 하나는 입력해야 합니다.', severity: 'warning' });
        return;
      }

      if (editingVendor) {
        // 수정
        await updateDoc(doc(db, 'vendorManagement', editingVendor.id), formData);
        setSnackbar({ open: true, message: '거래처가 수정되었습니다.', severity: 'success' });
      } else {
        // 추가
        await addDoc(collection(db, 'vendorManagement'), {
          ...formData,
          createdAt: new Date()
        });
        setSnackbar({ open: true, message: '거래처가 추가되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
      loadVendors();
    } catch (error) {
      console.error('거래처 저장 오류:', error);
      setSnackbar({ open: true, message: '거래처 저장에 실패했습니다.', severity: 'error' });
    }
  };

  // 거래처 삭제
  const handleDelete = async (vendor) => {
    if (window.confirm(`"${vendor.name}" 거래처를 삭제하시겠습니까?`)) {
      try {
        await deleteDoc(doc(db, 'vendorManagement', vendor.id));
        setSnackbar({ open: true, message: '거래처가 삭제되었습니다.', severity: 'success' });
        loadVendors();
      } catch (error) {
        console.error('거래처 삭제 오류:', error);
        setSnackbar({ open: true, message: '거래처 삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 정렬 변경
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 검색 필터링
  const filteredVendors = vendors.filter(vendor =>
    vendor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.position?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.phone?.includes(searchTerm) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 엑셀 다운로드
  const handleDownload = () => {
    const data = filteredVendors.map((vendor, index) => ({
      'NO.': index + 1,
      '이름': vendor.name || '',
      '직위': vendor.position || '',
      '번호': vendor.phone || '',
      '메일': vendor.email || '',
      '회사명': vendor.companyName || '',
      '사업자번호': vendor.businessNumber || '',
      '주소': vendor.address || '',
      '비고': vendor.note || ''
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '거래처목록');
    XLSX.writeFile(wb, `거래처목록_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // 엑셀 업로드
  const handleUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        let successCount = 0;
        for (const row of jsonData) {
          try {
            const vendorData = {
              name: row['이름'] || '',
              position: row['직위'] || '',
              phone: row['번호'] || '',
              email: row['메일'] || '',
              companyName: row['회사명'] || '',
              businessNumber: row['사업자번호'] || '',
              address: row['주소'] || '',
              note: row['비고'] || '',
              createdAt: new Date()
            };

            if (vendorData.name && vendorData.companyName) {
              await addDoc(collection(db, 'vendorManagement'), vendorData);
              successCount++;
            }
          } catch (error) {
            console.error('행 업로드 오류:', error);
          }
        }

        setSnackbar({ 
          open: true, 
          message: `${successCount}개의 거래처가 업로드되었습니다.`, 
          severity: 'success' 
        });
        loadVendors();
      } catch (error) {
        console.error('파일 업로드 오류:', error);
        setSnackbar({ open: true, message: '파일 업로드에 실패했습니다.', severity: 'error' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  if (isMobile) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>
          거래처 관리
        </Typography>
        <Typography variant="body2" sx={{ color: '#ccc' }}>
          PC에서 이용해주세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: '#1a1a1a', color: '#fff', marginTop: '64px' }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: '2rem', color: '#4caf50' }} />
          <Typography variant="h4" sx={{ fontWeight: 600, color: '#fff' }}>
            거래처 관리
          </Typography>
          <Chip 
            label={`총 ${filteredVendors.length}개`} 
            sx={{ backgroundColor: '#4caf50', color: '#fff' }} 
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            component="label"
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#4caf50' }
            }}
          >
            업로드
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleUpload}
              style={{ display: 'none' }}
            />
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#4caf50' }
            }}
          >
            다운로드
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#45a049' }
            }}
          >
            거래처 추가
          </Button>
        </Box>
      </Box>

      {/* 검색 및 정렬 */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          placeholder="거래처 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            flex: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#444' },
              '&:hover fieldset': { borderColor: '#666' },
              '&.Mui-focused fieldset': { borderColor: '#4caf50' }
            },
            '& .MuiInputBase-input': { color: '#fff' }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#666' }} />
              </InputAdornment>
            )
          }}
        />
        
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel sx={{ color: '#ccc' }}>정렬</InputLabel>
          <Select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortField(field);
              setSortDirection(direction);
            }}
            sx={{
              color: '#fff',
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#444' },
                '&:hover fieldset': { borderColor: '#666' },
                '&.Mui-focused fieldset': { borderColor: '#4caf50' }
              }
            }}
          >
            <MenuItem value="name-asc">이름 ↑</MenuItem>
            <MenuItem value="name-desc">이름 ↓</MenuItem>
            <MenuItem value="companyName-asc">회사명 ↑</MenuItem>
            <MenuItem value="companyName-desc">회사명 ↓</MenuItem>
            <MenuItem value="createdAt-desc">최신순</MenuItem>
            <MenuItem value="createdAt-asc">오래된순</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* 거래처 테이블 */}
      <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#333' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: 80 }}>NO.</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('name')}>
                이름 <SortIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>직위</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>번호</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>메일</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleSort('companyName')}>
                회사명 <SortIcon sx={{ fontSize: '1rem', ml: 0.5 }} />
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>사업자번호</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>주소</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>비고</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: 120 }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredVendors.map((vendor, index) => (
              <TableRow key={vendor.id} sx={{ '&:hover': { backgroundColor: '#333' } }}>
                <TableCell sx={{ color: '#fff' }}>{index + 1}</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{vendor.name}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{vendor.position}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{vendor.phone}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{vendor.email}</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{vendor.companyName}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{vendor.businessNumber}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{vendor.address}</TableCell>
                <TableCell sx={{ color: '#fff' }}>{vendor.note}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="수정">
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(vendor)}
                        sx={{ color: '#4caf50' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="삭제">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(vendor)}
                        sx={{ color: '#f44336' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 거래처 추가/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { backgroundColor: '#2a2a2a' }
        }}
      >
        <DialogTitle sx={{ color: '#fff' }}>
          {editingVendor ? '거래처 수정' : '거래처 추가'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField
              label="이름"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="직위"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="번호"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
              placeholder="000-0000-0000 또는 000-000-0000"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="메일"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="회사명"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="사업자번호"
              value={formData.businessNumber}
              onChange={(e) => setFormData({ ...formData, businessNumber: formatBusinessNumber(e.target.value) })}
              placeholder="000-00-00000"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="주소"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              sx={{
                gridColumn: '1 / -1',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
            <TextField
              label="비고"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              multiline
              rows={3}
              sx={{
                gridColumn: '1 / -1',
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#4caf50' }
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #444' }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#ccc' }}>
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            sx={{
              backgroundColor: '#4caf50',
              '&:hover': { backgroundColor: '#45a049' }
            }}
          >
            {editingVendor ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default VendorManagement; 