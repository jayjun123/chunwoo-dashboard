import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Autocomplete,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../firebase';

const GisungManagement = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [sites, setSites] = useState([]);
  const [selectedSiteData, setSelectedSiteData] = useState(null);
  const [gisungData, setGisungData] = useState([]);
  const [filteredGisungData, setFilteredGisungData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [currentGisung, setCurrentGisung] = useState({});
  const [selectedSiteFilter, setSelectedSiteFilter] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [siteGisungTotals, setSiteGisungTotals] = useState({}); // 현장별 누계기성
  const [siteExpenseTotals, setSiteExpenseTotals] = useState({}); // 현장별 지출합계
  const [siteLaborTotals, setSiteLaborTotals] = useState({}); // 현장별 노무합계
  const [siteEtcTotals, setSiteEtcTotals] = useState({}); // 현장별 기타합계

  const inputRef1 = useRef();
  const inputRef2 = useRef();

  useEffect(() => {
    const sitesQuery = query(collection(db, 'sites'));
    const sitesUnsub = onSnapshot(sitesQuery, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const gisungQuery = query(collection(db, 'gisung'));
    const gisungUnsub = onSnapshot(gisungQuery, (snapshot) => {
      const gisungItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGisungData(gisungItems);
      
      // 현장별 누계기성 계산 (siteId, siteName, name 중 하나라도 일치)
      const totals = {};
      const expenseTotals = {};
      const laborTotals = {};
      const etcTotals = {};
      const parseAmount = v => Number(String(v || 0).replace(/,/g, ''));
      sites.forEach(site => {
        const siteGisungData = gisungItems.filter(item =>
          item.siteId === site.id ||
          item.siteName === site.name ||
          item.name === site.name
        );
        totals[site.id] = siteGisungData.reduce((sum, item) => sum + parseAmount(item.gisungAmount), 0);
        expenseTotals[site.id] = siteGisungData.reduce((sum, item) => sum + parseAmount(item.expense), 0);
        laborTotals[site.id] = siteGisungData.reduce((sum, item) => sum + parseAmount(item.labor), 0);
        etcTotals[site.id] = siteGisungData.reduce((sum, item) => sum + parseAmount(item.etc), 0);
      });
      setSiteGisungTotals(totals);
      setSiteExpenseTotals(expenseTotals);
      setSiteLaborTotals(laborTotals);
      setSiteEtcTotals(etcTotals);
      // 현장별 데이터를 sites 컬렉션에 업데이트
      Object.keys(totals).forEach(siteId => {
        updateDoc(doc(db, 'sites', siteId), {
          totalGisung: totals[siteId],
          expense: expenseTotals[siteId] || 0,
          labor: laborTotals[siteId] || 0,
          etc: etcTotals[siteId] || 0
        }).catch(error => {
          console.error('Error updating site totals:', error);
        });
      });
    });

    return () => {
      sitesUnsub();
      gisungUnsub();
    };
  }, []);

  // 필터링된 기성 데이터 업데이트
  useEffect(() => {
    if (selectedSiteFilter) {
      setFilteredGisungData(gisungData.filter(item => item.siteId === selectedSiteFilter));
    } else {
      setFilteredGisungData(gisungData);
    }
  }, [gisungData, selectedSiteFilter]);

  useEffect(() => {
    if (currentGisung.siteId) {
      const site = sites.find(s => s.id === currentGisung.siteId);
      setSelectedSiteData(site);
    } else {
      setSelectedSiteData(null);
    }
  }, [currentGisung.siteId, sites]);

  const handleAddGisung = () => {
    setDialogMode('add');
    setCurrentGisung({ 
      gisungDate: new Date().toISOString().split('T')[0],
      status: '승인대기'
    });
    setOpenDialog(true);
  };

  const handleEditGisung = (gisung) => {
    setDialogMode('edit');
    setCurrentGisung(gisung);
    setOpenDialog(true);
  };

  const handleDeleteGisung = async (id) => {
    if (window.confirm('기성 데이터를 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'gisung', id));
    }
  };

  const handleSaveGisung = async () => {
    const site = sites.find(s => s.id === currentGisung.siteId);
    const dataToSave = { ...currentGisung };
    if (site) {
      dataToSave.siteId = site.id; // Firestore의 id로 강제 저장
      dataToSave.siteName = site.name;
    }

    try {
      if (dialogMode === 'add') {
        await addDoc(collection(db, 'gisung'), dataToSave);
      } else {
        await updateDoc(doc(db, 'gisung', currentGisung.id), dataToSave);
      }
      setOpenDialog(false);
    } catch (error) {
      console.error("Failed to save gisung data:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '승인완료': return 'success';
      case '승인대기': return 'warning';
      case '반려': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
  };

  const getCurrentSiteTotalGisung = () => {
    if (!currentGisung.siteId) return 0;
    return siteGisungTotals[currentGisung.siteId] || 0;
  };

  const scrollFocus = (ref) => () => {
    setTimeout(() => {
      ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };

  return (
    <Box sx={{ p: 3, bgcolor: '#1a1d21', minHeight: '100vh', mt: isMobile ? '26px' : '50px' }}>
      <Grid container spacing={3}>
        {/* 헤더 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff' }}>
              기성관리
            </Typography>
            <Button
              variant="contained"
              onClick={handleAddGisung}
              sx={{ bgcolor: '#1976d2' }}
            >
              새기성
            </Button>
          </Box>
        </Grid>

        {/* 탭 */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ bgcolor: '#232734' }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{ 
                '& .MuiTab-root': { color: '#fff' },
                '& .Mui-selected': { color: '#1976d2' }
              }}
            >
              <Tab label="전체 기성" />
              <Tab label="현장별 기성" />
            </Tabs>
          </Paper>
        </Grid>

        {/* 통계 카드 */}
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232734', color: '#fff' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                총 기성 건수
              </Typography>
              <Typography variant="h4">
                {filteredGisungData.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232734', color: '#fff' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                총 기성 금액
              </Typography>
              <Typography variant="h4">
                {formatCurrency(filteredGisungData.reduce((sum, item) => sum + (item.gisungAmount || 0), 0))}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232734', color: '#fff' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                승인 대기
              </Typography>
              <Typography variant="h4">
                {filteredGisungData.filter(item => item.status === '승인대기').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ bgcolor: '#232734', color: '#fff' }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                승인 완료
              </Typography>
              <Typography variant="h4">
                {filteredGisungData.filter(item => item.status === '승인완료').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 현장별 필터 (현장별 탭에서만 표시) */}
        {activeTab === 1 && (
          <Grid item xs={12}>
            <Paper elevation={3} sx={{ bgcolor: '#232734', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: isMobile ? 'flex-start' : 'flex-start' }}>
                <FilterIcon sx={{ color: '#fff' }} />
                <Typography sx={{ color: '#fff', minWidth: '80px' }}>현장 필터:</Typography>
                <FormControl sx={{ minWidth: 300, textAlign: isMobile ? 'left' : 'left' }}>
                  <InputLabel sx={{ color: '#fff' }}>현장 선택</InputLabel>
                  <Select
                    value={selectedSiteFilter}
                    onChange={(e) => setSelectedSiteFilter(e.target.value)}
                    sx={{ color: '#fff', textAlign: 'left' }}
                  >
                    <MenuItem value="">전체 현장</MenuItem>
                    {sites.map((site) => (
                      <MenuItem key={site.id} value={site.id}>
                        {site.name} (기성: {formatCurrency(siteGisungTotals[site.id] || 0)}원, 지출: {formatCurrency(siteExpenseTotals[site.id] || 0)}원, 노무: {formatCurrency(siteLaborTotals[site.id] || 0)}원, 기타: {formatCurrency(siteEtcTotals[site.id] || 0)}원)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          </Grid>
        )}

        {/* 기성 목록 테이블 */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ bgcolor: '#232734', color: '#fff' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>현장명</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>항목</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>사용날짜</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>비고</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>기타</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>관리</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredGisungData.map((gisung) => (
                    <TableRow key={gisung.id} hover>
                      <TableCell sx={{ color: '#fff' }}>{gisung.siteName}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{gisung.itemType || '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{gisung.gisungDate || '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{gisung.description || '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{gisung.etcNote || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton size="small" onClick={() => handleEditGisung(gisung)} sx={{ color: '#1976d2' }}><EditIcon /></IconButton>
                          <IconButton size="small" onClick={() => handleDeleteGisung(gisung.id)} sx={{ color: '#f44336' }}><DeleteIcon /></IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* 기성 등록/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#232734', color: '#fff' }}>
          {dialogMode === 'add' ? '기성 등록' : '기성 수정'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#232734', color: '#fff' }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={sites}
                getOptionLabel={(option) => option.name || ''}
                value={sites.find(s => s.id === currentGisung.siteId) || null}
                onChange={(e, newValue) => {
                  if (newValue) {
                    setCurrentGisung(prev => ({ ...prev, siteId: newValue.id }));
                  } else {
                    setCurrentGisung(prev => ({ ...prev, siteId: '' }));
                  }
                }}
                renderInput={(params) => <TextField {...params} label="현장명" fullWidth margin="normal" inputRef={inputRef1} onFocus={scrollFocus(inputRef1)} />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#fff' }}>항목</InputLabel>
                <Select
                  value={currentGisung.itemType || ''}
                  onChange={e => setCurrentGisung(prev => ({ ...prev, itemType: e.target.value }))}
                  sx={{ color: '#fff' }}
                >
                  <MenuItem value="노무비">노무비</MenuItem>
                  <MenuItem value="경비">경비</MenuItem>
                  <MenuItem value="RnD">RnD</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="사용날짜"
                type="date"
                value={currentGisung.gisungDate || ''}
                onChange={e => setCurrentGisung(prev => ({ ...prev, gisungDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                sx={{ input: { color: '#fff' }, label: { color: '#fff' } }}
                inputRef={inputRef2}
                onFocus={scrollFocus(inputRef2)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="비고"
                value={currentGisung.description || ''}
                onChange={e => setCurrentGisung(prev => ({ ...prev, description: e.target.value }))}
                sx={{ input: { color: '#fff' }, label: { color: '#fff' } }}
                inputRef={inputRef3}
                onFocus={scrollFocus(inputRef3)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="기타"
                value={currentGisung.etcNote || ''}
                onChange={e => setCurrentGisung(prev => ({ ...prev, etcNote: e.target.value }))}
                sx={{ input: { color: '#fff' }, label: { color: '#fff' } }}
                inputRef={inputRef4}
                onFocus={scrollFocus(inputRef4)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232734' }}>
          <Button onClick={() => setOpenDialog(false)} sx={{ color: '#fff' }}>
            취소
          </Button>
          <Button onClick={handleSaveGisung} variant="contained">
            저장
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GisungManagement; 