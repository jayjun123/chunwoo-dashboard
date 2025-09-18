import React, { useEffect, useState } from 'react';
import {
  Paper, Box, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Checkbox
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, CloudDownload, CloudUpload } from '@mui/icons-material';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const GisungStatusTable = ({ onNewGisung }) => {
  const [gisungList, setGisungList] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchGisung();
  }, []);

  const fetchGisung = async () => {
    const snapshot = await getDocs(collection(db, 'gisung'));
    setGisungList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  // 청구완료 상태 토글
  const toggleClaimStatus = async (gisungId, currentStatus) => {
    try {
      const newStatus = currentStatus === '청구완료' ? '미청구' : '청구완료';
      await updateDoc(doc(db, 'gisung', gisungId), {
        claimStatus: newStatus
      });
      fetchGisung(); // 데이터 새로고침
    } catch (error) {
      console.error('청구상태 업데이트 실패:', error);
    }
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
        <Button 
          variant="contained" 
          color="success" 
          startIcon={<AddIcon />} 
          onClick={onNewGisung}
          sx={{ ml: 1 }}
        >
          기성등록
        </Button>
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
              <TableCell>청구완료</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gisungList.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage).map((row) => (
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
                  <Chip
                    label={row.claimStatus || '미청구'}
                    color={row.claimStatus === '청구완료' ? 'success' : 'default'}
                    onClick={() => toggleClaimStatus(row.id, row.claimStatus)}
                    sx={{ cursor: 'pointer' }}
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="contained" color="primary" sx={{ mr: 1 }}>수정</Button>
                  <Button size="small" variant="contained" color="error">삭제</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 페이지네이션 */}
      {gisungList.length > itemsPerPage && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 2 }}>
          <Button
            variant="outlined"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage(currentPage - 1)}
            sx={{ minWidth: '80px' }}
          >
            이전
          </Button>
          
          <Typography sx={{ mx: 2, fontWeight: 'bold' }}>
            {currentPage + 1} / {Math.ceil(gisungList.length / itemsPerPage)} 페이지
          </Typography>
          
          <Button
            variant="outlined"
            disabled={currentPage >= Math.ceil(gisungList.length / itemsPerPage) - 1}
            onClick={() => setCurrentPage(currentPage + 1)}
            sx={{ minWidth: '80px' }}
          >
            다음
          </Button>
        </Box>
      )}
    </Paper>
  );
};

export default GisungStatusTable; 