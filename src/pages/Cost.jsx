import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Snackbar, 
  Alert, 
  useMediaQuery, 
  MenuItem,
  InputAdornment,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Checkbox
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { exportToExcel } from '../utils/exportUtils';
import { useAuth } from '../contexts/AuthContext';

const Cost = ({ viewType, currentMonth, monthText, selectedSites, filteredData }) => {
  const { currentUser } = useAuth();
  const [costs, setCosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [form, setForm] = useState({
    site: '',
    itemType: '',
    date: '',
    totalValue: '',
    paymentType: '',
    description: '',
    etcNote: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isMobile = useMediaQuery('(max-width:900px)');

  // 필터링된 데이터가 전달되면 사용
  useEffect(() => {
    if (filteredData) {
      setCosts(filteredData);
    }
  }, [filteredData]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sites'));
        setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('현장명 목록 조회 실패:', error);
        setSites([]);
      }
    };
    fetchSites();
  }, []);

  // 검색 및 정렬된 데이터
  const filteredAndSortedCosts = useMemo(() => {
    let filtered = costs.filter(cost =>
      cost.site?.toLowerCase().includes(search.toLowerCase()) ||
      cost.itemType?.toLowerCase().includes(search.toLowerCase()) ||
      cost.paymentType?.toLowerCase().includes(search.toLowerCase()) ||
      cost.description?.toLowerCase().includes(search.toLowerCase())
    );

    // 클라이언트 사이드 정렬
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'totalValue') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === 'date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [costs, search, sortField, sortDirection]);

  // 통계 데이터
  const stats = useMemo(() => {
    const filtered = filteredData || filteredAndSortedCosts;
    const totalValue = filtered.reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
    
    return { totalValue };
  }, [filteredData, filteredAndSortedCosts]);

  // 체크박스 관련 함수들
  const handleSelectAll = (event) => {
    const filtered = filteredData || filteredAndSortedCosts;
    if (event.target.checked) {
      setSelectedItems(filtered.map(item => item.id));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) {
      setSnackbar({ open: true, message: '삭제할 항목을 선택해주세요.', severity: 'warning' });
      return;
    }

    if (window.confirm(`선택된 ${selectedItems.length}개 항목을 삭제하시겠습니까?`)) {
      try {
        const deletePromises = selectedItems.map(id => deleteDoc(doc(db, 'costs', id)));
        await Promise.all(deletePromises);
        setSelectedItems([]);
        setSnackbar({ open: true, message: `${selectedItems.length}개 항목이 삭제되었습니다.`, severity: 'success' });
      } catch (error) {
        console.error('일괄 삭제 실패:', error);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  const handleExcelDownload = () => {
    try {
      const data = filteredAndSortedCosts.map(cost => ({
        '현장명': cost.site || '-',
        '항목': cost.itemType || '-',
        '사용날짜': cost.date || '-',
        '금액': Number(cost.totalValue || 0).toLocaleString(),
        '결제': cost.paymentType || '-',
        '비고': cost.description || '-',
        '기타': cost.etcNote || '-',
      }));

      // 컬럼 너비 설정 (한글 텍스트 고려)
      const columnWidths = [
        { wch: 20 }, // 현장명
        { wch: 12 }, // 항목
        { wch: 15 }, // 사용날짜
        { wch: 15 }, // 금액
        { wch: 12 }, // 결제
        { wch: 25 }, // 비고
        { wch: 20 }, // 기타
      ];

      const result = exportToExcel(data, '지출현황', '지출현황', { columnWidths });
      
      if (result.success) {
        setSnackbar({ open: true, message: '엑셀 파일이 다운로드되었습니다.', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
      }
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  const openDialog = (cost = null) => {
    if (cost) {
      setEditId(cost.id);
      setForm({
        site: cost.site || '',
        itemType: cost.itemType || '',
        date: cost.date || '',
        totalValue: cost.totalValue || '',
        paymentType: cost.paymentType || '',
        description: cost.description || '',
        etcNote: cost.etcNote || '',
      });
    } else {
      setEditId(null);
      setForm({
        site: '',
        itemType: '',
        date: '',
        totalValue: '',
        paymentType: '',
        description: '',
        etcNote: '',
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({
      site: '',
      itemType: '',
      date: '',
      totalValue: '',
      paymentType: '',
      description: '',
      etcNote: '',
    });
  };

  const handleSave = async () => {
    if (!form.site || !form.itemType) {
      setSnackbar({ open: true, message: '필수 항목을 입력해주세요.', severity: 'error' });
      return;
    }

    try {
      const costData = {
        ...form,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editId) {
        await updateDoc(doc(db, 'costs', editId), costData);
        setSnackbar({ open: true, message: '지출 항목이 수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'costs'), {
          ...costData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        setSnackbar({ open: true, message: '지출 항목이 추가되었습니다.', severity: 'success' });
      }
      closeDialog();
    } catch (error) {
      console.error('지출 항목 저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'costs', id));
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('지출 항목 삭제 실패:', error);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
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

  const StatCard = ({ title, value, color }) => (
    <Grid item xs={6} sm={6} md={3}>
      <Card sx={{ 
        p: isMobile ? 2 : 2, 
        height: '100%', 
        bgcolor: '#181f2e', 
        color: '#fff',
        border: '1px solid #232b3b'
      }}>
        <Typography 
          variant={isMobile ? "subtitle2" : "subtitle2"} 
          sx={{ 
            color: '#bbb', 
            mb: isMobile ? 1 : 1,
            fontSize: isMobile ? '0.9rem' : 'inherit',
            lineHeight: isMobile ? 1.2 : 'inherit'
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant={isMobile ? "h6" : "h6"} 
          color={color || '#43e97b'} 
          sx={{ 
            fontWeight: 'bold',
            fontSize: isMobile ? '1rem' : 'inherit',
            lineHeight: isMobile ? 1.2 : 'inherit'
          }}
        >
          {Number(value || 0).toLocaleString()}원
        </Typography>
      </Card>
    </Grid>
  );

  // 필터 적용 (상위 컴포넌트에서 전달받은 filteredData 사용)
  const filtered = filteredData || filteredAndSortedCosts;

  return (
    <Box sx={{ p: 2 }}>
      {/* 통계 카드 + 새지출 버튼 한 줄 배치 (모바일만) */}
      {isMobile ? (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, position: 'relative', width: 390 }}>
          <Grid container spacing={2} sx={{ flex: 1 }}>
            <StatCard title="총 지출액" value={stats.totalValue} color="#ef5350" />
            <StatCard title="건수" value={filtered.length} color="#a084e8" />
          </Grid>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<AddIcon />} 
            sx={{ ml: 2, height: 40, position: 'absolute', right: 4, top: 15 }} 
            onClick={() => openDialog()}>
            새 지출
          </Button>
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <StatCard title="총 지출액" value={stats.totalValue} color="#ef5350" />
            <StatCard title="건수" value={filtered.length} color="#a084e8" />
          </Grid>
        </Box>
      )}
      
      <Paper sx={{ 
        width: isMobile ? '410px' : '100%', 
        overflow: 'hidden', 
        mt: 3, 
        p: 2,
        maxWidth: isMobile ? '410px' : '100vw',
        boxSizing: 'border-box',
        ml: isMobile ? '-16px' : 0
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, position: 'relative' }}>
          <Typography variant="h6" sx={{ flex: 1, display: isMobile ? 'none' : 'block' }}>지출현황</Typography>
          <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} sx={{ ml: 1, display: isMobile ? 'none' : 'flex' }} onClick={handleExcelDownload}>엑셀 다운로드</Button>
          <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />} sx={{ ml: 1, display: isMobile ? 'none' : 'flex' }}>엑셀 업로드</Button>
        </Box>
        <TableContainer sx={{ 
          width: isMobile ? '410px' : '100%',
          maxWidth: isMobile ? '410px' : '100%',
          overflowX: 'auto'
        }}>
          <Table size={isMobile ? 'small' : 'medium'} sx={{ 
            width: isMobile ? '410px' : '100%',
            minWidth: isMobile ? '410px' : '100%',
            tableLayout: 'auto'
          }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#232b3b' }}>
                <TableCell padding="checkbox" sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                  <Checkbox
                    indeterminate={selectedItems.length > 0 && selectedItems.length < filtered.length}
                    checked={filtered.length > 0 && selectedItems.length === filtered.length}
                    onChange={handleSelectAll}
                    sx={{ color: '#fff' }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, ml: isMobile ? '-8px' : 0 }}>현장명</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, ml: isMobile ? '-8px' : 0 }}>항목</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>사용날짜</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, ml: isMobile ? '-8px' : 0 }}>금액</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>결제</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>비고</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>기타</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 9} sx={{ textAlign: 'center', color: '#bbb', py: 4, ml: isMobile ? '-8px' : 0 }}>
                    {search ? '검색 결과가 없습니다.' : '지출 데이터가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(cost => (
                  <TableRow 
                    key={cost.id} 
                    sx={{ 
                      '&:hover': { bgcolor: '#232b3b' },
                      borderBottom: '1px solid #333'
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <Checkbox
                        checked={selectedItems.includes(cost.id)}
                        onChange={() => handleSelectItem(cost.id)}
                        sx={{ color: '#90caf9' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>{cost.site || '-'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={cost.itemType || '-'} 
                        size="small" 
                        sx={{ 
                          bgcolor: cost.itemType === '노무비' ? '#ffd600' : 
                                  cost.itemType === '경비' ? '#ef5350' : 
                                  cost.itemType === 'RnD' ? '#43e97b' : '#a084e8',
                          color: '#000',
                          fontWeight: 700
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#fff', display: isMobile ? 'none' : 'table-cell' }}>{cost.date || '-'}</TableCell>
                    <TableCell sx={{ color: '#ef5350', fontWeight: 700 }}>
                      {Number(cost.totalValue || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <Chip 
                        label={cost.paymentType || '-'} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: '#555',
                          color: '#fff'
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#bbb', display: isMobile ? 'none' : 'table-cell' }}>{cost.description || '-'}</TableCell>
                    <TableCell sx={{ color: '#bbb', display: isMobile ? 'none' : 'table-cell' }}>{cost.etcNote || '-'}</TableCell>
                    <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => openDialog(cost)}
                        sx={{ color: '#90caf9' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(cost.id)}
                        sx={{ color: '#ef5350' }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 항목 추가/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#181f2e',
            color: '#fff',
            borderRadius: 4,
            minHeight: '480px'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#232b3b', 
          color: '#90caf9',
          fontWeight: 700,
          fontSize: '1.3rem',
          py: 2,
          textAlign: 'center'
        }}>
          지출 항목
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 2, mt: 6 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* 1줄: 현장명(검색/드롭다운) + 항목(드롭다운) */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <FormControl sx={{ flex: 1, minWidth: 140 }} size="medium">
                <InputLabel sx={{ color: '#bbb', fontSize: '1rem' }}>현장명</InputLabel>
                <Select
                  value={form.site ?? ''}
                  label="현장명"
                  onChange={e => setForm({ ...form, site: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                    '& .MuiSelect-icon': { color: '#fff' },
                    '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#232b3b',
                        '& .MuiMenuItem-root': {
                          color: '#fff',
                          fontSize: '1rem',
                          py: 1.5,
                          '&:hover': { bgcolor: '#2c3446' },
                          '&.Mui-selected': { bgcolor: '#1976d2' }
                        }
                      }
                    }
                  }}
                >
                  {sites.length === 0 ? (
                    <MenuItem value="" disabled>현장 없음</MenuItem>
                  ) : (
                    sites.map(site => (
                      <MenuItem key={site.id} value={site.name}>{site.name}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <FormControl sx={{ flex: 1, minWidth: 140 }} size="medium">
                <InputLabel sx={{ color: '#bbb', fontSize: '1rem' }}>항목</InputLabel>
                <Select
                  value={form.itemType ?? ''}
                  label="항목"
                  onChange={e => setForm({ ...form, itemType: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                    '& .MuiSelect-icon': { color: '#fff' },
                    '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#232b3b',
                        '& .MuiMenuItem-root': {
                          color: '#fff',
                          fontSize: '1rem',
                          py: 1.5,
                          '&:hover': { bgcolor: '#2c3446' },
                          '&.Mui-selected': { bgcolor: '#1976d2' }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="노무비">노무비</MenuItem>
                  <MenuItem value="경비">경비</MenuItem>
                  <MenuItem value="RnD">RnD</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {/* 2줄: 사용날짜(날짜선택) + 결제방법(드롭다운) */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <TextField
                label="사용날짜"
                type="date"
                value={form.date ?? ''}
                onChange={e => setForm({ ...form, date: e.target.value })}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
                InputLabelProps={{ shrink: true }}
              />
              <FormControl sx={{ flex: 1, minWidth: 140 }} size="medium">
                <InputLabel sx={{ color: '#bbb', fontSize: '1rem' }}>결제방법</InputLabel>
                <Select
                  value={form.paymentType ?? ''}
                  label="결제방법"
                  onChange={e => setForm({ ...form, paymentType: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                    '& .MuiSelect-icon': { color: '#fff' },
                    '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#232b3b',
                        '& .MuiMenuItem-root': {
                          color: '#fff',
                          fontSize: '1rem',
                          py: 1.5,
                          '&:hover': { bgcolor: '#2c3446' },
                          '&.Mui-selected': { bgcolor: '#1976d2' }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="카드">카드</MenuItem>
                  <MenuItem value="세금계산서">세금계산서</MenuItem>
                  <MenuItem value="영수증">영수증</MenuItem>
                  <MenuItem value="노무자료">노무자료</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {/* 3줄: 금액 + 기타사항 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <TextField
                label="금액"
                type="number"
                value={form.totalValue ?? ''}
                onChange={e => setForm({ ...form, totalValue: e.target.value })}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
              />
              <TextField
                label="기타사항"
                value={form.etcNote ?? ''}
                onChange={e => setForm({ ...form, etcNote: e.target.value })}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
              />
            </Box>
            {/* 4줄: 비고 */}
            <Box display="flex" width="100%" justifyContent="center">
              <TextField
                label="비고"
                value={form.description ?? ''}
                onChange={e => setForm({ ...form, description: e.target.value })}
                fullWidth
                multiline
                rows={3}
                size="medium"
                sx={{
                  maxWidth: 400,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem' }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232b3b', p: 3, justifyContent: 'center' }}>
          <Button 
            onClick={closeDialog}
            sx={{ color: '#bbb', fontSize: '1rem', px: 3, py: 1 }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            sx={{ 
              bgcolor: '#2e7d32',
              fontSize: '1rem',
              px: 3,
              py: 1,
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Cost; 