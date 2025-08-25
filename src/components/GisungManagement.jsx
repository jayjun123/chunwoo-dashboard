import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  Snackbar,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { parseGisungExcel } from '../utils/excelUtils';
import { downloadTemplateBasedGisungExcel } from '../utils/gisungTemplateUtils';
import { moveCurrentToPrevious, createNextGisungWithPrevious } from '../utils/gisungTemplateUtils';
import { formatNumber } from '../utils/formatUtils';

const GisungManagement = ({ siteId, siteData: initialSiteData }) => {
  const [gisungData, setGisungData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [siteData, setSiteData] = useState(initialSiteData);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingGisung, setEditingGisung] = useState(null);
  const [formData, setFormData] = useState({
    gisungNumber: 1,
    gisungAmount: 0,
    gisungDate: '',
    remark: '',
    items: []
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (siteId) {
      loadGisungData();
    }
  }, [siteId]);

  // 현장 데이터 로드
  useEffect(() => {
    const loadSiteData = async () => {
      if (siteId && !siteData) {
        try {
          const siteDoc = doc(db, 'sites', siteId);
          const siteSnapshot = await getDoc(siteDoc);
          if (siteSnapshot.exists()) {
            setSiteData({ id: siteSnapshot.id, ...siteSnapshot.data() });
          }
        } catch (error) {
          console.error('현장 데이터 로드 오류:', error);
        }
      }
    };
    loadSiteData();
  }, [siteId, siteData]);

  const loadGisungData = async () => {
    setLoading(true);
    try {
      const gisungQuery = query(collection(db, 'gisung'), where('siteId', '==', siteId));
      const snapshot = await getDocs(gisungQuery);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.gisungNumber - b.gisungNumber);
      setGisungData(data);
    } catch (error) {
      console.error('기성 데이터 로드 오류:', error);
      setSnackbar({ open: true, message: '데이터 로드 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.gisungDate) {
      setSnackbar({ open: true, message: '기성일자를 입력해주세요.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const gisungData = {
        ...formData,
        siteId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (editingGisung) {
        await updateDoc(doc(db, 'gisung', editingGisung.id), gisungData);
        setSnackbar({ open: true, message: '기성금이 수정되었습니다.', severity: 'success' });
      } else {
        await addDoc(collection(db, 'gisung'), gisungData);
        setSnackbar({ open: true, message: '기성금이 추가되었습니다.', severity: 'success' });
      }

      setOpenDialog(false);
      setEditingGisung(null);
      setFormData({
        gisungNumber: 1,
        gisungAmount: 0,
        gisungDate: '',
        remark: '',
        items: []
      });
      loadGisungData();
    } catch (error) {
      console.error('기성 데이터 저장 오류:', error);
      setSnackbar({ open: true, message: '저장 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (gisung) => {
    setEditingGisung(gisung);
    setFormData({
      gisungNumber: gisung.gisungNumber,
      gisungAmount: gisung.gisungAmount,
      gisungDate: gisung.gisungDate,
      remark: gisung.remark,
      items: gisung.items || []
    });
    setOpenDialog(true);
  };

  const handleDelete = async (gisungId) => {
    // 삭제할 기성 데이터 찾기
    const gisungToDelete = gisungData.find(g => g.id === gisungId);
    const sequence = gisungToDelete?.sequence || 'N';
    const siteName = gisungToDelete?.name || gisungToDelete?.siteName || '알 수 없음';
    
    if (window.confirm(`"${siteName}" ${sequence} 기성 데이터를 정말 삭제하시겠습니까?`)) {
      setLoading(true);
      try {
        await deleteDoc(doc(db, 'gisung', gisungId));
        setSnackbar({ open: true, message: '기성금이 삭제되었습니다.', severity: 'success' });
        loadGisungData();
      } catch (error) {
        console.error('기성 데이터 삭제 오류:', error);
        setSnackbar({ open: true, message: '삭제 중 오류가 발생했습니다.', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDownloadExcel = async () => {
    try {
      // 데이터 확인 및 기본값 설정
      const validSiteData = {
        name: siteData?.name || '현장명',
        siteName: siteData?.name || '현장명',
        contractor: siteData?.contractor || '',
        subContractor: siteData?.subContractor || '',
        contractDate: siteData?.contractDate || siteData?.startDate || '',
        completionDate: siteData?.completionDate || siteData?.endDate || '',
        contractAmount: siteData?.contractAmount || 0,
        ...siteData
      };

      // 기성 데이터가 없어도 기본 템플릿 생성
      const validGisungData = gisungData.length > 0 ? gisungData : [{
        gisungNumber: 1,
        gisungAmount: 0,
        gisungDate: new Date().toISOString().split('T')[0],
        remark: '기성금 내역 없음',
        items: []
      }];

      const filename = `${validSiteData.name}_기성금청구서.xlsx`;
      await downloadTemplateBasedGisungExcel(validSiteData, validGisungData, [], filename);
      setSnackbar({ open: true, message: '엑셀 파일이 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드 중 오류가 발생했습니다: ' + error.message, severity: 'error' });
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setSelectedFile(file);
    } else {
      setSnackbar({ open: true, message: '올바른 엑셀 파일을 선택해주세요.', severity: 'error' });
    }
  };

  const handleUploadExcel = async () => {
    if (!selectedFile) {
      setSnackbar({ open: true, message: '파일을 선택해주세요.', severity: 'error' });
      return;
    }

    setLoading(true);
    try {
      const parsedData = await parseGisungExcel(selectedFile);
      
      // 파싱된 데이터를 새로운 기성금 항목으로 추가
      const newGisungNumber = gisungData.length + 1;
      const newGisungData = {
        gisungNumber: newGisungNumber,
        gisungAmount: parsedData.summary.totalCurrentAmount,
        gisungDate: new Date().toISOString().split('T')[0],
        remark: '엑셀에서 업로드된 데이터',
        items: parsedData.items,
        siteId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, 'gisung'), newGisungData);
      
      setSnackbar({ open: true, message: '엑셀 데이터가 성공적으로 업로드되었습니다.', severity: 'success' });
      setUploadDialog(false);
      setSelectedFile(null);
      loadGisungData();
    } catch (error) {
      console.error('엑셀 업로드 오류:', error);
      setSnackbar({ open: true, message: '엑셀 업로드 중 오류가 발생했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 청구완료 처리 함수
  const handleCompleteGisung = async (gisungId) => {
    if (!window.confirm('청구를 완료하시겠습니까? 완료 후에는 수정할 수 없습니다.')) {
      return;
    }

    setLoading(true);
    try {
      // 청구완료 처리 (금회기성 → 전회기성 이동)
      const result = await moveCurrentToPrevious(siteId, gisungId);
      
      if (result.success) {
        setSnackbar({ 
          open: true, 
          message: '청구가 완료되었습니다. 다음 기성금에서 전회기성으로 반영됩니다.', 
          severity: 'success' 
        });
        loadGisungData(); // 데이터 새로고침
      } else {
        throw new Error(result.message || '청구완료 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('청구완료 처리 오류:', error);
      setSnackbar({ 
        open: true, 
        message: '청구완료 처리 중 오류가 발생했습니다: ' + error.message, 
        severity: 'error' 
      });
    } finally {
      setLoading(false);
    }
  };

  const totalGisungAmount = gisungData.reduce((sum, item) => sum + parseFloat(item.gisungAmount || 0), 0);
  const contractAmount = parseFloat(siteData?.contractAmount) || 0;
  const advanceAmount = parseFloat(siteData?.advance || 0); // 선급금
  const totalProgressAmount = totalGisungAmount + advanceAmount;
  const remainingAmount = contractAmount - totalProgressAmount;
  const gisungRate = contractAmount > 0 ? Math.round((totalProgressAmount / contractAmount) * 100) : 0;

  if (!siteData) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2, color: '#fff' }}>현장 데이터를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f59e42' }}>
          기성금 관리 - {siteData.name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleDownloadExcel}
            sx={{ color: '#f59e42', borderColor: '#f59e42' }}
          >
            엑셀 다운로드
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialog(true)}
            sx={{ color: '#f59e42', borderColor: '#f59e42' }}
          >
            엑셀 업로드
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            sx={{ bgcolor: '#f59e42', '&:hover': { bgcolor: '#d97706' } }}
          >
            기성금 추가
          </Button>
        </Box>
      </Box>

      {/* 요약 정보 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f59e42', mb: 1 }}>
                계약금액
              </Typography>
              <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                {formatNumber(contractAmount, true)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f59e42', mb: 1 }}>
                총 기성금액
              </Typography>
              <Typography variant="h4" sx={{ color: '#3b82f6', fontWeight: 'bold', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                {formatNumber(totalGisungAmount, true)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f59e42', mb: 1 }}>
                기성률
              </Typography>
              <Typography variant="h4" sx={{ color: '#8b5cf6', fontWeight: 'bold', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                {gisungRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
            <CardContent>
              <Typography variant="h6" sx={{ color: '#f59e42', mb: 1 }}>
                잔여금액
              </Typography>
              <Typography variant="h4" sx={{ color: '#ef4444', fontWeight: 'bold', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                {formatNumber(remainingAmount, true)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 기성금 목록 */}
      <TableContainer component={Paper} sx={{ bgcolor: '#232b3b', border: '1px solid #333' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: '#f59e42', fontWeight: 'bold' }}>차수</TableCell>
              <TableCell sx={{ color: '#f59e42', fontWeight: 'bold' }}>기성금액</TableCell>
              <TableCell sx={{ color: '#f59e42', fontWeight: 'bold' }}>기성일자</TableCell>
              <TableCell sx={{ color: '#f59e42', fontWeight: 'bold' }}>비고</TableCell>
              <TableCell sx={{ color: '#f59e42', fontWeight: 'bold' }}>상태</TableCell>
              <TableCell sx={{ color: '#f59e42', fontWeight: 'bold' }}>작업</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gisungData.map((gisung) => (
              <TableRow key={gisung.id}>
                <TableCell sx={{ color: '#fff' }}>
                  <Chip label={`${gisung.gisungNumber}차`} color="primary" onClick={() => {}} />
                </TableCell>
                <TableCell sx={{ color: '#10b981', fontWeight: 'bold' }}>
                  {formatNumber(gisung.gisungAmount, true)}
                </TableCell>
                <TableCell sx={{ color: '#fff' }}>
                  {(() => {
                    try {
                      // Firestore Timestamp 객체인 경우
                      if (gisung.gisungDate && typeof gisung.gisungDate === 'object' && gisung.gisungDate.toDate) {
                        return gisung.gisungDate.toDate().toLocaleDateString('ko-KR');
                      }
                      
                      // 일반적인 날짜 변환
                      const date = new Date(gisung.gisungDate);
                      if (isNaN(date.getTime())) {
                        console.warn('Invalid date in GisungManagement:', gisung.gisungDate);
                        return '';
                      }
                      return date.toLocaleDateString('ko-KR');
                    } catch (error) {
                      console.error('날짜 포맷팅 오류:', error, '원본 데이터:', gisung.gisungDate);
                      return '';
                    }
                  })()}
                </TableCell>
                <TableCell sx={{ color: '#fff' }}>
                  {gisung.remark || '-'}
                </TableCell>
                <TableCell sx={{ color: '#fff' }}>
                  {gisung.status === '청구완료' ? (
                    <Chip 
                      label="완료" 
                      color="success" 
                      size="small"
                      icon={<CheckCircleIcon />}
                    />
                  ) : (
                    <Chip 
                      label="작성중" 
                      color="warning" 
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell>
                  {gisung.status !== '청구완료' && (
                    <>
                      <IconButton
                        onClick={() => handleEdit(gisung)}
                        sx={{ color: '#3b82f6' }}
                        title="수정"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleCompleteGisung(gisung.id)}
                        sx={{ color: '#10b981' }}
                        title="청구완료"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(gisung.id)}
                        sx={{ color: '#ef4444' }}
                        title="삭제"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </>
                  )}
                  {gisung.status === '청구완료' && (
                    <Typography variant="body2" sx={{ color: '#10b981', fontStyle: 'italic' }}>
                      청구완료됨
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 기성금 추가/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ color: '#f59e42', fontWeight: 'bold' }}>
          {editingGisung ? '기성금 수정' : '기성금 추가'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="차수"
                type="number"
                value={formData.gisungNumber}
                onChange={(e) => setFormData({ ...formData, gisungNumber: parseInt(e.target.value) || 0 })}
                sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="기성금액"
                type="number"
                value={formData.gisungAmount}
                onChange={(e) => setFormData({ ...formData, gisungAmount: parseFloat(e.target.value) || 0 })}
                sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="기성일자"
                type="date"
                value={formData.gisungDate}
                onChange={(e) => setFormData({ ...formData, gisungDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="비고"
                multiline
                rows={3}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                sx={{ '& .MuiOutlinedInput-root': { color: '#fff' } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: '#6b7280' }}>
            취소
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            sx={{ bgcolor: '#f59e42', color: '#fff', '&:hover': { bgcolor: '#d97706' } }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 엑셀 업로드 다이얼로그 */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#f59e42', fontWeight: 'bold' }}>
          엑셀 파일 업로드
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="excel-file-input"
              type="file"
              onChange={handleFileSelect}
            />
            <label htmlFor="excel-file-input">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ color: '#f59e42', borderColor: '#f59e42' }}
              >
                엑셀 파일 선택
              </Button>
            </label>
            {selectedFile && (
              <Typography sx={{ mt: 2, color: '#fff' }}>
                선택된 파일: {selectedFile.name}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialog(false)} sx={{ color: '#6b7280' }}>
            취소
          </Button>
          <Button
            onClick={handleUploadExcel}
            disabled={!selectedFile || loading}
            sx={{ bgcolor: '#f59e42', color: '#fff', '&:hover': { bgcolor: '#d97706' } }}
          >
            업로드
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
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GisungManagement; 