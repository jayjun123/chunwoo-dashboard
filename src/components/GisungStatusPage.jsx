import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { devLog, devError, useCleanup } from '../utils/performanceUtils';
import * as XLSX from 'xlsx';
import { addMonths, subMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatContractAmount, formatGisungAmount, formatAdvanceAmount } from '../utils/formatUtils';

const GisungStatusPage = ({ viewType: initialViewType, currentMonth: initialCurrentMonth, monthText: initialMonthText, selectedSites, filteredData }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { addCleanup } = useCleanup();
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
  const handlePrevMonth = useCallback(() => {
    const newMonth = subMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    devLog('이전달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  }, [currentMonth]);
  
  const handleNextMonth = useCallback(() => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    devLog('다음달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  }, [currentMonth]);
  
  const handleThisMonth = useCallback(() => {
    const newMonth = new Date();
    setCurrentMonth(newMonth);
    devLog('이번달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  }, []);
  
  const handleMonthClick = () => handleThisMonth();

  useEffect(() => {
    fetchAllGisung();
  }, []); // 컴포넌트 마운트 시 한 번만 실행

  useEffect(() => {
    fetchGisung();
    fetchSites();
  }, [viewType, currentMonth, selectedSites]); // 의존성 배열 수정

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
      devLog('filteredData를 백업으로 사용:', filteredData);
      setGisungList(filteredData);
    }
  }, [filteredData, gisungList.length]);

  const fetchSites = useCallback(async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sites'));
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      devError('현장 데이터 로드 오류:', e);
      setSites([]); // 오류 발생 시 빈 배열로 설정
    }
  }, []);

  const fetchAllGisung = useCallback(async () => {
    try {
      devLog('=== 전체 기성 데이터 로드 시작 ===');
      const snapshot = await getDocs(collection(db, 'gisung'));
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      devLog('로드된 전체 기성 데이터:', allData);
      setAllGisungData(allData);
      devLog('=== 전체 기성 데이터 로드 완료 ===');
    } catch (e) {
      devError('전체 기성 데이터 로드 오류:', e);
      setAllGisungData([]); // 오류 발생 시 빈 배열로 설정
    }
  }, []);

  const fetchGisung = useCallback(async () => {
    try {
      devLog('=== 기성 데이터 로드 시작 ===');
      devLog('viewType:', viewType);
      devLog('currentMonth:', currentMonth);
      devLog('selectedSites:', selectedSites);
      
      let q;
      const gisungCollection = collection(db, 'gisung');
      
      if (viewType === 'month') {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        devLog('월별 필터링 - monthStr:', monthStr);
        q = query(gisungCollection, where('gisungMonth', '==', monthStr));
      } else if (viewType === 'site' && selectedSites && selectedSites.length > 0) {
        devLog('현장별 필터링 - selectedSites:', selectedSites);
        q = query(gisungCollection, where('name', 'in', selectedSites));
      } else if (viewType === 'site' && (!selectedSites || selectedSites.length === 0)) {
        devLog('현장별 필터링 - 선택된 현장 없음');
        setGisungList([]);
        return;
      } else {
        devLog('필터링 조건 없음 - 전체 데이터 로드');
        q = query(gisungCollection);
      }
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      devLog('로드된 기성 데이터:', data);
      setGisungList(data);
      devLog('=== 기성 데이터 로드 완료 ===');
    } catch (e) {
      devError('기성 데이터 로드 오류:', e);
      setGisungList([]);
    }
  }, [viewType, currentMonth, selectedSites]);



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
    // 현재 월 문자열 (예: "2024-07")
    const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    let totalContractAmount = 0;
    let totalAdvance = 0;
    
    if (viewType === 'month') {
      // 월별: 해당 월에 공사가 시작된 현장들의 계약금액만 합산
      totalContractAmount = sites.reduce((sum, site) => {
        if (!site.startDate) return sum;
        
        try {
          // startDate가 문자열인 경우 Date 객체로 변환
          const startDate = typeof site.startDate === 'string' 
            ? new Date(site.startDate) 
            : site.startDate.toDate ? site.startDate.toDate() : site.startDate;
          
          // 시작 월 문자열 (예: "2024-07")
          const startMonthStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
          
          // 현재 월과 시작 월이 같으면 계약금액 포함
          if (startMonthStr === currentMonthStr) {
            return sum + (Number(site.contractAmount) || 0);
          }
        } catch (e) {
          devError('날짜 파싱 오류:', e, site);
        }
        
        return sum;
      }, 0);
      
      totalAdvance = sites.reduce((sum, site) => sum + (Number(site.advance) || 0), 0);
    } else if (viewType === 'site') {
      // 현장별: 선택된 현장들의 계약금액만 합산
      if (selectedSites && selectedSites.length > 0) {
        totalContractAmount = sites
          .filter(site => selectedSites.includes(site.name))
          .reduce((sum, site) => sum + (Number(site.contractAmount) || 0), 0);
        
        totalAdvance = sites
          .filter(site => selectedSites.includes(site.name))
          .reduce((sum, site) => sum + (Number(site.advance) || 0), 0);
      } else {
        // 선택된 현장이 없으면 0
        totalContractAmount = 0;
        totalAdvance = 0;
      }
    }
    
    const totalPrevGisung = gisungList.reduce((sum, gisung) => sum + (Number(gisung.prevGisung) || 0), 0);
    const totalGisungAmount = gisungList.reduce((sum, gisung) => sum + (Number(gisung.gisungAmount) || 0), 0);
    
    return { totalContractAmount, totalAdvance, totalPrevGisung, totalGisungAmount };
  }, [sites, gisungList, currentMonth, viewType, selectedSites]);

  const handleExcelDownload = () => {
    const data = filteredAndSortedGisung.map(row => ({
      '현장명': row.name,
      '계약금액': formatContractAmount(row.contractAmount),
      '선급금': formatAdvanceAmount(row.advance),
      '전회기성': formatGisungAmount(row.prevGisung),
      '기성월': row.gisungMonth || '-',
      '기성금액': formatGisungAmount(row.gisungAmount),
      '비고': row.note || '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, '기성현황');
    XLSX.writeFile(wb, `기성현황_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const updateSiteTotalProgress = useCallback(async (siteName) => {
    if (!siteName) return;
    try {
      const site = sites.find(s => s.name === siteName);
      if (!site) {
        devError("업데이트할 현장을 찾을 수 없습니다:", siteName);
        return;
      }

      const gisungQuery = query(collection(db, 'gisung'), where('name', '==', siteName));
      const gisungSnapshot = await getDocs(gisungQuery);
      const totalProgress = gisungSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().gisungAmount) || 0), 0);

      const siteRef = doc(db, 'sites', site.id);
      await updateDoc(siteRef, {
        totalProgress: totalProgress
      });
      devLog(`'${siteName}' 현장의 누계기성이 ${totalProgress}으로 업데이트되었습니다.`);
    } catch (e) {
      devError("현장 누계기성 업데이트 실패:", e);
    }
  }, [sites]);

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
        paymentMethod: item.paymentMethod || '',
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
        paymentMethod: '',
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

  const handlePaymentStatusChange = async (gisungId, newStatus) => {
    try {
      const gisungRef = doc(db, 'gisung', gisungId);
      await updateDoc(gisungRef, {
        paymentStatus: newStatus,
        updatedAt: serverTimestamp()
      });
      
      // 로컬 상태 업데이트
      setGisungList(prev => prev.map(item => 
        item.id === gisungId 
          ? { ...item, paymentStatus: newStatus }
          : item
      ));
      
      console.log(`기성 ID ${gisungId}의 입금상태가 ${newStatus}로 변경되었습니다.`);
    } catch (error) {
      console.error('입금상태 변경 실패:', error);
      alert('입금상태 변경에 실패했습니다.');
    }
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

  // 계약금액 상세 모달 상태
  const [contractDetailModal, setContractDetailModal] = useState(false);
  const [contractDetailData, setContractDetailData] = useState([]);

  // 계약금액 상세 데이터 계산
  const getContractDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    return sites.filter(site => {
      if (!site.startDate) return false;
      
      try {
        const startDate = typeof site.startDate === 'string' 
          ? new Date(site.startDate) 
          : site.startDate.toDate ? site.startDate.toDate() : site.startDate;
        
        const startMonthStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
        
        return startMonthStr === currentMonthStr;
      } catch (e) {
        return false;
      }
    }).map(site => ({
      name: site.name,
      contractAmount: Number(site.contractAmount || 0),
      startDate: site.startDate,
      endDate: site.endDate,
      status: site.status || '진행중'
    }));
  }, [sites, currentMonth, viewType]);

  // 계약금액 카드 클릭 핸들러
  const handleContractCardClick = () => {
    if (viewType === 'month') {
      const detailData = getContractDetailData();
      setContractDetailData(detailData);
      setContractDetailModal(true);
    }
  };

  const StatCard = ({ title, value, color, onClick }) => (
    <Grid item xs={3} sm={6} md={3}>
      <Card 
        sx={{ 
          p: isMobile ? 2 : 2, 
          height: '100%', 
          bgcolor: '#181f2e', 
          color: '#fff',
          border: '1px solid #232b3b',
          minHeight: isMobile ? '70px' : 'auto',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.2s ease-in-out',
          '&:hover': onClick ? {
            bgcolor: '#232b3b',
            border: '1px solid #43e97b',
            transform: 'translateY(-2px)',
            boxShadow: '0 4px 12px rgba(67, 233, 123, 0.3)'
          } : {},
        }}
        onClick={onClick}
      >
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
      width: isMobile ? '100%' : 'calc(100% - 20px)', 
      maxWidth: isMobile ? '100%' : 'calc(100% - 20px)', 
      mx: isMobile ? 0 : '10px',
      p: isMobile ? 0 : 2,
      mt: isMobile ? '-50px' : 0
    }}>
      {/* 상단 제목 및 통계 */}
      {viewType === 'month' && !isMobile && (
        <Typography variant="h4" sx={{ 
          mb: 3, 
          fontWeight: 800, 
          color: '#90caf9',
          textAlign: 'center'
        }}>
          {monthText || '기성현황'}
        </Typography>
      )}

      {/* 통계 카드 */}
      <Grid container spacing={isMobile ? 0 : 2} sx={{ 
        mb: 3,
        mt: isMobile ? '50px' : 0,
        justifyContent: isMobile ? 'center' : 'flex-start'
      }}>
        <StatCard 
          title="총 계약금액" 
          value={stats.totalContractAmount} 
          color="#43e97b" 
          onClick={handleContractCardClick}
        />
        <StatCard title="총 선급금" value={stats.totalAdvance} color="#ffd600" />
        <StatCard title="총 전회기성" value={stats.totalPrevGisung} color="#a084e8" />
        <StatCard title="총 기성금액" value={stats.totalGisungAmount} color="#ef5350" />
      </Grid>

      {/* 검색 및 버튼들 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: isMobile ? 'column' : 'row'
      }}>

        
        {/* 버튼들 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'flex-end'
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
      </Box>

      {/* 테이블 */}
      <Paper sx={{ 
        borderRadius: 4, 
        boxShadow: 6, 
        bgcolor: '#181f2e', 
        color: '#fff',
        overflow: 'hidden',
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box'
      }}>
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
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>결제방법</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>입금확인</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>비고</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, display: isMobile ? 'none' : 'table-cell' }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedGisung.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 11} sx={{ textAlign: 'center', color: '#bbb', py: 4 }}>
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
                    <TableCell sx={{ color: '#bbb', display: isMobile ? 'none' : 'table-cell' }}>{row.paymentMethod || '-'}</TableCell>
                    <TableCell sx={{ display: isMobile ? 'none' : 'table-cell' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={row.paymentStatus || '미입금'}
                          onChange={(e) => handlePaymentStatusChange(row.id, e.target.value)}
                          sx={{
                            bgcolor: '#232b3b',
                            color: '#fff',
                            fontSize: '0.8rem',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                            '& .MuiSelect-icon': { color: '#fff' }
                          }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: '#232b3b',
                                '& .MuiMenuItem-root': {
                                  color: '#fff',
                                  fontSize: '0.8rem',
                                  '&:hover': { bgcolor: '#2c3446' },
                                  '&.Mui-selected': { bgcolor: '#1976d2' }
                                }
                              }
                            }
                          }}
                        >
                          <MenuItem value="미입금">미입금</MenuItem>
                          <MenuItem value="입금완료">입금완료</MenuItem>
                          <MenuItem value="일부분">일부분</MenuItem>
                        </Select>
                      </FormControl>
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
            minHeight: isMobile ? 'auto' : '480px',
            width: '100%',
            maxHeight: isMobile ? '90vh' : '80vh',
            overflow: 'auto'
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: '#232b3b', 
          color: '#90caf9',
          fontWeight: 700,
          fontSize: { xs: '1.1rem', md: '1.3rem' },
          py: { xs: 1.5, md: 2 },
          textAlign: 'center'
        }}>
          기성 등록(vat포함)
        </DialogTitle>
        <DialogContent sx={{ pt: { xs: 2, md: 4 }, pb: 2, mt: { xs: 2, md: 6 } }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={isMobile ? 2 : 3}>
            {/* 1줄: 현장명(검색,드롭다운) + 기성월 */}
            <Box display="flex" width="100%" flexDirection={isMobile ? "column" : "row"} justifyContent={isMobile ? "flex-start" : "center"} gap={isMobile ? 1 : 2}>
              <FormControl sx={{ minWidth: isMobile ? '100%' : 220 }} size={isMobile ? "small" : "medium"}>
                <InputLabel sx={{ color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } }}>현장명</InputLabel>
                <Select
                  value={formData.name}
                  label="현장명"
                  onChange={handleSiteChange}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                    '& .MuiSelect-icon': { color: '#fff' },
                    '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#232b3b',
                        '& .MuiMenuItem-root': {
                          color: '#fff',
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          py: isMobile ? 1 : 1.5,
                          '&:hover': { bgcolor: '#2c3446' },
                          '&.Mui-selected': { bgcolor: '#1976d2' }
                        }
                      }
                    }
                  }}
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
                size={isMobile ? "small" : "medium"}
                sx={{
                  minWidth: isMobile ? '100%' : 120,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                }}
              />
            </Box>
            {/* 2줄: 계약금액 + 선급금 */}
            <Box display="flex" width="100%" flexDirection={isMobile ? "column" : "row"} justifyContent="center" gap={isMobile ? 1 : 2}>
              <TextField
                label="계약금액"
                value={Number(formData.contractAmount || 0).toLocaleString()}
                size={isMobile ? "small" : "medium"}
                sx={{
                  minWidth: isMobile ? '100%' : 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                }}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="선급금"
                value={Number(formData.advance || 0).toLocaleString()}
                size={isMobile ? "small" : "medium"}
                sx={{
                  minWidth: isMobile ? '100%' : 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                }}
                InputProps={{ readOnly: true }}
              />
            </Box>
            {/* 3줄: 전회기성 + 금회기성 */}
            <Box display="flex" width="100%" flexDirection={isMobile ? "column" : "row"} justifyContent="center" gap={isMobile ? 1 : 2}>
              <TextField
                label="전회기성"
                value={Number(formData.prevGisung || 0).toLocaleString()}
                size={isMobile ? "small" : "medium"}
                sx={{
                  minWidth: isMobile ? '100%' : 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                }}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="금회기성"
                value={formData.currentGisung}
                onChange={e => setFormData({ ...formData, currentGisung: e.target.value })}
                size={isMobile ? "small" : "medium"}
                sx={{
                  minWidth: isMobile ? '100%' : 180,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                }}
              />
            </Box>
            {/* 4줄: 결제방법 */}
            <Box display="flex" width="100%" justifyContent="center">
              <FormControl sx={{ minWidth: isMobile ? '100%' : 400 }} size={isMobile ? "small" : "medium"}>
                <InputLabel sx={{ color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } }}>결제방법</InputLabel>
                <Select
                  value={formData.paymentMethod || ''}
                  label="결제방법"
                  onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#333' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#90caf9' },
                    '& .MuiSelect-icon': { color: '#fff' },
                    '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' }, py: isMobile ? 1 : 1.5 }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#232b3b',
                        '& .MuiMenuItem-root': {
                          color: '#fff',
                          fontSize: { xs: '0.9rem', md: '1rem' },
                          py: isMobile ? 1 : 1.5,
                          '&:hover': { bgcolor: '#2c3446' },
                          '&.Mui-selected': { bgcolor: '#1976d2' }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="세금계산서">세금계산서</MenuItem>
                  <MenuItem value="노무자료">노무자료</MenuItem>
                  <MenuItem value="노무비닷컴">노무비닷컴</MenuItem>
                  <MenuItem value="무자료">무자료</MenuItem>
                  <MenuItem value="기타">기타</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {/* 5줄: 비고 */}
            <Box display="flex" width="100%" justifyContent="center">
              <TextField
                label="비고"
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: e.target.value })}
                fullWidth
                multiline
                rows={isMobile ? 2 : 3}
                size={isMobile ? "small" : "medium"}
                sx={{
                  maxWidth: isMobile ? '100%' : 400,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: { xs: '0.9rem', md: '1rem' } },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: { xs: '0.9rem', md: '1rem' } }
                }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232b3b', p: { xs: 2, md: 3 }, justifyContent: 'center' }}>
          <Button 
            onClick={handleClose}
            sx={{ 
              color: '#bbb', 
              fontSize: { xs: '0.9rem', md: '1rem' }, 
              px: { xs: 2, md: 3 }, 
              py: { xs: 0.8, md: 1 } 
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ 
              bgcolor: '#2e7d32',
              fontSize: { xs: '0.9rem', md: '1rem' },
              px: { xs: 2, md: 3 },
              py: { xs: 0.8, md: 1 },
              '&:hover': { bgcolor: '#1b5e20' }
            }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 계약금액 상세 모달 */}
      <Dialog 
        open={contractDetailModal} 
        onClose={() => setContractDetailModal(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#23242a',
            color: '#fff',
            '& .MuiDialogTitle-root': {
              color: '#fff',
              borderBottom: '1px solid #444',
            },
            '& .MuiDialogContent-root': {
              color: '#fff',
            },
            '& .MuiDialogActions-root': {
              borderTop: '1px solid #444',
            },
          }
        }}
      >
        <DialogTitle>
          {monthText} 총계약금액 상세
          <Typography variant="body2" sx={{ color: '#bbb', mt: 1 }}>
            총 {contractDetailData.length}개 현장 • {formatContractAmount(contractDetailData.reduce((sum, site) => sum + site.contractAmount, 0))}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {contractDetailData.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" sx={{ color: '#bbb' }}>
                해당 월에 시작된 현장이 없습니다.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: '#2c3446' }}>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>순번</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>현장명</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>계약금액</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>시작일</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>종료일</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contractDetailData.map((site, index) => (
                    <TableRow key={index} sx={{ '&:hover': { bgcolor: '#2c3446' } }}>
                      <TableCell sx={{ color: '#fff' }}>{index + 1}</TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 500 }}>{site.name}</TableCell>
                      <TableCell sx={{ color: '#43e97b', fontWeight: 700 }}>
                        {formatContractAmount(site.contractAmount)}
                      </TableCell>
                      <TableCell sx={{ color: '#fff' }}>
                        {typeof site.startDate === 'string' ? site.startDate : 
                         site.startDate?.toDate ? site.startDate.toDate().toLocaleDateString() : 
                         site.startDate?.toLocaleDateString?.() || '-'}
                      </TableCell>
                      <TableCell sx={{ color: '#fff' }}>
                        {typeof site.endDate === 'string' ? site.endDate : 
                         site.endDate?.toDate ? site.endDate.toDate().toLocaleDateString() : 
                         site.endDate?.toLocaleDateString?.() || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={site.status} 
                          size="small"
                          sx={{
                            bgcolor: site.status === '완료' ? '#4caf50' : 
                                    site.status === '진행중' ? '#2196f3' : 
                                    site.status === '예정' ? '#ff9800' : '#9e9e9e',
                            color: '#fff',
                            fontWeight: 500
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setContractDetailModal(false)}
            sx={{ color: '#ccc' }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GisungStatusPage; 