import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  IconButton, 
  Snackbar, 
  Alert, 
  useMediaQuery, 
  MenuItem,
  InputAdornment,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  Autocomplete,
  Pagination,
  Stack
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  CloudDownload as CloudDownloadIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon,
  Sort as SortIcon
} from '@mui/icons-material';
import { db } from '../firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, where, orderBy, serverTimestamp, getDocs } from 'firebase/firestore';
import { exportToExcel } from '../utils/excelUtils.jsx';
import { useAuth } from '../contexts/AuthContext';
import SearchableSiteSelect from '../components/common/SearchableSiteSelect';
import { syncCostToSite } from '../utils/integrationUtils';

const Cost = ({ viewType, currentMonth, monthText, selectedSites, filteredData }) => {
  const { currentUser } = useAuth();
  const [costs, setCosts] = useState([]);
  const [sites, setSites] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('itemType');
  const [sortDirection, setSortDirection] = useState('asc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [form, setForm] = useState({
    site: '',
    itemType: '',
    date: '',
    totalValue: '',
    paymentType: '',
    description: '',
    sequence: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const isMobile = useMediaQuery('(max-width:900px)');

  // 실시간 지출 데이터 리스너
  useEffect(() => {
    if (filteredData) {
      // 상위 컴포넌트에서 필터링된 데이터가 전달되면 사용
      setCosts(filteredData);
    } else {
      // 실시간 리스너 설정
      const unsubscribe = onSnapshot(collection(db, 'costs'), (snapshot) => {
        const costsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('실시간 데이터 업데이트:', costsData.length, '개');
        setCosts(costsData);
      }, (error) => {
        console.error('지출 데이터 실시간 리스너 오류:', error);
      });

      return () => unsubscribe();
    }
  }, [filteredData]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'sites'));
        setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('현장명 목록 조회 실패:', error);
        setSites([]);
      }
    };
    fetchSites();
  }, []);

  // 검색이나 필터 조건이 변경될 때 첫 페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [search, viewType, selectedSites, sortField, sortDirection]);

  // 검색 및 정렬된 데이터
  const filteredAndSortedCosts = useMemo(() => {
    let filtered = costs.filter(cost =>
      cost.site?.toLowerCase().includes(search.toLowerCase()) ||
      cost.itemType?.toLowerCase().includes(search.toLowerCase()) ||
      cost.paymentType?.toLowerCase().includes(search.toLowerCase()) ||
      cost.description?.toLowerCase().includes(search.toLowerCase())
    );

    // 월별 뷰에서는 모든 데이터 표시
    if (viewType === 'month') {
      console.log('월별 뷰 - 모든 지출 데이터 표시');
      // 월별 뷰에서는 모든 데이터 표시 (기본 검색 필터만 적용)
    } else if (viewType === 'site') {
      console.log('지출 현장별 필터링 적용:', selectedSites);
      
      // 현장이 선택되지 않은 경우 빈 배열 반환
      if (!selectedSites || selectedSites.length === 0) {
        console.log('현장 미선택 - 지출 데이터 없음');
        return [];
      }
      
      // 전체선택인지 확인
      const isAllSelected = selectedSites.some(site => {
        if (typeof site === 'string') {
          return site === '전체선택' || site === 'all';
        }
        if (site && typeof site === 'object') {
          return site.name === '전체선택' || site.id === 'all';
        }
        return false;
      });
      
      if (isAllSelected) {
        console.log('전체선택 - 모든 지출 데이터 표시');
        // 전체선택이 있으면 모든 데이터 표시 (기본 검색 필터만 적용)
      } else {
        // 특정 현장이 선택된 경우 해당 현장만 필터링
        console.log('특정 현장 선택됨 - 지출 필터링 적용');
        filtered = filtered.filter(cost => {
          const isSelected = selectedSites.some(selectedSite => {
            // 문자열인 경우 (현장명)
            if (typeof selectedSite === 'string') {
              return cost.site === selectedSite || cost.siteId === selectedSite;
            }
            // 객체인 경우 (현장 객체)
            if (selectedSite && typeof selectedSite === 'object') {
              return cost.site === selectedSite.name || cost.siteId === selectedSite.id;
            }
            return false;
          });
          
          console.log('지출 데이터 체크:', {
            costSite: cost.site,
            costSiteId: cost.siteId,
            selectedSites: selectedSites,
            isSelected: isSelected
          });
          return isSelected;
        });
        console.log('필터링된 지출 결과:', filtered.length, '개');
      }
    }

    // 클라이언트 사이드 정렬
    console.log('정렬 실행:', { sortField, sortDirection, filteredLength: filtered.length });
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'totalValue') {
        aValue = Number(a.totalValue) || 0;
        bValue = Number(b.totalValue) || 0;
      } else if (sortField === 'date') {
        aValue = new Date(a.date || 0);
        bValue = new Date(b.date || 0);
      } else if (sortField === 'itemType') {
        aValue = String(a.itemType || '').toLowerCase();
        bValue = String(b.itemType || '').toLowerCase();
      } else if (sortField === 'sequence') {
        // 차수 문자열에서 숫자만 추출 (예: "1차" -> 1, "2차" -> 2)
        const getSequenceNumber = (sequenceStr) => {
          if (!sequenceStr) return 0;
          const match = sequenceStr.toString().match(/(\d+)/);
          return match ? Number(match[1]) : 0;
        };
        aValue = getSequenceNumber(a.sequence);
        bValue = getSequenceNumber(b.sequence);
      } else {
        aValue = String(a[sortField] || '').toLowerCase();
        bValue = String(b[sortField] || '').toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    console.log('정렬 완료:', filtered.slice(0, 3).map(item => ({ itemType: item.itemType, sequence: item.sequence })));

    return filtered;
  }, [costs, search, sortField, sortDirection, viewType, selectedSites]);

  // 통계 데이터
  const stats = useMemo(() => {
    const filtered = filteredData || filteredAndSortedCosts;
    
    // 현장별 탭에서 현장이 선택되지 않은 경우 0으로 표시
    if (viewType === 'site' && (!selectedSites || selectedSites.length === 0)) {
      return { totalValue: 0 };
    }
    
    const totalValue = filtered.reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
    
    return { totalValue };
  }, [filteredData, filteredAndSortedCosts, selectedSites, viewType]);

  // 체크박스 관련 함수들
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      // 현재 페이지의 모든 항목 선택
      setSelectedItems(prev => [...new Set([...prev, ...currentData.map(item => item.id)])]);
    } else {
      // 현재 페이지의 모든 항목 선택 해제
      const currentPageIds = currentData.map(item => item.id);
      setSelectedItems(prev => prev.filter(id => !currentPageIds.includes(id)));
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
      setSnackbar({ open: true, message: '삭제할 항목을 선택해주세요.', severity: 'warning' });
      return;
    }

    if (window.confirm(`선택된 ${selectedItems.length}개 항목을 삭제하시겠습니까?`)) {
      try {
        // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
        setCosts(prev => prev.filter(cost => !selectedItems.includes(cost.id)));
        const selectedItemsCopy = [...selectedItems];
        setSelectedItems([]);
        
        const deletePromises = selectedItemsCopy.map(id => deleteDoc(doc(db, 'costs', id)));
        await Promise.all(deletePromises);
        
        setSnackbar({ open: true, message: `${selectedItemsCopy.length}개 항목이 삭제되었습니다.`, severity: 'success' });
      } catch (error) {
        console.error('일괄 삭제 실패:', error);
        // 실패 시 원래 상태로 복원
        setCosts(prev => [...prev]);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  const handleExcelDownload = () => {
    try {
      const data = filteredAndSortedCosts.map(cost => ({
        '현장명': cost.site || '-',
        '항목': cost.itemType || '-',
        '사용날짜': cost.date || '-',
        '금액': Number(cost.totalValue || 0).toLocaleString(),
        '결제': cost.paymentType || '-',
        '비고': cost.description || '-',
      }));

      // 컬럼 너비 설정 (한글 텍스트 고려)
      const columnWidths = [
        { wch: 20 }, // 현장명
        { wch: 12 }, // 항목
        { wch: 15 }, // 사용날짜
        { wch: 15 }, // 금액
        { wch: 12 }, // 결제
        { wch: 25 }, // 비고
      ];

      const result = exportToExcel(data, '지출현황', '지출현황', { columnWidths });
      
      if (result.success) {
        setSnackbar({ open: true, message: '엑셀 파일이 다운로드되었습니다.', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
      }
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({ open: true, message: '엑셀 다운로드에 실패했습니다.', severity: 'error' });
    }
  };

  const openDialog = (cost = null) => {
    if (cost) {
      setEditId(cost.id);
      setForm({
        site: cost.site || '',
        itemType: cost.itemType || '',
        date: cost.date || '',
        totalValue: cost.totalValue || '',
        paymentType: cost.paymentType || '',
        description: cost.description || '',
        sequence: cost.sequence || '',
      });
    } else {
      setEditId(null);
      
      // 현장이 하나만 선택되어 있으면 자동으로 설정
      let autoSelectedSite = '';
      if (selectedSites && selectedSites.length === 1) {
        const selectedSite = selectedSites[0];
        if (typeof selectedSite === 'string' && selectedSite !== '전체선택') {
          autoSelectedSite = selectedSite;
        } else if (selectedSite && typeof selectedSite === 'object' && selectedSite.name && selectedSite.name !== '전체선택') {
          autoSelectedSite = selectedSite.name;
        }
      }
      
      setForm({
        site: autoSelectedSite,
        itemType: '',
        date: '',
        totalValue: '',
        paymentType: '',
        description: '',
        sequence: '',
      });
    }
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditId(null);
    setForm({
      site: '',
      itemType: '',
      date: '',
      totalValue: '',
      paymentType: '',
      description: '',
      sequence: '',
    });
  };

  const handleSave = async () => {
    if (!form.site || !form.itemType) {
      setSnackbar({ open: true, message: '필수 항목을 입력해주세요.', severity: 'error' });
      return;
    }

    try {
      // 새 지출인 경우 차수 자동 설정
      let finalForm = { ...form };
      if (!editId) {
        // 차수가 비어있거나 1차인 경우에만 다시 계산
        if (!form.sequence || form.sequence === '1차') {
          console.log('저장 시 차수 계산:', { site: form.site, itemType: form.itemType, date: form.date });
          finalForm.sequence = calculateNextSequence(form.site, form.itemType, form.date);
          console.log('저장 시 설정된 차수:', finalForm.sequence);
        } else {
          console.log('저장 시 기존 차수 유지:', form.sequence);
        }
      }

      const costData = {
        ...finalForm,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      };

      if (editId) {
        await updateDoc(doc(db, 'costs', editId), costData);
        
        // 로컬 상태 즉시 업데이트
        setCosts(prev => prev.map(cost => 
          cost.id === editId ? { ...cost, ...costData, id: cost.id } : cost
        ));
        
        setSnackbar({ open: true, message: '지출 항목이 수정되었습니다.', severity: 'success' });
      } else {
        const docRef = await addDoc(collection(db, 'costs'), {
          ...costData,
          createdAt: serverTimestamp(),
          createdBy: currentUser.uid
        });
        
        // 로컬 상태 즉시 업데이트
        const newCost = { 
          id: docRef.id, 
          ...costData,
          createdAt: new Date(),
          createdBy: currentUser.uid
        };
        setCosts(prev => [newCost, ...prev]);
        
        setSnackbar({ open: true, message: '지출 항목이 추가되었습니다.', severity: 'success' });
      }

      // 지출 → 현장관리 연동 (에러 무시)
      try {
        await syncCostToSite(form.site);
      } catch (syncError) {
        console.error('현장관리 연동 실패:', syncError);
        // 연동 실패해도 지출 저장은 성공으로 처리
      }
      
      // 다이얼로그 즉시 닫기
      setDialogOpen(false);
      setEditId(null);
      setForm({
        site: '',
        itemType: '',
        date: '',
        totalValue: '',
        paymentType: '',
        description: '',
        sequence: '',
      });
    } catch (error) {
      console.error('지출 항목 저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        // 로컬 상태 즉시 업데이트 (낙관적 업데이트)
        setCosts(prev => prev.filter(cost => cost.id !== id));
        
        await deleteDoc(doc(db, 'costs', id));
        
        setSnackbar({ open: true, message: '삭제되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('지출 항목 삭제 실패:', error);
        // 실패 시 원래 상태로 복원
        setCosts(prev => [...prev]);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  // 차수 계산 함수 (새 지출 등록용)
  const calculateNextSequence = (siteName, itemType, selectedDate = null) => {
    if (!siteName || !itemType) return '';
    
    console.log('🔍 차수 계산 시작:', { siteName, itemType, selectedDate });
    
    // 해당 현장과 항목의 기존 지출 데이터 필터링
    const existingCosts = costs.filter(cost => 
      cost.site === siteName && cost.itemType === itemType
    );
    
    console.log('📊 기존 지출 데이터 개수:', existingCosts.length);
    console.log('📊 기존 지출 데이터:', existingCosts.map(c => ({ 
      id: c.id, 
      sequence: c.sequence, 
      date: c.date, 
      site: c.site, 
      itemType: c.itemType 
    })));
    
    if (existingCosts.length === 0) {
      console.log('✅ 기존 데이터 없음, 1차 반환');
      return '1차';
    }
    
    // 사용날짜 순으로 정렬
    const sortedCosts = existingCosts.sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateA - dateB;
    });
    
    console.log('📅 날짜순 정렬된 데이터:', sortedCosts.map(c => ({ 
      sequence: c.sequence, 
      date: c.date 
    })));
    
    // 선택된 날짜가 있으면 해당 날짜 기준으로 차수 계산
    if (selectedDate) {
      const selectedDateObj = new Date(selectedDate);
      console.log('📅 선택된 날짜:', selectedDateObj);
      
      // 선택된 날짜보다 이전인 항목들만 필터링
      const previousCosts = sortedCosts.filter(cost => {
        const costDate = new Date(cost.date || 0);
        const isBefore = costDate <= selectedDateObj;
        console.log(`📅 ${cost.sequence} (${cost.date}) <= ${selectedDate}? ${isBefore}`);
        return isBefore;
      });
      
      console.log('📊 선택 날짜 이전 데이터 개수:', previousCosts.length);
      console.log('📊 선택 날짜 이전 데이터:', previousCosts.map(c => ({ 
        sequence: c.sequence, 
        date: c.date 
      })));
      
      // 이전 항목들 중 가장 큰 차수 찾기
      let maxSequence = 0;
      previousCosts.forEach(cost => {
        const match = (cost.sequence || '').match(/(\d+)차/);
        if (match) {
          const sequenceNum = parseInt(match[1]);
          if (sequenceNum > maxSequence) {
            maxSequence = sequenceNum;
          }
        }
      });
      
      // 차수 패턴이 없으면 데이터 개수로 계산
      if (maxSequence === 0) {
        const nextSequence = `${previousCosts.length + 1}차`;
        console.log('🔢 차수 패턴 없음, 이전 데이터 개수 기반 계산:', `${previousCosts.length}개 → ${nextSequence}`);
        return nextSequence;
      }
      
      const nextSequence = `${maxSequence + 1}차`;
      console.log('🔢 최대 차수:', maxSequence, '다음 차수:', nextSequence);
      return nextSequence;
    }
    
    // 날짜가 선택되지 않은 경우 기존 로직
    const lastSequence = sortedCosts[sortedCosts.length - 1].sequence || '';
    console.log('🔍 마지막 항목의 sequence 값:', lastSequence);
    console.log('🔍 마지막 항목 전체 데이터:', sortedCosts[sortedCosts.length - 1]);
    
    const match = lastSequence.match(/(\d+)차/);
    
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      const nextSequence = `${nextNumber}차`;
      console.log('🔢 마지막 차수:', lastSequence, '다음 차수:', nextSequence);
      return nextSequence;
    }
    
    // 차수 패턴이 없으면 데이터 개수로 계산
    console.log('⚠️ 차수 패턴 없음, 데이터 개수로 계산');
    console.log('🔍 모든 항목의 sequence 값들:', sortedCosts.map(c => ({ 
      id: c.id, 
      sequence: c.sequence, 
      date: c.date 
    })));
    
    // 기존 데이터 개수 + 1로 차수 계산
    const nextSequence = `${sortedCosts.length + 1}차`;
    console.log('🔢 데이터 개수 기반 차수 계산:', `${sortedCosts.length}개 → ${nextSequence}`);
    return nextSequence;
  };

  // 차수 계산 함수 (테이블 표시용)
  const calculateSequence = (cost) => {
    if (!cost || !cost.site || !cost.itemType) return '1차';
    
    // 저장된 차수가 있으면 그대로 사용
    if (cost.sequence) {
      return cost.sequence;
    }
    
    // 차수가 없으면 사용날짜 순서로 계산
    const siteItemCosts = costs.filter(item => 
      item.site === cost.site && item.itemType === cost.itemType
    );
    
    const sortedList = siteItemCosts
      .filter(item => item.date) // 사용날짜가 있는 항목만
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });
    
    const currentIndex = sortedList.findIndex(item => 
      item.id === cost.id
    );
    
    if (currentIndex === -1) return '1차';
    return `${currentIndex + 1}차`;
  };

  // 차수 정리 함수 (기존 데이터의 차수를 올바르게 재정렬)
  const fixSequences = async () => {
    try {
      console.log('🔧 차수 정리 시작...');
      console.log('📊 전체 지출 데이터 개수:', costs.length);
      
      // 현장별, 항목별로 그룹화
      const groupedCosts = {};
      costs.forEach(cost => {
        const key = `${cost.site}_${cost.itemType}`;
        if (!groupedCosts[key]) {
          groupedCosts[key] = [];
        }
        groupedCosts[key].push(cost);
      });

      console.log('📊 그룹화된 데이터:', Object.keys(groupedCosts).map(key => ({
        group: key,
        count: groupedCosts[key].length
      })));

      // 각 그룹별로 차수 재정렬
      for (const [key, groupCosts] of Object.entries(groupedCosts)) {
        const [siteName, itemType] = key.split('_');
        console.log(`🔧 ${siteName} - ${itemType} 차수 정리 시작 (${groupCosts.length}개)`);
        
        // 사용날짜 순서로 정렬
        const sortedCosts = groupCosts
          .filter(cost => cost.date)
          .sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
          });

        console.log(`📅 ${siteName} - ${itemType} 날짜순 정렬 결과:`, sortedCosts.map(c => ({
          id: c.id,
          date: c.date,
          currentSequence: c.sequence
        })));

        // 차수 재할당
        for (let i = 0; i < sortedCosts.length; i++) {
          const cost = sortedCosts[i];
          const newSequence = `${i + 1}차`;
          
          if (cost.sequence !== newSequence) {
            console.log(`🔄 ${cost.id}: ${cost.sequence} → ${newSequence}`);
            await updateDoc(doc(db, 'costs', cost.id), {
              sequence: newSequence,
              updatedAt: serverTimestamp()
            });
            
            // 로컬 상태 업데이트
            setCosts(prev => prev.map(c => 
              c.id === cost.id 
                ? { ...c, sequence: newSequence, updatedAt: new Date() }
                : c
            ));
          } else {
            console.log(`✅ ${cost.id}: ${cost.sequence} (변경 없음)`);
          }
        }
      }

      setSnackbar({
        open: true,
        message: '차수가 성공적으로 정리되었습니다.',
        severity: 'success'
      });
      
      console.log('✅ 차수 정리 완료');
    } catch (error) {
      console.error('차수 정리 중 오류:', error);
      setSnackbar({
        open: true,
        message: '차수 정리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleSort = (field) => {
    console.log('정렬 클릭:', { field, currentSortField: sortField, currentDirection: sortDirection });
    if (sortField === field) {
      const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      console.log('정렬 방향 변경:', newDirection);
      setSortDirection(newDirection);
    } else {
      console.log('정렬 필드 변경:', field);
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const StatCard = ({ title, value, color }) => (
    <Grid xs={6} sm={6} md={3}>
      <Card sx={{ 
        p: 2, 
        height: '100%', 
        bgcolor: '#181f2e', 
        color: '#fff',
        border: '1px solid #232b3b'
      }}>
        <Typography 
          variant="subtitle2" 
          sx={{ 
            color: '#bbb', 
            mb: 1,
            fontSize: '0.9rem',
            lineHeight: 1.2
          }}
        >
          {title}
        </Typography>
        <Typography 
          variant="h6" 
          color={color || '#43e97b'} 
          sx={{ 
            fontWeight: 'bold',
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            lineHeight: 1.2
          }}
        >
          {Number(value || 0).toLocaleString()}{title === '건수' ? '건' : '원'}
        </Typography>
      </Card>
    </Grid>
  );

  // 필터 적용 (상위 컴포넌트에서 전달받은 filteredData 사용)
  const filtered = filteredData ? filteredAndSortedCosts : filteredAndSortedCosts;

  // 페이지네이션 계산
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filtered.slice(startIndex, endIndex);

  // 페이지 변경 함수
  const handlePageChange = (event, newPage) => {
    setCurrentPage(newPage);
  };

  // 페이지당 항목 수 변경 함수
  const handleItemsPerPageChange = (event) => {
    setItemsPerPage(parseInt(event.target.value));
    setCurrentPage(1); // 페이지당 항목 수가 변경되면 첫 페이지로 이동
  };

  return (
    <Box sx={{ 
      width: isMobile ? '100%' : 'calc(100% - 20px)', 
      maxWidth: isMobile ? '100%' : 'calc(100% - 20px)', 
      mx: isMobile ? 0 : '10px',
      p: 0,
      overflow: 'hidden',
      mt: isMobile ? '0px' : '90px'
    }}>

      
      {/* 통계 카드 + 새지출 버튼 한 줄 배치 (모바일만) */}
      {isMobile ? (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, position: 'relative' }}>
          <Grid container spacing={2} sx={{ flex: 1 }}>
            <StatCard title="총 지출액" value={stats.totalValue} color="#ef5350" />
            <StatCard title="건수" value={!selectedSites || selectedSites.length === 0 ? 0 : filtered.length} color="#a084e8" />
          </Grid>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<AddIcon />} 
            sx={{ ml: 2, height: 40, position: 'absolute', right: 4, top: 15 }} 
            onClick={() => openDialog()}>
            새 지출
          </Button>
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={2}>
            <StatCard title="총 지출액" value={stats.totalValue} color="#ef5350" />
            <StatCard title="건수" value={!selectedSites || selectedSites.length === 0 ? 0 : filtered.length} color="#a084e8" />
          </Grid>
        </Box>
      )}
      
      <Paper sx={{ 
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden', 
        mt: 3, 
        p: 0,
        boxSizing: 'border-box'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mb: 2, 
          position: 'relative',
          width: '100%',
          maxWidth: '100%',
          px: { xs: 1, md: 2 },
          boxSizing: 'border-box'
        }}>
          <Typography variant="h6" sx={{ 
            flex: 1, 
            display: isMobile ? 'none' : 'block',
          }}>지출현황</Typography>
          

          
          <Button variant="contained" color="success" startIcon={<AddIcon />} sx={{ 
            ml: 1, 
            display: isMobile ? 'none' : 'flex',
          }} onClick={() => openDialog()}>새 지출</Button>
          <Button variant="contained" color="primary" startIcon={<CloudDownloadIcon />} sx={{ 
            ml: 1, 
            display: isMobile ? 'none' : 'flex',
          }} onClick={handleExcelDownload}>엑셀 다운로드</Button>
          <Button variant="contained" color="primary" startIcon={<CloudUploadIcon />} sx={{ 
            ml: 1, 
            display: isMobile ? 'none' : 'flex',
          }}>엑셀 업로드</Button>

        </Box>
        <TableContainer sx={{ 
          width: '100%',
          maxWidth: '100%',
          overflowX: 'auto',
          px: { xs: 1, md: 2 },
          boxSizing: 'border-box',
          '& .MuiTable-root': {
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%'
          }
        }}>
          <Table size={isMobile ? 'small' : 'medium'} sx={{ 
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%',
            tableLayout: 'auto'
          }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#232b3b' }}>
                <TableCell padding="checkbox" sx={{ 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%'
                }}>
                  <Checkbox
                    indeterminate={currentData.some(item => selectedItems.includes(item.id)) && !currentData.every(item => selectedItems.includes(item.id))}
                    checked={currentData.length > 0 && currentData.every(item => selectedItems.includes(item.id))}
                    onChange={handleSelectAll}
                    sx={{ color: '#fff' }}
                  />
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  ml: isMobile ? '-8px' : 0,
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%'
                }}>현장명</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  ml: isMobile ? '-8px' : 0,
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2a3441' }
                }} onClick={() => handleSort('itemType')}>
                  항목
                  {sortField === 'itemType' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  fontSize: isMobile ? '0.7rem' : '0.95rem',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2a3441' }
                }} onClick={() => handleSort('sequence')}>
                  차수
                  {sortField === 'sequence' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  fontSize: isMobile ? '0.7rem' : '0.95rem'
                }}>사용날짜</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  ml: isMobile ? '-8px' : 0,
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: '#2a3441' }
                }} onClick={() => handleSort('totalValue')}>
                  금액
                  {sortField === 'totalValue' && (
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem' }}>
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%'
                }}>결제</TableCell>
                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: '350px',
                  minWidth: '300px',
                  maxWidth: '400px'
                }}>비고</TableCell>

                <TableCell sx={{ 
                  color: '#fff', 
                  fontWeight: 700, 
                  display: isMobile ? 'none' : 'table-cell',
                  width: 'auto',
                  minWidth: 0,
                  maxWidth: '100%'
                }}>관리</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {viewType === 'site' && (!selectedSites || selectedSites.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 8} sx={{ 
                    textAlign: 'center', 
                    color: '#bbb', 
                    py: 4, 
                    ml: isMobile ? '-8px' : 0,
                    width: 'auto',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}>
                    현장을 선택해주세요
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMobile ? 3 : 8} sx={{ 
                    textAlign: 'center', 
                    color: '#bbb', 
                    py: 4, 
                    ml: isMobile ? '-8px' : 0,
                    width: 'auto',
                    minWidth: 0,
                    maxWidth: '100%'
                  }}>
                    {viewType === 'site' && (!selectedSites || selectedSites.length === 0) 
                      ? '현장을 선택하거나 전체선택을 눌러주세요' 
                      : viewType === 'site' && selectedSites.length > 0
                      ? '선택된 현장의 지출 데이터가 없습니다'
                      : search ? '검색 결과가 없습니다.' : '지출 데이터가 없습니다.'}
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map(cost => (
                  <TableRow 
                    key={cost.id} 
                    sx={{ 
                      '&:hover': { bgcolor: '#232b3b' },
                      borderBottom: '1px solid #333'
                    }}
                  >
                    <TableCell padding="checkbox" sx={{ 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}>
                      <Checkbox
                        checked={selectedItems.includes(cost.id)}
                        onChange={() => handleSelectItem(cost.id)}
                        sx={{ color: '#90caf9' }}
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#fff',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}>{cost.site || '-'}</TableCell>
                    <TableCell sx={{
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}>
                      <Chip 
                        label={cost.itemType || '-'} 
                        size="small" 
                        sx={{ 
                          bgcolor: cost.itemType === '노무비' ? '#ffd600' : 
                                  cost.itemType === '경비' ? '#ef5350' : 
                                  cost.itemType === 'RnD' ? '#43e97b' : 
                                  cost.itemType === '지게차' ? '#ff9800' : 
                                  cost.itemType === '월세' ? '#ffffff' : '#a084e8',
                          color: cost.itemType === '월세' ? '#000' : '#000',
                          fontWeight: 700
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#fff', 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      fontSize: isMobile ? '0.7rem' : '0.95rem'
                    }}>{calculateSequence(cost)}</TableCell>
                    <TableCell sx={{ 
                      color: '#fff', 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      fontSize: isMobile ? '0.7rem' : '0.95rem'
                    }}>{cost.date || '-'}</TableCell>
                    <TableCell sx={{ 
                      color: '#ef5350', 
                      fontWeight: 700,
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}>
                      {Number(cost.totalValue || 0).toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}>
                      <Chip 
                        label={cost.paymentType || '-'} 
                        size="small" 
                        variant="outlined"
                        sx={{ 
                          borderColor: '#555',
                          color: '#fff'
                        }} 
                      />
                    </TableCell>
                    <TableCell sx={{ 
                      color: '#bbb', 
                      display: isMobile ? 'none' : 'table-cell',
                      width: '150px',
                      minWidth: '150px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>{cost.description || '-'}</TableCell>

                    <TableCell sx={{ 
                      display: isMobile ? 'none' : 'table-cell',
                      width: 'auto',
                      minWidth: 0,
                      maxWidth: '100%'
                    }}>
                      <IconButton 
                        size="small" 
                        onClick={() => openDialog(cost)}
                        sx={{ color: '#90caf9' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(cost.id)}
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
        
        {/* 페이지네이션 */}
        {filtered.length > 0 && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            p: 2, 
            borderTop: '1px solid #333' 
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                페이지당 항목 수:
              </Typography>
              <Select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                size="small"
                sx={{
                  color: '#fff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                  '& .MuiSvgIcon-root': { color: '#fff' },
                  minWidth: 70
                }}
              >
                <MenuItem value={5}>5</MenuItem>
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={20}>20</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                {startIndex + 1}-{Math.min(endIndex, filtered.length)} / {filtered.length}개
              </Typography>
            </Box>
            
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
              sx={{
                '& .MuiPaginationItem-root': {
                  color: '#fff',
                  borderColor: '#555',
                  '&:hover': {
                    backgroundColor: '#333'
                  },
                  '&.Mui-selected': {
                    backgroundColor: '#1976d2',
                    color: '#fff'
                  }
                }
              }}
            />
          </Box>
        )}
      </Paper>

      {/* 항목 추가/수정 다이얼로그 */}
      <Dialog 
        open={dialogOpen} 
        onClose={closeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#181f2e',
            color: '#fff',
            borderRadius: 4,
            minHeight: '480px'
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
          지출 항목
        </DialogTitle>
        <DialogContent sx={{ pt: 4, pb: 2, mt: 6 }}>
          <Box display="flex" flexDirection="column" alignItems="center" gap={3}>
            {/* 1줄: 현장명(검색/드롭다운) + 항목(드롭다운) */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <SearchableSiteSelect
                  sites={sites}
                  value={form.site ?? ''}
                  onChange={(newValue) => {
                    console.log('현장명 변경:', newValue);
                    setForm({ ...form, site: newValue });
                    // 현장명이 변경되면 차수 자동 업데이트
                    if (newValue && form.itemType && !editId) {
                      console.log('차수 계산 호출:', { site: newValue, itemType: form.itemType, date: form.date });
                      const nextSequence = calculateNextSequence(newValue, form.itemType, form.date);
                      console.log('계산된 차수:', nextSequence);
                      setForm(prev => ({ ...prev, sequence: nextSequence }));
                    }
                  }}
                  label="현장명"
                  placeholder="현장명을 검색하세요"
                  size="medium"
                  isMobile={isMobile}
                  sx={{ width: '100%' }}
                />
              </Box>
              <Autocomplete
                options={['노무비', '경비', 'RnD', '스카이', '장비', '자재비', '운반비', '임대료', '유류비', '식대', '지게차', '월세', '기타']}
                value={form.itemType ?? ''}
                onChange={(event, newValue) => {
                  console.log('항목 변경:', newValue);
                  setForm({ ...form, itemType: newValue || '' });
                  // 항목이 변경되면 차수 자동 업데이트
                  if (newValue && form.site && !editId) {
                    console.log('차수 계산 호출:', { site: form.site, itemType: newValue, date: form.date });
                    const nextSequence = calculateNextSequence(form.site, newValue, form.date);
                    console.log('계산된 차수:', nextSequence);
                    setForm(prev => ({ ...prev, sequence: nextSequence }));
                  }
                }}
                onInputChange={(event, newInputValue) => setForm({ ...form, itemType: newInputValue })}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="항목"
                    placeholder="선택하거나 직접 입력"
                    size="medium"
                    sx={{
                      flex: 1,
                      minWidth: 140,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                    }}
                  />
                )}
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-option': { color: '#fff' }
                }}
              />
            </Box>
            {/* 2줄: 차수 + 사용날짜 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <TextField
                label="차수"
                value={form.sequence ?? ''}
                onChange={e => setForm({ ...form, sequence: e.target.value })}
                placeholder="자동으로 설정됩니다"
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
              />
              <TextField
                label="사용날짜"
                type="date"
                value={form.date ?? ''}
                onChange={e => {
                  console.log('날짜 변경:', e.target.value);
                  setForm({ ...form, date: e.target.value });
                  // 날짜가 변경되면 차수 자동 업데이트
                  if (e.target.value && form.site && form.itemType && !editId) {
                    console.log('차수 계산 호출:', { site: form.site, itemType: form.itemType, date: e.target.value });
                    const nextSequence = calculateNextSequence(form.site, form.itemType, e.target.value);
                    console.log('계산된 차수:', nextSequence);
                    setForm(prev => ({ ...prev, sequence: nextSequence }));
                  }
                }}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
            {/* 3줄: 결제방법 + 금액 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <Autocomplete
                options={['카드', '세금계산서', '영수증', '노무자료', '기타']}
                value={form.paymentType ?? ''}
                onChange={(event, newValue) => setForm({ ...form, paymentType: newValue || '' })}
                onInputChange={(event, newInputValue) => setForm({ ...form, paymentType: newInputValue })}
                freeSolo
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="결제방법"
                    placeholder="선택하거나 직접 입력"
                    size="medium"
                    sx={{
                      flex: 1,
                      minWidth: 140,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 }
                    }}
                  />
                )}
                sx={{
                  flex: 1,
                  minWidth: 140,
                  '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-clearIndicator': { color: '#fff' },
                  '& .MuiAutocomplete-option': { color: '#fff' }
                }}
              />
              <TextField
                label="금액"
                type="number"
                value={form.totalValue ?? ''}
                onChange={e => setForm({ ...form, totalValue: e.target.value })}
                size="medium"
                sx={{
                  flex: 1,
                  minWidth: 140,
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
                value={form.description ?? ''}
                onChange={e => setForm({ ...form, description: e.target.value })}
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
            onClick={closeDialog}
            sx={{ color: '#bbb', fontSize: '1rem', px: 3, py: 1 }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSave} 
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Cost; 