import React, { useEffect, useState } from 'react';
import {
  Paper, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Checkbox
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudDownload, CloudUpload } from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const GisungStatusTable = () => {
  const [gisungList, setGisungList] = useState([]);

  useEffect(() => {
    fetchGisung();
  }, []);

  const fetchGisung = async () => {
    const snapshot = await getDocs(collection(db, 'gisung'));
    setGisungList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  return (
    <Paper sx={{ 
      width: '100%', 
      overflow: 'hidden', 
      mt: 3, 
      p: 2,
      maxWidth: '100vw',
      boxSizing: 'border-box'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>기성현황</Typography>
        <Button variant="contained" color="primary" startIcon={<CloudDownload />} sx={{ ml: 1 }}>엑셀 다운로드</Button>
        <Button variant="contained" color="primary" startIcon={<CloudUpload />} sx={{ ml: 1 }}>엑셀 업로드</Button>
        <Button variant="contained" color="success" startIcon={<AddIcon />} sx={{ ml: 1 }}>+ 새 기성</Button>
      </Box>
      <TableContainer sx={{ 
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto'
      }}>
        <Table sx={{ 
          width: '100%',
          minWidth: '100%',
          tableLayout: 'auto'
        }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox"><Checkbox /></TableCell>
              <TableCell>현장명</TableCell>
              <TableCell>계약금액</TableCell>
              <TableCell>선급금</TableCell>
              <TableCell>전회기성</TableCell>
              <TableCell>기성월</TableCell>
              <TableCell>기성금액</TableCell>
              <TableCell>결제방법</TableCell>
              <TableCell>비고</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gisungList.map((row) => (
              <TableRow key={row.id}>
                <TableCell padding="checkbox"><Checkbox /></TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{Number(row.contractAmount || 0).toLocaleString()}원</TableCell>
                <TableCell>{Number(row.advance || 0).toLocaleString()}원</TableCell>
                <TableCell>{Number(row.prevGisung || 0).toLocaleString()}원</TableCell>
                <TableCell>{row.gisungMonth || '-'}</TableCell>
                <TableCell>{Number(row.gisungAmount || 0).toLocaleString()}원</TableCell>
                <TableCell>{row.paymentMethod || '-'}</TableCell>
                <TableCell>{row.note || '-'}</TableCell>
                <TableCell>
                  <Button size="small" variant="contained" color="primary" sx={{ mr: 1 }}>수정</Button>
                  <Button size="small" variant="contained" color="error">삭제</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default GisungStatusTable; 