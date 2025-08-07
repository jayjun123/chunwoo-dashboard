import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  useTheme,
  Snackbar,
  Alert,
  CardContent,
  Autocomplete,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Sort as SortIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp, orderBy } from 'firebase/firestore';
import { getClaimStats, getClaimsByMonth } from '../api/claims';
import { db, storage } from '../firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { devLog, devError, useCleanup } from '../utils/performanceUtils';
import * as XLSX from 'xlsx';
import { addMonths, subMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatContractAmount, formatGisungAmount, formatAdvanceAmount } from '../utils/formatUtils';
import { downloadGisungExcel, parseGisungExcel, generateIntegratedGisungExcel, generateGisungExcel } from '../utils/excelUtils';
import { downloadTemplateBasedGisungExcel, createFormulaBasedGisungExcel } from '../utils/gisungTemplateUtils';
import SearchableSiteSelect from './common/SearchableSiteSelect';
import { migrateSiteItems } from '../scripts/migrateSiteItems';
import { migrateSiteCodes } from '../scripts/migrateSiteCodes';

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
  
  // 상태 관리
  const [gisungList, setGisungList] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('gisungMonth');
  const [sortDirection, setSortDirection] = useState('desc');
  const [selectedItems, setSelectedItems] = useState([]);
  const [claimStats, setClaimStats] = useState({ totalAmount: 0 });
  const [claimsBySite, setClaimsBySite] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // 네비게이션 상태

  // props를 내부 상태로 관리
  const [currentMonth, setCurrentMonth] = useState(initialCurrentMonth || new Date());
  const [viewType, setViewType] = useState(initialViewType || 'month');
  
  // props 변경 시 내부 상태 업데이트 (안정화)
  useEffect(() => {
    if (initialCurrentMonth && initialCurrentMonth.getTime() !== currentMonth.getTime()) {
      setCurrentMonth(initialCurrentMonth);
    }
  }, [initialCurrentMonth]);
  
  useEffect(() => {
    if (initialViewType && initialViewType !== viewType) {
      setViewType(initialViewType);
    }
  }, [initialViewType]);
  
  // 현장 선택 상태 (내부 상태로 관리) - 안정적인 참조를 위해 useRef 사용
  const [selectedSitesInternal, setSelectedSitesInternal] = useState([]);
  const selectedSitesInternalStableRef = useRef([]);
  

  const stableCurrentMonth = useMemo(() => {
    if (!currentMonth || !currentMonth.getTime || isNaN(currentMonth.getTime())) {
      return new Date();
    }
    return currentMonth;
  }, [currentMonth]);
  
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    advance: '',
    prevGisung: '',
    gisungMonth: '',
    gisungAmount: '',
    currentGisung: '',
    note: '',
    sequence: '', // 차수 필드 추가
  });

  // monthText 계산
  const monthText = useMemo(() => {
    if (!stableCurrentMonth || isNaN(stableCurrentMonth.getTime())) {
      return format(new Date(), 'yyyy년 MM월', { locale: ko });
    }
    return format(stableCurrentMonth, 'yyyy년 MM월', { locale: ko });
  }, [stableCurrentMonth]);

  // 메인 데이터 로딩 함수 (ref 기반)
  const loadData = useCallback(async () => {
    try {
      // 사이트 데이터 로드
      const sitesSnapshot = await getDocs(collection(db, 'sites'));
      const sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSites(sitesData);
      
      // 기성 데이터 로드
      const gisungCollection = collection(db, 'gisung');
      const currentViewType = viewTypeRef.current;
      const currentStableMonth = currentMonthRef.current;
      
      if (currentViewType === 'month') {
        const currentYear = currentStableMonth.getFullYear();
        const currentMonthNum = currentStableMonth.getMonth() + 1;
        const monthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`;
        const q = query(gisungCollection, where('gisungMonth', '==', monthStr));
        const gisungSnapshot = await getDocs(q);
        const gisungData = gisungSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGisungList(gisungData);
      } else if (currentViewType === 'site') {
        console.log('🔍 현장별 탭 데이터 로딩 시작');
        const currentSelectedSites = selectedSitesRef.current && selectedSitesRef.current.length > 0 
          ? selectedSitesRef.current 
          : selectedSitesInternalRef.current;
          
        console.log('📊 선택된 현장들:', currentSelectedSites);
          
        if (!currentSelectedSites || currentSelectedSites.length === 0) {
          console.log('⚠️ 선택된 현장 없음, 빈 배열 설정');
          setGisungList([]);
        } else {
          const isAllSelected = currentSelectedSites.some(site => 
            (typeof site === 'string' && (site === '전체선택' || site === 'all')) ||
            (site && typeof site === 'object' && (site.name === '전체선택' || site.id === 'all'))
          );
          
          console.log('📊 전체선택 여부:', isAllSelected);
          
          if (isAllSelected) {
            console.log('📊 전체 현장 데이터 로딩');
            const q = query(gisungCollection);
            const gisungSnapshot = await getDocs(q);
            const gisungData = gisungSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('✅ 전체 현장 데이터 로딩 완료:', gisungData.length, '개');
            setGisungList(gisungData);
          } else {
            const selectedSiteNames = currentSelectedSites.map(site => 
              typeof site === 'string' ? site : site.name
            );
            console.log('📊 선택된 현장명들:', selectedSiteNames);
            const q = query(gisungCollection, where('name', 'in', selectedSiteNames));
            const gisungSnapshot = await getDocs(q);
            const gisungData = gisungSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log('✅ 선택된 현장 데이터 로딩 완료:', gisungData.length, '개');
            setGisungList(gisungData);
          }
        }
      }
      // 청구 데이터 로드
      const currentMonthStr = `${currentStableMonth.getFullYear()}-${String(currentStableMonth.getMonth() + 1).padStart(2, '0')}`;
      const stats = await getClaimStats(currentMonthStr);
      setClaimStats(stats);
      const claims = await getClaimsByMonth(currentMonthStr);
      const claimsMap = {};
      claims.forEach(claim => {
        claimsMap[claim.siteName] = claim.claimAmount || 0;
      });
      setClaimsBySite(claimsMap);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setSites([]);
      setGisungList([]);
      setClaimStats({ totalAmount: 0 });
      setClaimsBySite({});
    }
  }, []);

  // 안정적인 참조를 위한 useRef 사용
  const selectedSitesRef = useRef(selectedSites);
  const selectedSitesInternalRef = useRef([]);
  const viewTypeRef = useRef(viewType);
  const currentMonthRef = useRef(currentMonth);

  // ref 업데이트 (의존성 배열 추가)
  useEffect(() => {
    selectedSitesRef.current = selectedSites;
  }, [selectedSites]);

  useEffect(() => {
    selectedSitesInternalRef.current = selectedSitesInternal;
    selectedSitesInternalStableRef.current = selectedSitesInternal;
  }, [selectedSitesInternal]);

  useEffect(() => {
    viewTypeRef.current = viewType;
  }, [viewType]);

  useEffect(() => {
    currentMonthRef.current = currentMonth;
  }, [currentMonth]);

  // 단일 useEffect로 통합 (안정적인 의존성만 사용)
  useEffect(() => {
    console.log('🔄 데이터 로딩 트리거:', { viewType, stableCurrentMonth: stableCurrentMonth.toISOString() });
    
    // 현장별 탭에서 선택된 현장이 없으면 데이터 로딩 건너뛰기
    if (viewType === 'site') {
      const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
      if (!currentSelectedSites || currentSelectedSites.length === 0) {
        console.log('⚠️ 현장별 탭에서 선택된 현장 없음, 데이터 로딩 건너뛰기');
        return;
      }
    }
    
    loadData();
  }, [viewType, stableCurrentMonth]);

  // 선택된 현장 변경 시 데이터 로딩 (별도 useEffect)
  useEffect(() => {
    if (viewType === 'site') {
      console.log('🔄 선택된 현장 변경으로 인한 데이터 로딩');
      loadData();
    }
  }, [loadData]);





  // 검색 및 정렬된 데이터 (서버에서 이미 필터링된 데이터에 검색만 적용)
  const filteredAndSortedGisung = useMemo(() => {
    console.log('검색 필터링 시작 - 서버에서 필터링된 데이터:', gisungList.length, '개');
    console.log('검색어:', search);
    
    let filtered = gisungList.filter(gisung =>
      gisung.name?.toLowerCase().includes(search.toLowerCase()) ||
      gisung.gisungMonth?.toLowerCase().includes(search.toLowerCase()) ||
      gisung.note?.toLowerCase().includes(search.toLowerCase())
    );

    console.log('검색 필터링 후:', filtered.length, '개');

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
  }, [gisungList, search, sortField, sortDirection, viewType]);

  // 통계 데이터
  const stats = useMemo(() => {
    try {
      // 기본값 설정
      const defaultStats = {
        totalContractAmount: 0,
        totalAdvance: 0,
        totalGisungAmount: 0,
        totalPrevGisung: 0,
        totalCurrentGisung: 0,
        totalCumulativeGisung: 0,
        totalClaimAmount: claimStats.totalAmount || 0
      };

      // 현장별 뷰에서 현장이 선택되지 않은 경우
      const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
      if (viewType === 'site' && (!currentSelectedSites || currentSelectedSites.length === 0)) {
        console.log('현장 미선택 - 스마트카드 0으로 설정');
        return defaultStats;
      }

      // 전체선택 여부 확인
      const isAllSelected = currentSelectedSites.some(site => {
        if (typeof site === 'string') {
          return site === '전체선택' || site === 'all';
        }
        if (site && typeof site === 'object') {
          return site.name === '전체선택' || site.id === 'all';
        }
        return false;
      });

      // 계약금액과 선급금 계산
      let totalContractAmount = 0;
      let totalAdvance = 0;

      if (viewType === 'month') {
        // 월별 뷰: 해당 월에 공사기간이 포함된 현장들 계산
        const currentYear = stableCurrentMonth.getFullYear();
        const currentMonthNum = stableCurrentMonth.getMonth() + 1;
        
        sites.forEach(site => {
          if (!site.startDate || !site.endDate) return;
          
          try {
            const startDate = typeof site.startDate === 'string' 
              ? new Date(site.startDate) 
              : site.startDate.toDate ? site.startDate.toDate() : site.startDate;
            const endDate = typeof site.endDate === 'string' 
              ? new Date(site.endDate) 
              : site.endDate.toDate ? site.endDate.toDate() : site.endDate;
            
            if (!startDate || isNaN(startDate.getTime()) || !endDate || isNaN(endDate.getTime())) return;
            
            const currentDate = new Date(currentYear, currentMonthNum - 1, 1);
            const nextMonthDate = new Date(currentYear, currentMonthNum, 1);
            
            // 공사기간이 해당 월과 겹치는지 확인
            if (startDate < nextMonthDate && endDate >= currentDate) {
              totalContractAmount += Number(site.contractAmount) || 0;
              totalAdvance += Number(site.advance) || 0;
            }
          } catch (error) {
            // 에러 무시하고 계속 진행
          }
        });
      } else {
        // 현장별 뷰: 선택된 현장들 또는 전체 현장들 계산
        const targetSites = isAllSelected ? sites : sites.filter(site => 
          currentSelectedSites.some(selectedSite => {
            if (typeof selectedSite === 'string') {
              return site.name === selectedSite || site.id === selectedSite;
            }
            if (selectedSite && typeof selectedSite === 'object') {
              return site.name === selectedSite.name || site.id === selectedSite.id;
            }
            return false;
          })
        );

        targetSites.forEach(site => {
          totalContractAmount += Number(site.contractAmount) || 0;
          totalAdvance += Number(site.advance) || 0;
        });
      }

      // 기성 통계 계산 (서버에서 이미 필터링된 데이터 사용)
      const gisungStats = filteredAndSortedGisung.reduce((acc, gisung) => {
        acc.totalGisungAmount += Number(gisung.gisungAmount) || 0;
        acc.totalPrevGisung += Number(gisung.prevGisung) || 0;
        acc.totalCurrentGisung += Number(gisung.currentGisung) || 0;
        acc.totalCumulativeGisung += (Number(gisung.prevGisung) || 0) + (Number(gisung.gisungAmount) || 0);
        return acc;
      }, { totalGisungAmount: 0, totalPrevGisung: 0, totalCurrentGisung: 0, totalCumulativeGisung: 0 });

      return {
        totalContractAmount,
        totalAdvance,
        totalGisungAmount: gisungStats.totalGisungAmount,
        totalPrevGisung: gisungStats.totalPrevGisung,
        totalCurrentGisung: gisungStats.totalCurrentGisung,
        totalCumulativeGisung: gisungStats.totalCumulativeGisung,
        totalClaimAmount: claimStats.totalAmount || 0
      };
    } catch (error) {
      return {
        totalContractAmount: 0,
        totalAdvance: 0,
        totalGisungAmount: 0,
        totalPrevGisung: 0,
        totalCurrentGisung: 0,
        totalCumulativeGisung: 0,
        totalClaimAmount: 0
      };
    }
  }, [viewType, sites, filteredAndSortedGisung, claimStats.totalAmount]);

  const handleExcelDownload = async () => {
    try {
      const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
      console.log('엑셀 다운로드 시작:', { 
        viewType, 
        currentSelectedSites, 
        filteredAndSortedGisung: filteredAndSortedGisung.length,
        sites: sites.length,
        gisungList: gisungList.length
      });
      
      if (viewType === 'site' && currentSelectedSites.length === 0) {
        setSnackbar({
          open: true,
          message: '현장을 선택하거나 전체선택을 눌러주세요.',
          severity: 'warning'
        });
        return;
      }
      
      // 템플릿 파일 존재 여부 확인 (임시로 비활성화)
      /*
      try {
        const templateRef = ref(storage, 'templates/gisung.xlsx');
        await getDownloadURL(templateRef);
        console.log('템플릿 파일 확인됨');
      } catch (error) {
        console.error('템플릿 파일 없음:', error);
        setSnackbar({
          open: true,
          message: '템플릿 파일이 업로드되지 않았습니다. 관리자에게 문의하세요.',
          severity: 'error'
        });
        return;
      }
      */

      if (viewType === 'month') {
        const monthStr = `${stableCurrentMonth.getFullYear()}-${String(stableCurrentMonth.getMonth() + 1).padStart(2, '0')}`;
        const monthData = filteredAndSortedGisung.filter(row => {
          return row.gisungMonth === monthStr;
        });
        
        // 월별 뷰에서는 기존 방식 사용
        if (monthData.length > 0) {
          // 기성 데이터가 있으면 기존 방식으로 다운로드
          for (const gisungItem of monthData) {
            const site = sites.find(s => s.name === gisungItem.name);
            if (site) {
              const filename = `${site.name}_기성금청구서.xlsx`;
              try {
                console.log('현장 데이터:', site);
                console.log('기성 데이터:', [gisungItem]);
                
                const siteItems = await fetchSiteItems(site.id);
                console.log('물량내역 데이터:', siteItems);
                
                await downloadGisungExcel(site.name, [gisungItem], filename);
                console.log('엑셀 다운로드 완료:', filename);
              } catch (error) {
                console.error('엑셀 생성 실패:', error);
                
                // 사용자 친화적인 오류 메시지
                let userMessage = `엑셀 생성 실패: ${error.message}`;
                
                if (error.message.includes('다운로드')) {
                  userMessage = '파일 다운로드에 실패했습니다. 브라우저 설정을 확인해주세요.';
                } else if (error.message.includes('손상')) {
                  userMessage = '파일이 손상되어 생성할 수 없습니다.';
                } else if (error.message.includes('템플릿')) {
                  userMessage = '템플릿 파일을 찾을 수 없습니다. 관리자에게 문의하세요.';
                } else if (error.message.includes('메모리')) {
                  userMessage = '메모리 부족으로 파일을 생성할 수 없습니다.';
                }
                
                setSnackbar({
                  open: true,
                  message: userMessage,
                  severity: 'error'
                });
              }
            }
          }
          
          setSnackbar({
            open: true,
            message: `${monthText} 기성금청구서가 다운로드되었습니다.`,
            severity: 'success'
          });
        } else {
          setSnackbar({
            open: true,
            message: `${monthText}에 해당하는 기성 데이터가 없습니다.`,
            severity: 'warning'
          });
        }
        return;
      }
      
      if (viewType === 'site' && currentSelectedSites && currentSelectedSites.length > 0) {
        // 전체선택인지 확인
        const isAllSelected = currentSelectedSites.some(site => {
          if (typeof site === 'string') {
            return site === '전체선택' || site === 'all';
          }
          if (site && typeof site === 'object') {
            return site.name === '전체선택' || site.id === 'all';
          }
          return false;
        });
        
        if (isAllSelected) {
          // 전체선택인 경우 모든 현장의 기성금청구서 생성
          for (const site of sites) {
            const siteGisungData = gisungList.filter(item => item.name === site.name);
            if (siteGisungData.length > 0) {
              const filename = `${site.name}_기성금청구서.xlsx`;
              try {
                const siteItems = await fetchSiteItems(site.id);
                await downloadTemplateBasedGisungExcel(site, siteGisungData, siteItems, filename);
              } catch (error) {
                console.error('엑셀 생성 실패:', error);
              }
            }
          }
          
          setSnackbar({
            open: true,
            message: '전체 현장 기성금청구서가 다운로드되었습니다.',
            severity: 'success'
          });
        } else {
          // 특정 현장이 선택된 경우
          const selectedSiteNames = currentSelectedSites.map(site => {
            if (typeof site === 'string') return site;
            if (site && typeof site === 'object') return site.name;
            return '';
          }).filter(name => name !== '');
          
          for (const siteName of selectedSiteNames) {
            const site = sites.find(s => s.name === siteName);
            if (site) {
              const siteGisungData = gisungList.filter(item => item.name === siteName);
              const filename = `${site.name}_기성금청구서.xlsx`;
              try {
                const siteItems = await fetchSiteItems(site.id);
                await downloadTemplateBasedGisungExcel(site, siteGisungData, siteItems, filename);
              } catch (error) {
                console.error('엑셀 생성 실패:', error);
              }
            }
          }
          
          setSnackbar({
            open: true,
            message: '선택된 현장 기성금청구서가 다운로드되었습니다.',
            severity: 'success'
          });
        }
        return;
      }
      
      // 기본 케이스
      setSnackbar({
        open: true,
        message: '기성금청구서가 다운로드되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('엑셀 다운로드 실패:', error);
      setSnackbar({
        open: true,
        message: '엑셀 다운로드에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleIntegratedExcelDownload = async () => {
    try {
      const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
      if (viewType !== 'site' || !currentSelectedSites || currentSelectedSites.length === 0) {
        setSnackbar({
          open: true,
          message: '현장별 탭에서 현장을 선택해주세요.',
          severity: 'warning'
        });
        return;
      }

      const selectedSiteName = currentSelectedSites[0];
      const selectedSiteData = sites.find(site => 
        site.id === selectedSiteName || 
        site.name === selectedSiteName
      );
      
      if (!selectedSiteData) {
        setSnackbar({ open: true, message: '현장을 선택해주세요.', severity: 'warning' });
        return;
      }

      const siteGisungData = gisungList.filter(item => 
        item.name === selectedSiteData.name || item.siteId === selectedSiteName
      );
      
      await generateIntegratedGisungExcel(selectedSiteData.name, siteGisungData, selectedSiteData);
      setSnackbar({ open: true, message: '통합 엑셀 파일이 다운로드되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('통합 엑셀 다운로드 오류:', error);
      setSnackbar({ open: true, message: '통합 엑셀 다운로드 중 오류가 발생했습니다.', severity: 'error' });
    }
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const parsedData = await parseGisungExcel(file);
      console.log('파싱된 데이터:', parsedData);
      
      // 파싱된 데이터를 기성 데이터로 변환하여 저장
      if (parsedData && parsedData.items && parsedData.items.length > 0) {
        const siteName = parsedData.siteName || '업로드된 현장';
        const gisungMonth = parsedData.gisungMonth || `${stableCurrentMonth.getFullYear()}-${String(stableCurrentMonth.getMonth() + 1).padStart(2, '0')}`;
        
        // 현장 정보 찾기
        const site = sites.find(s => s.name === siteName);
        if (!site) {
          setSnackbar({
            open: true,
            message: '현장을 찾을 수 없습니다. 현장관리에서 먼저 현장을 등록해주세요.',
            severity: 'warning'
          });
          return;
        }
        
        // 기성 데이터 생성 (기본적으로 미청구 상태로 설정)
        const gisungData = {
          name: siteName,
          siteId: site.id,
          contractAmount: site.contractAmount || 0,
          advance: site.advance || 0,
          prevGisung: parsedData.summary?.totalPreviousAmount || 0,
          gisungMonth: gisungMonth,
          gisungAmount: parsedData.summary?.totalCurrentAmount || 0,
          currentGisung: parsedData.summary?.totalCurrentAmount || 0,
          note: '엑셀 업로드',
          sequence: suggestNextSequence(siteName),
          claimStatus: '미청구', // 기본적으로 미청구 상태로 설정
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Firestore에 저장
        const newDoc = await addDoc(collection(db, 'gisung'), gisungData);
        
        // 로컬 상태 업데이트
        setGisungList(prev => [...prev, { ...gisungData, id: newDoc.id }]);
        
        // 현장 누계기성 업데이트
        await updateSiteTotalProgress(siteName);
        
        setSnackbar({
          open: true,
          message: '엑셀 파일이 성공적으로 업로드되어 기성 데이터가 저장되었습니다.',
          severity: 'success'
        });
      } else {
        setSnackbar({
          open: true,
          message: '엑셀 파일에서 유효한 데이터를 찾을 수 없습니다.',
          severity: 'warning'
        });
      }
    } catch (error) {
      console.error('엑셀 업로드 실패:', error);
      setSnackbar({
        open: true,
        message: '엑셀 파일 업로드에 실패했습니다.',
        severity: 'error'
      });
    }
    
    // 파일 입력 초기화
    event.target.value = '';
  };

  const updateSiteTotalProgress = useCallback(async (siteName) => {
    if (!siteName) return;
    try {
      const site = sites.find(s => s.name === siteName);
      if (!site) {
        return;
      }

      const gisungQuery = query(collection(db, 'gisung'), where('name', '==', siteName));
      const gisungSnapshot = await getDocs(gisungQuery);
      const totalProgress = gisungSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().gisungAmount) || 0), 0);

      const siteRef = doc(db, 'sites', site.id);
      await updateDoc(siteRef, {
        totalProgress: totalProgress
      });
    } catch (e) {
      console.error("현장 누계기성 업데이트 실패:", e);
    }
  }, [sites]);

  const handleOpen = (item = null) => {
    if (item) {
      setSelected(item);
      // 현장 데이터에서 계약금액과 선급금 가져오기
      const site = sites.find(s => s.name === item.name);
      setFormData({
        name: item.name || '',
        contractAmount: site?.contractAmount || '',
        advance: site?.advance || '',
        prevGisung: item.prevGisung || '',
        gisungMonth: item.gisungMonth || '',
        gisungAmount: item.gisungAmount || '',
        currentGisung: item.gisungAmount || '',
        paymentMethod: item.paymentMethod || '',
        note: item.note || '',
        sequence: item.sequence || calculateSequence(item.name, item), // 기존 차수 또는 계산된 차수
      });
    } else {
      setSelected(null);
      setFormData({
        name: '',
        contractAmount: '',
        advance: '',
        prevGisung: '',
        gisungMonth: viewType === 'month' ? `${stableCurrentMonth.getFullYear()}-${String(stableCurrentMonth.getMonth() + 1).padStart(2, '0')}` : '',
        gisungAmount: '',
        currentGisung: '',
        paymentMethod: '',
        note: '',
        sequence: '', // 자동으로 설정될 예정
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
    // 포커스를 안전한 곳으로 이동
    setTimeout(() => {
      const safeElement = document.querySelector('button, a, input, [tabindex]:not([tabindex="-1"])');
      if (safeElement) {
        safeElement.focus();
      }
    }, 100);
  };

  const handleSubmit = async () => {
    try {
      // 현장 id 찾아서 formData에 추가
      const site = sites.find(s => s.name === formData.name);
      if (site) {
        formData.siteId = site.id;
        // 현장 데이터의 계약금액과 선급금을 사용
        formData.contractAmount = site.contractAmount;
        formData.advance = site.advance;
      }
      
      // 차수가 비어있으면 자동으로 설정
      if (!formData.sequence && formData.name) {
        formData.sequence = suggestNextSequence(formData.name);
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
        
        // 로컬 상태 업데이트
        setGisungList(prev => prev.map(item => 
          item.id === selected.id 
            ? { ...item, ...dataToSave, updatedAt: new Date() }
            : item
        ));
      } else {
        const newDoc = await addDoc(collection(db, 'gisung'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        
        // 로컬 상태에 새 항목 추가
        setGisungList(prev => [...prev, { id: newDoc.id, ...dataToSave, createdAt: new Date() }]);
      }
      await updateSiteTotalProgress(formData.name);
      handleClose();
      
      setSnackbar({
        open: true,
        message: selected ? '기성이 수정되었습니다.' : '새 기성이 추가되었습니다.',
        severity: 'success'
      });
    } catch (e) {
      console.error(e);
      setSnackbar({
        open: true,
        message: '저장 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  const handleDelete = async (itemToDelete) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'gisung', itemToDelete.id));
        
        // 로컬 상태에서 삭제
        setGisungList(prev => prev.filter(item => item.id !== itemToDelete.id));
        
        await updateSiteTotalProgress(itemToDelete.name);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // 차수 계산 함수 (테이블 표시용)
  const calculateSequence = (siteName, currentItem = null) => {
    if (!currentItem || !currentItem.gisungMonth) return '1차';
    
    // 저장된 차수가 있으면 그대로 사용
    if (currentItem.sequence) {
      return currentItem.sequence;
    }
    
    // 차수가 없으면 기성월 순서로 계산
    const siteGisungList = gisungList.filter(item => item.name === siteName);
    const sortedList = siteGisungList
      .filter(item => item.gisungMonth) // 기성월이 있는 항목만
      .sort((a, b) => {
        const dateA = new Date(a.gisungMonth);
        const dateB = new Date(b.gisungMonth);
        return dateA - dateB;
      });
    
    const currentIndex = sortedList.findIndex(item => 
      item.id === currentItem.id
    );
    
    if (currentIndex === -1) return '1차';
    return `${currentIndex + 1}차`;
  };

  // 자동 차수 제안 함수 (새 기성 등록용)
  const suggestNextSequence = (siteName) => {
    if (!siteName) return '1차';
    
    const siteGisungList = gisungList.filter(item => item.name === siteName);
    console.log('현장 기성 데이터:', siteGisungList);
    
    // 기존 차수들을 분석하여 다음 차수 제안
    const existingSequences = siteGisungList
      .map(item => item.sequence)
      .filter(seq => seq) // 빈 값 제외
      .sort((a, b) => {
        // 숫자 부분만 추출하여 숫자로 정렬
        const numA = parseInt(a.match(/(\d+)/)?.[1] || 0);
        const numB = parseInt(b.match(/(\d+)/)?.[1] || 0);
        return numA - numB;
      });
    
    console.log('기존 차수들:', existingSequences);
    
    if (existingSequences.length === 0) {
      console.log('기존 차수 없음, 1차 반환');
      return '1차';
    }
    
    // 마지막 차수 분석
    const lastSequence = existingSequences[existingSequences.length - 1];
    console.log('마지막 차수:', lastSequence);
    
    // 숫자만 추출
    const match = lastSequence.match(/(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[1]);
      const nextSequence = `${lastNumber + 1}차`;
      console.log('다음 차수 제안:', nextSequence);
      return nextSequence;
    }
    
    console.log('숫자 추출 실패, 1차 반환');
    return '1차';
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

  // 누계기성 계산 함수 (전회기성 + 금회기성)
  const calculateCumulativeGisung = (row) => {
    const prevGisung = parseFloat(row.prevGisung || 0);
    const currentGisung = parseFloat(row.gisungAmount || 0);
    return prevGisung + currentGisung;
  };

  // 현장관리 물량 데이터 가져오기
  const fetchSiteItems = async (siteId) => {
    try {
      // 현장관리에서 물량 데이터 가져오기
      const site = sites.find(s => s.id === siteId);
      if (!site) {
        console.log('현장을 찾을 수 없습니다:', siteId);
        return [];
      }
      
      console.log('🔍 현장 데이터 확인:', {
        name: site.name,
        id: site.id,
        hasItems: !!site.items,
        hasMaterials: !!site.materials,
        hasEstimates: !!site.estimates,
        hasCosts: !!site.costs,
        hasGisung: !!site.gisung
      });
      
      // 1. site.items (기본 물량 데이터)
      if (site.items && Array.isArray(site.items) && site.items.length > 0) {
        console.log('✅ 현장 물량 데이터 (items):', site.items.length, '개 항목');
        return site.items;
      }
      
      // 2. site.materials (자재 데이터)
      if (site.materials && Array.isArray(site.materials) && site.materials.length > 0) {
        console.log('✅ 현장 자재 데이터 (materials):', site.materials.length, '개 항목');
        return site.materials.map(material => ({
          name: material.name || material.itemName || '',
          specification: material.specification || material.spec || '',
          unit: material.unit || '',
          quantity: Number(material.quantity) || 0,
          price: Number(material.unitPrice || material.price) || 0
        }));
      }
      
      // 3. site.estimates (견적 데이터)
      if (site.estimates && Array.isArray(site.estimates) && site.estimates.length > 0) {
        console.log('✅ 현장 견적 데이터 (estimates):', site.estimates.length, '개 항목');
        return site.estimates.map(estimate => ({
          name: estimate.item || estimate.name || '',
          specification: estimate.specification || estimate.spec || '',
          unit: estimate.unit || '',
          quantity: Number(estimate.quantity) || 0,
          price: Number(estimate.unitPrice || estimate.price) || 0
        }));
      }
      
      // 4. site.costs (비용 데이터)
      if (site.costs && Array.isArray(site.costs) && site.costs.length > 0) {
        console.log('✅ 현장 비용 데이터 (costs):', site.costs.length, '개 항목');
        return site.costs.map(cost => ({
          name: cost.name || cost.itemName || '',
          specification: cost.specification || cost.spec || '',
          unit: cost.unit || '',
          quantity: Number(cost.quantity) || 0,
          price: Number(cost.unitPrice || cost.price) || 0
        }));
      }
      
      // 5. site.gisung (기성 데이터에서 추출)
      if (site.gisung && Array.isArray(site.gisung) && site.gisung.length > 0) {
        console.log('✅ 현장 기성 데이터 (gisung):', site.gisung.length, '개 항목');
        // 기성 데이터에서 물량 정보 추출
        const gisungItems = site.gisung.map(g => ({
          name: g.name || '기성항목',
          specification: g.specification || '',
          unit: g.unit || '',
          quantity: Number(g.quantity) || 0,
          price: Number(g.unitPrice || g.price) || 0
        }));
        return gisungItems;
      }
      
      // 6. siteItems 컬렉션에서 현장별 물량데이터 조회 (새로운 구조)
      try {
        console.log('🔍 siteItems 컬렉션에서 물량 데이터 조회 시도...');
        
        const siteItemsQuery = query(
          collection(db, 'siteItems'), 
          where('siteId', '==', siteId),
          orderBy('sequence', 'asc')
        );
        const siteItemsSnapshot = await getDocs(siteItemsQuery);
        
        if (!siteItemsSnapshot.empty) {
          const siteItemsData = siteItemsSnapshot.docs.map(doc => doc.data());
          console.log('✅ siteItems 컬렉션 데이터:', siteItemsData.length, '개 항목');
          return siteItemsData.map(item => ({
            name: item.name || '',
            specification: item.specification || '',
            unit: item.unit || '',
            quantity: Number(item.quantity) || 0,
            price: Number(item.unitPrice || item.price) || 0
          }));
        }
      } catch (siteItemsError) {
        console.log('❌ siteItems 조회 실패:', siteItemsError);
      }
      
      // 7. 기존 컬렉션들에서 조회 (하위 호환성)
      try {
        console.log('🔍 기존 컬렉션에서 물량 데이터 조회 시도...');
        
        // estimates 컬렉션에서 현장별 데이터 조회
        const estimatesQuery = query(collection(db, 'estimates'), where('siteId', '==', siteId));
        const estimatesSnapshot = await getDocs(estimatesQuery);
        if (!estimatesSnapshot.empty) {
          const estimatesData = estimatesSnapshot.docs.map(doc => doc.data());
          console.log('✅ Firestore estimates 데이터:', estimatesData.length, '개 항목');
          return estimatesData.map(estimate => ({
            name: estimate.name || estimate.itemName || '',
            specification: estimate.specification || estimate.spec || '',
            unit: estimate.unit || '',
            quantity: Number(estimate.quantity) || 0,
            price: Number(estimate.unitPrice || estimate.price) || 0
          }));
        }
        
        // costs 컬렉션에서 현장별 데이터 조회
        const costsQuery = query(collection(db, 'costs'), where('siteId', '==', siteId));
        const costsSnapshot = await getDocs(costsQuery);
        if (!costsSnapshot.empty) {
          const costsData = costsSnapshot.docs.map(doc => doc.data());
          console.log('✅ Firestore costs 데이터:', costsData.length, '개 항목');
          return costsData.map(cost => ({
            name: cost.name || cost.itemName || '',
            specification: cost.specification || cost.spec || '',
            unit: cost.unit || '',
            quantity: Number(cost.quantity) || 0,
            price: Number(cost.unitPrice || cost.price) || 0
          }));
        }
      } catch (firestoreError) {
        console.log('❌ 기존 Firestore 조회 실패:', firestoreError);
      }
      
      // 물량 데이터가 없는 경우 기본 템플릿 데이터 반환
      console.log('⚠️ 현장 물량 데이터가 없음. 기본 템플릿 데이터 사용.');
      return [
        { name: '유리공사', specification: '일반유리', unit: 'M²', quantity: 100, price: 45000 },
        { name: '샤시공사', specification: 'PVC샤시', unit: 'M²', quantity: 80, price: 65000 },
        { name: '유리문공사', specification: '자동문', unit: '개', quantity: 2, price: 1500000 },
        { name: '부자재', specification: '씰링,브라켓', unit: 'LOT', quantity: 1, price: 500000 },
        { name: '운반비', specification: '현장운반', unit: '식', quantity: 1, price: 300000 },
        { name: '기타', specification: '제잡비', unit: 'LOT', quantity: 1, price: 200000 },
        { name: '단수정리', specification: '', unit: '', quantity: 1, price: -28000 }
      ];
    } catch (error) {
      console.error('❌ 현장관리 물량 데이터 가져오기 실패:', error);
      return [];
    }
  };

  // 차수 정리 함수 (기존 데이터의 차수를 올바르게 재정렬)
  const fixSequences = async () => {
    try {
      // 현장별로 그룹화
      const sitesByName = {};
      gisungList.forEach(item => {
        if (!sitesByName[item.name]) {
          sitesByName[item.name] = [];
        }
        sitesByName[item.name].push(item);
      });

      // 각 현장별로 차수 재정렬
      for (const [siteName, siteItems] of Object.entries(sitesByName)) {
        // 기성월 순서로 정렬
        const sortedItems = siteItems
          .filter(item => item.gisungMonth)
          .sort((a, b) => {
            const dateA = new Date(a.gisungMonth);
            const dateB = new Date(b.gisungMonth);
            return dateA - dateB;
          });

        // 차수 재할당
        for (let i = 0; i < sortedItems.length; i++) {
          const item = sortedItems[i];
          const newSequence = `${i + 1}차`;
          
          if (item.sequence !== newSequence) {
            await updateDoc(doc(db, 'gisung', item.id), {
              sequence: newSequence,
              updatedAt: serverTimestamp()
            });
            
            // 로컬 상태 업데이트
            setGisungList(prev => prev.map(gisung => 
              gisung.id === item.id 
                ? { ...gisung, sequence: newSequence, updatedAt: new Date() }
                : gisung
            ));
          }
        }
      }

      setSnackbar({
        open: true,
        message: '차수가 올바르게 정리되었습니다.',
        severity: 'success'
      });
    } catch (error) {
      console.error('차수 정리 중 오류:', error);
      setSnackbar({
        open: true,
        message: '차수 정리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };

  // 특정 현장의 차수 정리 함수
  const fixSiteSequences = async (siteName) => {
    try {
      const siteItems = gisungList.filter(item => item.name === siteName);
      
      if (siteItems.length === 0) {
        setSnackbar({
          open: true,
          message: `${siteName} 현장의 데이터가 없습니다.`,
          severity: 'warning'
        });
        return;
      }

      // 기성월 순서로 정렬
      const sortedItems = siteItems
        .filter(item => item.gisungMonth)
        .sort((a, b) => {
          const dateA = new Date(a.gisungMonth);
          const dateB = new Date(b.gisungMonth);
          return dateA - dateB;
        });

      console.log(`${siteName} 현장 정렬된 데이터:`, sortedItems);

      // 차수 재할당
      for (let i = 0; i < sortedItems.length; i++) {
        const item = sortedItems[i];
        const newSequence = `${i + 1}차`;
        
        console.log(`${item.gisungMonth}: ${item.sequence} → ${newSequence}`);
        
        if (item.sequence !== newSequence) {
          await updateDoc(doc(db, 'gisung', item.id), {
            sequence: newSequence,
            updatedAt: serverTimestamp()
          });
          
          // 로컬 상태 업데이트
          setGisungList(prev => prev.map(gisung => 
            gisung.id === item.id 
              ? { ...gisung, sequence: newSequence, updatedAt: new Date() }
              : gisung
          ));
        }
      }

      setSnackbar({
        open: true,
        message: `${siteName} 현장의 차수가 정리되었습니다.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('차수 정리 중 오류:', error);
      setSnackbar({
        open: true,
        message: '차수 정리 중 오류가 발생했습니다.',
        severity: 'error'
      });
    }
  };



  // 현장명 변경 시 자동 차수 설정


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
        
        // 로컬 상태에서 삭제
        setGisungList(prev => prev.filter(item => !selectedItems.includes(item.id)));
        
        // 삭제된 항목들의 현장별로 누계기성 업데이트
        for (const siteName of siteNames) {
          await updateSiteTotalProgress(siteName);
        }
        
        setSelectedItems([]);
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
    
    const currentYear = stableCurrentMonth.getFullYear();
    const currentMonthNum = stableCurrentMonth.getMonth() + 1;
    
    console.log('🔍 계약현장 상세 데이터 계산:', {
      currentYear,
      currentMonthNum,
      sitesCount: sites.length,
      sites: sites.map(s => ({ name: s.name, startDate: s.startDate, endDate: s.endDate }))
    });
    
    const filteredSites = sites.filter(site => {
      if (!site.startDate || !site.endDate) {
        console.log('❌ 날짜 정보 없음:', site.name);
        return false;
      }
      
      try {
        const startDate = new Date(site.startDate);
        const endDate = new Date(site.endDate);
        const currentDate = new Date(currentYear, currentMonthNum - 1, 1);
        const nextMonthDate = new Date(currentYear, currentMonthNum, 1);
        
        // 공사기간이 해당 월과 겹치는지 확인
        const isInRange = startDate < nextMonthDate && endDate >= currentDate;
        console.log('🔍 현장 필터링:', {
          name: site.name,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          currentDate: currentDate.toISOString(),
          nextMonthDate: nextMonthDate.toISOString(),
          isInRange
        });
        return isInRange;
      } catch (e) {
        console.log('❌ 날짜 파싱 오류:', site.name, e);
        return false;
      }
    });
    
    console.log('✅ 필터링된 현장:', filteredSites.length, '개');
    
    return filteredSites.map(site => ({
      name: site.name,
      contractAmount: Number(site.contractAmount || 0),
      startDate: site.startDate,
      endDate: site.endDate,
      status: site.status || '진행중'
    }));
  }, [stableCurrentMonth, viewType, sites]);

  // 선급금 상세 데이터 계산
  const getAdvanceDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${stableCurrentMonth.getFullYear()}-${String(stableCurrentMonth.getMonth() + 1).padStart(2, '0')}`;
    
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
  }, [stableCurrentMonth, viewType]);

  // 청구예정 상세 데이터 계산
  const getClaimDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${stableCurrentMonth.getFullYear()}-${String(stableCurrentMonth.getMonth() + 1).padStart(2, '0')}`;
    
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
  }, [stableCurrentMonth, viewType]);

  // 기성금액 상세 데이터 계산
  const getGisungDetailData = useCallback(() => {
    if (viewType !== 'month') return [];
    
    const currentMonthStr = `${stableCurrentMonth.getFullYear()}-${String(stableCurrentMonth.getMonth() + 1).padStart(2, '0')}`;
    
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
  }, [stableCurrentMonth, viewType]);

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
    <Grid>
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
            fontSize: isMobile ? '0.8rem' : '0.9rem',
            lineHeight: isMobile ? 1.1 : 'inherit'
          }}
        >
          {value}
        </Typography>
      </Card>
    </Grid>
  );

  // 차트 데이터 계산 (계약금, 노무, 경비, 기타 순서) - 현재 사용되지 않음
  // const contractAmount = sites.find(site => site.id === selectedSite)?.contractAmount || 0;
  // const totalLabor = gisungList.filter(item => item.category === '노무비').reduce((sum, item) => sum + Number(item.amount), 0);
  // const totalExpense = gisungList.filter(item => item.category === '경비').reduce((sum, item) => sum + Number(item.amount), 0);
  // const totalEtc = gisungList.filter(item => item.category === '기타' || item.category === 'RnD').reduce((sum, item) => sum + Number(item.amount), 0);

  // chartData는 현재 사용되지 않음 - 필요시 주석 해제
  // const chartData = [
  //   { name: '계약금', value: contractAmount },
  //   { name: '노무', value: totalLabor },
  //   { name: '경비', value: totalExpense },
  //   { name: '기타', value: totalEtc },
  // ];

  // 청구상태 토글 함수
  const toggleClaimStatus = async (gisungId, currentStatus) => {
    try {
      const newStatus = currentStatus === '청구완료' ? '미청구' : '청구완료';
      await updateDoc(doc(db, 'gisung', gisungId), {
        claimStatus: newStatus
      });
      
      // 로컬 상태 업데이트
      setGisungList(prev => prev.map(item => 
        item.id === gisungId 
          ? { ...item, claimStatus: newStatus }
          : item
      ));
      
      setSnackbar({
        open: true,
        message: `청구상태가 ${newStatus}로 변경되었습니다.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('청구상태 업데이트 실패:', error);
      setSnackbar({
        open: true,
        message: '청구상태 변경에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 해당 월에 공사기간이 포함된 현장 개수 계산
  const contractSiteCount = useMemo(() => {
    if (viewType === 'month') {
      // 월별: 해당 월에 공사기간이 포함된 모든 현장 개수
      const currentYear = stableCurrentMonth.getFullYear();
      const currentMonthNum = stableCurrentMonth.getMonth() + 1;
      
      console.log('🔍 계약현장 카운트 계산:', {
        currentYear,
        currentMonthNum,
        sitesCount: sites.length
      });
      
      const filteredSites = sites.filter(site => {
        if (!site.startDate || !site.endDate) {
          console.log('❌ 날짜 정보 없음 (카운트):', site.name);
          return false;
        }
        
        try {
          const startDate = new Date(site.startDate);
          const endDate = new Date(site.endDate);
          const currentDate = new Date(currentYear, currentMonthNum - 1, 1);
          const nextMonthDate = new Date(currentYear, currentMonthNum, 1);
          
          // 공사기간이 해당 월과 겹치는지 확인
          const isInRange = startDate < nextMonthDate && endDate >= currentDate;
          console.log('🔍 현장 필터링 (카운트):', {
            name: site.name,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isInRange
          });
          return isInRange;
        } catch (e) {
          console.log('❌ 날짜 파싱 오류 (카운트):', site.name, e);
          return false;
        }
      });
      
      console.log('✅ 필터링된 현장 (카운트):', filteredSites.length, '개');
      return filteredSites.length;
    } else if (viewType === 'site') {
      // 현장별: 선택된 현장들 중 해당 월에 시작하는 현장 개수
      const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
      if (!currentSelectedSites || currentSelectedSites.length === 0) {
        return 0;
      }
      
      const currentYear = stableCurrentMonth.getFullYear();
      const currentMonthNum = stableCurrentMonth.getMonth() + 1;
      
      const isAllSelected = currentSelectedSites.some(site => {
        if (typeof site === 'string') {
          return site === '전체선택' || site === 'all';
        }
        if (site && typeof site === 'object') {
          return site.name === '전체선택' || site.id === 'all';
        }
        return false;
      });
      
      if (isAllSelected) {
        // 전체선택: 전체 현장 중 해당 월에 시작하는 현장 개수
        return sites.filter(site => {
          if (site.startDate) {
            const startDate = new Date(site.startDate);
            return startDate.getFullYear() === currentYear && 
                   startDate.getMonth() + 1 === currentMonthNum;
          }
          return false;
        }).length;
      } else {
        // 특정 현장들: 선택된 현장들 중 해당 월에 시작하는 현장 개수
        const selectedSiteNames = currentSelectedSites.map(site => 
          typeof site === 'string' ? site : site.name
        );
        return sites.filter(site => {
          if (selectedSiteNames.includes(site.name) && site.startDate) {
            const startDate = new Date(site.startDate);
            return startDate.getFullYear() === currentYear && 
                   startDate.getMonth() + 1 === currentMonthNum;
          }
          return false;
        }).length;
      }
    }
    return 0;
  }, [viewType, sites, gisungList]);

  // 기성청구 건수 계산
  const claimCount = useMemo(() => {
    return gisungList.length; // 기성청구 건수
  }, [gisungList]);

  // 계약금액 통계 계산 (현장별 탭용)
  const contractAmountStats = useMemo(() => {
    if (viewType !== 'site') return { totalAmount: 0 };
    
    const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
    if (!currentSelectedSites || currentSelectedSites.length === 0) {
      return { totalAmount: 0 };
    }
    
    const totalAmount = sites
      .filter(site => {
        if (typeof currentSelectedSites[0] === 'string' && currentSelectedSites[0] === '전체선택') {
          return true; // 전체선택인 경우 모든 현장 포함
        }
        return currentSelectedSites.some(selectedSite => 
          typeof selectedSite === 'string' ? selectedSite === site.name : selectedSite.name === site.name
        );
      })
      .reduce((sum, site) => {
        const contractAmount = parseFloat(site.contractAmount) || 0;
        return sum + contractAmount;
      }, 0);
    
    return { totalAmount };
  }, [viewType, sites, selectedSites, selectedSitesInternal]);

  // 선급금 통계 계산 (현장별 탭용)
  const advanceAmountStats = useMemo(() => {
    if (viewType !== 'site') return { totalAmount: 0 };
    
    const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
    if (!currentSelectedSites || currentSelectedSites.length === 0) {
      return { totalAmount: 0 };
    }
    
    const totalAmount = sites
      .filter(site => {
        if (typeof currentSelectedSites[0] === 'string' && currentSelectedSites[0] === '전체선택') {
          return true; // 전체선택인 경우 모든 현장 포함
        }
        return currentSelectedSites.some(selectedSite => 
          typeof selectedSite === 'string' ? selectedSite === site.name : selectedSite.name === site.name
        );
      })
      .reduce((sum, site) => {
        const advanceAmount = parseFloat(site.advance) || 0;
        return sum + advanceAmount;
      }, 0);
    
    return { totalAmount };
  }, [viewType, sites, selectedSites, selectedSitesInternal]);

  // 청구예정 통계 계산 (현장별 탭용)
  const claimAmountStats = useMemo(() => {
    if (viewType !== 'site') return { totalAmount: 0 };
    
    const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
    if (!currentSelectedSites || currentSelectedSites.length === 0) {
      return { totalAmount: 0 };
    }
    
    const totalAmount = gisungList
      .filter(item => {
        if (typeof currentSelectedSites[0] === 'string' && currentSelectedSites[0] === '전체선택') {
          return true; // 전체선택인 경우 모든 기성 포함
        }
        return currentSelectedSites.some(selectedSite => 
          typeof selectedSite === 'string' ? selectedSite === item.siteName : selectedSite.name === item.siteName
        );
      })
      .reduce((sum, item) => {
        const claimAmount = parseFloat(item.claimAmount) || 0;
        return sum + claimAmount;
      }, 0);
    
    return { totalAmount };
  }, [viewType, gisungList, selectedSites, selectedSitesInternal]);

  // 금회기성 통계 계산 (현장별 탭용)
  const gisungAmountStats = useMemo(() => {
    if (viewType !== 'site') return { totalAmount: 0 };
    
    const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
    if (!currentSelectedSites || currentSelectedSites.length === 0) {
      return { totalAmount: 0 };
    }
    
    const totalAmount = gisungList
      .filter(item => {
        if (typeof currentSelectedSites[0] === 'string' && currentSelectedSites[0] === '전체선택') {
          return true; // 전체선택인 경우 모든 기성 포함
        }
        return currentSelectedSites.some(selectedSite => 
          typeof selectedSite === 'string' ? selectedSite === item.siteName : selectedSite.name === item.siteName
        );
      })
      .reduce((sum, item) => {
        const gisungAmount = parseFloat(item.currentGisung) || 0;
        return sum + gisungAmount;
      }, 0);
    
    return { totalAmount };
  }, [viewType, gisungList, selectedSites, selectedSitesInternal]);

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
        {viewType === 'month' ? (
          // 월별 탭: 계약현장, 청구건수
          <>
            <Grid>
              <StatCard
                title="계약현장"
                value={contractSiteCount}
                color="#3b82f6"
                onClick={handleContractCardClick}
              />
            </Grid>
            <Grid>
              <StatCard
                title="청구건수"
                value={claimCount}
                color="#ef4444"
                onClick={handleClaimCardClick}
              />
            </Grid>
          </>
        ) : (
          // 현장별 탭: 계약금액, 선급금, 청구예정, 금회기성
          <>
            <Grid>
              <StatCard
                title="계약금액"
                value={contractAmountStats.totalAmount.toLocaleString() + '원'}
                color="#3b82f6"
                onClick={handleContractCardClick}
              />
            </Grid>
            <Grid>
              <StatCard
                title="선급금"
                value={advanceAmountStats.totalAmount.toLocaleString() + '원'}
                color="#f59e0b"
                onClick={handleAdvanceCardClick}
              />
            </Grid>
            <Grid>
              <StatCard
                title="청구예정"
                value={claimAmountStats.totalAmount.toLocaleString() + '원'}
                color="#ef4444"
                onClick={handleClaimCardClick}
              />
            </Grid>
            <Grid>
              <StatCard
                title="금회기성"
                value={gisungAmountStats.totalAmount.toLocaleString() + '원'}
                color="#10b981"
                onClick={handleGisungCardClick}
              />
            </Grid>
          </>
        )}
      </Grid>

      {/* 검색 및 버튼들 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        

        
        {/* 버튼들 */}
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="success" 
            startIcon={<AddIcon />} 
            onClick={() => handleOpen()}
            sx={{ ml: 1 }}
          >
            기성등록
          </Button>
          

          

          
          {!isMobile && (
            <>
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
              <Button
                variant="outlined"
                startIcon={<UploadIcon />}
                component="label"
                sx={{
                  borderColor: '#666',
                  color: '#fff',
                  '&:hover': { borderColor: '#888' },
                  fontSize: '0.875rem'
                }}
              >
                엑셀 업로드
                <input
                  id="excel-upload"
                  name="excelFile"
                  type="file"
                  accept=".xlsx,.xls"
                  style={{ display: 'none' }}
                  onChange={handleExcelUpload}
                />
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={async () => {
                  try {
                    await migrateSiteItems();
                    setSnackbar({
                      open: true,
                      message: '물량데이터 마이그레이션이 완료되었습니다.',
                      severity: 'success'
                    });
                  } catch (error) {
                    setSnackbar({
                      open: true,
                      message: '마이그레이션 중 오류가 발생했습니다.',
                      severity: 'error'
                    });
                  }
                }}
                sx={{
                  borderColor: '#ff9800',
                  color: '#ff9800',
                  '&:hover': { borderColor: '#f57c00' },
                  fontSize: '0.875rem'
                }}
              >
                물량데이터 마이그레이션
              </Button>
              <Button
                variant="outlined"
                startIcon={<CloudDownloadIcon />}
                onClick={async () => {
                  try {
                    await migrateSiteCodes();
                    setSnackbar({
                      open: true,
                      message: '고유번호 마이그레이션이 완료되었습니다.',
                      severity: 'success'
                    });
                  } catch (error) {
                    setSnackbar({
                      open: true,
                      message: '마이그레이션 중 오류가 발생했습니다.',
                      severity: 'error'
                    });
                  }
                }}
                sx={{
                  borderColor: '#4caf50',
                  color: '#4caf50',
                  '&:hover': { borderColor: '#45a049' },
                  fontSize: '0.875rem'
                }}
              >
                고유번호 마이그레이션
              </Button>
            </>
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

      {/* 현장 선택 상태 안내 */}
      {viewType === 'site' && (() => {
        const currentSelectedSites = selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal;
        return (
          <Box sx={{ mb: 2, p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid #444' }}>
            {currentSelectedSites.length === 0 ? (
              <Typography variant="body2" sx={{ color: '#ff9800', fontWeight: 500 }}>
                ⚠️ 현장을 선택하거나 전체선택을 눌러주세요
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ color: '#90caf9', fontWeight: 500 }}>
                📍 선택된 현장: <strong>
                  {currentSelectedSites.some(site => 
                    (typeof site === 'string' && site === '전체선택') ||
                    (typeof site === 'object' && site.name === '전체선택')
                  ) ? '전체 현장' : 
                  currentSelectedSites.map(site => 
                    typeof site === 'string' ? site : site.name
                  ).join(', ')
                }</strong>
                {filteredAndSortedGisung.length > 0 && (
                  <span style={{ color: '#4caf50', marginLeft: 8 }}>
                    ({filteredAndSortedGisung.length}개 데이터)
                  </span>
                )}
              </Typography>
            )}
          </Box>
        );
      })()}

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
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>고유번호</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>현장명</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>계약금액</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>선급금</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>전회기성</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>기성월</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>차수</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>금회기성</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>누계기성</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>비고</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>청구완료</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600, fontSize: '1rem' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedGisung.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} sx={{ textAlign: 'center', color: '#ccc', py: 4 }}>
                    {viewType === 'site' && (selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal).length === 0 
                      ? '현장을 선택하거나 전체선택을 눌러주세요' 
                      : viewType === 'site' && (selectedSites && selectedSites.length > 0 ? selectedSites : selectedSitesInternal).length > 0
                      ? '선택된 현장의 데이터가 없습니다'
                      : '데이터가 없습니다.'}
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
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>
                      {(() => {
                        const site = sites.find(s => s.name === row.name);
                        return site?.siteCode ? (
                          <Chip
                            label={site.siteCode}
                            size="small"
                            sx={{
                              backgroundColor: '#2196f3',
                              color: 'white',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}
                          />
                        ) : (
                          <span style={{ color: '#f44336' }}>미지정</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{row.name || '-'}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{formatContractAmount(sites.find(site => site.name === row.name)?.contractAmount || row.contractAmount)}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{formatAdvanceAmount(row.advance)}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{formatGisungAmount(row.prevGisung)}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{row.gisungMonth || '-'}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{calculateSequence(row.name, row)}</TableCell>
                    <TableCell sx={{ color: '#ef5350', fontWeight: 600, fontSize: '1rem' }}>{formatGisungAmount(row.gisungAmount)}</TableCell>
                    <TableCell sx={{ color: '#ff9800', fontWeight: 600, fontSize: '1rem' }}>{formatGisungAmount(calculateCumulativeGisung(row))}</TableCell>
                    <TableCell sx={{ color: '#fff', fontSize: '1rem' }}>{row.note || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.claimStatus || '미청구'}
                        color={row.claimStatus === '청구완료' ? 'success' : 'default'}
                        onClick={() => toggleClaimStatus(row.id, row.claimStatus)}
                        sx={{ 
                          cursor: 'pointer',
                          color: '#fff',
                          '&.MuiChip-colorSuccess': {
                            bgcolor: '#4caf50',
                            color: '#fff'
                          },
                          '&.MuiChip-colorDefault': {
                            bgcolor: '#666',
                            color: '#fff'
                          }
                        }}
                      />
                    </TableCell>
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
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        disableRestoreFocus
        disableAutoFocus
        keepMounted={false}
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #444' }}>
          {selected ? '기성 수정' : '새 기성 등록'}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 2, mt: 2 }}>
            <SearchableSiteSelect
              sites={sites}
              value={formData.name}
              onChange={(newValue) => {
                setFormData({ ...formData, name: newValue });
                // 현장명이 변경되면 자동으로 다음 차수 제안
                if (newValue) {
                  const nextSequence = suggestNextSequence(newValue);
                  setFormData(prev => ({ ...prev, sequence: nextSequence }));
                }
              }}
              label="현장명"
              placeholder="현장명을 입력하여 검색하세요"
              isMobile={isMobile}
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
              id="gisung-sequence"
              name="sequence"
              label="차수"
              value={formData.sequence}
              onChange={(e) => setFormData({ ...formData, sequence: e.target.value })}
              fullWidth
              placeholder="예: 1차, 2차, 1-1차, 1-2차 등"
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
              id="gisung-contract-amount"
              name="contractAmount"
              label="계약금액"
              value={sites.find(site => site.name === formData.name)?.contractAmount || ''}
              fullWidth
              type="number"
              disabled
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#232b3b',
                  color: '#fff',
                  '& fieldset': { borderColor: '#444' },
                  '&:hover fieldset': { borderColor: '#666' },
                  '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                },
                '& .MuiInputLabel-root': { color: '#ccc' },
                '& .MuiInputBase-input': { color: '#888' },
              }}
              helperText="현장 데이터에서 자동으로 가져옵니다"
            />
            <TextField
              id="gisung-advance"
              name="advance"
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
              id="gisung-prev-gisung"
              name="prevGisung"
              label="전회기성"
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
              id="gisung-month"
              name="gisungMonth"
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
              id="gisung-amount"
              name="gisungAmount"
              label="금회기성"
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
              id="gisung-current"
              name="currentGisung"
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
              id="gisung-note"
              name="note"
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
      
      {/* 계약금액 상세 모달 */}
      <Dialog 
        open={contractDetailModal} 
        onClose={() => setContractDetailModal(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #444' }}>
          계약금액 상세 내역
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>현장명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>계약금액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>시작일</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>종료일</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contractDetailData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#ccc', py: 4 }}>
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  contractDetailData.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ color: '#fff' }}>{item.name}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{formatContractAmount(item.contractAmount)}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', borderTop: '1px solid #444' }}>
          <Button onClick={() => setContractDetailModal(false)} sx={{ color: '#ccc' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 선급금 상세 모달 */}
      <Dialog 
        open={advanceDetailModal} 
        onClose={() => setAdvanceDetailModal(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #444' }}>
          선급금 상세 내역
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>현장명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>선급금</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>시작일</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>종료일</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {advanceDetailData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#ccc', py: 4 }}>
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  advanceDetailData.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ color: '#fff' }}>{item.name}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{formatAdvanceAmount(item.advance)}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.startDate ? new Date(item.startDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.endDate ? new Date(item.endDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', borderTop: '1px solid #444' }}>
          <Button onClick={() => setAdvanceDetailModal(false)} sx={{ color: '#ccc' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 청구예정 상세 모달 */}
      <Dialog 
        open={claimDetailModal} 
        onClose={() => setClaimDetailModal(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #444' }}>
          청구예정 상세 내역
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>현장명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>청구금액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>기성월</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>결제방법</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {claimDetailData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#ccc', py: 4 }}>
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  claimDetailData.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ color: '#fff' }}>{item.name}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{formatGisungAmount(item.claimAmount)}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.gisungMonth}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.paymentMethod}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', borderTop: '1px solid #444' }}>
          <Button onClick={() => setClaimDetailModal(false)} sx={{ color: '#ccc' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 기성금액 상세 모달 */}
      <Dialog 
        open={gisungDetailModal} 
        onClose={() => setGisungDetailModal(false)}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#1a1d21', color: '#fff', borderBottom: '1px solid #444' }}>
          기성금액 상세 내역
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#1a1d21', color: '#fff' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>현장명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>기성금액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>기성월</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>결제방법</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gisungDetailData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ textAlign: 'center', color: '#ccc', py: 4 }}>
                      데이터가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  gisungDetailData.map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell sx={{ color: '#fff' }}>{item.name}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{formatGisungAmount(item.gisungAmount)}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.gisungMonth}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.paymentMethod}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{item.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#1a1d21', borderTop: '1px solid #444' }}>
          <Button onClick={() => setGisungDetailModal(false)} sx={{ color: '#ccc' }}>
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default GisungStatusPage; 