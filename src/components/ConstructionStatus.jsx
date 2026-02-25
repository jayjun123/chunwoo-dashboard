import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  People as PeopleIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { generateDocumentExcel } from '../utils/materialUploadUtils.jsx';
import { templateUrls } from '../utils/templateUrls';

const ConstructionStatus = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [paymentStatusMap, setPaymentStatusMap] = useState({}); // 현장별 입금 상태
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startDate: '',
    endDate: '',
    status: 'pending',
    description: '',
    manager: '',
    budget: '',
  });

  useEffect(() => {
    loadSites();
  }, []);

  const loadSites = async () => {
    try {
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      const sitesData = sitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSites(sitesData);
      
      // 기성현황 데이터를 가져와서 입금 상태 확인
      await loadPaymentStatus(sitesData);
      
      setLoading(false);
    } catch (error) {
      console.error('현장 데이터 로드 실패:', error);
      setError('현장 데이터를 불러오는데 실패했습니다.');
      setLoading(false);
    }
  };

  // 기성현황 데이터를 가져와서 현장별 입금 상태 확인
  const loadPaymentStatus = async (sitesData) => {
    try {
      const gisungSnapshot = await getDocs(collection(db, 'gisung'));
      const gisungData = gisungSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 현장별 입금 상태 맵 생성
      const paymentMap = {};
      
      sitesData.forEach(site => {
        const siteGisungData = gisungData.filter(g => {
          if (!g.name || !site.name) return false;
          return g.name === site.name || g.name.includes(site.name) || site.name.includes(g.name);
        });
        
        console.log(`🔍 현장 "${site.name}" 기성 데이터 검색:`, {
          siteName: site.name,
          foundGisungCount: siteGisungData.length,
          gisungNames: gisungData.map(g => g.name).filter(name => name && name.includes(site.name))
        });
        
        if (siteGisungData.length === 0) {
          paymentMap[site.name] = { isFullyPaid: false, totalGisung: 0, paidGisung: 0, paymentRate: 0 };
          console.log(`⚠️ 현장 "${site.name}"에 대한 기성 데이터가 없습니다.`);
          return;
        }
        
        // 해당 현장의 모든 기성 데이터 확인 (청구완료된 것만)
        const totalGisung = siteGisungData
          .filter(g => g.claimStatus === '청구완료')
          .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
        const isAdvanceRow = (g) => g.note && String(g.note).trim().includes('선급금');
        const paidFromGisung = siteGisungData
          .filter(g => g.claimStatus === '청구완료' && g.paymentStatus === '입금완료' && !isAdvanceRow(g))
          .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
        const paidFromAdvanceRows = siteGisungData
          .filter(g => g.paymentStatus === '입금완료' && isAdvanceRow(g))
          .reduce((sum, g) => sum + (Number(g.advance) || Number(g.gisungAmount) || 0), 0);
        const paidGisung = paidFromGisung + paidFromAdvanceRows;
        
        const advanceAmount = Number(site.advance) || 0;
        const totalWithAdvance = totalGisung + advanceAmount;
        const contractAmount = Number(site.contractAmount) || 0;
        const balance = contractAmount - advanceAmount - paidFromGisung;
        
        const isFullyPaid = siteGisungData.length > 0 && (balance <= 0 || Math.abs(balance) < 1);
        
        // 입금률 계산 (참고용)
        const paymentRate = totalWithAdvance > 0 ? ((paidGisung + advanceAmount) / totalWithAdvance) * 100 : 0;
        
        paymentMap[site.name] = {
          isFullyPaid,
          totalGisung: totalWithAdvance,
          paidGisung: paidGisung + advanceAmount,
          paymentRate: Math.round(paymentRate),
          balance: balance,
          contractAmount: contractAmount
        };
        
        console.log(`💰 현장 "${site.name}" 입금 상태 상세:`, {
          siteName: site.name,
          contractAmount: contractAmount,
          advanceAmount: advanceAmount,
          totalGisung: totalGisung,
          paidGisung: paidGisung,
          balance: balance,
          isFullyPaid,
          paymentRate: paymentRate.toFixed(2) + '%',
          gisungData: siteGisungData.map(g => ({
            sequence: g.sequence,
            amount: g.gisungAmount,
            paymentStatus: g.paymentStatus
          }))
        });
      });
      
      setPaymentStatusMap(paymentMap);
    } catch (error) {
      console.error('입금 상태 확인 실패:', error);
    }
  };

  const handleOpenDialog = (site = null) => {
    if (site) {
      setSelectedSite(site);
      setFormData({
        name: site.name,
        location: site.location,
        startDate: site.startDate,
        endDate: site.endDate,
        status: site.status,
        description: site.description,
        manager: site.manager,
        budget: site.budget,
      });
    } else {
      setSelectedSite(null);
      setFormData({
        name: '',
        location: '',
        startDate: '',
        endDate: '',
        status: 'pending',
        description: '',
        manager: '',
        budget: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedSite(null);
    setFormData({
      name: '',
      location: '',
      startDate: '',
      endDate: '',
      status: 'pending',
      description: '',
      manager: '',
      budget: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const siteData = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      if (selectedSite) {
        await updateDoc(doc(db, 'sites', selectedSite.id), siteData);
      } else {
        siteData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'sites'), siteData);
      }

      handleCloseDialog();
      loadSites();
    } catch (error) {
      console.error('현장 저장 실패:', error);
      setError('현장 정보를 저장하는데 실패했습니다.');
    }
  };

  const handleDelete = async (siteId) => {
    if (window.confirm('정말로 이 현장을 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'sites', siteId));
        loadSites();
      } catch (error) {
        console.error('현장 삭제 실패:', error);
        setError('현장을 삭제하는데 실패했습니다.');
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'completed':
        return 'primary';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '진행중';
      case 'completed':
        return '완료';
      case 'pending':
        return '대기중';
      default:
        return status;
    }
  };

  // 견적서 다운로드 함수
  const handleDownloadEstimate = async (site) => {
    try {
      console.log('📋 견적서 다운로드 시작:', site.name);
      
      // 현장 데이터를 견적서 형식으로 변환
      const estimateData = {
        siteName: site.name || '현장명',
        company: site.company || '회사명',
        manager: site.manager || '현장소장',
        address: site.location || '주소',
        contractAmount: site.contractAmount || site.budget || 0,
        startDate: site.startDate || '',
        endDate: site.endDate || '',
        description: site.description || '현장 설명',
        status: site.status || 'pending'
      };

      // 견적서 템플릿 사용하여 엑셀 생성
      const fileName = `${site.name}_견적서.xlsx`;
      await generateDocumentExcel(estimateData, templateUrls.estimate, fileName);
      
      console.log('✅ 견적서 다운로드 완료:', fileName);
    } catch (error) {
      console.error('견적서 다운로드 오류:', error);
      setError('견적서 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          현장관리
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          현장 추가
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {sites.map((site) => (
          <Grid item xs={12} md={6} lg={4} key={site.id}>
            <Card sx={{ position: 'relative' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Typography variant="h6" component="div">
                    {site.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Chip
                      label={getStatusText(site.status)}
                      color={getStatusColor(site.status)}
                      size="small"
                    />
                    {/* 입금 100% 완료된 현장에 정산완료 표시 - 현장명 중앙에 겹치게 */}
                    {paymentStatusMap[site.name]?.isFullyPaid && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 10,
                          backgroundColor: 'transparent',
                          border: '3px solid #f44336',
                          borderRadius: '6px',
                          padding: '4px 12px',
                          fontSize: '0.9rem',
                          fontWeight: 'bold',
                          color: '#f44336',
                          pointerEvents: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        정산완료
                      </Box>
                    )}
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <LocationIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {site.location}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {(() => {
                      try {
                        // Firestore Timestamp 객체인 경우
                        const startDate = site.startDate && typeof site.startDate === 'object' && site.startDate.toDate 
                          ? site.startDate.toDate() 
                          : new Date(site.startDate);
                        
                        const endDate = site.endDate && typeof site.endDate === 'object' && site.endDate.toDate 
                          ? site.endDate.toDate() 
                          : new Date(site.endDate);
                        
                        // Invalid Date 체크
                        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                          console.warn('Invalid date in ConstructionStatus:', { startDate: site.startDate, endDate: site.endDate });
                          return '날짜 정보 없음';
                        }
                        
                        return `${startDate.toLocaleDateString('ko-KR')} ~ ${endDate.toLocaleDateString('ko-KR')}`;
                      } catch (error) {
                        console.error('날짜 포맷팅 오류:', error, '원본 데이터:', { startDate: site.startDate, endDate: site.endDate });
                        return '날짜 정보 없음';
                      }
                    })()}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PeopleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    현장관리자: {site.manager}
                  </Typography>
                </Box>

                {/* 입금 상태 정보 표시 */}
                {paymentStatusMap[site.name] && (
                  <Box sx={{ mt: 2, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      <strong>입금 현황:</strong> {paymentStatusMap[site.name].paymentRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      입금: {paymentStatusMap[site.name].paidGisung.toLocaleString()}원 / 전체: {paymentStatusMap[site.name].totalGisung.toLocaleString()}원
                    </Typography>
                    <Typography variant="caption" color={paymentStatusMap[site.name].balance <= 0 ? 'success.main' : 'error.main'}>
                      잔액: {paymentStatusMap[site.name].balance.toLocaleString()}원
                    </Typography>
                  </Box>
                )}

                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  {site.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => handleOpenDialog(site)}>
                  수정
                </Button>
                <Button size="small" color="error" onClick={() => handleDelete(site.id)}>
                  삭제
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedSite ? '현장 정보 수정' : '새 현장 추가'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장명"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="위치"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="시작일"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="종료일"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>상태</InputLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    label="상태"
                  >
                    <MenuItem value="pending">대기중</MenuItem>
                    <MenuItem value="active">진행중</MenuItem>
                    <MenuItem value="completed">완료</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="현장관리자"
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="예산"
                  name="budget"
                  type="number"
                  value={formData.budget}
                  onChange={handleInputChange}
                  required
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
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedSite ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConstructionStatus; 