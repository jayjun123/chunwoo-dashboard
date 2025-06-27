import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const GisungStatusPage = ({ viewType, currentMonth, monthText, selectedSites }) => {
  const [gisungList, setGisungList] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    advance: '',
    prevGisung: '',
    gisungMonth: '',
    gisungAmount: '',
    note: '',
  });

  useEffect(() => {
    fetchGisung();
  }, [viewType, currentMonth, selectedSites]);

  const fetchGisung = async () => {
    try {
      let q = collection(db, 'gisung');
      
      // 월별/현장별 필터링
      if (viewType === 'month' && currentMonth) {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        q = query(q, where('gisungMonth', '==', monthStr));
      } else if (viewType === 'site' && selectedSites?.length > 0) {
        q = query(q, where('name', 'in', selectedSites));
      }
      
      const snapshot = await getDocs(q);
      setGisungList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleExcelDownload = () => {
    const data = gisungList.map(row => ({
      '현장명': row.name,
      '계약금액': Number(row.contractAmount || 0).toLocaleString(),
      '선급금': Number(row.advance || 0).toLocaleString(),
      '전회기성': Number(row.prevGisung || 0).toLocaleString(),
      '기성월': row.gisungMonth || '-',
      '기성금액': Number(row.gisungAmount || 0).toLocaleString(),
      '비고': row.note || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, '기성현황');
    XLSX.writeFile(wb, `기성현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ... 나머지 핸들러 함수들 (handleOpen, handleClose, handleSubmit, handleDelete 등) ...

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 700 }}>
        {viewType === 'month' ? `${monthText} 기성현황` : '현장별 기성현황'}
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
          onClick={() => handleOpen()}
        >
          + 새 기성
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ background: 'transparent' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox /></TableCell>
              <TableCell>현장명</TableCell>
              <TableCell>계약금액</TableCell>
              <TableCell>선급금</TableCell>
              <TableCell>전회기성</TableCell>
              <TableCell>기성월</TableCell>
              <TableCell>기성금액</TableCell>
              <TableCell>비고</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gisungList.map(row => (
              <TableRow key={row.id}>
                <TableCell padding="checkbox"><Checkbox /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{Number(row.contractAmount || 0).toLocaleString()}원</TableCell>
                <TableCell>{Number(row.advance || 0).toLocaleString()}원</TableCell>
                <TableCell>{Number(row.prevGisung || 0).toLocaleString()}원</TableCell>
                <TableCell>{row.gisungMonth || '-'}</TableCell>
                <TableCell>{Number(row.gisungAmount || 0).toLocaleString()}원</TableCell>
                <TableCell>{row.note || '-'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleOpen(row)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(row.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{selected ? '기성 수정' : '기성 등록'}</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="현장명"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          >
            {sites.map(site => (
              <MenuItem key={site.id} value={site.name}>{site.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="계약금액"
            value={formData.contractAmount}
            onChange={e => setFormData({ ...formData, contractAmount: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="선급금"
            value={formData.advance}
            onChange={e => setFormData({ ...formData, advance: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="전회기성"
            value={formData.prevGisung}
            onChange={e => setFormData({ ...formData, prevGisung: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="기성월"
            type="month"
            value={formData.gisungMonth}
            onChange={e => setFormData({ ...formData, gisungMonth: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="기성금액"
            value={formData.gisungAmount}
            onChange={e => setFormData({ ...formData, gisungAmount: e.target.value.replace(/[^0-9]/g, '') })}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="비고"
            value={formData.note}
            onChange={e => setFormData({ ...formData, note: e.target.value })}
            fullWidth
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">저장</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GisungStatusPage; 