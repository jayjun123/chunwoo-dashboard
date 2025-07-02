import React, { useState, useEffect, useMemo } from 'react';
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
  InputAdornment,
  Card,
  Chip,
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { addMonths, subMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';

const GisungStatusPage = ({ viewType: initialViewType, currentMonth: initialCurrentMonth, monthText: initialMonthText, selectedSites, filteredData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [gisungList, setGisungList] = useState([]);
  const [allGisungData, setAllGisungData] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('gisungMonth');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  
  // 네비게이션 상태
  const [viewType, setViewType] = useState(initialViewType || 'month');
  const [currentMonth, setCurrentMonth] = useState(initialCurrentMonth || new Date());
  
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    advance: '',
    prevGisung: '',
    gisungMonth: '',
    gisungAmount: '',
    currentGisung: '',
    note: '',
  });

  // monthText 계산 - currentMonth 변경 시 즉시 업데이트
  const monthText = useMemo(() => {
    if (!currentMonth || isNaN(currentMonth.getTime())) {
      return format(new Date(), 'yyyy년 MM월', { locale: ko });
    }
    return format(currentMonth, 'yyyy년 MM월', { locale: ko });
  }, [currentMonth]);

  // 네비게이션 핸들러 - 상태 변경 시 즉시 반영
  const handlePrevMonth = () => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    console.log('이전달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  };
  
  const handleNextMonth = () => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    console.log('다음달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  };
  
  const handleThisMonth = () => {
    const newMonth = new Date();
    setCurrentMonth(newMonth);
    console.log('이번달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  };
  
  const handleMonthClick = () => handleThisMonth();

  useEffect(() => {
    fetchAllGisung();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  useEffect(() => {
    fetchGisung();
    fetchSites();
  }, [viewType, currentMonth, selectedSites]);

  // props.currentMonth가 바뀔 때마다 내부 currentMonth 동기화
  useEffect(() => {
    if (initialCurrentMonth) {
      setCurrentMonth(initialCurrentMonth);
    }
  }, [initialCurrentMonth]);

  // sites가 로드되면 첫 번째 현장 id로 selectedSite 기본값 설정
  useEffect(() => {
    if (sites.length > 0 && !selectedSite) {
      setSelectedSite(sites[0].id);
    }
  }, [sites]);

  // 필터링된 데이터가 전달되면 사용 (하지만 내부 로직이 우선)
  useEffect(() => {
    // filteredData가 전달되어도 내부 fetchGisung 로직을 우선 사용
    // filteredData는 백업용으로만 사용
    if (filteredData && filteredData.length > 0 && gisungList.length === 0) {
      console.log('filteredData를 백업으로 사용:', filteredData);
      setGisungList(filteredData);
    }
  }, [filteredData, gisungList.length]);

  const fetchSites = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sites'));
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error('현장 데이터 로드 오류:', e);
      setSites([]); // 오류 발생 시 빈 배열로 설정
    }
  };

  const fetchAllGisung = async () => {
    try {
      console.log('=== 전체 기성 데이터 로드 시작 ===');
      const snapshot = await getDocs(collection(db, 'gisung'));
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('로드된 전체 기성 데이터:', allData);
      setAllGisungData(allData);
      console.log('=== 전체 기성 데이터 로드 완료 ===');
    } catch (e) {
      console.error('전체 기성 데이터 로드 오류:', e);
      setAllGisungData([]); // 오류 발생 시 빈 배열로 설정
    }
  };

  const fetchGisung = async () => {
    try {
      console.log('=== 기성 데이터 로드 시작 ===');
      console.log('viewType:', viewType);
      console.log('currentMonth:', currentMonth);
      console.log('selectedSites:', selectedSites);
      
      let q;
      const gisungCollection = collection(db, 'gisung');
      
      if (viewType === 'month') {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        console.log('월별 필터링 - monthStr:', monthStr);
        q = query(gisungCollection, where('gisungMonth', '==', monthStr));
      } else if (viewType === 'site' && selectedSites && selectedSites.length > 0) {
        console.log('현장별 필터링 - selectedSites:', selectedSites);
        q = query(gisungCollection, where('name', 'in', selectedSites));
      } else if (viewType === 'site' && (!selectedSites || selectedSites.length === 0)) {
        console.log('현장별 필터링 - 선택된 현장 없음');
        setGisungList([]);
        return;
      } else {
        console.log('필터링 조건 없음 - 전체 데이터 로드');
        q = query(gisungCollection);
      }
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('로드된 기성 데이터:', data);
      setGisungList(data);
      console.log('=== 기성 데이터 로드 완료 ===');
    } catch (e) {
      console.error('기성 데이터 로드 오류:', e);
      setGisungList([]);
    }
  };

  // 검색 및 정렬된 데이터
  const filteredAndSortedGisung = useMemo(() => {
    let filtered = gisungList.filter(gisung =>
      gisung.name?.toLowerCase().includes(search.toLowerCase()) ||
      gisung.gisungMonth?.toLowerCase().includes(search.toLowerCase()) ||
      gisung.note?.toLowerCase().includes(search.toLowerCase())
    );

    // 클라이언트 사이드 정렬
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'contractAmount' || sortField === 'advance' || sortField === 'prevGisung' || sortField === 'gisungAmount') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else if (sortField === 'gisungMonth') {
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
  }, [gisungList, search, sortField, sortDirection]);

  // 통계 데이터
  const stats = useMemo(() => {
    const totalContractAmount = filteredAndSortedGisung.reduce((sum, gisung) => sum + (Number(gisung.contractAmount) || 0), 0);
    const totalAdvance = filteredAndSortedGisung.reduce((sum, gisung) => sum + (Number(gisung.advance) || 0), 0);
    const totalPrevGisung = filteredAndSortedGisung.reduce((sum, gisung) => sum + (Number(gisung.prevGisung) || 0), 0);
    const totalGisungAmount = filteredAndSortedGisung.reduce((sum, gisung) => sum + (Number(gisung.gisungAmount) || 0), 0);
    
    return { totalContractAmount, totalAdvance, totalPrevGisung, totalGisungAmount };
  }, [filteredAndSortedGisung]);

  const handleExcelDownload = () => {
    const data = filteredAndSortedGisung.map(row => ({
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

  const updateSiteTotalProgress = async (siteName) => {
    if (!siteName) return;
    try {
      const site = sites.find(s => s.name === siteName);
      if (!site) {
        console.error("업데이트할 현장을 찾을 수 없습니다:", siteName);
        return;
      }

      const gisungQuery = query(collection(db, 'gisung'), where('name', '==', siteName));
      const gisungSnapshot = await getDocs(gisungQuery);
      const totalProgress = gisungSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().gisungAmount) || 0), 0);

      const siteRef = doc(db, 'sites', site.id);
      await updateDoc(siteRef, {
        totalProgress: totalProgress
      });
      console.log(`'${siteName}' 현장의 누계기성이 ${totalProgress}으로 업데이트되었습니다.`);
    } catch (e) {
      console.error("현장 누계기성 업데이트 실패:", e);
    }
  };

  const handleOpen = (item = null) => {
    fetchAllGisung(); // 팝업 열 때마다 최신 DB fetch
    if (item) {
      setSelected(item);
      setFormData({
        name: item.name || '',
        contractAmount: item.contractAmount || '',
        advance: item.advance || '',
        prevGisung: item.prevGisung || '',
        gisungMonth: item.gisungMonth || '',
        gisungAmount: item.gisungAmount || '',
        currentGisung: item.gisungAmount || '',
        note: item.note || '',
      });
    } else {
      setSelected(null);
      setFormData({
        name: '',
        contractAmount: '',
        advance: '',
        prevGisung: '',
        gisungMonth: viewType === 'month' ? `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}` : '',
        gisungAmount: '',
        currentGisung: '',
        note: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  const handleSubmit = async () => {
    try {
      // 현장 id 찾아서 formData에 추가
      const site = sites.find(s => s.name === formData.name);
      if (site) {
        formData.siteId = site.id;
      }
      
      // currentGisung을 gisungAmount로 매핑
      const dataToSave = {
        ...formData,
        gisungAmount: formData.currentGisung, // 금회기성을 기성금액으로 저장
      };
      
      if (selected) {
        await updateDoc(doc(db, 'gisung', selected.id), {
          ...dataToSave,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'gisung'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
      }
      await updateSiteTotalProgress(formData.name);
      handleClose();
      fetchGisung();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (itemToDelete) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'gisung', itemToDelete.id));
        await updateSiteTotalProgress(itemToDelete.name);
        fetchGisung();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 현장명 선택 시 해당 현장의 누계기성(전회기성) 자동 합산
  const handleSiteChange = (e) => {
    const siteName = e.target.value;
    const selectedSite = sites.find(s => s.name === siteName);
    // name 매칭을 trim, 대소문자 구분 없이 엄격하게
    const siteGisungData = allGisungData.filter(
      g => (g.name || '').trim().toLowerCase() === siteName.trim().toLowerCase()
    );
    const prevSum = siteGisungData.reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
    setFormData({
      ...formData,
      name: siteName,
      contractAmount: selectedSite?.contractAmount || '',
      advance: selectedSite?.advance || '',
      prevGisung: prevSum.toString(),
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 체크박스 관련 함수들
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedItems(filteredAndSortedGisung.map(item => item.id));
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
      return; // 이미 UI에서 버튼이 숨겨져 있지만 안전장치
    }

    if (window.confirm(`선택된 ${selectedItems.length}개 기성 항목을 삭제하시겠습니까?`)) {
      try {
        // 선택된 항목들의 현장명을 먼저 수집
        const itemsToDelete = filteredAndSortedGisung.filter(item => selectedItems.includes(item.id));
        const siteNames = [...new Set(itemsToDelete.map(item => item.name))];
        
        // 일괄 삭제 실행
        const deletePromises = selectedItems.map(id => deleteDoc(doc(db, 'gisung', id)));
        await Promise.all(deletePromises);
        
        // 삭제된 항목들의 현장별로 누계기성 업데이트
        for (const siteName of siteNames) {
          await updateSiteTotalProgress(siteName);
        }
        
        setSelectedItems([]);
        fetchGisung(); // 데이터 새로고침
      } catch (e) {
        console.error('일괄 삭제 실패:', e);
      }
    }
  };

  const StatCard = ({ title, value, color }) => (
    <Grid item xs={3} sm={6} md={3}>
      <Card sx={{ 
        p: isMobile ? 2 : 2, 
        height: '100%', 
        bgcolor: '#181f2e', 
        color: '#fff',
        border: '1px solid #232b3b',
        minHeight: isMobile ? '70px' : 'auto'
      }}>
        <Typography 
          variant={isMobile ? "caption" : "subtitle2"} 
          sx={{ 
            color: '#bbb', 
            mb: isMobile ? 0.3 : 1,
            fontSize: isMobile ? '0.75rem' : 'inherit',
            lineHeight: isMobile ? 1.1 : 'inherit'
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant={isMobile ? "body2" : "h6"} 
          color={color || '#43e97b'} 
          sx={{ 
            fontWeight: 'bold',
            fontSize: isMobile ? '0.9rem' : 'inherit',
            lineHeight: isMobile ? 1.1 : 'inherit'
          }}
        >
          {Number(value || 0).toLocaleString()}원
        </Typography>
      </Card>
    </Grid>
  );

  // 차트 데이터 계산 (계약금, 노무, 경비, 기타 순서)
  const contractAmount = sites.find(site => site.id === selectedSite)?.contractAmount || 0;
  const totalLabor = gisungList.filter(item => item.category === '노무비').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalExpense = gisungList.filter(item => item.category === '경비').reduce((sum, item) => sum + Number(item.amount), 0);
  const totalEtc = gisungList.filter(item => item.category === '기타' || item.category === 'RnD').reduce((sum, item) => sum + Number(item.amount), 0);

  const chartData = [
    { name: '계약금', value: contractAmount },
    { name: '노무', value: totalLabor },
    { name: '경비', value: totalExpense },
    { name: '기타', value: totalEtc },
  ];

  return (
    <Box sx={{ 
      width: '100%', 
      p: isMobile ? 0 : 2,
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '-26px' : 'auto',
      width: isMobile ? '100vw' : '100%'
    }}>
      {/* 상단 제목 및 통계 */}
      <Typography variant="h4" sx={{ 
        mb: 3, 
        fontWeight: 800, 
        color: '#90caf9',
        textAlign: 'center'
      }}>
        {viewType === 'month' ? `${monthText || '기성현황'}` : '현장별 기성현황'}
      </Typography>

      {/* 통계 카드 */}
      <Grid container spacing={isMobile ? 0.7 : 2} sx={{ mb: 3 }}>
        <StatCard title="총 계약금액" value={stats.totalContractAmount} color="#43e97b" />
        <StatCard title="총 선급금" value={stats.totalAdvance} color="#ffd600" />
        <StatCard title="총 전회기성" value={stats.totalPrevGisung} color="#a084e8" />
        <StatCard title="총 기성금액" value={stats.totalGisungAmount} color="#ef5350" />
      </Grid>

      {/* 버튼들 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        alignItems: 'center',
        justifyContent: 'flex-end'
      }}>
        {selectedItems.length > 0 && (
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleBulkDelete}
            sx={{ 
              bgcolor: '#d32f2f',
              '&:hover': { bgcolor: '#c62828' }
            }}
          >
            선택 삭제 ({selectedItems.length})
          </Button>
        )}
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<CloudDownloadIcon />}
          onClick={handleExcelDownload}
          sx={{ 
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' },
            display: isMobile ? 'none' : 'flex'
          }}
        >
          엑셀 다운로드
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{ 
            bgcolor: '#2e7d32',
            '&:hover': { bgcolor: '#1b5e20' }
          }}
        >
          새 기성
        </Button>
      </Box>

      {/* 테이블 */}
      <Paper sx={{ 
        borderRadius: 4, 
        boxShadow: 6, 
        bgcolor: '#181f2e', 
        color: '#fff',
        overflow: 'hidden'
      }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#232b3b' }}>
                <TableCell padding="checkbox" sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                  <Checkbox
                    indeterminate={selectedItems.length > 0 && selectedItems.length < filteredAndSortedGisung.length}
                    checked={filteredAndSortedGisung.length > 0 && selectedItems.length === filteredAndSortedGisung.length}
                    onChange={handleSelectAll}
                    sx={{ color: '#fff' }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>기성월</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>현장명</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>계약금액</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>선급금</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>전회기성</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>기성금액</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>비고</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedGisung.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 10} sx={{ textAlign: 'center', color: '#bbb', py: 4 }}>
                    {search ? '검색 결과가 없습니다.' : '기성 데이터가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedGisung.map(row => (
                  <TableRow 
                    key={row.id}
                    sx={{ 
                      '&:hover': { bgcolor: '#232b3b' },
                      borderBottom: '1px solid #333'
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <Checkbox
                        checked={selectedItems.includes(row.id)}
                        onChange={() => handleSelectItem(row.id)}
                        sx={{ color: '#90caf9' }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={row.gisungMonth || '-'} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#1976d2',
                          color: '#fff',
                          fontWeight: 700
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>{row.name}</TableCell>
                    <TableCell sx={{ color: '#43e97b', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>
                      {Number(row.contractAmount || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ color: '#ffd600', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>
                      {Number(row.advance || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ color: '#a084e8', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>
                      {Number(row.prevGisung || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ color: '#ef5350', fontWeight: 700 }}>
                      {Number(row.gisungAmount || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ color: '#bbb', display: isMobile ? 'none' : 'table-cell' }}>{row.note || '-'}</TableCell>
                    <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpen(row)}
                        sx={{ color: '#90caf9' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(row)}
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

      {/* 등록/수정 다이얼로그 */}
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#181f2e',
            color: '#fff',
            borderRadius: 4,
            minHeight: '480px',
            width: '100%'
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
          기성 등록(vat포함)
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 2, mt: 6 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* 1줄: 현장명(검색,드롭다운) + 기성월 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <FormControl sx={{ minWidth: 220 }} size="medium">
                <InputLabel sx={{ color: '#bbb', fontSize: '1rem' }}>현장명</InputLabel>
                <Select
                  value={formData.name}
                  label="현장명"
                  onChange={handleSiteChange}
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
                  showSearch
                  displayEmpty
                >
                  {sites.map(site => (
                    <MenuItem key={site.id} value={site.name}>{site.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="기성월"
                value={formData.gisungMonth}
                onChange={e => setFormData({ ...formData, gisungMonth: e.target.value })}
                size="medium"
                sx={{
                  minWidth: 120,
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
            {/* 2줄: 계약금액 + 선급금 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <TextField
                label="계약금액"
                value={Number(formData.contractAmount || 0).toLocaleString()}
                size="medium"
                sx={{
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="선급금"
                value={Number(formData.advance || 0).toLocaleString()}
                size="medium"
                sx={{
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
                InputProps={{ readOnly: true }}
              />
            </Box>
            {/* 3줄: 전회기성 + 금회기성 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <TextField
                label="전회기성"
                value={Number(formData.prevGisung || 0).toLocaleString()}
                size="medium"
                sx={{
                  minWidth: 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="금회기성"
                value={formData.currentGisung}
                onChange={e => setFormData({ ...formData, currentGisung: e.target.value })}
                size="medium"
                sx={{
                  minWidth: 180,
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
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: e.target.value })}
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
            onClick={handleClose}
            sx={{ color: '#bbb', fontSize: '1rem', px: 3, py: 1 }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
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
    </Box>
  );
};

export default GisungStatusPage; 