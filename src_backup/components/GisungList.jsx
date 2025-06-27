import React, { useEffect, useState } from 'react';
import {
  Paper, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const GisungList = () => {
  const [gisungList, setGisungList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    payments: [{ label: '1차 기성', amount: '' }],
  });

  useEffect(() => {
    fetchGisung();
  }, []);

  const fetchGisung = async () => {
    const snapshot = await getDocs(collection(db, 'gisung'));
    setGisungList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleOpen = (item = null) => {
    if (item) {
      setSelected(item);
      setFormData({
        name: item.name,
        contractAmount: item.contractAmount,
        payments: item.payments || [{ label: '1차 기성', amount: '' }],
      });
    } else {
      setSelected(null);
      setFormData({ name: '', contractAmount: '', payments: [{ label: '1차 기성', amount: '' }] });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  const handleChangePayment = (idx, key, value) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.map((p, i) => i === idx ? { ...p, [key]: value } : p)
    }));
  };

  const handleAddPayment = () => {
    setFormData(prev => ({
      ...prev,
      payments: [...prev.payments, { label: `${prev.payments.length + 1}차 기성`, amount: '' }]
    }));
  };

  const handleRemovePayment = (idx) => {
    setFormData(prev => ({
      ...prev,
      payments: prev.payments.filter((_, i) => i !== idx)
    }));
  };

  const handleSubmit = async () => {
    if (selected) {
      await updateDoc(doc(db, 'gisung', selected.id), formData);
    } else {
      await addDoc(collection(db, 'gisung'), formData);
    }
    handleClose();
    fetchGisung();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, 'gisung', id));
    fetchGisung();
  };

  const getTotalPayment = (payments) => payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', mt: 3 }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">작업 목록</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
          기성 등록
        </Button>
      </Box>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>공사명</TableCell>
              <TableCell>계약금액</TableCell>
              <TableCell>기성합계</TableCell>
              <TableCell>잔액</TableCell>
              <TableCell>진행률</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gisungList.map((row) => {
              const total = getTotalPayment(row.payments || []);
              const contract = parseFloat(row.contractAmount) || 0;
              const percent = contract ? Math.round((total / contract) * 100) : 0;
              return (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{Number(row.contractAmount || 0).toLocaleString()}원</TableCell>
                  <TableCell>{Number(total || 0).toLocaleString()}원</TableCell>
                  <TableCell>{Number((contract - total) || 0).toLocaleString()}원</TableCell>
                  <TableCell>
                    <Chip
                      label={percent + '%'}
                      color={percent >= 100 ? 'success' : 'primary'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => handleOpen(row)}><EditIcon /></IconButton>
                    <IconButton size="small" onClick={() => handleDelete(row.id)}><DeleteIcon /></IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {/* 등록/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? '기성 수정' : '기성 등록'}</DialogTitle>
        <DialogContent>
          <TextField
            label="공사명"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="계약금액"
            value={formData.contractAmount}
            onChange={e => setFormData({ ...formData, contractAmount: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          {formData.payments.map((p, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 1 }}>
              <TextField
                label={p.label}
                value={p.amount}
                onChange={e => handleChangePayment(idx, 'amount', e.target.value.replace(/[^0-9]/g, ''))}
                fullWidth
              />
              <IconButton onClick={() => handleRemovePayment(idx)} disabled={formData.payments.length === 1}>
                <DeleteIcon />
              </IconButton>
            </Box>
          ))}
          <Button onClick={handleAddPayment} startIcon={<AddIcon />} sx={{ mt: 1 }}>
            차수 추가
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default GisungList; 