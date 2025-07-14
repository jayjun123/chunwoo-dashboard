import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Grid, Paper, Tabs, Tab, TextField, List, ListItem, ListItemText, Button, IconButton, Typography, Box, FormControl, Select, MenuItem, Checkbox, FormControlLabel, InputLabel } from '@mui/material';
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

const STATUS_OPTIONS = ['계획', '진행중', '완료', '미정'];
const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급', '관급'];

const initialFormState = {
  name: '',
  status: '계획',
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
};

const NewSites = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [statusTab, setStatusTab] = useState('진행중');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef(null);

  // 모바일에서 키보드가 올라올 때 뷰포트 조정
  useEffect(() => {
    if (isMobile) {
      const handleFocusIn = (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
          // 키보드가 올라올 때 뷰포트 높이 조정
          const viewport = document.querySelector('meta[name=viewport]');
          if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no');
          }
          
          // body에 키보드 열림 클래스 추가
          document.body.classList.add('keyboard-open');
          
          // 입력 필드가 화면 밖으로 나가지 않도록 스크롤
          setTimeout(() => {
            e.target.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'nearest'
            });
            
            // 추가 스크롤 조정
            const container = containerRef.current;
            if (container) {
              const rect = e.target.getBoundingClientRect();
              const containerRect = container.getBoundingClientRect();
              if (rect && containerRect) {
                const offset = rect.top - containerRect.top - 120;
                if (offset > 0) {
                  container.scrollTop += offset;
                }
              }
            }
          }, 100);
        }
      };

      const handleFocusOut = () => {
        // 포커스가 벗어날 때 뷰포트 복원
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
        }
        
        // body에서 키보드 열림 클래스 제거
        document.body.classList.remove('keyboard-open');
      };

      // 키보드 표시/숨김 이벤트 처리
      const handleVisualViewportChange = () => {
        const visualViewport = window.visualViewport;
        if (visualViewport) {
          const heightDiff = window.innerHeight - visualViewport.height;
          if (heightDiff > 150) {
            // 키보드가 열렸을 때
            document.body.classList.add('keyboard-open');
          } else {
            // 키보드가 닫혔을 때
            document.body.classList.remove('keyboard-open');
          }
        }
      };

      document.addEventListener('focusin', handleFocusIn);
      document.addEventListener('focusout', handleFocusOut);
      
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', handleVisualViewportChange);
      }

      return () => {
        document.removeEventListener('focusin', handleFocusIn);
        document.removeEventListener('focusout', handleFocusOut);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', handleVisualViewportChange);
        }
        document.body.classList.remove('keyboard-open');
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

  useEffect(() => {
    const q = query(collection(db, 'sites'), orderBy('name'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const sitesData = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        if (data.status === '진행') data.status = '진행중';
        else if (data.status === '예정') data.status = '계획';
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

  const handleSelectSite = (site) => setSelectedSite(site);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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

  return (
    <Box 
      ref={containerRef}
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        height: { xs: 'auto', md: 'calc(100vh - 64px - 52px)' }, 
        bgcolor: '#1a1d21', 
        p: 0, 
        gap: 2, 
        overflow: { xs: 'auto', md: 'hidden' },
        width: isMobile ? '100vw' : '100%',
        minHeight: isMobile ? '100vh' : 'auto',
        WebkitOverflowScrolling: isMobile ? 'touch' : 'auto',
        scrollBehavior: isMobile ? 'smooth' : 'auto'
      }}
    >
      {/* Left Panel */}
      <Paper elevation={3} sx={{ 
        width: { xs: '100%', md: '20%' }, 
        minWidth: { md: '200px' }, 
        height: { xs: isMobile ? '200px' : '300px', md: '100%' }, 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 1 : 2, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '-10px' : 'auto',
        left: isMobile ? '-8px' : 'auto'
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
          {STATUS_OPTIONS.map(opt => <Tab key={opt} label={opt} value={opt} />)}
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
        <List sx={{ overflowY: 'auto', flex: 1 }}>
          {filteredSites.map(site => (
            <ListItem 
              key={site.id} 
              selected={selectedSite?.id === site.id} 
              onClick={() => handleSelectSite(site)} 
              sx={{ 
                mb: isMobile ? 0.5 : 1, 
                borderRadius: 1,
                py: isMobile ? 0.5 : 1
              }}
            >
              <ListItemText 
                primary={site.name} 
                secondary={site.status}
                primaryTypographyProps={{ 
                  fontSize: isMobile ? '0.8rem' : 'inherit',
                  fontWeight: selectedSite?.id === site.id ? 'bold' : 'normal'
                }}
                secondaryTypographyProps={{ 
                  fontSize: isMobile ? '0.7rem' : 'inherit' 
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
        height: { xs: 'auto', md: '100%' },
        maxHeight: isMobile ? 'none' : '100%',
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '-10px' : 'auto',
        left: isMobile ? '-8px' : 'auto'
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
         <Box sx={{ 
           overflowY: 'auto', 
           pr: 1, 
           flex: 1, 
           display: 'flex', 
           flexDirection: 'column', 
           gap: isMobile ? 0.5 : 1,
           maxHeight: isMobile ? 'none' : 'calc(100vh - 200px)',
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
                 <Select name="status" value={form.status ?? '계획'} onChange={handleChange} disabled={isReadOnly}>
                   {STATUS_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                 </Select>
               </FormControl>
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 2, mt: isMobile ? 0.5 : 1, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 계약금액
               </Typography>
               <TextField name="contractAmount" value={isReadOnly ? (Number(form.contractAmount || 0)).toLocaleString() : (form.contractAmount ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} inputRef={inputRef2} onFocus={scrollFocus(inputRef2)} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 선급금
               </Typography>
               <TextField name="advance" value={isReadOnly ? (Number(form.advance || 0)).toLocaleString() : (form.advance ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 누계기성
               </Typography>
               <TextField name="totalProgress" value={(Number(form.totalProgress || 0)).toLocaleString()} onChange={handleChange} fullWidth size="small" disabled={true} sx={{ '& .MuiInputBase-input': { color: '#4caf50', fontWeight: 'bold' } }} />
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
                 회사명
               </Typography>
               <TextField 
                 name="companyName" 
                 value={form.companyName ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={companyNameRef}
                 onFocus={scrollFocus(companyNameRef)}
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
             <Box sx={{ flex: isMobile ? 'none' : 8 }}>
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
        height: { xs: isMobile ? '250px' : '300px', md: '100%' }, 
        display: 'flex', 
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 2 : 3, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '-10px' : 'auto',
        left: isMobile ? '-8px' : 'auto'
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
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
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
