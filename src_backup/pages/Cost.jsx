import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Snackbar, Alert, useMediaQuery
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudDownload as CloudDownloadIcon } from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, orderBy } from 'firebase/firestore';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(ArcElement, ChartTooltip, Legend);

const CostPage = ({ viewType, currentMonth, monthText, selectedSites }) => {
  const { currentUser } = useAuth();
  const [costs, setCosts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    budget: '',
    actual: '',
    description: '',
    site: '',
    month: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isMobile = useMediaQuery('(max-width:900px)');

  useEffect(() => {
    if (!currentUser) return;

    let q = collection(db, 'costs');
    
    // 월별/현장별 필터링
    if (viewType === 'month' && currentMonth) {
      const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      q = query(q, where('month', '==', monthStr), orderBy('createdAt', 'desc'));
    } else if (viewType === 'site' && selectedSites?.length > 0) {
      q = query(q, where('site', 'in', selectedSites), orderBy('createdAt', 'desc'));
    } else {
      q = query(q, orderBy('createdAt', 'desc'));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const costsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCosts(costsData);
    }, (error) => {
      console.error('지출 데이터 조회 실패:', error);
      setSnackbar({ open: true, message: '데이터를 불러오는데 실패했습니다.', severity: 'error' });
    });

    return () => unsub();
  }, [viewType, currentMonth, selectedSites, currentUser]);

  const handleExcelDownload = () => {
    try {
      const data = costs.map(cost => ({
        '항목명': cost.name,
        '예산': Number(cost.budget || 0).toLocaleString(),
        '실적': Number(cost.actual || 0).toLocaleString(),
        '현장': cost.site || '-',
        '월': cost.month || '-',
        '비고': cost.description || '-',
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '지출현황');
      XLSX.writeFile(wb, `지출현황_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  const openDialog = (cost = null) => {
    if (cost) {
      setEditId(cost.id);
      setForm({
        name: cost.name || '',
        budget: cost.budget || '',
        actual: cost.actual || '',
        description: cost.description || '',
        site: cost.site || '',
        month: cost.month || '',
      });
    } else {
      setEditId(null);
      setForm({
        name: '',
        budget: '',
        actual: '',
        description: '',
        site: '',
        month: viewType === 'month' ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}` : '',
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({
      name: '',
      budget: '',
      actual: '',
      description: '',
      site: '',
      month: '',
    });
  };

  const handleSave = async () => {
    if (!form.name || !form.budget) {
      setSnackbar({ open: true, message: '필수 항목을 입력해주세요.', severity: 'error' });
      return;
    }

    try {
      const costData = {
        ...form,
        budget: Number(form.budget),
        actual: Number(form.actual || 0),
        updatedAt: new Date(),
        updatedBy: currentUser.uid
      };

      if (editId) {
        await updateDoc(doc(db, 'costs', editId), costData);
        setSnackbar({ open: true, message: '원가 항목이 수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'costs'), {
          ...costData,
          createdAt: new Date(),
          createdBy: currentUser.uid
        });
        setSnackbar({ open: true, message: '원가 항목이 추가되었습니다.', severity: 'success' });
      }
      closeDialog();
    } catch (error) {
      console.error('원가 항목 저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'costs', id));
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('원가 항목 삭제 실패:', error);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 차트 데이터
  const chartData = {
    labels: costs.map(c => c.name),
    datasets: [
      {
        label: '예산',
        data: costs.map(c => Number(c.budget)),
        backgroundColor: 'rgba(54, 162, 235, 0.5)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
      {
        label: '실적',
        data: costs.map(c => Number(c.actual)),
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
      }
    ]
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        {viewType === 'month' ? `${monthText} 지출현황` : '현장별 지출현황'}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<CloudDownloadIcon />}
          onClick={handleExcelDownload}
        >
          엑셀 다운로드
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          startIcon={<AddIcon />}
          onClick={() => openDialog()}
        >
          항목 추가
        </Button>
      </Box>

      <Grid container spacing={2}>
        {/* 원가 항목 리스트 */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <TableContainer>
              <Table size={isMobile ? 'small' : 'medium'}>
                <TableHead>
                  <TableRow>
                    <TableCell>항목명</TableCell>
                    <TableCell>예산(₩)</TableCell>
                    <TableCell>실적(₩)</TableCell>
                    <TableCell>현장</TableCell>
                    <TableCell>월</TableCell>
                    <TableCell>비고</TableCell>
                    <TableCell>관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costs.map(cost => (
                    <TableRow key={cost.id}>
                      <TableCell>{cost.name}</TableCell>
                      <TableCell>{Number(cost.budget).toLocaleString()}</TableCell>
                      <TableCell>{Number(cost.actual).toLocaleString()}</TableCell>
                      <TableCell>{cost.site || '-'}</TableCell>
                      <TableCell>{cost.month || '-'}</TableCell>
                      <TableCell>{cost.description}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => openDialog(cost)}><EditIcon /></IconButton>
                        <IconButton size="small" onClick={() => handleDelete(cost.id)}><DeleteIcon /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        {/* 차트 및 통계 */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>예산 대비 실적 차트</Typography>
            <Doughnut
              data={chartData}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'bottom' },
                  tooltip: { enabled: true }
                }
              }}
            />
          </Paper>
        </Grid>
      </Grid>

      {/* 항목 추가/수정 다이얼로그 */}
      <Dialog open={dialogOpen} onClose={closeDialog}>
        <DialogTitle>{editId ? '항목 수정' : '항목 추가'}</DialogTitle>
        <DialogContent>
          <TextField
            label="항목명"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="예산(₩)"
            type="number"
            value={form.budget}
            onChange={e => setForm({ ...form, budget: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="실적(₩)"
            type="number"
            value={form.actual}
            onChange={e => setForm({ ...form, actual: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="현장"
            value={form.site}
            onChange={e => setForm({ ...form, site: e.target.value })}
            fullWidth sx={{ mb: 2 }}
          />
          <TextField
            label="월"
            type="month"
            value={form.month}
            onChange={e => setForm({ ...form, month: e.target.value })}
            fullWidth sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="비고"
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>취소</Button>
          <Button onClick={handleSave} variant="contained">저장</Button>
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

export default CostPage; 