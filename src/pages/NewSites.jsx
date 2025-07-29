import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Grid, Paper, Tabs, Tab, TextField, List, ListItem, ListItemText, Button, IconButton, Typography, Box, FormControl, Select, MenuItem, Checkbox, FormControlLabel, InputLabel, Autocomplete, Chip } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, onSnapshot, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { addSite, updateSite, deleteSite } from '../api/sites';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { formatContractAmount, formatAdvanceAmount, formatGisungAmount } from '../utils/formatUtils';
import { getSiteIntegratedStatus } from '../utils/integrationUtils';

const STATUS_OPTIONS = ['예정', '진행중', '완료', '미정'];
const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급', '관급'];
const ESTIMATE_STATUS_OPTIONS = ['있음', '없음', '입찰', '현설', '기타'];

const initialFormState = {
  name: '',
  status: '진행중',
  contractType: '관급',
  subcontractGuardian: false,
  installment: '',
  contractAmount: '',
  advance: '',
  totalProgress: '',
  address: '',
  startDate: '',
  endDate: '',
  companyName: '',
  manager: '',
  phone: '',
  team: '',
  desc: '',
  isFavorite: false,
  items: [],
  estimateStatus: '',
  estimateNote: '',
};

const NewSites = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [statusTab, setStatusTab] = useState('진행중');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [vendors, setVendors] = useState([]); // 거래처 데이터 상태 추가
  const [siteIntegratedStatus, setSiteIntegratedStatus] = useState(null);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef(null);

  // 상태별 카운트 계산
  const statusCounts = useMemo(() => {
    const counts = {
      '예정': 0,
      '진행중': 0,
      '완료': 0,
      '미정': 0
    };
    
    sites.forEach(site => {
      if (counts.hasOwnProperty(site.status)) {
        counts[site.status]++;
      }
    });
    
    return counts;
  }, [sites]);

  // 모바일에서 키보드가 올라올 때 뷰포트 조정 (간소화)
  useEffect(() => {
    if (isMobile) {
      const handleFocusIn = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          // 간단한 스크롤 조정만 수행
          setTimeout(() => {
            e.target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
          }, 100);
        }
      };

      document.addEventListener('focusin', handleFocusIn);

      return () => {
        document.removeEventListener('focusin', handleFocusIn);
      };
    }
  }, [isMobile]);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && dateString.includes('.')) {
      return dateString.replace(/\./g, '-');
    }
    if (dateString instanceof Date) {
      return dateString.toISOString().split('T')[0];
    }
    return dateString;
  };

  const formatDateForStorage = (dateString) => {
    if (!dateString) return '';
    if (typeof dateString === 'string' && dateString.includes('-')) {
      return dateString.replace(/-/g, '.');
    }
    return dateString;
  };

  // 거래처 데이터 로드
  const loadVendors = async () => {
    try {
      const vendorsQuery = query(collection(db, 'vendorManagement'), orderBy('companyName', 'asc'));
      const querySnapshot = await getDocs(vendorsQuery);
      const vendorsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVendors(vendorsData);
    } catch (error) {
      console.error('거래처 데이터 로드 오류:', error);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('name'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sitesData = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.status === '진행') data.status = '진행중';
        else if (data.status === '진행상황') data.status = '예정';
        return data;
      });

      const sitesWithGisung = await Promise.all(
        sitesData.map(async (site) => {
          try {
            const gisungQuery = query(collection(db, 'gisung'), where('name', '==', site.name));
            const gisungSnapshot = await getDocs(gisungQuery);
            const totalGisung = gisungSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().gisungAmount) || 0), 0);
            return { ...site, totalProgress: totalGisung };
          } catch (error) {
            console.error(`Error fetching gisung for site ${site.name}:`, error);
            return site;
          }
        })
      );
      setSites(sitesWithGisung);
    }, (error) => {
      console.error("Error fetching sites in real-time:", error);
    });

    // 거래처 데이터도 함께 로드
    loadVendors();

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedSite) {
      setForm({
        ...initialFormState,
        ...selectedSite,
        startDate: selectedSite.startDate ? selectedSite.startDate.split('T')[0] : '',
        endDate: selectedSite.endDate ? selectedSite.endDate.split('T')[0] : '',
      });
      setIsEditing(false);
    } else {
      setForm(initialFormState);
      setIsEditing(true);
    }
  }, [selectedSite]);

  const filteredSites = useMemo(() => {
    return sites
      .filter(site => site.status === statusTab)
      .filter(site =>
        site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.manager && site.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [sites, statusTab, searchTerm]);

  const handleSelectSite = async (site) => {
    setSelectedSite(site);
    
    // 선택된 현장의 통합 현황 조회
    if (site) {
      try {
        const integratedStatus = await getSiteIntegratedStatus(site.name);
        setSiteIntegratedStatus(integratedStatus);
      } catch (error) {
        console.error('현장 통합 현황 조회 오류:', error);
        setSiteIntegratedStatus(null);
      }
    } else {
      setSiteIntegratedStatus(null);
    }
  };
  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setForm(prev => ({ ...prev, [name]: newValue }));
    
    // 진행상황이 변경되고 현재 현장이 선택되어 있으면 자동 저장
    if (name === 'status' && selectedSite && !isEditing) {
      try {
        await updateSite(selectedSite.id, { 
          ...form, 
          status: newValue,
          updatedAt: new Date()
        });
        console.log('진행상황 자동 저장 완료:', newValue);
      } catch (error) {
        console.error('진행상황 자동 저장 실패:', error);
        alert('진행상황 저장에 실패했습니다.');
      }
    }
  };
  const handleItemsChange = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm(prev => ({ ...prev, items: newItems }));
  };
  const handleAddItem = () => setForm(prev => ({ ...prev, items: [...(prev.items || []), { name: '', quantity: '', price: '' }] }));
  const handleRemoveItem = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, items: newItems }));
  };
  const handleNewSite = () => {
    setSelectedSite(null);
    setForm({
      name: '',
      contractType: '관급',
      manager: '',
      startDate: '',
      endDate: '',
      status: '진행중',
      isFavorite: false,
      items: []
    });
    setIsEditing(false);
  };
  const handleEditClick = () => setIsEditing(true);

  const handleSave = async () => {
    // 기타 선택 시 견적 비고 필수 검증
    if (form.estimateStatus === '기타' && !form.estimateNote?.trim()) {
      alert('기타 선택 시 견적 비고를 반드시 입력해야 합니다.');
      estimateNoteRef.current?.focus();
      return;
    }

    const formDataToSave = { ...form, startDate: formatDateForStorage(form.startDate), endDate: formatDateForStorage(form.endDate) };
    if (selectedSite) {
      if (window.confirm('수정하시겠습니까?')) {
        try {
          await updateSite(selectedSite.id, formDataToSave);
          setIsEditing(false);
        } catch (error) { console.error("Failed to update site:", error); }
      }
    } else {
      // 등록 확인 메시지
      const confirmMessage = `다음 현장을 등록하시겠습니까?\n\n현장명: ${form.name}\n계약구분: ${form.contractType}\n담당자: ${form.manager}\n시작일: ${form.startDate}\n종료일: ${form.endDate}`;
      
      if (!window.confirm(confirmMessage)) {
        return;
      }
      
      try {
        await addSite(formDataToSave);
        alert('현장이 성공적으로 등록되었습니다.');
        handleNewSite();
      } catch (error) { 
        console.error("Failed to add site:", error);
        alert('현장 등록 중 오류가 발생했습니다.');
      }
    }
  };
  
  const handleDelete = async () => {
    if (selectedSite && window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteSite(selectedSite.id);
        handleNewSite();
      } catch (error) { console.error("Failed to delete site:", error); }
    }
  };

  const handleGisung = () => navigate(selectedSite ? `/progress?siteId=${selectedSite.id}` : '/progress');
  const handleWholeList = () => navigate('/whole-list');
  const isReadOnly = !isEditing;

  const scrollFocus = (ref) => () => {
    if (isMobile) {
      setTimeout(() => {
        ref?.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
        
        // 모바일에서 추가 스크롤 조정
        const container = containerRef.current;
        if (container) {
          const rect = ref.current?.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          if (rect && containerRect) {
            const offset = rect.top - containerRect.top - 100;
            container.scrollTop += offset;
          }
        }
      }, 100);
    } else {
      setTimeout(() => {
        ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  // 견적 유무 색상 반환 함수
  const getEstimateStatusColor = (status) => {
    switch (status) {
      case '있음':
        return '#4caf50';
      case '없음':
        return '#f44336';
      case '입찰':
        return '#9c27b0';
      case '현설':
        return '#00bcd4';
      case '기타':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  const inputRef1 = useRef();
  const inputRef2 = useRef();
  const addressRef = useRef();
  const startDateRef = useRef();
  const endDateRef = useRef();
  const companyNameRef = useRef();
  const managerRef = useRef();
  const phoneRef = useRef();
  const teamRef = useRef();
  const descRef = useRef();
  const estimateStatusRef = useRef();
  const estimateNoteRef = useRef();

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        minHeight: { xs: 'auto', md: 'calc(90vh - 64px - 52px)' }, // 100vh에서 90vh로 줄임
        bgcolor: '#1a1d21', 
        p: 0, 
        gap: 2, 
        overflow: { xs: 'auto', md: 'auto' },
        width: isMobile ? 'calc(100% - 5px)' : '100%',
        maxWidth: isMobile ? 'calc(100% - 5px)' : '100%',
        WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
        scrollBehavior: isMobile ? 'smooth' : 'auto',
        mt: isMobile ? '34px' : 8,
        ml: isMobile ? '2px' : 0,
        mr: isMobile ? '5px' : 0,
        position: 'relative',
        right: isMobile ? '0px' : 'auto',
        height: isMobile ? 'calc(90vh - 34px)' : 'auto', // 100vh에서 90vh로 줄임
        pb: isMobile ? '20px' : 0
      }}
    >
      {/* Left Panel */}
      <Paper elevation={3} sx={{ 
        width: { xs: '100%', md: '20%' }, 
        minWidth: { md: '200px' }, 
        height: { xs: '200px', md: 'calc(100vh - 120px)' }, 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 1 : 2, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '0px' : 'auto',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <Tabs 
          value={statusTab} 
          onChange={(e, v) => setStatusTab(v)} 
          variant="fullWidth" 
          sx={{ 
            mb: isMobile ? 1 : 2, 
            minHeight: 'auto', 
            '& .MuiTabs-flexContainer': { justifyContent: 'space-between' }, 
            '& .MuiTab-root': { 
              minWidth: 0, 
              px: isMobile ? 0.2 : 0.5, 
              py: isMobile ? 0.3 : 0.5, 
              fontSize: isMobile ? '0.65rem' : '0.75rem', 
              fontWeight: 'bold',
              minHeight: isMobile ? '32px' : 'auto'
            } 
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <Tab 
              key={opt} 
              label={`${opt} (${statusCounts[opt]})`} 
              value={opt}
              sx={{
                '& .MuiTab-label': {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }
              }}
            />
          ))}
        </Tabs>
        <TextField 
          placeholder="현장명, 담당자 검색" 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)} 
          variant="outlined" 
          size="small" 
          sx={{ 
            mb: isMobile ? 1 : 2, 
            input: { color: '#fff', fontSize: isMobile ? '0.8rem' : 'inherit' }, 
            fieldset: { borderColor: '#444' } 
          }} 
        />
        <List sx={{ 
          overflowY: 'auto', 
          flex: 1,
          minHeight: 0,
                      maxHeight: '100%',
            WebkitOverflowScrolling: 'touch',
            touchAction: 'pan-y',
          '&::-webkit-scrollbar': {
            width: '6px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#1a1d21',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#444',
            borderRadius: '3px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#666'
          }
        }}>
          {filteredSites.map(site => (
            <ListItem 
              key={site.id} 
              selected={selectedSite?.id === site.id} 
              onClick={() => handleSelectSite(site)} 
              sx={{ 
                mb: isMobile ? 0.25 : 0.5, 
                borderRadius: 1,
                py: isMobile ? 0.25 : 0.5,
                border: '1px solid',
                borderColor: selectedSite?.id === site.id ? '#90caf9' : '#333',
                bgcolor: selectedSite?.id === site.id ? '#1e3a5f' : 'transparent',
                '&:hover': {
                  bgcolor: selectedSite?.id === site.id ? '#1e3a5f' : '#2a2d35',
                  borderColor: '#90caf9'
                }
              }}
            >
              <ListItemText 
                primary={site.name} 
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography 
                      sx={{ 
                        fontSize: isMobile ? '0.7rem' : 'inherit',
                        color: selectedSite?.id === site.id ? '#90caf9' : '#aaa'
                      }}
                    >
                      {site.status}
                    </Typography>
                    {site.estimateStatus && (
                      <Chip
                        label={site.estimateStatus}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor: getEstimateStatusColor(site.estimateStatus),
                          color: getEstimateStatusColor(site.estimateStatus),
                          fontSize: isMobile ? '0.6rem' : '0.7rem',
                          height: isMobile ? '16px' : '20px',
                          '& .MuiChip-label': {
                            px: isMobile ? 0.5 : 1
                          }
                        }}
                        title={`견적 유무: ${site.estimateStatus}`}
                      />
                    )}
                  </Box>
                }
                primaryTypographyProps={{ 
                  fontSize: isMobile ? '0.8rem' : 'inherit',
                  fontWeight: selectedSite?.id === site.id ? 'bold' : 'normal',
                  color: selectedSite?.id === site.id ? '#90caf9' : '#fff'
                }}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
      
      {/* Center Panel */}
      <Paper elevation={3} sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 2 : 3, 
        borderRadius: 2, 
        minWidth: 0, 
        height: 'auto',
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '0px' : 'auto',
        overflowY: isMobile ? 'visible' : 'visible'
      }}>
         <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 2 }}>
           <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
             현장 상세 정보
           </Typography>
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
             <Button variant="contained" onClick={handleNewSite} size={isMobile ? 'small' : 'small'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               + 새현장
             </Button>
             <Button variant="outlined" onClick={handleWholeList} size={isMobile ? 'small' : 'small'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit', display: isMobile ? 'none' : 'inline-flex' }}>
               전체 List
             </Button>
           </Box>
         </Box>
         {/* 통합 현황 표시 */}
         {siteIntegratedStatus && (
           <Box sx={{ 
             mb: 2, 
             p: 2, 
             bgcolor: '#f5f5f5', 
             borderRadius: 1,
             border: '1px solid #e0e0e0'
           }}>
             <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: '#1976d2' }}>
               {selectedSite?.name} 통합 현황
             </Typography>
             <Grid container spacing={2}>
               <Grid xs={6} sm={3}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h4" sx={{ color: '#1976d2', fontWeight: 'bold' }}>
                     {siteIntegratedStatus.summary.totalEstimates}
                   </Typography>
                   <Typography variant="body2" sx={{ color: '#666' }}>견적</Typography>
                 </Box>
               </Grid>
               <Grid xs={6} sm={3}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h4" sx={{ color: '#7b1fa2', fontWeight: 'bold' }}>
                     {siteIntegratedStatus.summary.totalClaims}
                   </Typography>
                   <Typography variant="body2" sx={{ color: '#666' }}>청구</Typography>
                 </Box>
               </Grid>
               <Grid xs={6} sm={3}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h4" sx={{ color: '#388e3c', fontWeight: 'bold' }}>
                     {siteIntegratedStatus.summary.totalProgress}
                   </Typography>
                   <Typography variant="body2" sx={{ color: '#666' }}>기성</Typography>
                 </Box>
               </Grid>
               <Grid xs={6} sm={3}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h4" sx={{ color: '#f57c00', fontWeight: 'bold' }}>
                     {siteIntegratedStatus.summary.totalCosts}
                   </Typography>
                   <Typography variant="body2" sx={{ color: '#666' }}>지출</Typography>
                 </Box>
               </Grid>
             </Grid>
             <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
               <Grid container spacing={2}>
                 <Grid xs={12} sm={4}>
                   <Typography variant="body2" sx={{ color: '#666' }}>
                     견적 총액: {siteIntegratedStatus.summary.totalEstimateAmount.toLocaleString()}원
                   </Typography>
                 </Grid>
                 <Grid xs={12} sm={4}>
                   <Typography variant="body2" sx={{ color: '#666' }}>
                     청구 총액: {siteIntegratedStatus.summary.totalClaimAmount.toLocaleString()}원
                   </Typography>
                 </Grid>
                 <Grid xs={12} sm={4}>
                   <Typography variant="body2" sx={{ color: '#666' }}>
                     지출 총액: {siteIntegratedStatus.summary.totalCostAmount.toLocaleString()}원
                   </Typography>
                 </Grid>
               </Grid>
             </Box>
           </Box>
         )}

         <Box sx={{ 
           pr: 1, 
           display: 'flex', 
           flexDirection: 'column', 
           gap: isMobile ? 0.5 : 1,
           WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
           scrollBehavior: isMobile ? 'smooth' : 'auto'
         }}>
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: isMobile ? 'none' : 8 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 현장명
               </Typography>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <TextField name="name" value={form.name ?? ''} onChange={handleChange} size="small" disabled={isReadOnly} sx={{ width: isMobile ? '250px' : '500px' }} inputRef={inputRef1} onFocus={scrollFocus(inputRef1)} />
                 <Box sx={{ display: 'flex', alignItems: 'center', pb: 0.5, flexDirection: 'row', whiteSpace: 'nowrap' }}>
                   <Typography variant="body1" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>주요현장</Typography>
                   <IconButton 
                     onClick={() => handleChange({ target: { name: 'isFavorite', value: !form.isFavorite } })} 
                     size="small" 
                     sx={{ ml: 0.5 }} 
                     disabled={isReadOnly}
                   >
                     {form.isFavorite ? <StarIcon sx={{ color: 'gold' }} /> : <StarBorderIcon />}
                   </IconButton>
                 </Box>
               </Box>
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', flexDirection: 'row' }}>
             <Box sx={{ flex: isMobile ? 1 : 3 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 계약구분
               </Typography>
               <FormControl fullWidth size="small">
                 <Select name="contractType" value={form.contractType ?? '관급'} onChange={handleChange} disabled={isReadOnly}>
                   {CONTRACT_TYPE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: isMobile ? 1 : 3, pb: 0.5 }}>
               <FormControlLabel 
                 control={<Checkbox name="subcontractGuardian" checked={form.subcontractGuardian} onChange={handleChange} disabled={isReadOnly} />} 
                 label={<Typography sx={{ wordBreak: 'keep-all', fontSize: isMobile ? '0.6rem' : 'inherit' }}>하도급지킴이</Typography>} 
               />
             </Box>
             <Box sx={{ flex: isMobile ? 1 : 3 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 진행상황
               </Typography>
               <FormControl fullWidth size="small">
                 <Select 
                   name="status" 
                   value={form.status ?? '진행중'} 
                   onChange={handleChange} 
                   disabled={false}
                   sx={{
                     '& .MuiSelect-select': {
                       backgroundColor: form.status === '예정' ? '#ff9800' : 
                                      form.status === '진행중' ? '#1976d2' : 
                                      form.status === '완료' ? '#43a047' : 
                                      form.status === '미정' ? '#757575' : '#757575',
                       color: 'white',
                       fontWeight: 'bold'
                     }
                   }}
                 >
                   {STATUS_OPTIONS.map(opt => (
                     <MenuItem key={opt} value={opt} sx={{ 
                       backgroundColor: opt === '예정' ? '#ff9800' : 
                                     opt === '진행중' ? '#1976d2' : 
                                     opt === '완료' ? '#43a047' : 
                                     opt === '미정' ? '#757575' : '#757575',
                       color: 'white',
                       '&:hover': {
                         backgroundColor: opt === '예정' ? '#f57c00' : 
                                        opt === '진행중' ? '#1565c0' : 
                                        opt === '완료' ? '#388e3c' : 
                                        opt === '미정' ? '#616161' : '#616161'
                       }
                     }}>
                       {opt}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, mt: isMobile ? 0.5 : 1, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 계약금액
               </Typography>
               <TextField name="contractAmount" value={isReadOnly ? formatContractAmount(form.contractAmount) : (form.contractAmount ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} inputRef={inputRef2} onFocus={scrollFocus(inputRef2)} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 선급금
               </Typography>
               <TextField name="advance" value={isReadOnly ? formatAdvanceAmount(form.advance) : (form.advance ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 누계기성
               </Typography>
               <TextField name="totalProgress" value={formatGisungAmount(form.totalProgress)} onChange={handleChange} fullWidth size="small" disabled={true} sx={{ '& .MuiInputBase-input': { color: '#4caf50', fontWeight: 'bold' } }} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 안전관리비
               </Typography>
               <TextField name="safetyCost" value={isReadOnly ? (Number(form.safetyCost || 0)).toLocaleString() : (form.safetyCost ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex' }}>
             <Box sx={{ width: '100%' }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 주소
               </Typography>
               <TextField 
                 name="address" 
                 value={form.address ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={addressRef}
                 onFocus={scrollFocus(addressRef)}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 착공일
               </Typography>
               <TextField 
                 name="startDate" 
                 type="date" 
                 value={formatDateForInput(form.startDate) ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 InputLabelProps={{ shrink: true }} 
                 disabled={isReadOnly} 
                 inputRef={startDateRef}
                 onFocus={scrollFocus(startDateRef)}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 준공예정일
               </Typography>
               <TextField 
                 name="endDate" 
                 type="date" 
                 value={formatDateForInput(form.endDate) ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 InputLabelProps={{ shrink: true }} 
                 disabled={isReadOnly} 
                 inputRef={endDateRef}
                 onFocus={scrollFocus(endDateRef)}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 회사명 (거래처 선택 또는 입력)
               </Typography>
               <Autocomplete
                 options={vendors.map(vendor => vendor.companyName)}
                 value={form.companyName ?? ''}
                 onChange={(event, newValue) => {
                   const e = { target: { name: 'companyName', value: newValue || '' } };
                   handleChange(e);
                 }}
                 freeSolo
                 disabled={isReadOnly}
                 renderInput={(params) => (
                   <TextField
                     {...params}
                     size="small"
                     inputRef={companyNameRef}
                     onFocus={scrollFocus(companyNameRef)}
                   />
                 )}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 소장
               </Typography>
               <TextField 
                 name="manager" 
                 value={form.manager ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={managerRef}
                 onFocus={scrollFocus(managerRef)}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 연락처
               </Typography>
               <TextField 
                 name="phone" 
                 value={form.phone ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={phoneRef}
                 onFocus={scrollFocus(phoneRef)}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: isMobile ? 'none' : 4 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 시공팀
               </Typography>
               <TextField 
                 name="team" 
                 value={form.team ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={teamRef}
                 onFocus={scrollFocus(teamRef)}
               />
             </Box>
             <Box sx={{ flex: isMobile ? 'none' : 4 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 견적유무
               </Typography>
               <FormControl fullWidth size="small">
                 <Select 
                   name="estimateStatus" 
                   value={form.estimateStatus ?? ''} 
                   onChange={handleChange} 
                   disabled={isReadOnly}
                   inputRef={estimateStatusRef}
                   onFocus={scrollFocus(estimateStatusRef)}
                   sx={{
                     '& .MuiSelect-select': {
                       color: form.estimateStatus ? getEstimateStatusColor(form.estimateStatus) : 'inherit',
                       fontWeight: form.estimateStatus ? 'bold' : 'normal'
                     }
                   }}
                 >
                   <MenuItem value="">선택하세요</MenuItem>
                   {ESTIMATE_STATUS_OPTIONS.map(opt => (
                     <MenuItem key={opt} value={opt} sx={{ 
                       color: getEstimateStatusColor(opt),
                       fontWeight: 'bold',
                       '&:hover': {
                         backgroundColor: 'rgba(0, 0, 0, 0.04)'
                       }
                     }}>
                       {opt}
                     </MenuItem>
                   ))}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: isMobile ? 'none' : 4 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 견적비고 {form.estimateStatus === '기타' && <span style={{color: '#f44336'}}>*</span>}
               </Typography>
               <TextField 
                 name="estimateNote" 
                 value={form.estimateNote ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={estimateNoteRef}
                 onFocus={scrollFocus(estimateNoteRef)}
                 placeholder={form.estimateStatus === '기타' ? "기타 선택 시 반드시 입력하세요" : "견적 관련 메모"}
                 error={form.estimateStatus === '기타' && !form.estimateNote?.trim()}
                 helperText={form.estimateStatus === '기타' && !form.estimateNote?.trim() ? "기타 선택 시 비고를 입력해야 합니다" : ""}
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 기타사항
               </Typography>
               <TextField 
                 name="desc" 
                 value={form.desc ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={descRef}
                 onFocus={scrollFocus(descRef)}
               />
             </Box>
           </Box>
         </Box>
         <Box sx={{ mt: 'auto', pt: isMobile ? 1 : 2, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
           {isEditing ? (
             <Button variant="contained" color="primary" onClick={handleSave} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               {selectedSite ? '저장하기' : '등록하기'}
             </Button>
           ) : (
             <Button variant="contained" color="primary" onClick={handleEditClick} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               수정하기
             </Button>
           )}
           <Button variant="outlined" color="secondary" onClick={handleDelete} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             삭제
           </Button>
           <Button variant="contained" color="success" onClick={handleGisung} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             기성현황
           </Button>
         </Box>
      </Paper>
      
      {/* Right Panel */}
      <Paper elevation={3} sx={{ 
        width: { xs: '100%', md: '30%' }, 
        minWidth: { md: '280px' }, 
        height: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 2 : 3, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '2px' : 'auto'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1 : 2, flexWrap: 'wrap' }}>
          <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
            물량 내역
          </Typography>
          <Button variant="outlined" onClick={handleAddItem} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
            품목추가
          </Button>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, color: 'text.secondary', borderBottom: 1, borderColor: 'divider', pb: 1 }}>
          <Typography sx={{ width: '40%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>항목</Typography>
          <Typography sx={{ width: '20%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>물량</Typography>
          <Typography sx={{ width: '30%', fontWeight: 'bold', fontSize: isMobile ? '0.7rem' : 'inherit' }}>단가</Typography>
        </Box>
        <Box sx={{ minHeight: '200px' }}>
          {(form.items || []).map((item, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, mb: isMobile ? 0.5 : 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField 
                value={item.name ?? ''} 
                onChange={(e) => handleItemsChange(index, 'name', e.target.value)} 
                size="small" 
                sx={{ flex: '1 1 120px' }} 
                placeholder="항목" 
                disabled={isReadOnly}
                inputProps={{ style: { fontSize: isMobile ? '0.7rem' : 'inherit' } }}
              />
              <TextField 
                value={item.quantity ?? ''} 
                onChange={(e) => handleItemsChange(index, 'quantity', e.target.value)} 
                size="small" 
                sx={{ flex: '1 1 60px' }} 
                placeholder="물량" 
                disabled={isReadOnly}
                inputProps={{ style: { fontSize: isMobile ? '0.7rem' : 'inherit' } }}
              />
              <TextField 
                value={item.price ?? ''} 
                onChange={(e) => handleItemsChange(index, 'price', e.target.value)} 
                size="small" 
                sx={{ flex: '1 1 80px' }} 
                placeholder="단가" 
                disabled={isReadOnly}
                inputProps={{ style: { fontSize: isMobile ? '0.7rem' : 'inherit' } }}
              />
              <IconButton onClick={() => handleRemoveItem(index)} size="small" disabled={isReadOnly}>
                <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  );
};

export default NewSites;
