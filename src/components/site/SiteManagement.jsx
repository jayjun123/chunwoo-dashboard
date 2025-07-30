import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { collection, query, orderBy, getDocs, addDoc, updateDoc, deleteDoc, doc, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as XLSX from 'xlsx';

const SiteManagement = () => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sites, setSites] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    manager: '',
    company: '', // 회사명 필드 추가
    phone: '',
    email: '',
    status: 'active',
    startDate: '',
    endDate: '',
    description: '',
  });

  // 물량내역 관련 상태
  const [items, setItems] = useState([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedItems, setUploadedItems] = useState([]);
  const [selectedSiteForUpload, setSelectedSiteForUpload] = useState('');

  const statusOptions = [
    { value: 'active', label: '진행중', color: 'success' },
    { value: 'pending', label: '대기중', color: 'warning' },
    { value: 'completed', label: '완료', color: 'info' },
    { value: 'suspended', label: '중단', color: 'error' },
  ];

  const getEstimateStatusColor = (status) => {
    if (!status) return '#757575';
    
    switch (status) {
      case '제출':
        return '#43a047';
      case '미제출':
        return '#f44336';
      case '예정':
        return '#2e7d32';
      case '미정':
        return '#d32f2f';
      case '입찰':
        return '#ff9800';
      case '현설':
        return '#2196f3';
      case '기타':
        return '#9c27b0';
      default:
        return '#757575';
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const sitesQuery = query(
        collection(db, 'sites'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(sitesQuery);
      const sitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSites(sitesData);
    } catch (error) {
      console.error('현장 목록 조회 실패:', error);
      setError('현장 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (site = null) => {
    if (site) {
      setSelectedSite(site);
      setFormData({
        name: site.name,
        address: site.address,
        manager: site.manager,
        phone: site.phone,
        email: site.email,
        status: site.status,
        startDate: site.startDate,
        endDate: site.endDate,
        description: site.description,
      });
    } else {
      setSelectedSite(null);
      setFormData({
        name: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
        status: 'active',
        startDate: '',
        endDate: '',
        description: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSite(null);
    setFormData({
      name: '',
      address: '',
      manager: '',
      phone: '',
      email: '',
      status: 'active',
      startDate: '',
      endDate: '',
      description: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 확인 다이얼로그
    const action = selectedSite ? '수정' : '등록';
    const confirmMessage = selectedSite 
      ? `현장을 수정하시겠습니까?` 
      : `현장을 등록하시겠습니까?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const siteData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      // 거래처 연동: 현장 관리자와 회사명을 vendors 컬렉션에 자동 추가
      await syncVendorData(formData.manager, formData.name);

      if (selectedSite) {
        // 현장 정보 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), siteData);
      } else {
        // 새 현장 추가
        siteData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sites'), siteData);
      }

      handleCloseDialog();
      fetchSites();
      
      // 성공 메시지 - 현장명과 계획 포함
      const statusLabel = statusOptions.find(option => option.value === formData.status)?.label || '진행중';
      const successMessage = selectedSite 
        ? `${formData.name} [${statusLabel}] 현장수정 완료했습니다.`
        : `${formData.name} [${statusLabel}] 현장등록 완료했습니다.`;
      
      alert(successMessage);
      
      // 입력칸 초기화
      setFormData({
        name: '',
        address: '',
        manager: '',
        phone: '',
        email: '',
        status: 'active',
        startDate: '',
        endDate: '',
        description: '',
      });
    } catch (error) {
      console.error('현장 저장 실패:', error);
      const failMessage = selectedSite 
        ? '현장 수정에 실패했습니다.'
        : '현장 등록에 실패했습니다.';
      alert(failMessage);
      setError(failMessage);
    } finally {
      setLoading(false);
    }
  };

  // 현장관리에서 소장과 회사명을 견적페이지와 연동
  const syncVendorData = async (manager, company) => {
    console.log('=== 현장관리 데이터 저장 ===');
    console.log('소장:', manager);
    console.log('회사명:', company);
    
    // 견적페이지에서 사용할 수 있도록 데이터 저장
    if (manager && manager.trim()) {
      try {
        // 견적페이지에서 사용할 의뢰자 데이터 생성
        const requesterData = {
          name: manager.trim(),
          company: company && company.trim() ? company.trim() : '',
          source: 'site_management',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 의뢰자가 있는지 확인
        const existingQuery = query(
          collection(db, 'requesters'),
          where('name', '==', manager.trim())
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (existingSnapshot.empty) {
          console.log('새로운 의뢰자 추가:', requesterData);
          await addDoc(collection(db, 'requesters'), requesterData);
        } else {
          console.log('기존 의뢰자 업데이트:', requesterData);
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(doc(db, 'requesters', existingDoc.id), {
            company: requesterData.company,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('의뢰자 데이터 저장 오류:', error);
      }
    }
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await deleteDoc(doc(db, 'sites', siteId));
      fetchSites();
    } catch (error) {
      console.error('현장 삭제 실패:', error);
      setError('현장 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 물량내역 업로드 관련 함수들
  const handleOpenUploadDialog = (site) => {
    setSelectedSiteForUpload(site);
    setUploadedItems([]);
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setSelectedSiteForUpload('');
    setUploadedItems([]);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // "내역서" 시트 찾기
        const sheetName = workbook.SheetNames.find(name => name.includes('내역서'));
        if (!sheetName) {
          alert('엑셀 파일에서 "내역서" 시트를 찾을 수 없습니다.');
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // 5번째 줄부터 데이터 추출 (B, D, K, L 열)
        const extractedItems = [];
        for (let i = 4; i < jsonData.length; i++) { // 5번째 줄부터 (인덱스 4)
          const row = jsonData[i];
          if (row && row.length > 11) { // L열까지 있으려면 최소 12개 열 필요
            const itemName = row[1]; // B열 (인덱스 1)
            const quantity = row[3]; // D열 (인덱스 3)
            const unitPrice = row[10]; // K열 (인덱스 10)
            const totalPrice = row[11]; // L열 (인덱스 11)

            // 빈 행이 아닌 경우만 추가
            if (itemName && (quantity || unitPrice || totalPrice)) {
              extractedItems.push({
                id: Date.now() + i,
                name: itemName || '',
                quantity: quantity || 0,
                unitPrice: unitPrice || 0,
                totalPrice: totalPrice || 0
              });
            }
          }
        }

        setUploadedItems(extractedItems);
        console.log('추출된 물량내역:', extractedItems);
      } catch (error) {
        console.error('엑셀 파일 처리 오류:', error);
        alert('엑셀 파일 처리 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSaveItems = async () => {
    if (!selectedSiteForUpload || uploadedItems.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    setLoading(true);
    try {
      // 선택된 현장에 물량내역 저장
      const siteRef = doc(db, 'sites', selectedSiteForUpload.id);
      await updateDoc(siteRef, {
        items: uploadedItems,
        updatedAt: new Date()
      });

      alert('물량내역이 성공적으로 저장되었습니다.');
      handleCloseUploadDialog();
      fetchSites(); // 현장 목록 새로고침
    } catch (error) {
      console.error('물량내역 저장 오류:', error);
      alert('물량내역 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = (index, field, value) => {
    const updatedItems = [...uploadedItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setUploadedItems(updatedItems);
  };

  const handleDeleteItem = (index) => {
    const updatedItems = uploadedItems.filter((_, i) => i !== index);
    setUploadedItems(updatedItems);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      maxWidth: '100%',
      minWidth: 0,
      p: isMobile ? 0 : 3,
      m: 0,
      ml: isMobile ? '30px' : 0,
      boxSizing: 'border-box',
      mt: isMobile ? 0 : '130px'
    }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          현장 관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          새 현장 등록
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid #e0e0e0' } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>현장명</TableCell>
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>주소</TableCell>}
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>담당자</TableCell>
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>연락처</TableCell>}
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>상태</TableCell>
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>견적</TableCell>
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>시작일</TableCell>}
              {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>종료일</TableCell>}
              <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.name}</TableCell>
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.address}</TableCell>}
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.manager}</TableCell>
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.phone}</TableCell>}
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>
                  <Chip
                    label={statusOptions.find(option => option.value === site.status)?.label}
                    color={statusOptions.find(option => option.value === site.status)?.color}
                    size="small"
                  />
                </TableCell>
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>
                  {site.estimateStatus && (
                    <Chip
                      label={site.estimateStatus}
                      size="small"
                      sx={{
                        backgroundColor: getEstimateStatusColor(site.estimateStatus),
                        color: 'white',
                        fontSize: '0.75rem'
                      }}
                      title={`견적 상태: ${site.estimateStatus}`}
                    />
                  )}
                </TableCell>
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.startDate}</TableCell>}
                {!isMobile && <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>{site.endDate}</TableCell>}
                <TableCell sx={{ height: '60px', verticalAlign: 'middle' }}>
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/sites/${site.id}`)}
                  >
                    <LocationIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(site)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenUploadDialog(site)}
                    title="물량내역 업로드"
                  >
                    <UploadIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(site.id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sites.length === 0 && (
              <TableRow>
                <TableCell colSpan={isMobile ? 5 : 9} align="center" sx={{ height: '60px', verticalAlign: 'middle' }}>
                  등록된 현장이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedSite ? '현장 정보 수정' : '새 현장 등록'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장명"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="주소"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="담당자"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  required
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="연락처"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="이메일"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  select
                  label="상태"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  required
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="시작일"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="종료일"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="설명"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  rows={4}
                  inputProps={{
                    style: { 
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      fontSize: '16px',
                      transform: 'translateZ(0)',
                      backfaceVisibility: 'hidden'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : '저장'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* 물량내역 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          물량내역 업로드 - {selectedSiteForUpload?.name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              엑셀 파일의 "내역서" 시트에서 B, D, K, L열의 데이터를 추출합니다. (5번째 줄부터)
            </Typography>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <label htmlFor="excel-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
              >
                엑셀 파일 선택
              </Button>
            </label>
          </Box>

          {uploadedItems.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                추출된 물량내역 ({uploadedItems.length}개)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400, overflow: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목명</TableCell>
                      <TableCell>물량</TableCell>
                      <TableCell>단가</TableCell>
                      <TableCell>금액</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadedItems.map((item, index) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={item.name}
                            onChange={(e) => handleEditItem(index, 'name', e.target.value)}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleEditItem(index, 'quantity', Number(e.target.value))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleEditItem(index, 'unitPrice', Number(e.target.value))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={item.totalPrice}
                            onChange={(e) => handleEditItem(index, 'totalPrice', Number(e.target.value))}
                            fullWidth
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteItem(index)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>
            취소
          </Button>
          <Button
            onClick={handleSaveItems}
            variant="contained"
            disabled={uploadedItems.length === 0 || loading}
          >
            {loading ? <CircularProgress size={24} /> : '저장'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SiteManagement; 