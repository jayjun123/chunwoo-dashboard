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
import { getClaimStats, getClaimsByMonth } from '../api/claims';
import { db } from '../firebase';
import { devLog, devError, useCleanup } from '../utils/performanceUtils';
import * as XLSX from 'xlsx';
import { addMonths, subMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatContractAmount, formatGisungAmount, formatAdvanceAmount } from '../utils/formatUtils';

const GisungStatusPage = ({ 
  viewType: initialViewType = 'month', 
  currentMonth: initialCurrentMonth = new Date(), 
  monthText: initialMonthText, 
  selectedSites = [], 
  filteredData = [] 
}) => {
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
  const [claimStats, setClaimStats] = useState({ totalAmount: 0 });
  const [claimsBySite, setClaimsBySite] = useState({});
  
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
  }, [viewType, currentMonth]); // selectedSites 제거

  // selectedSites가 변경될 때만 기성 데이터 다시 로드
  useEffect(() => {
    if (viewType === 'site') {
      fetchGisung();
    }
  }, [selectedSites, viewType]);

  // 청구예정 데이터 가져오기
  useEffect(() => {
    const fetchClaimData = async () => {
      try {
        const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        
        // 통계 데이터 가져오기
        const stats = await getClaimStats(currentMonthStr);
        setClaimStats(stats);
        
        // 현장별 청구예정 데이터 가져오기
        const claims = await getClaimsByMonth(currentMonthStr);
        const claimsMap = {};
        claims.forEach(claim => {
          claimsMap[claim.siteName] = claim.claimAmount || 0;
        });
        setClaimsBySite(claimsMap);
        
        devLog('청구예정 데이터 로드:', { stats, claimsMap });
      } catch (error) {
        devError('청구예정 데이터 로드 오류:', error);
        setClaimStats({ totalAmount: 0 });
        setClaimsBySite({});
      }
    };
    
    fetchClaimData();
  }, [currentMonth]);

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
      devLog('현장 데이터 로드 시작');
      const snapshot = await getDocs(collection(db, 'sites'));
      const sitesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      devLog('로드된 현장 데이터:', sitesData);
      console.log('현장 데이터 상세:', sitesData.map(site => ({
        name: site.name,
        id: site.id,
        contractAmount: site.contractAmount,
        advance: site.advance
      })));
      setSites(sitesData);
    } catch (e) {
      devError('현장 데이터 로드 오류:', e);
      console.error('현장 데이터를 불러오는데 실패했습니다:', e.message);
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
      
      // currentMonth가 유효하지 않은 경우 기본값 사용
      if (!currentMonth || isNaN(currentMonth.getTime())) {
        devLog('currentMonth가 유효하지 않음, 기본값 사용');
        setCurrentMonth(new Date());
        return;
      }
      
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
      // 오류 발생 시 사용자에게 알림 (모바일에서는 콘솔만)
      console.error('기성 데이터를 불러오는데 실패했습니다:', e.message);
    }
  }, [viewType, currentMonth]);



  // 검색 및 정렬된 데이터
  const filteredAndSortedGisung = useMemo(() => {
    let filtered = gisungList.filter(gisung =>
      gisung.name?.toLowerCase().includes(search.toLowerCase()) ||
      gisung.gisungMonth?.toLowerCase().includes(search.toLowerCase()) ||
      gisung.note?.toLowerCase().includes(search.toLowerCase())
    );

    // 현장별 보기에서 선택된 현장만 필터링
    if (viewType === 'site' && selectedSites.length > 0) {
      filtered = filtered.filter(gisung => {
        const isSelected = selectedSites.includes(gisung.siteId) || selectedSites.includes(gisung.name);
        return isSelected;
      });
    }

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
  }, [gisungList, search, sortField, sortDirection, viewType, selectedSites]);

  // 통계 데이터
  const stats = useMemo(() => {
    try {
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
            
            // startDate가 유효하지 않은 경우 건너뛰기
            if (!startDate || isNaN(startDate.getTime())) {
              return sum;
            }
            
            const siteStartMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            
            // 해당 월에 시작된 현장만 포함
            if (siteStartMonth <= currentMonthStr) {
              return sum + (Number(site.contractAmount) || 0);
            }
            return sum;
          } catch (error) {
            devError('현장 시작일 파싱 오류:', error);
            return sum;
          }
        }, 0);
        
        totalAdvance = sites.reduce((sum, site) => {
          if (!site.startDate) return sum;
          
          try {
            const startDate = typeof site.startDate === 'string' 
              ? new Date(site.startDate) 
              : site.startDate.toDate ? site.startDate.toDate() : site.startDate;
            
            if (!startDate || isNaN(startDate.getTime())) {
              return sum;
            }
            
            const siteStartMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
            
            if (siteStartMonth <= currentMonthStr) {
              return sum + (Number(site.advance) || 0);
            }
            return sum;
          } catch (error) {
            devError('현장 시작일 파싱 오류:', error);
            return sum;
          }
        }, 0);
      } else {
        // 현장별: 선택된 현장들의 계약금액 합산
        // selectedSites가 비어있으면 0원, 아니면 선택된 현장만 포함
        if (selectedSites.length === 0) {
          totalContractAmount = 0;
          totalAdvance = 0;
          console.log('현장별 보기: 선택된 현장 없음 - 계약금액 0원');
        } else {
          console.log('현장별 보기 통계 계산:', {
            selectedSites,
            sitesCount: sites.length,
            sites: sites.map(s => ({ name: s.name, id: s.id, contractAmount: s.contractAmount }))
          });
          
          totalContractAmount = sites.reduce((sum, site) => {
            // 현장 ID 또는 현장명으로 비교
            const isSelected = selectedSites.includes(site.id) || selectedSites.includes(site.name);
            console.log(`현장 ${site.name} (${site.id}) 체크:`, {
              siteName: site.name,
              siteId: site.id,
              selectedSites,
              isSelected,
              contractAmount: site.contractAmount
            });
            
            if (!isSelected) {
              console.log(`현장 ${site.name} (${site.id}) 제외됨`);
              return sum;
            }
            const contractAmount = Number(site.contractAmount) || 0;
            console.log(`현장 ${site.name} (${site.id}) 포함됨 - 계약금액: ${contractAmount}`);
            return sum + contractAmount;
          }, 0);
          
          totalAdvance = sites.reduce((sum, site) => {
            // 현장 ID 또는 현장명으로 비교
            const isSelected = selectedSites.includes(site.id) || selectedSites.includes(site.name);
            if (!isSelected) {
              return sum;
            }
            return sum + (Number(site.advance) || 0);
          }, 0);
          
          console.log('현장별 보기 최종 결과:', {
            totalContractAmount,
            totalAdvance,
            selectedSites
          });
        }
      }
      
      // 기성 데이터 통계
      console.log('기성 데이터 통계 계산:', {
        viewType,
        selectedSites,
        gisungDataCount: filteredAndSortedGisung.length
      });
      
      const gisungStats = filteredAndSortedGisung.reduce((acc, gisung) => {
        // 현장별 보기에서 선택된 현장만 포함
        if (viewType === 'site') {
          if (selectedSites.length === 0) {
            // 선택된 현장이 없으면 기성 데이터도 포함하지 않음
            return acc;
          }
          // 현장 ID 또는 현장명으로 비교
          const isSelected = selectedSites.includes(gisung.siteId) || selectedSites.includes(gisung.name);
          if (!isSelected) {
            console.log(`기성 데이터 ${gisung.name} (${gisung.siteId}) 제외됨`);
            return acc;
          }
          console.log(`기성 데이터 ${gisung.name} (${gisung.siteId}) 포함됨 - 기성금액: ${gisung.gisungAmount}`);
        }
        acc.totalGisungAmount += Number(gisung.gisungAmount) || 0;
        acc.totalPrevGisung += Number(gisung.prevGisung) || 0;
        acc.totalCurrentGisung += Number(gisung.currentGisung) || 0;
        return acc;
      }, { totalGisungAmount: 0, totalPrevGisung: 0, totalCurrentGisung: 0 });
      
      const result = {
        totalContractAmount,
        totalAdvance,
        totalGisungAmount: gisungStats.totalGisungAmount,
        totalPrevGisung: gisungStats.totalPrevGisung,
        totalCurrentGisung: gisungStats.totalCurrentGisung,
        totalClaimAmount: claimStats.totalAmount || 0
      };
      
      console.log('최종 통계 결과:', result);
      
      return result;
    } catch (error) {
      devError('통계 계산 오류:', error);
      return {
        totalContractAmount: 0,
        totalAdvance: 0,
        totalGisungAmount: 0,
        totalPrevGisung: 0,
        totalCurrentGisung: 0,
        totalClaimAmount: 0
      };
    }
  }, [currentMonth, viewType, sites, filteredAndSortedGisung, claimStats.totalAmount, selectedSites]);

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
  // 차수 계산 함수
  const calculateSequence = (siteName, currentItem = null) => {
    const siteGisungList = gisungList.filter(item => item.name === siteName);
    
    if (siteGisungList.length === 0) return '1차';
    
    // 같은 현장의 기성 데이터를 등록 순서대로 정렬
    const sortedList = siteGisungList.sort((a, b) => {
      const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0);
      const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0);
      return dateA - dateB;
    });
    
    // 현재 항목의 인덱스 찾기
    const currentIndex = sortedList.findIndex(item => 
      currentItem && item.id === currentItem.id
    );
    
    if (currentIndex === -1) {
      // 현재 항목을 찾을 수 없는 경우, 전체 리스트에서 찾기
      const allSortedList = gisungList.filter(item => item.name === siteName)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt?.toDate?.() || a.createdAt || 0);
          const dateB = new Date(b.createdAt?.toDate?.() || b.createdAt || 0);
          return dateA - dateB;
        });
      
      const allIndex = allSortedList.findIndex(item => 
        currentItem && item.id === currentItem.id
      );
      
      if (allIndex === -1) return '1차';
      return `${allIndex + 1}차`;
    }
    
    return `${currentIndex + 1}차`;
  };

  // 기성율 계산 함수 (총 기성금액 / 총 계약금액 * 100)
  const calculateProgressRate = (siteName) => {
    const siteGisungList = gisungList.filter(item => item.name === siteName);
    const siteData = sites.find(site => site.name === siteName);
    
    if (!siteData || !siteData.contractAmount) return 0;
    
    const totalGisungAmount = siteGisungList.reduce((sum, item) => sum + Number(item.gisungAmount || 0), 0);
    const contractAmount = Number(siteData.contractAmount);
    
    if (contractAmount === 0) return 0;
    
    return Math.round((totalGisungAmount / contractAmount) * 100);
  };

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
  
  // 선급금 상세 모달 상태
  const [advanceDetailModal, setAdvanceDetailModal] = useState(false);
  const [advanceDetailData, setAdvanceDetailData] = useState([]);
  
  // 청구예정 상세 모달 상태
  const [claimDetailModal, setClaimDetailModal] = useState(false);
  const [claimDetailData, setClaimDetailData] = useState([]);
  
  // 기성금액 상세 모달 상태
  const [gisungDetailModal, setGisungDetailModal] = useState(false);
  const [gisungDetailData, setGisungDetailData] = useState([]);

  // 계약금액 상세 데이터 계산
  const getContractDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    return sites.filter(site => {
      if (!site.startDate) return false;
      
      // 계약금액이 0원 이상인 현장만 포함
      const contractAmount = Number(site.contractAmount || 0);
      if (contractAmount <= 0) return false;
      
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

  // 선급금 상세 데이터 계산
  const getAdvanceDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    return sites.filter(site => {
      if (!site.startDate) return false;
      
      // 선급금이 1원 이상인 현장만 포함
      const advanceAmount = Number(site.advance || 0);
      if (advanceAmount <= 0) return false;
      
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
      advance: Number(site.advance || 0),
      startDate: site.startDate,
      endDate: site.endDate,
      status: site.status || '진행중'
    }));
  }, [sites, currentMonth, viewType]);

  // 청구예정 상세 데이터 계산
  const getClaimDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    console.log('🔥 청구예정 상세 데이터 계산:', {
      currentMonthStr,
      gisungListLength: gisungList.length,
      gisungList: gisungList
    });
    
    const filteredData = gisungList.filter(item => {
      if (!item.gisungMonth) return false;
      
      // 기성금액이 0원 이상인 항목만 포함
      const gisungAmount = Number(item.gisungAmount || 0);
      if (gisungAmount <= 0) return false;
      
      const isMatch = item.gisungMonth === currentMonthStr;
      console.log('🔥 청구예정 필터링:', {
        name: item.name,
        gisungMonth: item.gisungMonth,
        gisungAmount: item.gisungAmount,
        isMatch
      });
      return isMatch;
    });
    
    console.log('🔥 필터링된 청구예정 데이터:', filteredData);
    
    return filteredData.map(item => ({
      name: item.name,
      claimAmount: Number(item.gisungAmount || 0),
      gisungMonth: item.gisungMonth,
      paymentMethod: item.paymentMethod || '-',
      status: item.paymentStatus || '미결제'
    }));
  }, [gisungList, currentMonth, viewType]);

  // 기성금액 상세 데이터 계산
  const getGisungDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    return gisungList.filter(item => {
      if (!item.gisungMonth) return false;
      
      // 기성금액이 0원 이상인 항목만 포함
      const gisungAmount = Number(item.gisungAmount || 0);
      if (gisungAmount <= 0) return false;
      
      return item.gisungMonth === currentMonthStr;
    }).map(item => ({
      name: item.name,
      gisungAmount: Number(item.gisungAmount || 0),
      gisungMonth: item.gisungMonth,
      paymentMethod: item.paymentMethod || '-',
      status: item.paymentStatus || '미결제'
    }));
  }, [gisungList, currentMonth, viewType]);

  // 계약금액 카드 클릭 핸들러
  const handleContractCardClick = () => {
    if (viewType === 'month') {
      const detailData = getContractDetailData();
      setContractDetailData(detailData);
      setContractDetailModal(true);
    }
  };

  // 선급금 카드 클릭 핸들러
  const handleAdvanceCardClick = () => {
    if (viewType === 'month') {
      const detailData = getAdvanceDetailData();
      setAdvanceDetailData(detailData);
      setAdvanceDetailModal(true);
    }
  };

  // 청구예정 카드 클릭 핸들러
  const handleClaimCardClick = () => {
    if (viewType === 'month') {
      const detailData = getClaimDetailData();
      setClaimDetailData(detailData);
      setClaimDetailModal(true);
    }
  };

  // 기성금액 카드 클릭 핸들러
  const handleGisungCardClick = () => {
    if (viewType === 'month') {
      const detailData = getGisungDetailData();
      setGisungDetailData(detailData);
      setGisungDetailModal(true);
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
          {value}
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
      p: isMobile ? 1 : 2,
      mt: isMobile ? '10px' : 0
    }}>
      {/* 통계 카드 */}
      <Grid container spacing={isMobile ? 1 : 2} sx={{ 
        mb: 3,
        mt: isMobile ? '20px' : 0,
        justifyContent: isMobile ? 'center' : 'flex-start'
      }}>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="계약금액"
            value={formatContractAmount(stats.totalContractAmount)}
            color="#3b82f6"
            onClick={handleContractCardClick}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="선급금"
            value={formatAdvanceAmount(stats.totalAdvance)}
            color="#f59e0b"
            onClick={handleAdvanceCardClick}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="청구예정"
            value={formatGisungAmount(stats.totalClaimAmount)}
            color="#ef4444"
            onClick={handleClaimCardClick}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <StatCard
            title="기성금액"
            value={formatGisungAmount(stats.totalGisungAmount)}
            color="#10b981"
            onClick={handleGisungCardClick}
          />
        </Grid>
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
        
        {/* 검색 */}
        <TextField
          placeholder="현장명, 기성월, 비고 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ 
            minWidth: isMobile ? '100%' : '300px',
            '& .MuiOutlinedInput-root': {
              bgcolor: '#232b3b',
              color: '#fff',
              '& fieldset': {
                borderColor: '#444',
              },
              '&:hover fieldset': {
                borderColor: '#666',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#3b82f6',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#ccc',
            },
            '& .MuiInputBase-input': {
              color: '#fff',
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#ccc' }} />
              </InputAdornment>
            ),
          }}
        />
        
        {/* 버튼들 */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' },
              fontSize: isMobile ? '0.8rem' : '0.875rem',
              px: isMobile ? 1 : 2
            }}
          >
            새 기성
          </Button>
          
          {!isMobile && (
            <Button
              variant="outlined"
              startIcon={<CloudDownloadIcon />}
              onClick={handleExcelDownload}
              sx={{
                borderColor: '#666',
                color: '#fff',
                '&:hover': { borderColor: '#888' },
                fontSize: '0.875rem'
              }}
            >
              엑셀 다운로드
            </Button>
          )}
          
          {selectedItems.length > 0 && (
            <Button
              variant="outlined"
              color="error"
              onClick={handleBulkDelete}
              sx={{
                borderColor: '#ef4444',
                color: '#ef4444',
                '&:hover': { borderColor: '#dc2626' },
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            >
              선택 삭제 ({selectedItems.length})
            </Button>
          )}
        </Box>
      </Box>

      {/* 데이터 테이블 */}
      <Paper sx={{ bgcolor: '#232b3b', color: '#fff' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selectedItems.length === filteredAndSortedGisung.length && filteredAndSortedGisung.length > 0}
                    indeterminate={selectedItems.length > 0 && selectedItems.length < filteredAndSortedGisung.length}
                    onChange={handleSelectAll}
                    sx={{ color: '#666', '&.Mui-checked': { color: '#3b82f6' } }}
                  />
                </TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>현장명</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>계약금액</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>선급금</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>이전 기성</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>기성월</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>기성금액</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>현재 기성</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>비고</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedGisung.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} sx={{ textAlign: 'center', color: '#ccc', py: 4 }}>
                    데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedGisung.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedItems.includes(row.id)}
                        onChange={() => handleSelectItem(row.id)}
                        sx={{ color: '#666', '&.Mui-checked': { color: '#3b82f6' } }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#fff' }}>{row.name || '-'}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{formatContractAmount(row.contractAmount)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{formatAdvanceAmount(row.advance)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{formatGisungAmount(row.prevGisung)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{row.gisungMonth || '-'}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{formatGisungAmount(row.gisungAmount)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{formatGisungAmount(row.currentGisung)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{row.note || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleOpen(row)}
                        size="small"
                        sx={{ color: '#3b82f6' }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(row)}
                        size="small"
                        sx={{ color: '#ef4444' }}
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

      {/* 다이얼로그 */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #444' }}>
          {selected ? '기성 수정' : '새 기성 추가'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 2, mt: 2 }}>
            <TextField
              label="현장명"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="계약금액"
              value={formData.contractAmount}
              onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
              fullWidth
              type="number"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="선급금"
              value={formData.advance}
              onChange={(e) => setFormData({ ...formData, advance: e.target.value })}
              fullWidth
              type="number"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="이전 기성"
              value={formData.prevGisung}
              onChange={(e) => setFormData({ ...formData, prevGisung: e.target.value })}
              fullWidth
              type="number"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="기성월"
              value={formData.gisungMonth}
              onChange={(e) => setFormData({ ...formData, gisungMonth: e.target.value })}
              fullWidth
              type="month"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="기성금액"
              value={formData.gisungAmount}
              onChange={(e) => setFormData({ ...formData, gisungAmount: e.target.value })}
              fullWidth
              type="number"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="현재 기성"
              value={formData.currentGisung}
              onChange={(e) => setFormData({ ...formData, currentGisung: e.target.value })}
              fullWidth
              type="number"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
            <TextField
              label="비고"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              fullWidth
              multiline
              rows={2}
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', borderTop: '1px solid #444' }}>
          <Button onClick={handleClose} sx={{ color: '#ccc' }}>
            취소
          </Button>
          <Button onClick={handleSubmit} variant="contained" sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            {selected ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GisungStatusPage; 