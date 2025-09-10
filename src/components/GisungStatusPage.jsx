import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Alert,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudDownload as CloudDownloadIcon,
  Search as SearchIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import { addMonths, subMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { formatNumber } from '../utils/formatUtils';
import SiteInfoPopup from './common/SiteInfoPopup';
import { generateTemplateBasedGisungExcel } from '../utils/gisungTemplateUtils';
// import { parseGisungExcelUpload } from '../utils/gisungUploadUtils';

const GisungStatusPage = ({ viewType: initialViewType, currentMonth: initialCurrentMonth, monthText: initialMonthText, selectedSites, filteredData }) => {
  // console.log('🔍 GisungStatusPage 컴포넌트 렌더링 시작');
  // console.log('🔍 props:', { initialViewType, initialCurrentMonth, initialMonthText, selectedSites, filteredData });
  
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // navigate로 전달된 state 파라미터 처리
  useEffect(() => {
    if (location.state) {
      console.log('🔍 GisungStatusPage - navigate state 받음:', location.state);
      
      if (location.state.selectedSite) {
        setSelectedSite(location.state.selectedSite);
        console.log('✅ 선택된 현장 설정:', location.state.selectedSite);
      }
      
      if (location.state.viewType) {
        setViewType(location.state.viewType);
        console.log('✅ 뷰 타입 설정:', location.state.viewType);
      }
      
      if (location.state.selectedMonth) {
        const [year, month] = location.state.selectedMonth.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1);
        setCurrentMonth(monthDate);
        console.log('✅ 선택된 월 설정:', monthDate);
      }
      
      // 페이지 이동 후 화면을 아래로 이동 (헤더 높이만큼)
      setTimeout(() => {
        // 여러 방법으로 스크롤 시도
        try {
          console.log('🔍 스크롤 조정 시작...');
          
          // 방법 1: window.scrollTo (가장 확실한 방법)
          window.scrollTo(0, 100);
          console.log('✅ 방법 1 실행: window.scrollTo(0, 100)');
          
          // 방법 2: document.documentElement.scrollTop
          if (document.documentElement) {
            document.documentElement.scrollTop = 100;
            console.log('✅ 방법 2 실행: document.documentElement.scrollTop = 100');
          }
          
          // 방법 3: document.body.scrollTop
          if (document.body) {
            document.body.scrollTop = 100;
            console.log('✅ 방법 3 실행: document.body.scrollTop = 100');
          }
          
          // 방법 4: 강제로 스크롤 위치 확인
          setTimeout(() => {
            const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
            console.log('🔍 현재 스크롤 위치:', currentScrollTop);
            
            if (currentScrollTop < 50) {
              console.log('⚠️ 스크롤이 제대로 작동하지 않음. 강제로 다시 시도...');
              window.scrollTo(0, 100);
            }
          }, 100);
          
          console.log('✅ 페이지 스크롤 조정: 100px 아래로 이동 완료');
        } catch (error) {
          console.error('❌ 스크롤 조정 실패:', error);
        }
      }, 500); // 더 긴 지연시간
    }
  }, [location.state]);
  

  
  // 기성금청구서 업로드 관련 상태
  const [uploadDialog, setUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  
  // 다운로드 로딩 상태
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // 현장 정보 팝업 상태
  const [siteInfoPopup, setSiteInfoPopup] = useState({ open: false, site: null });
  
  const [formData, setFormData] = useState({
    name: '',
    contractAmount: '',
    advance: '',
    prevGisung: '',
    gisungMonth: '',
    gisungAmount: '',
    currentGisung: '',
    claimMethod: '', // 청구방법 추가
    templateType: 'N', // 템플릿 타입 추가 (N: 뉴기성, L: 롱기성)
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
    // console.log('이전달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  }, [currentMonth]);
  
  const handleNextMonth = useCallback(() => {
    const newMonth = addMonths(currentMonth, 1);
    setCurrentMonth(newMonth);
    // console.log('다음달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  }, [currentMonth]);
  
  const handleThisMonth = useCallback(() => {
    const newMonth = new Date();
    setCurrentMonth(newMonth);
    // console.log('이번달 클릭:', format(newMonth, 'yyyy년 MM월', { locale: ko }));
  }, []);
  
  const handleMonthClick = useCallback(() => handleThisMonth(), [handleThisMonth]);

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

  // 팝업이 열려있을 때 allGisungData가 변경되면 누계기성 자동 업데이트
  useEffect(() => {
    if (open && formData?.name && allGisungData.length > 0) {
      // 해당 현장의 청구완료된 기성 데이터 찾기
      const siteGisungData = allGisungData.filter(
        g => (g?.name || '').trim().toLowerCase() === formData?.name.trim().toLowerCase() && g.claimStatus === '청구완료'
      );
      
      // 누계기성 계산 (청구완료된 것만)
      const totalGisungAmount = siteGisungData.reduce((sum, g) => {
        const amount = Number(g.gisungAmount) || Number(g.currentGisung) || 0;
        return sum + amount;
      }, 0);
      
      // 폼 데이터 업데이트 (누계기성만)
      setFormData(prev => ({
        ...prev,
        prevGisung: totalGisungAmount.toString()
      }));
      
      console.log(`🔄 팝업 누계기성 자동 업데이트: ${formData?.name} - ${totalGisungAmount.toLocaleString()}원`);
    }
  }, [allGisungData, open, formData?.name]);

  const fetchSites = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sites'));
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error('현장 데이터 로드 오류:', e);
      setSites([]); // 오류 발생 시 빈 배열로 설정
    }
  };

  const fetchAllGisung = useCallback(async () => {
    try {
      // console.log('=== 전체 기성 데이터 로드 시작 ===');
      const snapshot = await getDocs(collection(db, 'gisung'));
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // console.log('로드된 전체 기성 데이터:', allData);
      setAllGisungData(allData);
      // console.log('=== 전체 기성 데이터 로드 완료 ===');
      return allData; // 데이터 반환 추가
    } catch (e) {
      console.error('전체 기성 데이터 로드 오류:', e);
      setAllGisungData([]); // 오류 발생 시 빈 배열로 설정
      return []; // 오류 시 빈 배열 반환
    }
  }, []);

  // 기성 데이터 로드
  const fetchGisung = useCallback(async () => {
    try {
      // console.log('=== 기성 데이터 로드 시작 ===');
      // console.log('viewType:', viewType);
      // console.log('currentMonth:', currentMonth);
      // console.log('selectedSites:', selectedSites);

      // 먼저 전체 데이터를 로드하여 전회기성 계산에 사용
      const allSnapshot = await getDocs(collection(db, 'gisung'));
      const allGisungData = allSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let q;
      const gisungCollection = collection(db, 'gisung');
      
      if (viewType === 'month') {
        const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
        // console.log('월별 필터링 - monthStr:', monthStr);
        q = query(gisungCollection, where('gisungMonth', '==', monthStr));

      } else if (viewType === 'site' && selectedSites && selectedSites.length > 0) {
        // console.log('현장별 필터링 - selectedSites:', selectedSites);
        
        // selectedSites가 문자열 배열인지 객체 배열인지 확인
        const siteNames = selectedSites.map(site => {
          if (typeof site === 'string') {
            return site.trim(); // 공백 제거
          } else if (site && typeof site === 'object' && site?.name) {
            return site?.name.trim(); // 공백 제거
          }
          return site;
        }).filter(Boolean);
        
        // console.log('필터링할 현장명들:', siteNames);
        
        if (siteNames.length === 0) {
          // console.log('유효한 현장명이 없음');
          setGisungList([]);
          return;
        }
        
        // "전체선택"인 경우 모든 데이터 표시
        if (siteNames.includes('전체선택') || siteNames.includes('전체')) {
          // console.log('🔍 전체선택 - 모든 기성 데이터 표시');
          q = query(gisungCollection);
          
          const snapshot = await getDocs(q);
          const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // 전회기성 동적 계산
          const dataWithPrevGisung = allData.map(gisung => {
            const currentSeq = parseInt(gisung.sequence?.replace('차', '') || '0');
            const previousGisung = allGisungData
              .filter(prev => {
                const prevSeq = parseInt(prev.sequence?.replace('차', '') || '0');
                const isClaimCompleted = prev.claimStatus === '청구완료';
                return prev?.name === gisung?.name && prev.id !== gisung.id && prevSeq < currentSeq && isClaimCompleted;
              })
              .sort((a, b) => {
                const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
                const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
                return bSeq - aSeq;
              })[0];
            
            const calculatedPrevGisung = previousGisung ? (previousGisung.gisungAmount || 0) : 0;
            
            return {
              ...gisung,
              prevGisung: calculatedPrevGisung
            };
          });
          
          const sortedData = dataWithPrevGisung.sort((a, b) => {
            const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
            const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
            return bSeq - aSeq;
          });
          
          // console.log('전체선택 정렬 완료된 데이터:', sortedData);
          setGisungList(sortedData);
          return;
        }
        
        // 전체 데이터를 가져온 후 클라이언트에서 필터링 (현장명 매칭 문제 해결)
        // console.log('🔍 전체 데이터에서 현장별 필터링 적용');
        q = query(gisungCollection);
        
        const snapshot = await getDocs(q);
        const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 클라이언트에서 현장명 매칭 (더 유연한 매칭)
        const filteredData = allData.filter(gisung => {
          const gisungName = gisung?.name ? gisung?.name.trim() : '';
          return siteNames.some(siteName => {
            const normalizedSiteName = siteName.trim();
            const normalizedGisungName = gisungName.trim();
            
            // 정확한 일치 또는 포함 관계 확인
            const isExactMatch = normalizedGisungName === normalizedSiteName;
            const isPartialMatch = normalizedGisungName.includes(normalizedSiteName) || 
                                 normalizedSiteName.includes(normalizedGisungName);
            
            // 특수문자나 공백 제거 후 비교
            const cleanSiteName = normalizedSiteName.replace(/[^\w가-힣]/g, '');
            const cleanGisungName = normalizedGisungName.replace(/[^\w가-힣]/g, '');
            const isCleanMatch = cleanGisungName.includes(cleanSiteName) || cleanSiteName.includes(cleanGisungName);
            
            // console.log(`🔍 현장명 매칭: "${normalizedGisungName}" vs "${normalizedSiteName}" - 정확일치: ${isExactMatch}, 부분일치: ${isPartialMatch}, 정리매칭: ${isCleanMatch}`);
            
            return isExactMatch || isPartialMatch || isCleanMatch;
          });
        });
        
        // console.log('🔍 필터링된 기성 데이터:', filteredData);
        
        // 전회기성 동적 계산
        const filteredDataWithPrevGisung = filteredData.map(gisung => {
          // 현재 기성의 차수 추출
          const currentSeq = parseInt(gisung.sequence?.replace('차', '') || '0');
          
          // 같은 현장의 이전 차수 기성 데이터 찾기 (현재 차수보다 작은 차수만, 청구완료된 것만)
          const previousGisung = allGisungData
            .filter(prev => {
              const prevSeq = parseInt(prev.sequence?.replace('차', '') || '0');
              const isSameSite = prev?.name === gisung?.name;
              const isDifferentId = prev.id !== gisung.id;
              const isPreviousSequence = prevSeq < currentSeq;
              const isClaimCompleted = prev.claimStatus === '청구완료';
              
              return isSameSite && isDifferentId && isPreviousSequence && isClaimCompleted;
            })
            .sort((a, b) => {
              // sequence로 정렬 (1차, 2차, 3차...)
              const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
              const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
              return bSeq - aSeq; // 내림차순 정렬
            })[0]; // 가장 최근 이전 기성
          
          const calculatedPrevGisung = previousGisung ? (previousGisung.gisungAmount || 0) : 0;
          
          return {
            ...gisung,
            prevGisung: calculatedPrevGisung
          };
        });
        
        // console.log('전회기성 계산 완료된 필터링 데이터:', filteredDataWithPrevGisung);
        
        // 차수가 높은 것이 위에 오도록 정렬 (2차, 1차 순서)
        const sortedFilteredData = filteredDataWithPrevGisung.sort((a, b) => {
          // sequence 기준으로 정렬 (차수가 높은 것이 위에)
          const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
          const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
          return bSeq - aSeq; // 2차, 1차 순서
        });
        
        // console.log('정렬 완료된 필터링 데이터:', sortedFilteredData);
        setGisungList(sortedFilteredData);
        return;
      } else if (viewType === 'site' && (!selectedSites || selectedSites.length === 0)) {
        // console.log('현장별 필터링 - 선택된 현장 없음');
        setGisungList([]);
        return;
      } else {
        // console.log('필터링 조건 없음 - 전체 데이터 로드');
        q = query(gisungCollection);
      }
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // console.log('로드된 기성 데이터:', data);
      
              // 전회기성 동적 계산
        const dataWithPrevGisung = data.map(gisung => {
          // 현재 기성의 차수 추출
          const currentSeq = parseInt(gisung.sequence?.replace('차', '') || '0');
          
          // 디버깅: 현재 기성 정보 로그
          console.log(`🔍 전회기성 계산 - 현장: ${gisung?.name}, 차수: ${gisung.sequence}, 현재차수: ${currentSeq}`);
          
          // 같은 현장의 이전 차수 기성 데이터 찾기 (현재 차수보다 작은 차수만, 청구완료된 것만)
          const previousGisung = allGisungData
            .filter(prev => {
              const prevSeq = parseInt(prev.sequence?.replace('차', '') || '0');
              const isSameSite = prev?.name === gisung?.name;
              const isDifferentId = prev.id !== gisung.id;
              const isPreviousSequence = prevSeq < currentSeq;
              const isClaimCompleted = prev.claimStatus === '청구완료';
              
              // 디버깅: 필터링 조건 확인
              if (isSameSite && isDifferentId && isPreviousSequence && isClaimCompleted) {
                console.log(`✅ 전회기성 후보 - 현장: ${prev?.name}, 차수: ${prev.sequence}, 금액: ${prev.gisungAmount}`);
              }
              
              return isSameSite && isDifferentId && isPreviousSequence && isClaimCompleted;
            })
            .sort((a, b) => {
              // sequence로 정렬 (1차, 2차, 3차...)
              const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
              const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
              return bSeq - aSeq; // 내림차순 정렬
            })[0]; // 가장 최근 이전 기성
          
          const calculatedPrevGisung = previousGisung ? (previousGisung.gisungAmount || 0) : 0;
          
          console.log(`📊 전회기성 결과 - 현장: ${gisung?.name}, 차수: ${gisung.sequence}, 전회기성: ${calculatedPrevGisung}`);
          
          return {
            ...gisung,
            prevGisung: calculatedPrevGisung
          };
        });
      
      // console.log('전회기성 계산 완료된 데이터:', dataWithPrevGisung);
      
      // 차수가 높은 것이 위에 오도록 정렬 (2차, 1차 순서)
      const sortedData = dataWithPrevGisung.sort((a, b) => {
        // sequence 기준으로 정렬 (차수가 높은 것이 위에)
        const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
        const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
        return bSeq - aSeq; // 2차, 1차 순서
      });
      
              // console.log('정렬 완료된 데이터:', sortedData);
      setGisungList(sortedData);
              // console.log('=== 기성 데이터 로드 완료 ===');
    } catch (e) {
      console.error('기성 데이터 로드 오류:', e);
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

    // 사용자 정의 정렬이 있는 경우 해당 정렬 적용
    if (sortField) {
      filtered.sort((a, b) => {
        let aValue = a[sortField];
        let bValue = b[sortField];
        
        if (sortField === 'sequence') {
          // 차수 정렬: 숫자로 변환하여 정렬
          aValue = parseInt(aValue?.replace('차', '') || '0');
          bValue = parseInt(bValue?.replace('차', '') || '0');
        } else if (sortField === 'gisungAmount') {
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
    } else {
      // 기본 정렬: 현장명 오름차순, 차수 내림차순 (2차, 1차 순서)
      filtered.sort((a, b) => {
        // 먼저 현장명으로 정렬
        const nameComparison = (a?.name || '').localeCompare(b?.name || '');
        if (nameComparison !== 0) {
          return nameComparison;
        }
        
        // 같은 현장 내에서는 차수로 내림차순 정렬
        const aSeq = parseInt(a.sequence?.replace('차', '') || '0');
        const bSeq = parseInt(b.sequence?.replace('차', '') || '0');
        // console.log(`🔢 차수 정렬: ${a?.name} ${a.sequence}(${aSeq}) vs ${b?.name} ${b.sequence}(${bSeq})`);
        return bSeq - aSeq; // 차수가 높은 것이 위에 (2차, 1차 순서)
      });
    }

    return filtered;
  }, [gisungList, search, sortField, sortDirection]);

  // 통계 데이터
  const stats = useMemo(() => {
    // 현장별 뷰에서 선택된 현장이 있으면 해당 현장의 계약금액 사용
    let totalContractAmount = 0;
    if (viewType === 'site' && selectedSites && selectedSites.length > 0) {
      const selectedSiteName = selectedSites[0].trim();
      const site = sites.find(s => s?.name && s?.name.trim() === selectedSiteName);
      if (site) {
        totalContractAmount = Number(site.contractAmount || 0);
        // console.log(`📊 선택된 현장 계약금액: ${site?.name} - ${totalContractAmount.toLocaleString()}원`);
      }
    } else if (viewType === 'month') {
      // 월별 뷰에서는 이달에 시작하는 현장들의 계약금액 합계
      const currentMonth = new Date();
      const currentYear = currentMonth.getFullYear();
      const currentMonthNum = currentMonth.getMonth() + 1;
      
      const thisMonthSites = sites.filter(site => {
        if (!site.startDate) return false;
        
        try {
          const startDate = new Date(site.startDate);
          const siteYear = startDate.getFullYear();
          const siteMonth = startDate.getMonth() + 1;
          
          return siteYear === currentYear && siteMonth === currentMonthNum;
        } catch (error) {
          console.log(`⚠️ 현장 시작일 파싱 오류: ${site?.name} - ${site.startDate}`);
          return false;
        }
      });
      
      totalContractAmount = thisMonthSites.reduce((sum, site) => sum + (Number(site.contractAmount) || 0), 0);
      // console.log(`📊 이달 시작 현장 ${thisMonthSites.length}개 계약금액 합계: ${totalContractAmount.toLocaleString()}원`);
      // console.log(`📊 이달 시작 현장 목록:`, thisMonthSites.map(site => `${site?.name} (${site.startDate})`));
    } else {
      // 현장별 뷰에서 현장을 선택하지 않았으면 0
      totalContractAmount = 0;
      // console.log(`📊 현장 미선택 - 계약금액: 0원`);
    }
    
    // 선급금은 현장 데이터에서 가져와야 함 (기성금 데이터가 아닌)
    let totalAdvance = 0;
    if (viewType === 'site') {
      if (selectedSites && selectedSites.length > 0) {
        // 선택된 현장들의 선급금 합계
        totalAdvance = selectedSites.reduce((sum, siteName) => {
          const site = sites.find(s => s?.name && s?.name.trim() === siteName.trim());
          return sum + (Number(site?.advance || 0));
        }, 0);
      } else {
        // 현장을 선택하지 않았으면 선급금 0
        totalAdvance = 0;
      }
    } else if (viewType === 'month') {
      // 월별 뷰에서는 이달 시작 현장들의 선급금 합계
      // thisMonthSites가 정의되어 있는지 확인
      if (typeof thisMonthSites !== 'undefined') {
        totalAdvance = thisMonthSites.reduce((sum, site) => sum + (Number(site.advance || 0)), 0);
      } else {
        // thisMonthSites가 정의되지 않은 경우 현재 월 현장들을 다시 계산
        const currentMonth = new Date();
        const currentYear = currentMonth.getFullYear();
        const currentMonthNum = currentMonth.getMonth() + 1;
        
        const thisMonthSites = sites.filter(site => {
          if (!site.startDate) return false;
          
          try {
            const startDate = new Date(site.startDate);
            const siteYear = startDate.getFullYear();
            const siteMonth = startDate.getMonth() + 1;
            
            return siteYear === currentYear && siteMonth === currentMonthNum;
          } catch (error) {
            console.log(`⚠️ 현장 시작일 파싱 오류: ${site?.name} - ${site.startDate}`);
            return false;
          }
        });
        
        totalAdvance = thisMonthSites.reduce((sum, site) => sum + (Number(site.advance || 0)), 0);
      }
    } else {
      // 전체 뷰에서는 모든 현장의 선급금 합계
      totalAdvance = sites.reduce((sum, site) => sum + (Number(site.advance || 0)), 0);
    }
    
    console.log(`💰 선급금 계산 결과: ${totalAdvance.toLocaleString()}원`);
    console.log(`💰 뷰 타입: ${viewType}, 선택된 현장: ${selectedSites?.length || 0}개`);
    const totalPrevGisung = filteredAndSortedGisung.reduce((sum, gisung) => sum + (Number(gisung.prevGisung) || 0), 0);
    
    // 청구완료된 기성만 총기성금액에 포함
    const totalGisungAmount = filteredAndSortedGisung
      .filter(gisung => gisung.claimStatus === '청구완료')
      .reduce((sum, gisung) => sum + (Number(gisung.gisungAmount) || 0), 0);
    
    // 입금완료된 기성만 입금완료금액에 포함
    const totalPaidAmount = filteredAndSortedGisung
      .filter(gisung => gisung.paymentStatus === '입금완료')
      .reduce((sum, gisung) => sum + (Number(gisung.gisungAmount) || 0), 0);
    
    // 잔액 = 계약금액 - 선급금 - 기성금액
    const totalBalance = totalContractAmount - totalAdvance - totalGisungAmount;
    
    return { totalContractAmount, totalAdvance, totalPrevGisung, totalGisungAmount, totalPaidAmount, totalBalance };
  }, [filteredAndSortedGisung, sites, viewType, selectedSites]);

  // 기성현황 엑셀 다운로드 함수 (원래 기능)
  const handleExcelDownload = () => {
    try {
      console.log('📊 기성현황 엑셀 다운로드 시작');
      
      // 데이터 유효성 검사
      if (!filteredAndSortedGisung || !Array.isArray(filteredAndSortedGisung)) {
        console.error('❌ filteredAndSortedGisung 데이터가 유효하지 않습니다:', filteredAndSortedGisung);
        alert('다운로드할 데이터가 없습니다.');
        return;
      }

      const data = filteredAndSortedGisung.map(row => {
        // 각 행의 데이터 유효성 검사
        if (!row || typeof row !== 'object') {
          console.warn('⚠️ 유효하지 않은 행 데이터:', row);
          return {
            '현장명': '데이터오류',
            '계약금액': '0',
            '선급금': '0',
            '전회기성': '0',
            '기성월': '-',
            '기성금액': '0',
            '비고': '데이터오류',
          };
        }

        return {
          '현장명': row?.name || '현장명없음',
          '계약금액': Number(row.contractAmount || 0).toLocaleString(),
          '선급금': Number(row.advance || 0).toLocaleString(),
          '전회기성': Number(row.prevGisung || 0).toLocaleString(),
          '기성월': row.gisungMonth || '-',
          '기성금액': Number(row.gisungAmount || 0).toLocaleString(),
          '비고': row.note || '-',
        };
      });

      console.log('📊 엑셀 데이터 준비 완료:', data.length, '행');

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, '기성현황');
      
      const fileName = `기성현황_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      console.log('✅ 기성현황 엑셀 다운로드 완료:', fileName);
    } catch (error) {
      console.error('❌ 기성현황 엑셀 다운로드 실패:', error);
      alert('엑셀 다운로드 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 기성금청구서 엑셀 다운로드 함수 (템플릿 기반)
  const handleGisungClaimDownload = async () => {
    setDownloadLoading(true);
    
    // 월별 뷰에서는 별도 함수 호출
    if (viewType !== 'site') {
      console.log('📊 월별 뷰 엑셀 다운로드 호출');
      handleMonthlyExcelDownload();
      return;
    }

    if (!selectedSites || !Array.isArray(selectedSites) || selectedSites.length === 0) {
      console.warn('⚠️ 선택된 현장이 없습니다.');
      alert('기성금청구서를 다운로드할 현장을 선택해주세요.');
      setDownloadLoading(false);
      return;
    }

    if (!sites || !Array.isArray(sites) || sites.length === 0) {
      console.error('❌ 현장 데이터가 없습니다.');
      alert('현장 데이터를 불러올 수 없습니다.');
      setDownloadLoading(false);
      return;
    }
    
    try {
      console.log('📊 기성금청구서 다운로드 시작');
        
        // 기성금청구서 템플릿 사용 (이미 상단에서 import됨)
        
        // 선택된 현장 정보 가져오기
        let siteData = {
          name: '현장명',
          contractAmount: 0,
          manager: '',
          company: '',
          contractor: '',
          contractType: '유리공사',
          startDate: '',
          endDate: '',
          advance: 0
        };

        // 현장별 뷰에서 선택된 현장이 있으면 해당 정보 사용
        let selectedSiteId = null;
        const selectedSiteName = selectedSites[0]?.trim();
        
        if (!selectedSiteName) {
          console.error('❌ 선택된 현장명이 유효하지 않습니다.');
          alert('선택된 현장명이 유효하지 않습니다.');
          throw new Error('선택된 현장명이 유효하지 않습니다.');
        }
        
        const site = sites.find(s => s && s?.name && s?.name.trim() === selectedSiteName);
        if (site) {
          selectedSiteId = site.id; // 현장의 고유 ID 저장
          console.log('🔍 선택된 현장 정보:', site);
          console.log('🔍 현장의 모든 키:', Object.keys(site));
          console.log('🔍 선택된 현장 ID:', selectedSiteId);
          console.log('🔍 === 고유번호 확인 ===');
          console.log('🔍 현장명:', site?.name);
          console.log('🔍 고유번호 (siteId):', selectedSiteId);
          console.log('🔍 ====================');
          
          // 안전한 데이터 매핑
          siteData = {
            name: site?.name || '현장명없음',
            contractAmount: Number(site.contractAmount || 0),
            manager: site.manager || '',
            company: site.companyName || site.company || site.contractor || site.client || '',
            contractor: site.contractor || site.company || site.client || '',
            contractType: site.contractType || '유리공사',
            startDate: site.startDate || '',
            endDate: site.endDate || '',
            advance: Number(site.advance || 0),
            stampType: site.stampType || 'A인감',
            templateType: site.templateType || 'N'
          };
          console.log('🔍 매핑된 siteData:', siteData);
          console.log('🔍 templateType 확인:', site.templateType, '→', siteData.templateType);
        }

        // 기성 데이터 준비 (데이터가 없어도 빈 배열로)
        const gisungData = filteredAndSortedGisung && filteredAndSortedGisung.length > 0 ? 
          filteredAndSortedGisung.map(row => {
            if (!row || typeof row !== 'object') {
              console.warn('⚠️ 유효하지 않은 기성 데이터 행:', row);
              return {
                name: '데이터오류',
                contractAmount: 0,
                advance: 0,
                prevGisung: 0,
                gisungAmount: 0,
                gisungMonth: '',
                note: '데이터오류'
              };
            }
            
            return {
              name: row?.name || '현장명없음',
              contractAmount: Number(row.contractAmount || 0),
              advance: Number(row.advance || 0),
              prevGisung: Number(row.prevGisung || 0),
              gisungAmount: Number(row.gisungAmount || 0),
              gisungMonth: row.gisungMonth || '',
              note: row.note || ''
            };
          }) : [];

        // 실제 현장의 물량 데이터 가져오기
        let siteItems = [];
        
        if (site && site.items && Array.isArray(site.items)) {
          // 물량 데이터 유효성 검사 및 정리 (총공사계, 부가세, 총액 등 제외)
          siteItems = site.items.filter(item => {
            if (!item || typeof item !== 'object') {
              console.warn('⚠️ 유효하지 않은 물량 데이터 항목:', item);
              return false;
            }
            
            const itemName = String(item?.name || '').trim();
            
            // 단수정리는 무조건 포함
            if (itemName.includes('단수정리')) {
              console.log(`✅ 단수정리 항목 포함: ${itemName}`);
              return true;
            }
            
            // 총계, 부가세, 계약금액 관련 항목 제외
            const isTotalItem = itemName.includes('총공사계') || itemName.includes('총 공사계') || 
                               itemName.includes('부가세') || itemName.includes('계약금액') ||
                               itemName.includes('합계') || itemName.includes('소계') ||
                               item.isTotal || item.isVat || item.isTotalWithVat;
            
            // 실제 물량 데이터만 포함 (단수정리 제외한 총계 항목들)
            const shouldInclude = !isTotalItem;
            
            if (shouldInclude) {
              console.log(`✅ 물량 데이터 포함: ${itemName}`);
            } else {
              console.log(`❌ 총계 항목 제외: ${itemName}`);
            }
            
            return shouldInclude;
          }).map(item => ({
            name: item?.name || '품목명없음',
            specification: item.specification || '',
            unit: item.unit || '식',
            quantity: Number(item.quantity || 0),
            unitPrice: Number(item.unitPrice || item.JEprice || 0),
            amount: Number(item.amount || 0)
          }));
          
          console.log('현장 물량 데이터 사용:', siteItems);
          console.log('현장 물량 데이터 상세:', JSON.stringify(siteItems, null, 2));
        } else {
          console.log('현장에서 물량 데이터를 찾을 수 없음:', {
            siteName: selectedSiteName,
            hasSite: !!site,
            hasItems: site ? !!site.items : false,
            isArray: site && site.items ? Array.isArray(site.items) : false
          });
        }
        
        // 물량 데이터가 없으면 기본값 사용
        if (siteItems.length === 0) {
          siteItems = [
            {
              name: '유리공사',
              specification: '기성금청구서',
              unit: '식',
              quantity: 1,
              unitPrice: Number(siteData.contractAmount || 0),
              amount: Number(siteData.contractAmount || 0)
            }
          ];
          console.log('기본 물량 데이터 사용:', siteItems);
        }

        console.log('최종 siteItems 데이터:', siteItems);
        console.log('최종 siteData:', siteData);

        // 파일명 생성 - 청구완료된 기성 데이터의 개수로 차수 결정
        let currentSequence = 1;
        let completedGisung = [];
        
        try {
          // Firebase에서 해당 현장의 모든 기성 데이터 조회 (청구완료 상태와 관계없이)
          const { collection, query, where, getDocs } = await import('firebase/firestore');
          const { db } = await import('../firebase');
          
          const selectedSiteName = selectedSites[0].trim();
          const gisungQuery = query(
            collection(db, 'gisung'),
            where('name', '==', selectedSiteName)
          );
          const gisungSnapshot = await getDocs(gisungQuery);
          completedGisung = gisungSnapshot.docs.map(doc => doc.data());
          currentSequence = completedGisung.length + 1;
          
          console.log(`📊 Firebase 조회: ${selectedSiteName} - 전체 기성 데이터 ${completedGisung.length}개 → ${currentSequence}차`);
        } catch (error) {
          console.error('❌ Firebase 조회 실패:', error);
          // 실패 시 기존 로직 사용
          const selectedSiteName = selectedSites[0].trim();
          completedGisung = filteredAndSortedGisung.filter(gisung => 
            gisung.name === selectedSiteName
          );
          currentSequence = completedGisung.length + 1;
          console.log(`📊 기존 로직 사용: ${selectedSiteName} - 전체 기성 데이터 ${completedGisung.length}개 → ${currentSequence}차`);
        }
        
        // 차수 계산 로그 추가
        console.log(`📊 최종 차수: ${currentSequence}차`);
        console.log(`📊 현장명: ${siteData?.name}`);
        console.log(`📊 청구완료된 기성 데이터: ${completedGisung.length}개`);
        
        console.log('템플릿 생성 시작...');
        
        // 이전 기성 데이터에서 K값을 G값으로 가져오기
        let previousGisungData = null;
        if (currentSequence > 1 && selectedSiteId) {
          try {
            // 1. gisung_uploads 컬렉션에서 extractedItems와 uploadedData 가져오기
            console.log(`🔍 gisung_uploads 조회 조건: siteId=${selectedSiteId}, sequence=${currentSequence - 1}`);
            
            // 먼저 해당 현장의 모든 gisung_uploads 데이터를 가져와서 확인
            const allGisungUploadsQuery = query(
              collection(db, 'gisung_uploads'),
              where('siteId', '==', selectedSiteId)
            );
            const allGisungUploadsSnapshot = await getDocs(allGisungUploadsQuery);
            console.log(`🔍 해당 현장의 모든 gisung_uploads 데이터:`, allGisungUploadsSnapshot.docs.map(doc => doc.data()));
            
            // sequence 필드 타입 확인
            allGisungUploadsSnapshot.docs.forEach(doc => {
              const data = doc.data();
              console.log(`📊 문서 ${doc.id}: sequence=${data.sequence} (타입: ${typeof data.sequence})`);
            });
            
            // 가장 최근에 업로드된 데이터를 가져오기 (sequence 필터 제거)
            console.log(`🔍 조회 조건: siteId=${selectedSiteId}, 가장 최근 업로드 데이터`);
            
            const previousGisungUploadsQuery = query(
              collection(db, 'gisung_uploads'),
              where('siteId', '==', selectedSiteId)
            );
            const previousGisungUploadsSnapshot = await getDocs(previousGisungUploadsQuery);
            
            console.log(`🔍 gisung_uploads 조회 결과: ${previousGisungUploadsSnapshot.size}개 문서`);
            if (!previousGisungUploadsSnapshot.empty) {
              // 가장 최근에 업로드된 문서 선택 (uploadDate 기준)
              const sortedDocs = previousGisungUploadsSnapshot.docs.sort((a, b) => {
                const aDate = a.data().uploadDate?.toDate?.() || new Date(0);
                const bDate = b.data().uploadDate?.toDate?.() || new Date(0);
                return bDate - aDate; // 최신순 정렬
              });
              
              const docData = sortedDocs[0].data();
              console.log(`📊 찾은 문서 데이터:`, docData);
              console.log(`📊 extractedItems:`, docData.extractedItems);
              console.log(`📊 uploadedData:`, docData.uploadedData);
              
              // uploadedData 구조 확인
              if (docData.uploadedData && typeof docData.uploadedData === 'object') {
                const uploadedDataArray = [];
                Object.keys(docData.uploadedData).forEach(key => {
                  if (key.startsWith('item_')) {
                    uploadedDataArray.push(docData.uploadedData[key]);
                  }
                });
                console.log(`📊 변환된 uploadedData 배열:`, uploadedDataArray);
                console.log(`📊 uploadedData 배열 길이:`, uploadedDataArray.length);
              }
            } else {
              console.log(`❌ gisung_uploads에서 ${currentSequence - 1}차 데이터를 찾을 수 없음`);
            }
            
            // 2. gisung 컬렉션에서 previousGisungResult와 advancePaymentResult 가져오기
            console.log(`🔍 gisung 조회 조건: siteId=${selectedSiteId}, sequence=${currentSequence - 1}차`);
            
            const previousGisungQuery = query(
              collection(db, 'gisung'),
              where('siteId', '==', selectedSiteId),
              where('claimStatus', '==', '청구완료'),
              where('sequence', '==', `${currentSequence - 1}차`)
            );
            const previousGisungSnapshot = await getDocs(previousGisungQuery);
            
            console.log(`🔍 gisung 조회 결과: ${previousGisungSnapshot.size}개 문서`);
            if (!previousGisungSnapshot.empty) {
              const gisungData = previousGisungSnapshot.docs[0].data();
              console.log(`📊 찾은 gisung 데이터:`, gisungData);
              console.log(`📊 previousGisungResult:`, gisungData.previousGisungResult);
              console.log(`📊 advancePaymentResult:`, gisungData.advancePaymentResult);
              console.log(`📊 items 배열:`, gisungData.items);
              console.log(`📊 items 배열 길이:`, gisungData.items ? gisungData.items.length : 0);
            } else {
              console.log(`❌ gisung에서 ${currentSequence - 1}차 데이터를 찾을 수 없음`);
            }
            
            // 두 컬렉션의 데이터를 합치기
            previousGisungData = {};
            
            if (!previousGisungUploadsSnapshot.empty) {
              // 가장 최근에 업로드된 문서 선택 (uploadDate 기준)
              const sortedDocs = previousGisungUploadsSnapshot.docs.sort((a, b) => {
                const aDate = a.data().uploadDate?.toDate?.() || new Date(0);
                const bDate = b.data().uploadDate?.toDate?.() || new Date(0);
                return bDate - aDate; // 최신순 정렬
              });
              
              const uploadsData = sortedDocs[0].data();
              previousGisungData = { 
                id: sortedDocs[0].id, 
                ...uploadsData 
              };
              console.log(`📊 gisung_uploads에서 데이터 가져옴:`, uploadsData);
              console.log(`📊 extractedItems 필드:`, uploadsData.extractedItems);
            }
            
            if (!previousGisungSnapshot.empty) {
              const gisungData = previousGisungSnapshot.docs[0].data();
              // gisung 컬렉션의 데이터로 덮어쓰기 (전회기성, 선급금 등)
              previousGisungData = { 
                ...previousGisungData, 
                ...gisungData 
              };
              console.log(`📊 gisung에서 데이터 가져옴:`, gisungData);
              console.log(`📊 previousGisungResult:`, gisungData.previousGisungResult);
              console.log(`📊 advancePaymentResult:`, gisungData.advancePaymentResult);
            }
            
            if (Object.keys(previousGisungData).length > 0) {
              console.log(`📊 Firebase에서 이전 기성 데이터 찾음: ${previousGisungData.sequence}`);
              console.log(`📊 이전 기성 데이터 상세:`, previousGisungData);
              console.log(`📊 이전 기성 데이터 키들:`, Object.keys(previousGisungData));
            } else {
              console.log(`📊 이전 차수(${currentSequence - 1}차) 기성 데이터를 찾을 수 없음`);
            }
          } catch (error) {
            console.error('❌ 이전 기성 데이터 조회 실패:', error);
            // 실패 시 기존 로직 사용
            const previousGisung = filteredAndSortedGisung.find(gisung => 
              gisung.name === siteData?.name && 
              gisung.claimStatus === '청구완료' && 
              gisung.sequence === `${currentSequence - 1}차`
            );
            if (previousGisung) {
              previousGisungData = previousGisung;
              console.log(`📊 기존 로직으로 이전 기성 데이터 찾음: ${previousGisung.sequence}`);
            }
          }
        }
        
        // 기성금청구서 생성 시작 메시지
        const templateTypeText = siteData.templateType === 'L' ? 'LONG' : 'NEW';
        setLoadingMessage(`열심히 제작중에 있습니다.\n기성금청구서 [${templateTypeText}]을 생산하고 있습니다.`);
        
        console.log('🔍 generateTemplateBasedGisungExcel 호출 전 디버깅:');
        console.log('🔍 siteData.templateType:', siteData.templateType);
        console.log('🔍 siteData:', siteData);
        console.log('🔍 siteItems.length:', siteItems.length);
        
        // generateTemplateBasedGisungExcel 함수 존재 확인
        if (typeof generateTemplateBasedGisungExcel !== 'function') {
          console.error('❌ generateTemplateBasedGisungExcel 함수가 정의되지 않았습니다.');
          alert('기성금청구서 생성 함수를 찾을 수 없습니다.');
          throw new Error('기성금청구서 생성 함수를 찾을 수 없습니다.');
        }
        
        // 기성금청구서 템플릿으로 엑셀 생성 (데이터만 입력)
        const result = await generateTemplateBasedGisungExcel(siteData, gisungData, siteItems, currentSequence, previousGisungData);
        
        if (!result || !result.workbook) {
          console.error('❌ 기성금청구서 생성 결과가 유효하지 않습니다:', result);
          alert('기성금청구서 생성에 실패했습니다.');
          throw new Error('기성금청구서 생성에 실패했습니다.');
        }
        
        const { workbook, gisungMonth, templateType } = result;
        
        // 파일명에서 특수문자 제거하여 안전한 파일명 생성
        const safeSiteName = (siteData?.name || '현장명없음').replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
        const fileName = `${currentSequence}차_기성금청구서_${safeSiteName}`;
        
        console.log('파일 다운로드 시작:', fileName);
        
        // ExcelJS 워크북을 직접 파일로 저장 (원래 방식)
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('기성금청구서 다운로드 완료:', fileName);
        alert('기성금청구서가 다운로드되었습니다!');
    } catch (error) {
      console.error('❌ 기성금청구서 다운로드 실패:', error);
      console.error('❌ 오류 상세:', error.stack);
      
      // 사용자에게 더 친화적인 오류 메시지 제공
      let errorMessage = '기성금청구서 다운로드에 실패했습니다.';
      if (error.message.includes('템플릿')) {
        errorMessage = '템플릿 파일을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('Firebase')) {
        errorMessage = '데이터를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('Excel')) {
        errorMessage = '엑셀 파일 생성 중 오류가 발생했습니다. 다시 시도해주세요.';
      } else if (error.message.includes('Cannot read properties of undefined')) {
        errorMessage = '데이터 처리 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.';
      }
      
      alert(errorMessage + '\n\n오류: ' + error.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  // 월별 뷰 엑셀 다운로드 함수 (별도 함수로 분리)
  const handleMonthlyExcelDownload = () => {
    try {
      // 월별 뷰에서는 테이블 내용을 다운로드
      const data = filteredAndSortedGisung.map((row, index) => {
           // 잔액 계산
           const currentSeq = parseInt(row.sequence?.replace('차', '') || '0');
           const totalGisungForSite = allGisungData
             .filter(g => {
               const gSeq = parseInt(g.sequence?.replace('차', '') || '0');
               return g.name === row.name && 
                      g.claimStatus === '청구완료' && 
                      gSeq <= currentSeq;
             })
             .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
           const balance = (row.contractAmount || 0) - (row.advance || 0) - totalGisungForSite;

          return {
            'NO.': index + 1,
            '차수': row.sequence || '1차',
            '기성월': row.gisungMonth || '-',
            '현장명': row.name || '',
            '계약금액': formatNumber(row.contractAmount, true),
            '선급금': formatNumber(row.advance, true),
            '전회기성': formatNumber(row.prevGisung, true),
            '금회기성': formatNumber(row.gisungAmount, true),
            '잔액': formatNumber(balance, true),
            '청구상태': row.claimStatus === '청구완료' ? '청구완료' : '미청구',
            '청구방법': row.claimMethod || '-',
            '입금확인': row.paymentStatus || '미입금',
            '비고': row.note || ''
          };
        });

        const ws = XLSX.utils.json_to_sheet(data);
        
        // 테두리 스타일 설정
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cell_address]) {
              ws[cell_address] = { v: '', t: 's' };
            }
            ws[cell_address].s = {
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } }
              }
            };
          }
        }
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '기성관리목록');
        XLSX.writeFile(wb, `기성관리목록_${monthText}_${new Date().toISOString().split('T')[0]}.xlsx`);
        
        console.log('기성관리목록 다운로드 완료');
        alert('기성관리목록이 다운로드되었습니다!');
    } catch (error) {
      console.error('❌ 월별 뷰 엑셀 다운로드 실패:', error);
      console.error('❌ 오류 상세:', error.stack);
      
      // 사용자에게 더 친화적인 오류 메시지 제공
      let errorMessage = '월별 뷰 엑셀 다운로드에 실패했습니다.';
      if (error.message.includes('템플릿')) {
        errorMessage = '템플릿 파일을 불러올 수 없습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.message.includes('Firebase')) {
        errorMessage = '데이터를 불러올 수 없습니다. 인터넷 연결을 확인해주세요.';
      } else if (error.message.includes('Excel')) {
        errorMessage = '엑셀 파일 생성 중 오류가 발생했습니다. 다시 시도해주세요.';
      } else if (error.message.includes('Cannot read properties of undefined')) {
        errorMessage = '데이터 처리 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.';
      }
      
      alert(errorMessage + '\n\n오류: ' + error.message);
    } finally {
      setDownloadLoading(false);
    }
  };

  const updateSiteTotalProgress = async (siteName) => {
    if (!siteName) return;
    try {
      const site = sites.find(s => s?.name === siteName);
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

  const handleOpen = useCallback(async (item = null) => {
    // console.log('🔍 기성등록 팝업 열기 시작');
    // allGisungData가 비어있을 때만 새로 로드
    if (allGisungData.length === 0) {
      await fetchAllGisung();
      // console.log('✅ allGisungData 새로고침 완료');
    }
    if (item) {
      setSelected(item);
      setFormData({
        name: item?.name || '',
        contractAmount: item.contractAmount || '',
        advance: item.advance || '',
        prevGisung: item.prevGisung || '',
        gisungMonth: item.gisungMonth || '',
        gisungAmount: item.gisungAmount || '',
        currentGisung: item.gisungAmount || '',
        claimMethod: item.claimMethod || '',
        note: item.note || '',
      });
    } else {
      setSelected(null);
      
      // 현장별 뷰에서 선택된 현장이 있으면 자동으로 설정
      let defaultSiteName = '';
      let defaultContractAmount = '';
      let defaultAdvance = '';
      
      if (viewType === 'site' && selectedSites && selectedSites.length > 0) {
        const selectedSiteName = selectedSites[0].trim();
        const site = sites.find(s => s?.name && s?.name.trim() === selectedSiteName);
        if (site) {
          defaultSiteName = site?.name;
          defaultContractAmount = site.contractAmount || '';
          defaultAdvance = site.advance || '';
          // console.log(`✅ 기성등록: 선택된 현장 자동 설정 - ${defaultSiteName}`);
        }
      }
      
      // 현장별 뷰에서 선택된 현장이 있으면 누계기성 계산
      let defaultPrevGisung = '';
      if (viewType === 'site' && selectedSites && selectedSites.length > 0 && defaultSiteName) {
        // 해당 현장의 청구완료된 기성 데이터 찾기 (이전 기성들만)
        const siteGisungData = allGisungData.filter(
          g => (g.name || '').trim().toLowerCase() === defaultSiteName.trim().toLowerCase() && g.claimStatus === '청구완료'
        );
        
        // 누계기성 계산 (이전 기성들만, 현재 기성은 제외)
        const prevSum = siteGisungData.reduce((sum, g) => {
          const amount = Number(g.gisungAmount) || Number(g.currentGisung) || 0;
          return sum + amount;
        }, 0);
        
        defaultPrevGisung = prevSum.toString();
        console.log(`🔍 기성등록 팝업 - ${defaultSiteName} 누계기성 계산: ${prevSum.toLocaleString()}원 (이전 기성들만)`);
      }
      
      // 기본 기성월을 전달로 설정
      const previousMonth = new Date();
      previousMonth.setMonth(previousMonth.getMonth() - 1);
      const defaultGisungMonth = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
      
      setFormData({
        name: defaultSiteName,
        contractAmount: defaultContractAmount,
        advance: defaultAdvance,
        prevGisung: defaultPrevGisung,
        gisungMonth: defaultGisungMonth,
        gisungAmount: '',
        currentGisung: '',
        claimMethod: '',
        note: '',
      });
    }
    setOpen(true);
  }, [allGisungData.length, fetchAllGisung, viewType, selectedSites, sites]);

  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };
  
  // 현장명 더블클릭 핸들러
  const handleSiteNameDoubleClick = (siteName) => {
    console.log(`🔍 현장명 더블클릭: "${siteName}"`);
    
    if (!siteName || siteName.trim() === '') {
      console.log('⚠️ 현장명이 비어있습니다.');
      return;
    }
    
    const site = sites.find(s => s?.name === siteName);
    if (site) {
      console.log(`✅ 현장 정보 팝업 열기: ${site?.name}`);
      setSiteInfoPopup({ open: true, site });
    } else {
      console.log(`⚠️ 현장을 찾을 수 없습니다: ${siteName}`);
      alert(`현장 "${siteName}"을 찾을 수 없습니다.`);
    }
  };
  
  // 현장 정보 팝업 닫기
  const handleCloseSiteInfoPopup = () => {
    setSiteInfoPopup({ open: false, site: null });
  };

  const handleSubmit = async () => {
    try {
      // 현장명 유효성 검사
      if (!formData.name || formData.name.trim() === '') {
        alert('현장명을 입력해주세요.');
        return;
      }
      
      console.log('📝 기성등록 시작:', formData);
      
      // 현장 id 찾아서 formData에 추가 (기존 현장 목록에 있는 경우에만)
      const selectedSite = sites.find(s => s.name === formData.name);
      if (selectedSite) {
        formData.siteId = selectedSite.id;
        console.log(`🔍 기존 현장 선택: ${selectedSite.name} (ID: ${selectedSite.id})`);
      } else {
        // 직접 입력한 새로운 현장명인 경우 siteId는 설정하지 않음
        console.log(`🔍 새로운 현장명 직접 입력: ${formData.name} (siteId 없음)`);
        delete formData.siteId; // siteId 제거
      }
      
      // 차수 계산 - 해당 현장의 기존 기성 데이터 개수 + 1
      const existingGisungCount = allGisungData.filter(gisung => gisung.name === formData.name).length;
      const sequence = existingGisungCount + 1;
      console.log(`📊 차수 계산: ${formData.name} - 기존 ${existingGisungCount}개 → ${sequence}차`);
      
      // currentGisung을 gisungAmount로 매핑
      const dataToSave = {
        ...formData,
        sequence: `${sequence}차`, // 현장별 차수 설정
        gisungAmount: Number(formData.currentGisung) || 0, // 금회기성을 기성금액으로 저장 (숫자로 변환)
        currentGisung: Number(formData.currentGisung) || 0, // 호환성을 위해 currentGisung도 저장
        prevGisung: Number(formData.prevGisung) || 0, // 누계기성 명시적으로 저장 (숫자로 변환)
        claimMethod: formData.claimMethod || '', // 청구방법 저장
      };
      
      // console.log('💾 저장할 데이터:', dataToSave);
      // console.log('💾 기성금액 확인:', {
      //   currentGisung: formData.currentGisung,
      //   gisungAmount: dataToSave.gisungAmount,
      //   prevGisung: dataToSave.prevGisung
      // });
      
      if (selected) {
        // 수정할 때는 기존 데이터 유지하되, 변경된 필드들 업데이트
        const updateData = {
          name: formData.name, // 현장명 업데이트
          gisungAmount: Number(formData.currentGisung) || 0, // 금회기성만 업데이트 (숫자로 변환)
          currentGisung: Number(formData.currentGisung) || 0, // 호환성을 위해 currentGisung도 업데이트
          gisungMonth: formData.gisungMonth,
          claimMethod: formData.claimMethod || '', // 청구방법 업데이트
          note: formData.note,
          contractAmount: formData.contractAmount, // 계약금액 업데이트
          advance: formData.advance, // 선급금 업데이트
          prevGisung: Number(formData.prevGisung) || 0, // 누계기성 업데이트
          updatedAt: serverTimestamp()
        };
        
        // 현장명이 변경된 경우 siteId 업데이트 (기존 현장 목록에 있는 경우에만)
        if (formData.name !== selected.name) {
          const newSite = sites.find(s => s.name === formData.name);
          if (newSite) {
            updateData.siteId = newSite.id;
            console.log(`🔄 현장명 변경: ${selected.name} → ${formData.name}, siteId: ${newSite.id}`);
          } else {
            // 직접 입력한 새로운 현장명인 경우 siteId 제거
            updateData.siteId = null;
            console.log(`🔄 새로운 현장명으로 변경: ${selected.name} → ${formData.name} (siteId 제거)`);
          }
        }
        
        await updateDoc(doc(db, 'gisung', selected.id), updateData);
        console.log('✅ 기성 데이터 수정 완료:', {
          현장명: formData.name,
          기성월: formData.gisungMonth,
          금회기성: formData.currentGisung,
          청구방법: formData.claimMethod
        });
      } else {
        // 새로 등록할 때만 차수와 전회기성 설정
        await addDoc(collection(db, 'gisung'), {
          ...dataToSave,
          createdAt: serverTimestamp()
        });
        console.log('✅ 기성 데이터 등록 완료');
      }
      
      // 현장 총 진행률 업데이트 (기존 현장 목록에 있는 경우에만)
      const existingSite = sites.find(s => s.name === formData.name);
      if (existingSite) {
        await updateSiteTotalProgress(formData.name);
        console.log(`✅ 현장 총 진행률 업데이트 완료: ${formData.name}`);
      } else {
        console.log(`ℹ️ 새로운 현장명이므로 현장 총 진행률 업데이트 건너뜀: ${formData.name}`);
      }
      
      handleClose();
      
      // 데이터 새로고침 (모든 데이터 업데이트)
      await fetchGisung();
      await fetchAllGisung();
      
      console.log('✅ 기성등록 완료 및 데이터 새로고침 완료');
    } catch (e) {
      console.error('❌ 기성등록 실패:', e);
    }
  };

  const handleDelete = async (itemToDelete) => {
    // sequence에서 "차" 제거 (이미 "2차" 형태로 저장되어 있음)
    const sequence = itemToDelete.sequence || 'N';
    if (window.confirm(`"${itemToDelete.name}" ${sequence} 기성 데이터를 정말 삭제하시겠습니까?`)) {
      try {
        console.log(`🗑️ 기성 데이터 삭제 시작: ${itemToDelete.name} (ID: ${itemToDelete.id})`);
        
        // Firebase에서 기성 데이터 삭제
        await deleteDoc(doc(db, 'gisung', itemToDelete.id));
        console.log(`✅ Firebase에서 기성 데이터 삭제 완료: ${itemToDelete.name}`);
        
        // 현장 총 진행률 업데이트
        await updateSiteTotalProgress(itemToDelete.name);
        console.log(`✅ 현장 총 진행률 업데이트 완료: ${itemToDelete.name}`);
        
        // 로컬 상태에서도 즉시 제거
        setGisungList(prev => prev.filter(item => item.id !== itemToDelete.id));
        
        // 전체 데이터 새로고침
        fetchGisung();
        
        console.log(`✅ 기성 데이터 삭제 완료: ${itemToDelete.name}`);
      } catch (error) {
        console.error('❌ 기성 데이터 삭제 실패:', error);
        alert('삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // 현장명 선택 시 해당 현장의 누계기성(전회기성) 자동 합산
  const handleSiteChange = (e) => {
    const siteName = e.target.value;
    const selectedSite = sites.find(s => s.name === siteName);
    // name 매칭을 trim, 대소문자 구분 없이 엄격하게, 청구완료된 것만
    const siteGisungData = allGisungData.filter(
      g => (g.name || '').trim().toLowerCase() === siteName.trim().toLowerCase() && g.claimStatus === '청구완료'
    );
    
    // 여러 필드에서 기성금액 찾기 (청구완료된 것만)
    const prevSum = siteGisungData.reduce((sum, g) => {
      const amount = Number(g.gisungAmount) || Number(g.currentGisung) || 0;
      console.log(`📊 누계기성 계산: ${g.sequence} - gisungAmount: ${g.gisungAmount}, currentGisung: ${g.currentGisung}, 계산된값: ${amount}, 청구상태: ${g.claimStatus}`);
      return sum + amount;
    }, 0);
    
    console.log(`🔍 현장 변경: ${siteName} - 누계기성: ${prevSum.toLocaleString()}원`);
    
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

  // 청구페이지 연동 함수: 기성현황에서 청구상태 변경 시 청구페이지의 해당 항목도 업데이트
  const syncClaimStatusToClaims = async (gisungItem, newStatus) => {
    try {
      console.log(`🔄 청구페이지 연동 시작: ${gisungItem.name} - ${newStatus}`);
      
      // 청구 컬렉션에서 같은 현장명, 같은 차수, 같은 금액의 항목 찾기
      const claimsQuery = query(
        collection(db, 'claims'),
        where('siteName', '==', gisungItem.name)
      );
      const claimsSnapshot = await getDocs(claimsQuery);
      
      if (claimsSnapshot.empty) {
        console.log(`⚠️ 청구 데이터에서 현장 "${gisungItem.name}"을 찾을 수 없습니다.`);
        return;
      }
      
      const claimsData = claimsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`🔍 찾은 청구 데이터:`, claimsData);
      
      // 같은 차수와 금액을 가진 청구 항목 찾기
      const matchingClaims = claimsData.filter(claim => {
        // 차수 비교 (예: "1차" vs "1차")
        const gisungSequence = gisungItem.sequence || '';
        const claimSequence = claim.sequence || '';
        
        // 금액 비교 (소수점 오차 고려)
        const gisungAmount = Number(gisungItem.gisungAmount) || 0;
        const claimAmount = Number(claim.claimAmount) || 0;
        const amountMatch = Math.abs(gisungAmount - claimAmount) < 1; // 1원 이하 차이면 같은 금액으로 인식
        
        console.log(`🔍 청구 항목 비교:`, {
          gisungSequence,
          claimSequence,
          gisungAmount,
          claimAmount,
          amountMatch,
          sequenceMatch: gisungSequence === claimSequence
        });
        
        return gisungSequence === claimSequence && amountMatch;
      });
      
      console.log(`🔍 매칭된 청구 항목:`, matchingClaims);
      
      if (matchingClaims.length === 0) {
        console.log(`⚠️ 같은 차수와 금액을 가진 청구 항목을 찾을 수 없습니다.`);
        return;
      }
      
      // 청구상태 매핑 (기성현황 → 청구페이지)
      const claimStatusMap = {
        '청구완료': 'O',
        '미청구': 'X'
      };
      
      const newClaimStatus = claimStatusMap[newStatus] || 'X';
      
      // 매칭된 모든 청구 항목 업데이트
      for (const claim of matchingClaims) {
        console.log(`🔄 청구 항목 업데이트: ${claim.id} - ${claim.claimStatus} → ${newClaimStatus}`);
        
        const claimRef = doc(db, 'claims', claim.id);
        await updateDoc(claimRef, {
          claimStatus: newClaimStatus,
          updatedAt: serverTimestamp()
        });
        
        console.log(`✅ 청구 항목 업데이트 완료: ${claim.id}`);
      }
      
      console.log(`✅ 청구페이지 연동 완료: ${matchingClaims.length}개 항목 업데이트`);
      
    } catch (error) {
      console.error('❌ 청구페이지 연동 실패:', error);
      // 연동 실패해도 기성현황 업데이트는 계속 진행
    }
  };



  // 청구상태 변경 함수
  const handleClaimStatusChange = async (gisungItem) => {
    try {
      const newStatus = gisungItem.claimStatus === '청구완료' ? '미청구' : '청구완료';
      
      console.log(`🔄 청구상태 변경 시작: ${gisungItem.name}`);
      console.log(`🔍 현재 상태: ${gisungItem.claimStatus} → ${newStatus}`);
      console.log(`🔍 기존 데이터:`, gisungItem);
      
      // Firebase에서 상태만 업데이트 (기존 데이터 유지)
      console.log(`🔥 Firebase 상태 업데이트 시작: ID ${gisungItem.id}`);
      const gisungRef = doc(db, 'gisung', gisungItem.id);
      
      const updateData = {
        claimStatus: newStatus,
        updatedAt: serverTimestamp()
      };
      
      console.log(`📝 저장할 데이터:`, updateData);
      
      await updateDoc(gisungRef, updateData);
      console.log(`✅ Firebase 상태 업데이트 완료`);
      
      // 청구페이지 연동: 같은 현장명, 같은 차수, 같은 금액의 청구 항목 찾아서 상태 업데이트
      await syncClaimStatusToClaims(gisungItem, newStatus);
      
      // 로컬 상태 업데이트 (기존 데이터 유지)
      setGisungList(prev => 
        prev.map(item => 
          item.id === gisungItem.id 
            ? { ...item, claimStatus: newStatus }
            : item
        )
      );
      console.log(`✅ 로컬 상태 업데이트 완료`);
      
      // 전체 데이터 새로고침
      console.log(`🔄 전체 데이터 새로고침 시작...`);
      await fetchAllGisung();
      await fetchGisung();
      console.log(`✅ 전체 데이터 새로고침 완료`);
      
      console.log(`✅ 청구상태 변경 완료: ${gisungItem.name} - ${newStatus}`);
      
      // 성공 메시지
      alert(`청구상태가 ${newStatus}로 변경되었습니다.`);
      
    } catch (error) {
      console.error('❌ 청구상태 변경 실패:', error);
      console.error('❌ 오류 상세:', error.stack);
      alert('청구상태 변경에 실패했습니다: ' + error.message);
    }
  };

  // 입금확인 상태 변경 함수
  const handlePaymentStatusChange = async (gisungItem) => {
    try {
      let newStatus;
      if (!gisungItem.paymentStatus || gisungItem.paymentStatus === '미입금') {
        newStatus = '입금완료';
      } else if (gisungItem.paymentStatus === '입금완료') {
        newStatus = '일부분';
      } else if (gisungItem.paymentStatus === '일부분') {
        newStatus = '악성';
      } else if (gisungItem.paymentStatus === '악성') {
        newStatus = '미입금';
      }
      
      console.log(`🔄 입금확인 상태 변경 시작: ${gisungItem.name}`);
      console.log(`🔍 현재 상태: ${gisungItem.paymentStatus || '미입금'} → ${newStatus}`);
      
      // Firebase에서 상태만 업데이트 (기존 데이터 유지)
      console.log(`🔥 Firebase 상태 업데이트 시작: ID ${gisungItem.id}`);
      const gisungRef = doc(db, 'gisung', gisungItem.id);
      
      const updateData = {
        paymentStatus: newStatus,
        updatedAt: serverTimestamp()
      };
      
      console.log(`📝 저장할 데이터:`, updateData);
      
      await updateDoc(gisungRef, updateData);
      console.log(`✅ Firebase 상태 업데이트 완료`);
      
      // 로컬 상태 업데이트 (기존 데이터 유지)
      setGisungList(prev => 
        prev.map(item => 
          item.id === gisungItem.id 
            ? { ...item, paymentStatus: newStatus }
            : item
        )
      );
      console.log(`✅ 로컬 상태 업데이트 완료`);
      
      // 전체 데이터 새로고침
      console.log(`🔄 전체 데이터 새로고침 시작...`);
      await fetchAllGisung();
      await fetchGisung();
      console.log(`✅ 전체 데이터 새로고침 완료`);
      
      console.log(`✅ 입금확인 상태 변경 완료: ${gisungItem.name} - ${newStatus}`);
      
      // 성공 메시지
      alert(`입금확인 상태가 ${newStatus}로 변경되었습니다.`);
      
    } catch (error) {
      console.error('❌ 입금확인 상태 변경 실패:', error);
      console.error('❌ 오류 상세:', error.stack);
      alert('입금확인 상태 변경에 실패했습니다: ' + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    
    if (window.confirm(`선택된 ${selectedItems.length}개 기성 데이터를 정말 삭제하시겠습니까?\n\n삭제할 항목들:\n${itemsToDelete.map(item => `- ${item?.name} ${item.sequence || 'N'}`).join('\n')}`)) {
      try {
        console.log(`🗑️ 일괄 삭제 시작: ${selectedItems.length}개 항목`);
        
        // 선택된 항목들의 정보 가져오기
        const itemsToDelete = gisungList.filter(item => selectedItems.includes(item.id));
        
        // Firebase에서 일괄 삭제
        for (const id of selectedItems) {
          await deleteDoc(doc(db, 'gisung', id));
          console.log(`✅ Firebase에서 기성 데이터 삭제 완료: ID ${id}`);
        }
        
        // 현장별로 총 진행률 업데이트
        const uniqueSiteNames = [...new Set(itemsToDelete.map(item => item?.name))];
        for (const siteName of uniqueSiteNames) {
          await updateSiteTotalProgress(siteName);
          console.log(`✅ 현장 총 진행률 업데이트 완료: ${siteName}`);
        }
        
        // 선택 상태 초기화
        setSelectedItems([]);
        
        // 로컬 상태에서도 즉시 제거
        setGisungList(prev => prev.filter(item => !selectedItems.includes(item.id)));
        
        // 전체 데이터 새로고침
        fetchGisung();
        
        console.log(`✅ 일괄 삭제 완료: ${selectedItems.length}개 항목`);
      } catch (error) {
        console.error('❌ 일괄 삭제 실패:', error);
        alert('일괄 삭제에 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  // 기성금청구서 업로드 함수
  const handleUploadGisung = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setUploadMessage('기성금청구서 파일을 업로드 중...');
    
    try {
      // 현장별 뷰에서만 기성금청구서 업로드
      if (viewType === 'site' && selectedSites && selectedSites.length > 0) {
        // 현장 데이터 찾기 (현재 선택된 현장 우선, 없으면 formData 사용)
        let siteData = null;
        
        // 현장별 뷰에서 선택된 현장이 있으면 해당 정보 사용
        const selectedSiteName = selectedSites[0].trim();
        siteData = sites.find(s => s.name && s.name.trim() === selectedSiteName);
        console.log('🔍 선택된 현장으로 업로드:', selectedSiteName, siteData);
        
        // 선택된 현장이 없으면 formData 사용
        if (!siteData) {
          siteData = sites.find(site => site?.name === formData.name);
          console.log('🔍 formData로 현장 찾기:', formData.name, siteData);
        }
        
        if (!siteData) {
          throw new Error('현장 정보를 찾을 수 없습니다. 현장을 선택해주세요.');
        }
        
        console.log('✅ 업로드할 현장 정보:', siteData);
        
        // 기성금청구서 업로드 (올바른 함수 사용)
        const { parseGisungExcelUpload } = await import('../utils/gisungUploadUtils');
        const result = await parseGisungExcelUpload(selectedFile, siteData, filteredAndSortedGisung);
        
        if (result.success) {
          const itemCount = result.data ? result.data.length : 0;
          setUploadMessage(`✅ 기성금청구서 업로드 완료! (${itemCount}개 항목) - 테이블에 추가됨`);
          setSelectedFile(null);
          
          // 즉시 데이터 새로고침
          console.log('🔄 업로드 후 데이터 새로고침 시작...');
          await fetchGisung();
          await fetchAllGisung();
          
          setTimeout(() => {
            setUploadDialog(false);
            setUploadMessage('');
          }, 3000);
        } else {
          setUploadMessage(`업로드 실패: ${result.message}`);
        }
      } else {
        // 월별 뷰에서는 목록 업로드
        setUploadMessage('목록 파일을 업로드 중...');
        
        // 엑셀 파일 읽기
        const data = new Uint8Array(await selectedFile.arrayBuffer());
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('📊 업로드된 데이터:', jsonData);
        
        // 데이터 처리 및 저장
        let successCount = 0;
        let errorCount = 0;
        
        for (const row of jsonData) {
          try {
            // 필수 필드 확인
            if (!row['현장명'] || !row['기성월']) {
              console.warn('필수 필드 누락:', row);
              continue;
            }
            
            // 기성 데이터 생성
            const gisungData = {
              name: row['현장명'] || '',
              sequence: row['차수'] || '1차',
              gisungMonth: row['기성월'] || '',
              contractAmount: parseFloat(row['계약금액']?.replace(/[^\d.-]/g, '') || '0'),
              advance: parseFloat(row['선급금']?.replace(/[^\d.-]/g, '') || '0'),
              prevGisung: parseFloat(row['전회기성']?.replace(/[^\d.-]/g, '') || '0'),
              gisungAmount: parseFloat(row['금회기성']?.replace(/[^\d.-]/g, '') || '0'),
              claimMethod: row['청구방법'] || '',
              claimStatus: row['청구상태'] === '청구완료' ? '청구완료' : '미청구',
              paymentStatus: row['입금확인'] || '미입금',
              note: row['비고'] || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            // Firebase에 저장
            await addDoc(collection(db, 'gisung'), gisungData);
            successCount++;
            
          } catch (error) {
            console.error('행 처리 오류:', error, row);
            errorCount++;
          }
        }
        
        setUploadMessage(`✅ 목록 업로드 완료! (${successCount}개 성공, ${errorCount}개 실패)`);
        setSelectedFile(null);
        
        // 즉시 데이터 새로고침
        console.log('🔄 업로드 후 데이터 새로고침 시작...');
        await fetchGisung();
        await fetchAllGisung();
        
        setTimeout(() => {
          setUploadDialog(false);
          setUploadMessage('');
        }, 3000);
      }
    } catch (error) {
      console.error('업로드 실패:', error);
      setUploadMessage(`업로드 실패: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 모바일용 기성 데이터 카드 컴포넌트
  const MobileGisungCard = ({ gisung, onEdit, onDelete, onStatusChange, onPaymentStatusChange }) => {
      const handleSiteNameDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation(); // 이벤트 전파 중단
    console.log(`🔍 모바일 현장명 더블클릭: "${gisung?.name}"`);
    console.log(`🔍 sites 데이터:`, sites);
    console.log(`🔍 sites 길이:`, sites.length);
    
    if (!gisung?.name || gisung?.name.trim() === '') {
      console.log('⚠️ 현장명이 비어있습니다.');
      return;
    }
    
            const site = sites.find(s => s?.name === gisung?.name);
    console.log(`🔍 찾은 site:`, site);
    
    if (site) {
      console.log(`✅ 모바일 현장 정보 팝업 열기: ${site?.name}`);
      setSiteInfoPopup({ open: true, site });
    } else {
      console.log(`⚠️ 현장을 찾을 수 없습니다: ${gisung?.name}`);
      console.log(`⚠️ 전체 sites:`, sites.map(s => s?.name));
      alert(`현장 "${gisung?.name}"을 찾을 수 없습니다.`);
    }
  };

    return (
    <Card 
      sx={{ 
        mb: 2, 
        bgcolor: '#232b3b', 
        border: '1px solid #333',
        '&:hover': { bgcolor: '#2c3446' },
        cursor: 'pointer'
      }}
      onDoubleClick={handleSiteNameDoubleClick}
      onClick={(e) => {
        console.log('🔍 카드 클릭됨');
        e.stopPropagation();
      }}
      title="더블클릭하여 현장 정보 보기"
    >
      <CardContent sx={{ p: 2 }}>
        {/* 헤더: 현장명, 차수, 기성월 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#90caf9', 
              fontWeight: 700, 
              fontSize: '1rem',
              cursor: 'pointer',
              '&:hover': { 
                textDecoration: 'underline',
                color: '#64b5f6'
              }
            }}
            onDoubleClick={handleSiteNameDoubleClick}
            title="더블클릭하여 현장 정보 보기"
          >
            {gisung.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={gisung.sequence || '1차'} 
              size="small"
              sx={{ bgcolor: '#ff6b35', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} 
            />
            <Chip
              label={gisung.gisungMonth || '-'} 
              size="small"
              sx={{ bgcolor: '#1976d2', color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} 
            />
          </Box>
        </Box>

        {/* 금액 정보 */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid xs={6}>
            <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>계약금액</Typography>
            <Typography sx={{ color: '#43e97b', fontWeight: 700, fontSize: '0.9rem' }}>
              {formatNumber(gisung.contractAmount, true)}
            </Typography>
          </Grid>
          <Grid xs={6}>
            <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>선급금</Typography>
            <Typography sx={{ color: '#ffd600', fontWeight: 700, fontSize: '0.9rem' }}>
              {formatNumber(gisung.advance, true)}
            </Typography>
          </Grid>
          <Grid xs={6}>
            <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>전회기성</Typography>
            <Typography sx={{ color: '#a084e8', fontWeight: 700, fontSize: '0.9rem' }}>
              {formatNumber(gisung.prevGisung, true)}
            </Typography>
          </Grid>
          <Grid xs={6}>
            <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>금회기성</Typography>
            <Typography sx={{ color: '#ef5350', fontWeight: 700, fontSize: '0.9rem' }}>
              {formatNumber(gisung.gisungAmount, true)}
            </Typography>
          </Grid>
                     <Grid xs={6}>
             <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>잔액</Typography>
             <Typography sx={{ color: '#43e97b', fontWeight: 700, fontSize: '0.9rem' }}>
               {(() => {
                 // 현재 기성의 차수 추출
                 const currentSeq = parseInt(gisung.sequence?.replace('차', '') || '0');
                 
                 // 해당 현장의 현재 차수 이하의 청구완료된 기성 합계 계산
                 const totalGisungForSite = allGisungData
                   .filter(g => {
                     const gSeq = parseInt(g.sequence?.replace('차', '') || '0');
                     return g.name === gisung.name && 
                            g.claimStatus === '청구완료' && 
                            gSeq <= currentSeq;
                   })
                   .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
                 
                 // 잔액 = 계약금액 - 선급금 - 해당 차수까지의 누계기성
                 const balance = (gisung.contractAmount || 0) - (gisung.advance || 0) - totalGisungForSite;
                 return balance.toLocaleString();
               })()}원
             </Typography>
           </Grid>
          <Grid xs={6}>
            <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>청구방법</Typography>
            <Typography sx={{ color: '#fff', fontWeight: 600, fontSize: '0.9rem' }}>
              {gisung.claimMethod || '-'}
            </Typography>
          </Grid>
        </Grid>

        {/* 하단: 청구상태, 입금확인, 비고, 액션 버튼 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={gisung.claimStatus === '청구완료' ? '청구완료' : '미청구'}
              size="small"
              onClick={() => onStatusChange(gisung)}
              sx={{
                bgcolor: gisung.claimStatus === '청구완료' ? '#4caf50' : '#ff9800',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.7rem',
                '&:hover': {
                  bgcolor: gisung.claimStatus === '청구완료' ? '#45a049' : '#f57c00'
                }
              }}
            />
            <Chip
              label={gisung.paymentStatus || '미입금'}
              size="small"
              onClick={() => onPaymentStatusChange(gisung)}
              sx={{
                bgcolor: gisung.paymentStatus === '입금완료' ? '#ffd600' : 
                        gisung.paymentStatus === '일부분' ? '#ff9800' :
                        gisung.paymentStatus === '악성' ? '#f44336' : '#2a2a2a',
                color: gisung.paymentStatus === '입금완료' ? '#000' : '#fff',
                border: gisung.paymentStatus === '입금완료' ? '2px solid #ffd600' : 
                       gisung.paymentStatus === '일부분' ? '2px solid #ff9800' :
                       gisung.paymentStatus === '악성' ? '2px solid #f44336' : '2px solid #fff',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.7rem',
                '&:hover': {
                  bgcolor: gisung.paymentStatus === '입금완료' ? '#ffed4e' : 
                          gisung.paymentStatus === '일부분' ? '#ffb74d' :
                          gisung.paymentStatus === '악성' ? '#ef5350' : '#444'
                }
              }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(gisung);
              }}
              sx={{ color: '#90caf9', p: 0.5 }}
            >
              <EditIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(gisung);
              }}
              sx={{ color: '#ef5350', p: 0.5 }}
            >
              <DeleteIcon sx={{ fontSize: '1rem' }} />
            </IconButton>
          </Box>
        </Box>

        {/* 비고 */}
        {gisung.note && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #333' }}>
            <Typography sx={{ color: '#bbb', fontSize: '0.8rem' }}>비고</Typography>
            <Typography sx={{ color: '#fff', fontSize: '0.8rem', lineHeight: 1.4 }}>
              {gisung.note}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
    );
  };

  const StatCard = ({ title, value, color }) => (
    <Grid size={{ xs: 3, sm: 6, md: 3 }}>
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
                          {formatNumber(value, true)}
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



  // 오류 처리 추가
  if (!sites || sites.length === 0) {
    return (
      <Box sx={{ 
        width: '100%', 
        p: isMobile ? 0 : 2,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
        flexDirection: 'column',
        gap: 2
      }}>
        <Typography variant="h6" sx={{ color: '#fff' }}>
          현장 데이터를 불러오는 중...
        </Typography>
        <Typography variant="body2" sx={{ color: '#bbb' }}>
          로딩 중... 잠시만 기다려주세요.
        </Typography>
        <Typography variant="body2" sx={{ color: '#bbb' }}>
          sites.length: {sites ? sites.length : 'undefined'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: isMobile ? '100vw' : '100%', 
      p: isMobile ? 1 : 2, // 모바일에서 패딩 추가
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '0px' : 'auto', // 모바일에서 left 조정
      overflow: 'hidden' // 모바일에서 오버플로우 방지
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
         <StatCard title={isMobile ? "계약금액" : "총 계약금액"} value={stats.totalContractAmount} color="#43e97b" />
         <StatCard title={isMobile ? "선급금" : "총 선급금"} value={stats.totalAdvance} color="#ffd600" />
         <StatCard title={isMobile ? "기성금액" : "총 기성금액"} value={stats.totalGisungAmount} color="#ef5350" />
         <StatCard title={isMobile ? "입금완료금액" : "입금완료금액"} value={stats.totalPaidAmount} color="#4caf50" />
         {viewType !== 'month' && (
           <StatCard title="잔액" value={stats.totalBalance} color="#a084e8" />
         )}
       </Grid>

             {/* 버튼들 */}
       <Box sx={{ 
         display: 'flex', 
         gap: isMobile ? 1 : 2, 
         mb: 3, 
         alignItems: 'center',
         justifyContent: isMobile ? 'center' : 'flex-end',
         flexDirection: isMobile ? 'column' : 'row',
         flexWrap: isMobile ? 'wrap' : 'nowrap'
       }}>
                 {selectedItems.length > 0 && (
           <Button 
             variant="contained" 
             color="error" 
             onClick={handleBulkDelete}
             sx={{ 
               bgcolor: '#d32f2f',
               '&:hover': { bgcolor: '#c62828' },
               fontSize: isMobile ? '0.8rem' : 'inherit',
               px: isMobile ? 1 : 2
             }}
           >
             {isMobile ? `삭제 (${selectedItems.length})` : `선택 삭제 (${selectedItems.length})`}
           </Button>
         )}
        
        {/* 청구예정목록 버튼 */}
        <Button
          variant="contained" 
          color="info" 
          onClick={() => navigate('/claims')}
          sx={{
            bgcolor: '#1976d2',
            '&:hover': { bgcolor: '#1565c0' },
            fontSize: isMobile ? '0.8rem' : 'inherit',
            px: isMobile ? 1 : 2
          }}
        >
          청구예정목록
        </Button>
        
        {/* 기성등록 버튼 */}
        <Button
          variant="contained" 
          color="success" 
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            bgcolor: '#2e7d32',
            '&:hover': { bgcolor: '#1b5e20' },
            fontSize: isMobile ? '0.8rem' : 'inherit',
            px: isMobile ? 1 : 2
          }}
        >
          기성등록
        </Button>
                             <Button
           variant="contained" 
           color="secondary" 
                 startIcon={<CloudDownloadIcon />}
                 onClick={handleGisungClaimDownload}
                 sx={{
             bgcolor: '#9c27b0',
             '&:hover': { bgcolor: '#7b1fa2' },
             fontSize: isMobile ? '0.8rem' : 'inherit',
             px: isMobile ? 1 : 2
                 }}
               >
                 {isMobile ? '기성청구서' : (viewType === 'site' ? '기성금청구서 다운로드' : '목록 다운로드')}
               </Button>

                         <Button
           variant="contained" 
           color="warning" 
           startIcon={<UploadIcon />}
           onClick={() => setUploadDialog(true)}
               sx={{
             bgcolor: '#f59e42',
             '&:hover': { bgcolor: '#d97706' },
             fontSize: isMobile ? '0.8rem' : 'inherit',
             px: isMobile ? 1 : 2
           }}
         >
           {isMobile ? '기성업로드' : (viewType === 'site' ? '기성금청구서 업로드' : '목록 업로드')}
             </Button>


      </Box>

      {/* 데이터 표시 */}
      {isMobile ? (
        // 모바일: 카드 형태로 표시
        <Box sx={{ 
          mt: 2, 
          maxHeight: 'calc(100vh - 300px)', // 모바일에서 스크롤 가능한 높이 설정
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingBottom: '20px' // 하단 여백 추가
        }}>
          {filteredAndSortedGisung.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              color: '#bbb', 
              py: 4,
              bgcolor: '#181f2e',
              borderRadius: 4,
              border: '1px solid #333'
            }}>
              <Typography variant="h6">
                {search ? '검색 결과가 없습니다.' : '기성 데이터가 없습니다.'}
              </Typography>
            </Box>
          ) : (
            filteredAndSortedGisung.map(row => (
              <MobileGisungCard
                key={row.id}
                gisung={row}
                onEdit={handleOpen}
                onDelete={handleDelete}
                onStatusChange={handleClaimStatusChange}
                onPaymentStatusChange={handlePaymentStatusChange}
              />
            ))
          )}
        </Box>
      ) : (
        // 데스크톱: 테이블 형태로 표시
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
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedItems.length > 0 && selectedItems.length < filteredAndSortedGisung.length}
                      checked={filteredAndSortedGisung.length > 0 && selectedItems.length === filteredAndSortedGisung.length}
                      onChange={handleSelectAll}
                      sx={{ color: '#fff' }}
                    />
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#fff', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#2c3e50' }
                    }}
                    onClick={() => handleSort('sequence')}
                  >
                    차수 {sortField === 'sequence' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#fff', 
                      fontWeight: 700, 
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#2c3e50' }
                    }}
                    onClick={() => handleSort('gisungMonth')}
                  >
                    기성월 {sortField === 'gisungMonth' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>현장명</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>계약금액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>선급금</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>전회기성</TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#fff', 
                      fontWeight: 700,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: '#2c3e50' }
                    }}
                    onClick={() => handleSort('gisungAmount')}
                  >
                    금회기성 {sortField === 'gisungAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>잔액</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>청구상태</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>청구방법</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>입금확인</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>비고</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 700 }}>관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAndSortedGisung.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} sx={{ textAlign: 'center', color: '#bbb', py: 4 }}>
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
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedItems.includes(row.id)}
                          onChange={() => handleSelectItem(row.id)}
                          sx={{ color: '#90caf9' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.sequence || '1차'} 
                          size="small"
                          sx={{
                            bgcolor: '#ff6b35',
                            color: '#fff',
                            fontWeight: 700
                          }} 
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
                      <TableCell 
                        sx={{ 
                          color: '#fff',
                          cursor: 'pointer',
                          '&:hover': { 
                            bgcolor: '#2c3446',
                            textDecoration: 'underline'
                          }
                        }}
                        onDoubleClick={() => handleSiteNameDoubleClick(row.name)}
                        title="더블클릭하여 현장 정보 보기"
                      >
                        {row.name}
                      </TableCell>
                      <TableCell sx={{ color: '#43e97b', fontWeight: 700 }}>
                        {formatNumber(row.contractAmount, true)}
                      </TableCell>
                      <TableCell sx={{ color: '#ffd600', fontWeight: 700 }}>
                        {formatNumber(row.advance, true)}
                      </TableCell>
                      <TableCell sx={{ color: '#a084e8', fontWeight: 700 }}>
                        {formatNumber(row.prevGisung, true)}
                      </TableCell>
                      <TableCell sx={{ color: '#ef5350', fontWeight: 700 }}>
                        {formatNumber(row.gisungAmount, true)}
                      </TableCell>
                                             <TableCell sx={{ color: '#43e97b', fontWeight: 700 }}>
                         {(() => {
                           // 현재 기성의 차수 추출
                           const currentSeq = parseInt(row.sequence?.replace('차', '') || '0');
                           
                           // 해당 현장의 현재 차수 이하의 청구완료된 기성 합계 계산
                           const totalGisungForSite = allGisungData
                             .filter(g => {
                               const gSeq = parseInt(g.sequence?.replace('차', '') || '0');
                               return g.name === row.name && 
                                      g.claimStatus === '청구완료' && 
                                      gSeq <= currentSeq;
                             })
                             .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
                           
                           // 잔액 = 계약금액 - 선급금 - 해당 차수까지의 누계기성
                           const balance = (row.contractAmount || 0) - (row.advance || 0) - totalGisungForSite;
                           return formatNumber(balance, true);
                         })()}
                       </TableCell>
                      <TableCell>
                        <Chip
                          label={row.claimStatus === '청구완료' ? '청구완료' : '미청구'}
                          size="small"
                          onClick={() => handleClaimStatusChange(row)}
                          sx={{
                            bgcolor: row.claimStatus === '청구완료' ? '#4caf50' : '#ff9800',
                            color: '#fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: row.claimStatus === '청구완료' ? '#45a049' : '#f57c00'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#fff' }}>
                        {row.claimMethod || '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.paymentStatus || '미입금'}
                          size="small"
                          onClick={() => handlePaymentStatusChange(row)}
                          sx={{
                            bgcolor: row.paymentStatus === '입금완료' ? '#ffd600' : 
                                    row.paymentStatus === '일부분' ? '#ff9800' :
                                    row.paymentStatus === '악성' ? '#f44336' : '#2a2a2a',
                            color: row.paymentStatus === '입금완료' ? '#000' : '#fff',
                            border: row.paymentStatus === '입금완료' ? '2px solid #ffd600' : 
                                   row.paymentStatus === '일부분' ? '2px solid #ff9800' :
                                   row.paymentStatus === '악성' ? '2px solid #f44336' : '2px solid #fff',
                            fontWeight: 700,
                            cursor: 'pointer',
                            '&:hover': {
                              bgcolor: row.paymentStatus === '입금완료' ? '#ffed4e' : 
                                      row.paymentStatus === '일부분' ? '#ffb74d' :
                                      row.paymentStatus === '악성' ? '#ef5350' : '#444'
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#bbb' }}>{row.note || '-'}</TableCell>
                      <TableCell>
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
      )}

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
            {/* 1줄: 현장명(직접입력/선택) + 기성월 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
              <Autocomplete
                value={formData.name}
                onChange={(event, newValue) => {
                  const value = newValue || '';
                  console.log(`🔍 현장명 입력: "${value}"`);
                  
                  const selectedSite = sites.find(site => site?.name === value);
                  if (selectedSite) {
                    // 기존 현장이 선택된 경우
                    console.log(`🔍 기존 현장 선택: ${selectedSite?.name}`);
                    setFormData({
                      ...formData,
                      name: selectedSite?.name,
                      contractAmount: selectedSite.contractAmount || '',
                      advance: selectedSite.advance || '',
                      prevGisung: '0'
                    });
                  } else {
                    // 새로운 현장명이 입력된 경우 - 사용자가 직접 입력할 수 있도록 설정
                    console.log(`🔍 새로운 현장명 입력: ${value}`);
                    setFormData({
                      ...formData,
                      name: value,
                      // 계약금액과 선급금은 사용자가 직접 입력하도록 빈 값으로 유지
                      contractAmount: formData.contractAmount || '',
                      advance: formData.advance || '',
                      prevGisung: '0'
                    });
                  }
                }}
                onInputChange={(event, newInputValue) => {
                  console.log(`🔍 현장명 직접 입력: "${newInputValue}"`);
                  setFormData({
                    ...formData,
                    name: newInputValue
                  });
                }}
                options={sites.map(site => site?.name)}
                freeSolo={true} // 직접 입력 허용
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="현장명 (직접 입력 또는 선택)"
                    size="medium"
                    sx={{
                      minWidth: 220,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 },
                      '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                      '& .MuiAutocomplete-clearIndicator': { color: '#fff' }
                    }}
                  />
                )}
                sx={{
                  '& .MuiAutocomplete-popper': {
                    '& .MuiPaper-root': {
                      bgcolor: '#232b3b',
                      '& .MuiAutocomplete-option': {
                        color: '#fff',
                        fontSize: '1rem',
                        py: 1.5,
                        '&:hover': { bgcolor: '#2c3446' },
                        '&.Mui-focused': { bgcolor: '#1976d2' }
                      }
                    }
                  }
                }}
                clearOnBlur={false}
              />
              <TextField
                label="기성월"
                type="month"
                value={formData.gisungMonth}
                onChange={e => setFormData({ ...formData, gisungMonth: e.target.value })}
                size="medium"
                InputLabelProps={{ shrink: true }}
                sx={{
                  minWidth: 140,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#333' },
                    '&:hover fieldset': { borderColor: '#555' },
                    '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                  },
                  '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                  '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 },
                  '& input[type="month"]::-webkit-calendar-picker-indicator': {
                    filter: 'invert(1)',
                    cursor: 'pointer'
                  }
                }}
              />
            </Box>
            {/* 2줄: 계약금액 + 선급금 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
            <TextField
              label="계약금액 (직접 입력)"
                value={formData.contractAmount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, contractAmount: value });
                }}
                placeholder="계약금액을 입력하세요"
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
            <TextField
              label="선급금"
                value={formData.advance}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData({ ...formData, advance: value });
                }}
                placeholder="선급금을 입력하세요"
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
                        {/* 3줄: 누계기성 + 금회기성 */}
            <Box display="flex" width="100%" justifyContent="center" gap={2}>
            <TextField
              label="누계기성"
                value={Math.round(Number(formData.prevGisung || 0)).toLocaleString()}
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
            {/* 4줄: 청구방법 */}
            <Box display="flex" width="100%" justifyContent="center">
              <Autocomplete
                value={formData.claimMethod}
                onChange={(event, newValue) => setFormData({ ...formData, claimMethod: newValue || '' })}
                options={['세금계산서', '노무비', '현금', '하도급지킴이', '노무비닷컴']}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="청구방법"
                    placeholder="선택하거나 직접 입력"
                    size="medium"
                    sx={{
                      minWidth: 220,
                      '& .MuiOutlinedInput-root': {
                        '& fieldset': { borderColor: '#333' },
                        '&:hover fieldset': { borderColor: '#555' },
                        '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                      },
                      '& .MuiInputLabel-root': { color: '#bbb', fontSize: '1rem' },
                      '& .MuiInputBase-input': { color: '#fff', fontSize: '1rem', py: 1.5 },
                      '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                      '& .MuiAutocomplete-clearIndicator': { color: '#fff' }
                    }}
                  />
                )}
                sx={{
                  '& .MuiAutocomplete-popper': {
                    '& .MuiPaper-root': {
                      bgcolor: '#232b3b',
                      '& .MuiAutocomplete-option': {
                        color: '#fff',
                        fontSize: '1rem',
                        py: 1.5,
                        '&:hover': { bgcolor: '#2c3446' },
                        '&.Mui-focused': { bgcolor: '#1976d2' }
                      }
                    }
                  }
                }}
                freeSolo
                clearOnBlur
              />
            </Box>
            {/* 5줄: 비고 */}
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
      
      {/* 기성금청구서 업로드 다이얼로그 */}
      <Dialog open={uploadDialog} onClose={() => setUploadDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#232b3b', color: '#fff', fontWeight: 'bold' }}>
          기성금청구서 업로드
        </DialogTitle>
        <DialogContent sx={{ bgcolor: '#181f2e', color: '#fff', pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 3, color: '#bbb' }}>
            기성금청구서 엑셀 파일을 업로드하면 자동으로 차수가 계산되어 저장됩니다.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="gisung-upload-input"
              type="file"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              disabled={uploading}
            />
            <label htmlFor="gisung-upload-input">
              <Button
                variant="outlined"
                component="span"
                disabled={uploading}
                sx={{
                  borderColor: '#f59e42',
                  color: '#f59e42',
                  '&:hover': { borderColor: '#d97706', bgcolor: 'rgba(245, 158, 66, 0.1)' }
                }}
              >
                파일 선택
              </Button>
            </label>
            {selectedFile && (
              <Typography variant="body2" sx={{ mt: 1, color: '#90caf9' }}>
                선택된 파일: {selectedFile.name}
              </Typography>
            )}
          </Box>
          
          {uploadMessage && (
            <Alert severity={uploading ? 'info' : 'success'} sx={{ mb: 2 }}>
              {uploadMessage}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ bgcolor: '#232b3b', p: 3 }}>
          <Button 
            onClick={() => setUploadDialog(false)}
            disabled={uploading}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleUploadGisung}
            disabled={!selectedFile || uploading}
            variant="contained"
            sx={{ 
              bgcolor: '#f59e42',
              '&:hover': { bgcolor: '#d97706' }
            }}
          >
            {uploading ? '업로드 중...' : '업로드'}
          </Button>
                 </DialogActions>
       </Dialog>
       
       {/* 다운로드 로딩 팝업 */}
       <Dialog 
         open={downloadLoading} 
         maxWidth="sm" 
         fullWidth
         PaperProps={{
           sx: {
             bgcolor: '#181f2e',
             color: '#fff',
             borderRadius: 4,
             p: 4,
             textAlign: 'center'
           }
         }}
       >
         <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
           <CircularProgress size={60} sx={{ color: '#90caf9', mb: 2 }} />
           <Typography variant="h6" sx={{ color: '#90caf9', fontWeight: 600, mb: 1 }}>
             열심히 제작중에 있습니다
           </Typography>
           <Typography variant="body1" sx={{ color: '#bbb', whiteSpace: 'pre-line', textAlign: 'center' }}>
             {loadingMessage || '기성금청구서를 생성하고 있습니다.'}
           </Typography>
           <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
             잠시만 기다려주세요...
           </Typography>
         </Box>
       </Dialog>
       
       {/* 현장 정보 팝업 */}
       <SiteInfoPopup
         open={siteInfoPopup.open}
         onClose={handleCloseSiteInfoPopup}
         site={siteInfoPopup.site}
       />
     </Box>
   );
 };

export default GisungStatusPage; 