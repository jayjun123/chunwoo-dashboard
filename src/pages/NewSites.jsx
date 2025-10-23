import React, { useState, useEffect, useMemo, useRef, startTransition } from 'react';
import { Grid, Paper, Tabs, Tab, TextField, List, ListItem, ListItemText, Button, IconButton, Typography, Box, FormControl, Select, MenuItem, Checkbox, FormControlLabel, InputLabel, Autocomplete, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, InputAdornment, Container } from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadIcon from '@mui/icons-material/Upload';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ClearIcon from '@mui/icons-material/Clear';
import MaterialInventory from '../components/MaterialInventory';

import { collection, onSnapshot, query, orderBy, where, getDocs, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { addSite, updateSite, deleteSite } from '../api/sites';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { formatContractAmount, formatAdvanceAmount, formatGisungAmount, formatSafetyCost, formatNumber } from '../utils/formatUtils';

// 물량과 금액 포맷팅 함수
const formatQuantity = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  
  // "물량"이라는 텍스트가 들어있으면 빈 문자열로 처리
  if (typeof value === 'string' && value.includes('물량')) {
    return '';
  }
  
  const num = parseFloat(value);
  if (isNaN(num)) return '';
  if (num === 0) return '0';
  
  // 소수점 2째 자리까지 표시하되, 정확한 값은 유지
  const roundedForDisplay = Math.round(num * 100) / 100;
  return roundedForDisplay.toLocaleString();
};

const formatAmount = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0';
  // 정수로 반올림하여 천단위 쉼표 적용
  const roundedNum = Math.round(num);
  return roundedNum.toLocaleString();
};

const formatPrice = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  if (num === 0) return '0';
  // 정수로 반올림하여 천단위 쉼표 적용
  return Math.round(num).toLocaleString();
};

// 진행상황 계산 함수
const calculateProgress = (site) => {
  if (!site.startDate || !site.endDate) return null;
  
  const startDate = new Date(site.startDate);
  const endDate = new Date(site.endDate);
  const today = new Date();
  
  // 날짜가 유효하지 않으면 null 반환
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return null;
  
  const totalDays = endDate.getTime() - startDate.getTime();
  const elapsedDays = today.getTime() - startDate.getTime();
  
  if (totalDays <= 0) return null;
  
  const progress = (elapsedDays / totalDays) * 100;
  return Math.max(0, Math.min(100, progress)); // 0-100 범위로 제한
};

// 날짜 포맷팅 함수
const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  try {
    // Firestore Timestamp 객체인 경우
    const start = startDate && typeof startDate === 'object' && startDate.toDate 
      ? startDate.toDate() 
      : new Date(startDate);
    
    const end = endDate && typeof endDate === 'object' && endDate.toDate 
      ? endDate.toDate() 
      : new Date(endDate);
    
    // Invalid Date 체크
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      console.warn('Invalid date in formatDateRange:', { startDate, endDate });
      return '';
    }
    
    const formatDate = (date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${month}/${day}`;
    };
    
    return `${formatDate(start)}~${formatDate(end)}`;
  } catch (error) {
    console.error('날짜 포맷팅 오류:', error, '원본 데이터:', { startDate, endDate });
    return '';
  }
};
import { getSiteIntegratedStatus } from '../utils/integrationUtils';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { uploadMaterialData, generateDocumentExcel, getMaterialDataFromFirebase } from '../utils/materialUploadUtils.jsx';
import { downloadNapfoomContract } from '../utils/napfoomUtils';
import { safeUpdateDoc, debouncedUpdate } from '../utils/databaseUtils';

// 회사명은 사용자 입력값 그대로 저장합니다. 더 이상 표준화하지 않습니다.
const normalizeCompanyName = (value) => (value ?? '').toString();

const STATUS_OPTIONS = ['예정', '진행', '완료', '미정'];
const CONTRACT_TYPE_OPTIONS = ['하도급계약', '납품계약', '일반계약', '계약없음', '원도급', '관급'];
const ESTIMATE_STATUS_OPTIONS = ['제출대기', '제출완료', '수주', '미수주', '기타'];

const initialFormState = {
  name: '',
  status: '진행',
  contractType: '계약없음',
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
  stampType: '인감없음',
  safetyCost: 0,
  items: [],
  estimateStatus: '',
  windowCompany: '', // 창호업체 필드
  note: '', // estimateNote를 note로 변경
};

const NewSites = () => {
  const [sites, setSites] = useState([]);
  const [selectedSite, setSelectedSite] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [statusTab, setStatusTab] = useState('진행');
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [vendors, setVendors] = useState([]); // 거래처 데이터 상태 추가
  const [companyFocused, setCompanyFocused] = useState(false);
  const prevSavedCompanyRef = useRef('');
  const [siteIntegratedStatus, setSiteIntegratedStatus] = useState(null);
  const [totalIntegratedStatus, setTotalIntegratedStatus] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const containerRef = useRef(null);

  // 물량내역 업로드 관련 상태
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadedItems, setUploadedItems] = useState([]);
  
  // 다운로드 로딩 상태
  const [downloadLoading, setDownloadLoading] = useState(false);
  
  
  // 마이그레이션 로딩 상태
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // 기성관리 데이터 상태
  const [gisungData, setGisungData] = useState([]);
  const [paymentStatusMap, setPaymentStatusMap] = useState({});

  // 실물량파악 관련 상태
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [quantityPassword, setQuantityPassword] = useState('');
  const [quantityPasswordError, setQuantityPasswordError] = useState('');
  const [showHiddenCompleted, setShowHiddenCompleted] = useState(false);
  const [showDistributionView, setShowDistributionView] = useState(false);

  // 상태별 카운트 계산
  const statusCounts = useMemo(() => {
    const counts = {
      '예정': 0,
      '진행': 0,
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

  // URL 파라미터에서 현장명 확인 및 자동 선택
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    if (pathSegments.length > 2 && pathSegments[1] === 'sites') {
      const siteName = decodeURIComponent(pathSegments[2]);
      const targetSite = sites.find(site => site?.name === siteName);
      if (targetSite) {
        startTransition(() => {
          setSelectedSite(targetSite);
          setForm(targetSite);
          setIsEditing(false);
        });
      }
    }
  }, [location.pathname, sites]);

  // URL 쿼리 파라미터에서 siteId 처리
  useEffect(() => {
    if (sites.length > 0) {
      const urlParams = new URLSearchParams(location.search);
      const siteId = urlParams.get('siteId');
      
      if (siteId) {
        const targetSite = sites.find(site => site?.id === siteId);
        if (targetSite) {
          console.log('🔍 URL 파라미터로 현장 선택:', targetSite.name);
          startTransition(() => {
            setSelectedSite(targetSite);
            setForm(targetSite);
            setIsEditing(false);
          });
        }
      }
    }
  }, [location.search, sites]);

  // 기성관리 데이터 로드
  useEffect(() => {
    const fetchGisungData = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'gisung'));
        const gisungData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGisungData(gisungData);
        console.log('🏗️ 기성관리 데이터 로드 완료:', gisungData.length, '개');
      } catch (error) {
        console.error('기성관리 데이터 로드 실패:', error);
      }
    };
    fetchGisungData();
  }, []);

  // 현장별 입금 상태 계산
  useEffect(() => {
    const loadPaymentStatus = async () => {
      try {
        const paymentMap = {};
        
        sites.forEach(site => {
          // 현장명 매칭 (정확한 매칭과 부분 매칭 모두 시도)
          const siteGisungData = gisungData.filter(g => {
            const exactMatch = g.name === site.name;
            const partialMatch = g.name && site.name && g.name.includes(site.name);
            return exactMatch || partialMatch;
          });
          
          if (siteGisungData.length === 0) {
            paymentMap[site.name] = { isFullyPaid: false, totalGisung: 0, paidGisung: 0, paymentRate: 0 };
            return;
          }
          
          // 해당 현장의 모든 기성 데이터 확인
          const totalGisung = siteGisungData.reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
          const paidGisung = siteGisungData
            .filter(g => g.paymentStatus === '입금완료')
            .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
          
          // 선급금도 고려
          const advanceAmount = Number(site.advance) || 0;
          const totalWithAdvance = totalGisung + advanceAmount;
          
          // 잔액 계산 (계약금액 - 선급금 - 입금완료된 기성)
          const contractAmount = Number(site.contractAmount) || 0;
          const balance = contractAmount - advanceAmount - paidGisung;
          
          // 정산완료 조건: 잔액이 0이고 입금완료 칩이 있는 경우
          const hasPaidGisung = siteGisungData.some(g => g.paymentStatus === '입금완료');
          const isFullyPaid = balance <= 0 && hasPaidGisung;
          
          // 입금률 계산 (참고용)
          const paymentRate = totalWithAdvance > 0 ? ((paidGisung + advanceAmount) / totalWithAdvance) * 100 : 0;
          
          paymentMap[site.name] = {
            isFullyPaid,
            totalGisung,
            paidGisung,
            paymentRate,
            balance,
            hasPaidGisung
          };
        });
        
        setPaymentStatusMap(paymentMap);
        console.log('💰 입금 상태 맵 업데이트 완료:', Object.keys(paymentMap).length, '개 현장');
      } catch (error) {
        console.error('입금 상태 계산 실패:', error);
      }
    };
    
    if (sites.length > 0 && gisungData.length > 0) {
      loadPaymentStatus();
    }
  }, [sites, gisungData]);

  // location state에서 전달받은 현장 정보 처리
  useEffect(() => {
    if (location.state && sites.length > 0) {
      const { selectedSiteId, selectedSiteName } = location.state;
      
      if (selectedSiteId) {
        const targetSite = sites.find(site => site.id === selectedSiteId);
        if (targetSite) {
          startTransition(() => {
            setSelectedSite(targetSite);
            setForm(targetSite);
            setIsEditing(false);
          });
        }
      } else if (selectedSiteName) {
        const targetSite = sites.find(site => site.name === selectedSiteName);
        if (targetSite) {
          startTransition(() => {
            setSelectedSite(targetSite);
            setForm(targetSite);
            setIsEditing(false);
          });
        }
      }
      
      // location state 초기화 (중복 실행 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location.state, sites]);



  // 현장 데이터가 변경될 때마다 전체 통합현황 재계산 (캐싱 적용)
  const [costData, setCostData] = useState([]);
  
  // 기성 데이터 로드 및 입금 상태 확인
  useEffect(() => {
    const loadGisungData = async () => {
      try {
        const gisungQuery = query(collection(db, 'gisung'));
        const gisungSnapshot = await getDocs(gisungQuery);
        const data = gisungSnapshot.docs.map(doc => doc.data());
        setGisungData(data);
        
        // 입금 상태 확인
        await loadPaymentStatus(data);
      } catch (error) {
        console.error('기성 데이터 로드 오류:', error);
      }
    };
    
    const loadCostData = async () => {
      try {
        const costQuery = query(collection(db, 'costs'));
        const costSnapshot = await getDocs(costQuery);
        const data = costSnapshot.docs.map(doc => doc.data());
        setCostData(data);
      } catch (error) {
        console.error('지출 데이터 로드 오류:', error);
      }
    };
    
    loadGisungData();
    loadCostData();
  }, []);

  // sites 데이터가 변경될 때마다 입금 상태 재확인
  useEffect(() => {
    if (sites.length > 0 && gisungData.length > 0) {
      loadPaymentStatus(gisungData);
    }
  }, [sites, gisungData]);

  // 기성현황 데이터를 가져와서 현장별 입금 상태 확인
  const loadPaymentStatus = async (gisungData) => {
    try {
      // 현장별 입금 상태 맵 생성
      const paymentMap = {};
      
      sites.forEach(site => {
        // 현장명 매칭 (정확한 매칭과 부분 매칭 모두 시도)
        const siteGisungData = gisungData.filter(g => {
          const exactMatch = g.name === site.name;
          const partialMatch = g.name && site.name && g.name.includes(site.name);
          return exactMatch || partialMatch;
        });
        
        if (siteGisungData.length === 0) {
          paymentMap[site.name] = { isFullyPaid: false, totalGisung: 0, paidGisung: 0, paymentRate: 0 };
          return;
        }
        
        // 해당 현장의 모든 기성 데이터 확인
        const totalGisung = siteGisungData.reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
        const paidGisung = siteGisungData
          .filter(g => g.paymentStatus === '입금완료')
          .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
        
        // 선급금도 고려
        const advanceAmount = Number(site.advance) || 0;
        const totalWithAdvance = totalGisung + advanceAmount;
        
        // 잔액 계산 (계약금액 - 선급금 - 입금완료된 기성)
        const contractAmount = Number(site.contractAmount) || 0;
        const balance = contractAmount - advanceAmount - paidGisung;
        
        // 정산완료 조건: 기성 데이터가 없거나, 잔액이 0이고 입금완료 칩이 있는 경우
        const hasPaidGisung = siteGisungData.some(g => g.paymentStatus === '입금완료');
        const isFullyPaid = siteGisungData.length === 0 || (balance <= 0 && hasPaidGisung);
        
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
      });
      
      setPaymentStatusMap(paymentMap);
    } catch (error) {
      console.error('입금 상태 확인 실패:', error);
    }
  };
  
  // 캐시된 데이터를 사용한 통합현황 계산
  useEffect(() => {
    if (sites.length === 0) return;
    
    try {
      let totalContractAmount = 0;
      let totalProgressAmount = 0;
      let totalCostAmount = 0;

      // 1. 계약금액: 현장상세정보에서 직접 가져오기 (로컬 계산)
      totalContractAmount = sites.reduce((sum, site) => {
        return sum + (Number(site.contractAmount) || 0);
      }, 0);
      
      // 2. 누계기성: 캐시된 데이터 사용 (선급금 포함)
      const siteNames = sites.map(site => site?.name);
      
      totalProgressAmount = gisungData.reduce((sum, gisung) => {
        if (siteNames.includes(gisung.name)) {
          return sum + (Number(gisung.gisungAmount) || 0);
        }
        return sum;
      }, 0);
      
      // 선급금을 누계기성에 포함
      const totalAdvanceAmount = sites.reduce((sum, site) => {
        return sum + (Number(site.advance) || 0);
      }, 0);
      
      totalProgressAmount += totalAdvanceAmount;
      
      totalCostAmount = costData.reduce((sum, cost) => {
        if (siteNames.includes(cost.siteName)) {
          return sum + (Number(cost.amount) || 0);
        }
        return sum;
      }, 0);

      console.log('통합현황 계산 결과 (캐시 사용):', {
        totalContractAmount,
        totalProgressAmount,
        totalAdvanceAmount,
        totalCostAmount,
        sitesCount: sites.length,
        gisungDataLength: gisungData.length,
        costDataLength: costData.length,
        siteNames: siteNames
      });

      setTotalIntegratedStatus({
        summary: {
          totalEstimateAmount: totalContractAmount,
          totalClaimAmount: totalProgressAmount,
          totalCostAmount: totalCostAmount
        }
      });
    } catch (error) {
      console.error('전체 통합현황 계산 오류:', error);
    }
  }, [sites, gisungData, costData]);

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
    
    try {
      // Firestore Timestamp 객체인 경우
      if (dateString && typeof dateString === 'object' && dateString.toDate) {
        return dateString.toDate().toISOString().split('T')[0];
      }
      
      // 문자열인 경우
      if (typeof dateString === 'string') {
        if (dateString.includes('.')) {
          return dateString.replace(/\./g, '-');
        }
        return dateString;
      }
      
      // Date 객체인 경우
      if (dateString instanceof Date) {
        return dateString.toISOString().split('T')[0];
      }
      
      // 기타 경우
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date in formatDateForInput:', dateString);
        return '';
      }
      return dateObj.toISOString().split('T')[0];
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error, '원본 데이터:', dateString);
      return '';
    }
  };

  const formatDateForStorage = (dateString) => {
    if (!dateString) return '';
    
    try {
      // Firestore Timestamp 객체인 경우
      if (dateString && typeof dateString === 'object' && dateString.toDate) {
        const date = dateString.toDate();
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
      }
      
      // 문자열인 경우
      if (typeof dateString === 'string') {
        if (dateString.includes('-')) {
          return dateString.replace(/-/g, '.');
        }
        return dateString;
      }
      
      // Date 객체인 경우
      if (dateString instanceof Date) {
        return `${dateString.getFullYear()}.${String(dateString.getMonth() + 1).padStart(2, '0')}.${String(dateString.getDate()).padStart(2, '0')}`;
      }
      
      // 기타 경우
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date in formatDateForStorage:', dateString);
        return '';
      }
      return `${dateObj.getFullYear()}.${String(dateObj.getMonth() + 1).padStart(2, '0')}.${String(dateObj.getDate()).padStart(2, '0')}`;
    } catch (error) {
      console.error('날짜 포맷팅 오류:', error, '원본 데이터:', dateString);
      return '';
    }
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
        if (data.status === '진행중') data.status = '진행';
        else if (data.status === '진행상황') data.status = '예정';
        // 회사명 필드 호환: company → companyName 통합
        if (!data.companyName && data.company) {
          data.companyName = data.company;
        }
        return data;
      });

      const sitesWithGisung = await Promise.all(
        sitesData.map(async (site) => {
          try {
            const gisungQuery = query(collection(db, 'gisung'), where('name', '==', site?.name));
            const gisungSnapshot = await getDocs(gisungQuery);
            const totalGisung = gisungSnapshot.docs.reduce((sum, doc) => sum + (Number(doc.data().gisungAmount) || 0), 0);
            return { ...site, totalProgress: totalGisung };
          } catch (error) {
            console.error(`Error fetching gisung for site ${site?.name}:`, error);
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

  const findVendorByCompany = (companyName) => {
    if (!companyName) return null;
    const norm = (v) => (v ?? '').toString().trim();
    return vendors.find(v => norm(v.companyName) === norm(companyName)) || null;
  };

  // 거래처현황에서 회사 정보 가져오기
  const getVendorInfoByCompany = async (companyName) => {
    if (!companyName) return null;
    
    try {
      console.log('🔍 거래처현황에서 회사 정보 조회:', companyName);
      
      // bids 컬렉션에서 해당 회사명으로 검색
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const bidsRef = collection(db, 'bids');
      const q = query(bidsRef, where('companyName', '==', companyName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const vendorData = querySnapshot.docs[0].data();
        console.log('✅ 거래처현황에서 회사 정보 찾음:', vendorData);
        return {
          businessNumber: vendorData.businessNumber || '',
          companyAddress: vendorData.companyAddress || vendorData.address || '',
          phone: vendorData.phone || vendorData.phoneNumber || '',
          ceoName: vendorData.ceoName || vendorData.representative || vendorData.ceo || ''
        };
      } else {
        console.log('⚠️ 거래처현황에서 회사 정보를 찾을 수 없음:', companyName);
        return null;
      }
    } catch (error) {
      console.error('❌ 거래처현황 조회 실패:', error);
      return null;
    }
  };

  const handleDownloadNapfoomContract = async () => {
    setDownloadLoading(true);
    
    try {
      console.log('🔍 NAPFOOM 납품계약서 다운로드 시작 - 현재 form 상태:', form);
      console.log('🔍 현재 selectedSite:', selectedSite);
      console.log('📋 템플릿 타입: AUTO (물량 개수에 따라 자동 결정)');
      
      // 초기 로딩 메시지 (물량 확인 전)
      setLoadingMessage(`열심히 제작중에 있습니다.\n납품계약서를 생산하고 있습니다.`);
      
      // 거래처현황에서 회사 정보 가져오기
      const companyName = form.companyName || form.company || '';
      const vendorInfo = await getVendorInfoByCompany(companyName);
      
      console.log('🔍 거래처현황에서 가져온 정보:', vendorInfo);
      
      // selectedSite 유효성 검사
      if (!selectedSite) {
        console.error('❌ selectedSite가 undefined입니다.');
        alert('현장 정보를 찾을 수 없습니다. 현장을 다시 선택해주세요.');
        return;
      }

      if (!selectedSite.name) {
        console.error('❌ selectedSite.name이 undefined입니다:', selectedSite);
        alert('현장명 정보가 없습니다. 현장을 다시 선택해주세요.');
        return;
      }

      // form 데이터를 contractGabjiUtils에서 기대하는 형식으로 변환
      const site = {
        ...form,
        contractAmount: Number(form.contractAmount || 0),
        advance: Number(form.advance || 0),
        companyName: companyName,
        name: selectedSite.name || form.name || '현장명없음',
        address: form.address || '',
        startDate: form.startDate || '',
        endDate: form.endDate || '',
        stampType: form.stampType || '인감없음',
        // 물량 개수에 따른 templateType 자동 설정 (selectedSite.templateType 무시)
        templateType: 'AUTO', // 자동 설정 플래그
        // 거래처현황에서 가져온 데이터 우선 사용, 없으면 form 데이터 사용
        businessNumber: vendorInfo?.businessNumber || form.businessNumber || '',
        companyAddress: vendorInfo?.companyAddress || form.companyAddress || '',
        phone: vendorInfo?.phone || form.phone || '',
        ceoName: vendorInfo?.ceoName || form.ceoName || ''
      };
      
      console.log('🔍 전달할 site 데이터:', site);
      
                      const { downloadContractGabji } = await import('../utils/contractGabjiUtils');
                console.log('🔍 downloadContractGabji 함수 로드 완료');
      
      // 현재 선택된 현장의 물량 데이터 가져오기
      let napfoomMaterialItems = [];
      if (selectedSite && selectedSite?.id) {
        try {
          console.log('🔍 물량 데이터 조회 시작 - siteId:', selectedSite?.id);
          const { getMaterialDataFromFirebase } = await import('../utils/materialUploadUtils.jsx');
          const result = await getMaterialDataFromFirebase(selectedSite?.id);
          console.log('🔍 물량 데이터 조회 결과:', result);
          
          if (result.success && result.data && result.data.items && result.data.items.length > 0) {
            napfoomMaterialItems = result.data.items;
            console.log('✅ 물량 데이터 로드 완료:', napfoomMaterialItems.length, '개 항목');
            console.log('📊 첫 번째 항목 샘플:', napfoomMaterialItems[0]);
          } else {
            console.log('⚠️ materialEstimates 비어있음 → sites.items 폴백 시도');
            try {
              const { getDoc } = await import('firebase/firestore');
              const siteSnap = await getDoc(doc(db, 'sites', selectedSite?.id));
              if (siteSnap.exists()) {
                const siteDataDoc = siteSnap.data();
                const siteItems = Array.isArray(siteDataDoc.items) ? siteDataDoc.items : [];
                if (siteItems.length > 0) {
                  napfoomMaterialItems = siteItems;
                  console.log('✅ 폴백 성공: sites.items 로드', napfoomMaterialItems.length, '개');
                } else {
                  console.log('⚠️ 폴백 실패: sites.items 비어있음');
                }
              } else {
                console.log('⚠️ 폴백 실패: sites 문서 없음');
              }
            } catch (fallbackErr) {
              console.warn('⚠️ 폴백 중 오류:', fallbackErr);
            }
          }
        } catch (materialError) {
          console.warn('⚠️ 물량 데이터 로드 실패:', materialError);
        }
      } else {
        console.log('⚠️ 선택된 현장이 없습니다.');
      }
      
                            // 납품계약서 생성 (NAPFOOM 전용 함수 사용)
                            console.log('🔍 납품계약서 생성용 site 데이터:', site);
                            console.log('🔍 납품계약서 생성용 materialItems:', napfoomMaterialItems.length, '개');
                            
                            // 실제 물량 개수에 따른 템플릿 타입 계산 및 로딩 메시지 업데이트
                            const actualItemCount = napfoomMaterialItems.length;
                            const actualTemplateType = actualItemCount > 20 ? 'L' : 'N';
                            const actualTemplateTypeText = actualTemplateType === 'L' ? 'LONG' : 'NEW';
                            setLoadingMessage(`열심히 제작중에 있습니다.\n납품계약서 [${actualTemplateTypeText}]을 생산하고 있습니다.`);
                            
                            let result;
                            try {
                              console.log('🚀 createNapfoomContract 호출 시작');
                              console.log('📊 site 데이터:', site);
                              console.log('📊 materialItems:', napfoomMaterialItems);
                              
                              // NAPFOOM 전용 함수 import 및 호출
                              const { createNapfoomContract } = await import('../utils/napfoomUtils');
                              const fileName = `(납품계약서)${site?.name || '현장'} 중 유리납품`;
                              result = await createNapfoomContract(site, napfoomMaterialItems, fileName);
                              console.log('🔍 createNapfoomContract 결과:', result);
                            } catch (genError) {
                              console.error('❌ createNapfoomContract 함수에서 예외 발생:', genError);
                              console.error('❌ 예외 상세 정보:', {
                                message: genError.message,
                                stack: genError.stack,
                                name: genError.name
                              });
                              throw new Error(`납품계약서 생성 중 오류: ${genError.message}`);
                            }
                            
                            if (!result) {
                              throw new Error('createNapfoomContract가 undefined를 반환했습니다.');
                            }
                            
                            if (!result.success) {
                              throw new Error(result.error || '납품계약서 생성 실패');
                            }
      console.log('✅ NAPFOOM 납품계약서 다운로드 완료');
    } catch (e) {
      console.error('NAPFOOM 납품계약서 다운로드 실패:', e);
      console.error('오류 상세:', e.message);
      console.error('오류 스택:', e.stack);
      alert('NAPFOOM 납품계약서 생성에 실패했습니다. 템플릿/데이터를 확인해주세요.');
    } finally {
      setDownloadLoading(false);
      setLoadingMessage(''); // 로딩 메시지 초기화
    }
  };

  // 전체 필드 자동 저장 및 거래처 동기화 (디바운스)
  useEffect(() => {
    if (!selectedSite || isEditing) return; // 수정하기 모드일 때는 자동 저장 비활성화
    const timer = setTimeout(async () => {
      try {
        // 자동 저장 시작 전 스크롤 위치 저장
        saveScrollPosition();
        setIsFormSubmitting(true);
        const norm = (v) => (v ?? '').toString().trim();
        const currentSite = {
          name: selectedSite?.name || '',
          contractType: selectedSite?.contractType || '',
          contractAmount: Number(selectedSite?.contractAmount || 0),
          advance: Number(selectedSite?.advance || 0),
          safetyCost: Number(selectedSite?.safetyCost ?? 0),
          address: selectedSite?.address || '',
          startDate: selectedSite?.startDate || '',
          endDate: selectedSite?.endDate || '',
          manager: selectedSite?.manager || '',
          phone: selectedSite?.phone || '',
          team: selectedSite?.team || '',
          windowCompany: selectedSite?.windowCompany || '',
          note: selectedSite?.note || '',
          desc: selectedSite?.desc || '',
          isFavorite: !!selectedSite?.isFavorite,
          stampType: selectedSite?.stampType || '인감없음',
          companyName: selectedSite?.companyName || selectedSite?.company || ''
        };

        const desired = {
          name: form.name || '',
          contractType: form.contractType || '',
          contractAmount: Number(form.contractAmount || 0),
          advance: Number(form.advance || 0),
          address: form.address || '',
          startDate: formatDateForStorage(form.startDate) || '',
          endDate: formatDateForStorage(form.endDate) || '',
          manager: form.manager || '',
          phone: form.phone || '',
          team: form.team || '',
          windowCompany: form.windowCompany || '',
          note: form.note || '',
          desc: form.desc || '',
          safetyCost: Number(form.safetyCost ?? 0),
          isFavorite: !!form.isFavorite,
          stampType: form.stampType || '인감없음',
          companyName: form.companyName || ''
        };

        // 변경된 필드만 업데이트
        const diff = {};
        Object.keys(desired).forEach(k => {
          const a = desired[k];
          const b = currentSite[k];
          // companyName는 빈 문자열로 저장하지 않음 (타이핑 중간 공백 방지)
          if (k === 'companyName' && norm(a) === '') return;
          // 회사명 입력창에 포커스가 있는 동안은 저장 지연
          if (k === 'companyName' && companyFocused) return;
          if ((typeof a === 'number' ? a : norm(a)) !== (typeof b === 'number' ? b : norm(b))) {
            diff[k] = desired[k];
          }
        });

        if (Object.keys(diff).length > 0) {
          diff.updatedAt = new Date();
          // company 필드도 함께 동일값으로 맞춰 레거시 역주입 방지
          if (diff.companyName !== undefined) diff.company = diff.companyName;
          await updateDoc(doc(db, 'sites', selectedSite.id), diff);

          // 회사명이 변경된 경우에만 거래처관리 업서트
          if (diff.companyName && norm(diff.companyName) !== norm(currentSite.companyName)) {
            try {
              const qv = query(collection(db, 'vendorManagement'), where('companyName', '==', diff.companyName));
              const snap = await getDocs(qv);
              if (snap.empty) {
                await addDoc(collection(db, 'vendorManagement'), {
                  companyName: diff.companyName,
                  address: desired.address || '',
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              } else {
                await updateDoc(doc(db, 'vendorManagement', snap.docs[0].id), {
                  address: desired.address || '',
                  updatedAt: new Date()
                });
              }
              // 이전 회사명 문서가 남아있으면 정리
              const prevName = prevSavedCompanyRef.current;
              if (prevName && norm(prevName) !== norm(diff.companyName)) {
                const qOld = query(collection(db, 'vendorManagement'), where('companyName', '==', prevName));
                const oldSnap = await getDocs(qOld);
                if (!oldSnap.empty) {
                  try { await deleteDoc(doc(db, 'vendorManagement', oldSnap.docs[0].id)); } catch {}
                }
              }
              prevSavedCompanyRef.current = diff.companyName;
            } catch (ve) {
              console.error('거래처 동기화 오류:', ve);
            }
          }
        }
      } catch (e) {
        console.error('자동 저장 실패:', e);
      } finally {
        // 자동 저장 완료 후 스크롤 위치 복원
        setIsFormSubmitting(false);
        restoreScrollPosition();
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [selectedSite,
      form.name, form.contractType, form.contractAmount, form.advance, form.address,
      form.startDate, form.endDate, form.manager, form.phone, form.team,
      form.windowCompany, form.note, form.desc, form.isFavorite, form.stampType,
      form.companyName, companyFocused]);

  useEffect(() => {
    if (selectedSite) {
      setForm({
        ...initialFormState,
        ...selectedSite,
        companyName: selectedSite.companyName || selectedSite.company || '',
        startDate: selectedSite.startDate ? selectedSite.startDate.split('T')[0] : '',
        endDate: selectedSite.endDate ? selectedSite.endDate.split('T')[0] : '',
        safetyCost: Number(selectedSite.safetyCost ?? 0)
      });
      setIsEditing(false);
    } else {
      setForm(initialFormState);
      setIsEditing(true);
    }
  }, [selectedSite]);

  // 숨겨진 완료 현장 수 계산 (입금처리 안된 현장은 제외)
  const hiddenCompletedSites = useMemo(() => {
    if (statusTab !== '완료') return 0;
    
    const today = new Date();
    const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000)); // 60일 전
    
    return sites.filter(site => {
      if (site.status === '완료' && site.endDate) {
        try {
          const endDate = new Date(site.endDate);
          if (!isNaN(endDate.getTime()) && endDate < sixtyDaysAgo) {
            // 60일 이상 지난 완료 현장이지만 입금처리가 안된 현장은 숨기지 않음
            const paymentStatus = paymentStatusMap[site.name];
            if (paymentStatus && !paymentStatus.isFullyPaid) {
              return false; // 입금처리 안된 현장은 숨기지 않음
            }
            return true; // 입금처리 완료된 현장은 숨김
          }
        } catch (error) {
          console.warn('현장 준공일 파싱 오류:', site?.name, site.endDate, error);
        }
      }
      return false;
    }).length;
  }, [sites, statusTab, paymentStatusMap]);

  const filteredSites = useMemo(() => {
    const today = new Date();
    const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000)); // 60일 전
    
    let filtered = sites
      .filter(site => site.status === statusTab)
      .filter(site => {
        // 완료 상태인 현장의 경우, 준공일이 60일 이상 지났으면 제외 (단, showHiddenCompleted가 true이면 포함)
        if (site.status === '완료' && site.endDate) {
          try {
            const endDate = new Date(site.endDate);
            if (!isNaN(endDate.getTime()) && endDate < sixtyDaysAgo) {
              // 60일 이상 지난 완료 현장이지만 입금처리가 안된 현장은 항상 표시
              const paymentStatus = paymentStatusMap[site.name];
              if (paymentStatus && !paymentStatus.isFullyPaid) {
                return true; // 입금처리 안된 현장은 항상 표시
              }
              return showHiddenCompleted; // 입금처리 완료된 현장은 숨겨진 목록 보기 모드일 때만 포함
            }
          } catch (error) {
            console.warn('현장 준공일 파싱 오류:', site?.name, site.endDate, error);
          }
        }
        return true;
      })
      .filter(site =>
        site?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (site.manager && site.manager.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    
    // 정산완료된 현장을 제일 아래쪽에 배치
    const activeSites = [];
    const completedSites = [];
    
    filtered.forEach(site => {
      // 정산완료 여부 확인
      const isFullyPaid = paymentStatusMap[site.name]?.isFullyPaid || false;
      
      if (isFullyPaid) {
        completedSites.push(site);
      } else {
        activeSites.push(site);
      }
    });
    
    // 진행인 현장을 먼저, 정산완료된 현장을 나중에 배치
    return [...activeSites, ...completedSites];
  }, [sites, statusTab, searchTerm, showHiddenCompleted, paymentStatusMap]);

  const handleSelectSite = async (site) => {
    setSelectedSite(site);
    
    // 선택된 현장의 통합 현황 조회
    if (site) {
      try {
        // 중복 단수정리 항목 자동 정리
        let cleanedItems = site.items || [];
        const adjustmentItems = cleanedItems.filter(item => item?.name === '단수정리');
        
        if (adjustmentItems.length > 1) {
          console.log(`중복 단수정리 항목 발견: ${adjustmentItems.length}개`);
          
          // 첫 번째 단수정리 항목만 남기고 나머지 제거
          let foundFirst = false;
          cleanedItems = cleanedItems.filter(item => {
            if (item?.name === '단수정리') {
              if (!foundFirst) {
                foundFirst = true;
                return true; // 첫 번째는 유지
              } else {
                return false; // 나머지는 제거
              }
            }
            return true; // 단수정리가 아닌 항목들은 모두 유지
          });
          
          // Firebase에 자동 저장
          try {
            await updateDoc(doc(db, 'sites', site.id), {
              items: cleanedItems,
              updatedAt: new Date()
            });
            console.log('중복 단수정리 항목 자동 정리 완료');
          } catch (error) {
            console.error('중복 단수정리 자동 정리 오류:', error);
          }
        }
        
        // 물량내역에서 계약금액 자동 추출
        const autoContractAmount = getAutoContractAmount(cleanedItems);
        
        // 계약금액 우선순위: 물량내역 > 현장상세정보
        const contractAmount = autoContractAmount > 0 ? autoContractAmount : (Number(site.contractAmount) || 0);
        
        // 2. 누계기성: 캐시된 데이터 사용 (선급금 포함)
        const totalGisungAmount = gisungData.reduce((sum, gisung) => {
          if (gisung.name === site?.name) {
            return sum + (Number(gisung.gisungAmount) || 0);
          }
          return sum;
        }, 0);
        
        // 선급금을 누계기성에 포함
        const advanceAmount = Number(site.advance || 0);
        const totalWithAdvance = totalGisungAmount + advanceAmount;
        
        // 3. 지출: 캐시된 데이터 사용
        const totalCostAmount = costData.reduce((sum, cost) => {
          if (cost.siteName === site?.name) {
            return sum + (Number(cost.amount) || 0);
          }
          return sum;
        }, 0);
        
        const integratedStatus = {
          summary: {
            totalEstimateAmount: contractAmount,
            totalClaimAmount: totalWithAdvance, // 선급금 포함된 누계기성
            totalCostAmount: totalCostAmount
          }
        };
        
        console.log('현장 통합현황 계산 (캐시 사용):', {
          siteName: site?.name,
          contractAmount,
          totalGisungAmount,
          advanceAmount,
          totalWithAdvance,
          totalCostAmount
        });
        
        setSiteIntegratedStatus(integratedStatus);
        
        // 폼 데이터 설정 (물량내역의 계약금액 우선, 정리된 아이템 사용)
        setForm(prev => ({
          ...prev,
          ...site,
          items: cleanedItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : (site.contractAmount || '')
        }));
        
        setIsEditing(false);
      } catch (error) {
        console.error('현장 통합 현황 조회 오류:', error);
        setSiteIntegratedStatus(null);
      }
    } else {
      setSiteIntegratedStatus(null);
    }
  };
  // 전화번호 서식 함수
  const formatPhoneNumber = (value) => {
    // 숫자만 추출
    const numbers = value.replace(/[^0-9]/g, '');
    
    // 길이에 따라 서식 적용
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 7) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    } else if (numbers.length <= 11) {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
    } else {
      return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = async (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;
    
    // 전화번호 필드인 경우 서식 적용
    if (name === 'phone' && type !== 'checkbox') {
      newValue = formatPhoneNumber(value);
    }
    
    setForm(prev => ({ ...prev, [name]: newValue }));
    
    // 진행상황이 변경되고 현재 현장이 선택되어 있으면 자동 저장 (수정하기 모드가 아닐 때만)
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
  // 물량내역에서 계약금액(부가세포함) 자동 추출 함수
  const getAutoContractAmount = (items) => {
    const totalWithVatItem = items?.find(item => item?.isTotalWithVat);
    return totalWithVatItem ? parseFloat(totalWithVatItem.amount) || 0 : 0;
  };

  // 디바운싱을 위한 타이머
  const [saveTimer, setSaveTimer] = useState(null);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimer) {
        clearTimeout(saveTimer);
      }
    };
  }, [saveTimer]);

  // 수정하기 모드일 때 자동 저장 방지 함수
  const preventAutoSave = () => {
    if (isEditing) {
      console.log('수정하기 모드 - 자동 저장 방지됨');
      return true;
    }
    return false;
  };

  // 수정하기 모드에서 자동 저장 방지를 위한 useEffect
  useEffect(() => {
    if (isEditing && saveTimer) {
      console.log('수정하기 모드 진입 - 기존 자동 저장 타이머 취소');
      clearTimeout(saveTimer);
      setSaveTimer(null);
    }
  }, [isEditing, saveTimer]);


  const handleItemsChange = async (index, field, value) => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    const newItems = [...form.items];
    
    // 물량 필드에서 "물량" 텍스트가 들어오면 빈 문자열로 처리
    if (field === 'quantity' && typeof value === 'string' && value.includes('물량')) {
      newItems[index][field] = '';
    }
    // 물량, 단가, 금액의 경우 쉼표 제거 후 저장
    else if (field === 'quantity' || field === 'price' || field === 'amount') {
      const numericValue = value.replace(/,/g, '');
      newItems[index][field] = numericValue;
    } else {
      newItems[index][field] = value;
    }
    
    // 물량이나 단가가 변경되면 금액 자동 계산
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].price) || 0;
      newItems[index].amount = (quantity * price).toString();
    }
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = newItems
      .filter(item => !item?.isSpacer && !item?.isTotal && !item?.isVat && !item?.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = newItems.findIndex(item => item?.isTotal);
    if (totalIndex !== -1) {
      newItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트 (총공사계의 10%)
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = newItems.findIndex(item => item?.isVat);
    if (vatIndex !== -1) {
      newItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 총계 업데이트 (총공사계 + 부가세)
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = newItems.findIndex(item => item?.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      newItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    // 계약금액 자동 업데이트
    const autoContractAmount = getAutoContractAmount(newItems);
    
    // 로컬 상태 업데이트
    setForm(prev => ({ 
      ...prev, 
      items: newItems,
      contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : prev.contractAmount
    }));
    
    // 기존 타이머 취소
    if (saveTimer) {
      clearTimeout(saveTimer);
    }
    
    // Firebase에 디바운싱된 저장 (수정 모드에서도 저장)
    if (selectedSite) {
      const newTimer = setTimeout(async () => {
        try {
          // 물량내역 저장 시작 전 스크롤 위치 저장
          saveScrollPosition();
          setIsFormSubmitting(true);
          
          const { doc } = await import('firebase/firestore');
          const docRef = doc(db, 'sites', selectedSite.id);
          
          const success = await safeUpdateDoc(docRef, {
            items: newItems,
            contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount
          });
          
          if (!success) {
            console.warn('물량내역 저장 실패 - 나중에 다시 시도해주세요');
          }
        } catch (error) {
          console.error('물량내역 실시간 저장 오류:', error);
        } finally {
          // 물량내역 저장 완료 후 스크롤 위치 복원
          setIsFormSubmitting(false);
          restoreScrollPosition();
        }
      }, 1000); // 1초 후 저장
      
      setSaveTimer(newTimer);
    }
  };
  const handleAddItem = async () => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    const currentItems = [...(form.items || [])];
    
    // 총공사계 위의 인덱스 찾기
    const totalIndex = currentItems.findIndex(item => item?.isTotal);
    
    // 총공사계 위에 새 항목 추가
    const newItem = { name: '', quantity: '', price: '', amount: '' };
    if (totalIndex !== -1) {
      currentItems.splice(totalIndex, 0, newItem);
    } else {
      // 총공사계가 없으면 맨 뒤에 추가
      currentItems.push(newItem);
    }
    
    setForm(prev => ({ ...prev, items: currentItems }));
    
    // Firebase에 실시간 저장 (모든 모드에서 저장)
    if (selectedSite) {
      try {
        // 품목 추가 저장 시작 전 스크롤 위치 저장
        saveScrollPosition();
        setIsFormSubmitting(true);
        
        // sites 컬렉션 업데이트
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: currentItems,
          updatedAt: new Date()
        });
        
        // materialEstimates 컬렉션도 함께 업데이트 (선택적)
        try {
          const materialQuery = query(
            collection(db, 'materialEstimates'),
            where('siteId', '==', selectedSite.id)
          );
          const materialDocs = await getDocs(materialQuery);
          
          if (!materialDocs.empty) {
            const materialDoc = materialDocs.docs[0];
            const materialData = materialDoc.data();
            
            // 새로운 품목을 materialEstimates의 items에 추가
            const updatedItems = [...(materialData.items || []), newItem];
            
            await updateDoc(doc(db, 'materialEstimates', materialDoc.id), {
              items: updatedItems,
              updatedAt: serverTimestamp()
            });
            
            console.log('✅ materialEstimates 컬렉션도 함께 업데이트 완료');
          }
        } catch (materialError) {
          console.warn('materialEstimates 업데이트 실패 (무시됨):', materialError);
        }
      } catch (error) {
        console.error('품목 추가 실시간 저장 오류:', error);
      } finally {
        // 품목 추가 저장 완료 후 스크롤 위치 복원
        setIsFormSubmitting(false);
        restoreScrollPosition();
      }
    }
  };





  // 실물량파악 관련 함수들
  const handleQuantityCheck = () => {
    setShowQuantityDialog(true);
    setQuantityPassword('');
    setQuantityPasswordError('');
  };

  const handleQuantityPasswordSubmit = () => {
    if (quantityPassword === '2046') {
      setShowQuantityDialog(false);
      setQuantityPassword('');
      setQuantityPasswordError('');
      // 실물량파악 페이지로 이동
      navigate('/quantity-check', { 
        state: { 
          selectedSiteId: selectedSite?.id,
          selectedSiteName: selectedSite?.name 
        } 
      });
    } else {
      setQuantityPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handleQuantityDialogClose = () => {
    setShowQuantityDialog(false);
    setQuantityPassword('');
    setQuantityPasswordError('');
  };

  const handleAddAdjustmentItem = async (itemType = '단수정리') => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    // 수정하기 모드일 때 자동 저장 방지
    if (preventAutoSave()) {
      return;
    }
    
    const currentItems = [...(form.items || [])];
    
    // 이미 해당 항목이 있는지 확인
    const existingAdjustment = currentItems.find(item => item?.name === itemType);
    if (existingAdjustment) {
      alert(`${itemType} 항목이 이미 존재합니다.`);
      return;
    }
    
    // 조정 항목 추가 (B열에 공백 자동 설정)
    const adjustmentItem = {
      name: itemType,
      specification: itemType, // A열
      unit: '식', // C열
      quantity: '',
      price: '',
      amount: '',
      isAdjustment: true,
      // B열에 공백 자동 설정 (엑셀 파싱 시 문제 방지)
      columnB: ' ', // B열에 공백 1칸
      columnA: itemType, // A열
      columnC: '식' // C열
    };
    
    // 총계 항목들 앞에 추가
    const totalIndex = currentItems.findIndex(item => item?.isTotal);
    if (totalIndex !== -1) {
      currentItems.splice(totalIndex, 0, adjustmentItem);
    } else {
      currentItems.push(adjustmentItem);
    }
    
    setForm(prev => ({ ...prev, items: currentItems }));
    
    // Firebase에 실시간 저장 (수정 모드일 때만)
    if (selectedSite && isEditing) {
      try {
        // 단수정리 항목 추가 저장 시작 전 스크롤 위치 저장
        saveScrollPosition();
        setIsFormSubmitting(true);
        
        // sites 컬렉션 업데이트
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: currentItems,
          updatedAt: new Date()
        });
        
        // materialEstimates 컬렉션도 함께 업데이트
        const materialQuery = query(
          collection(db, 'materialEstimates'),
          where('siteId', '==', selectedSite.id)
        );
        const materialDocs = await getDocs(materialQuery);
        
        if (!materialDocs.empty) {
          const materialDoc = materialDocs.docs[0];
          const materialData = materialDoc.data();
          
          // 단수정리 항목을 materialEstimates의 items에 추가
          const updatedItems = [...(materialData.items || []), adjustmentItem];
          
          await updateDoc(doc(db, 'materialEstimates', materialDoc.id), {
            items: updatedItems,
            updatedAt: serverTimestamp()
          });
          
          console.log('✅ materialEstimates 컬렉션에 단수정리 추가 완료');
        }
      } catch (error) {
        console.error('단수정리 항목 추가 실시간 저장 오류:', error);
      } finally {
        // 단수정리 항목 추가 저장 완료 후 스크롤 위치 복원
        setIsFormSubmitting(false);
        restoreScrollPosition();
      }
    }
  };
  
  const handleRemoveItem = async (index) => {
    // 수정 모드가 아닌 경우 편집 불가
    if (selectedSite && !isEditing) {
      return;
    }
    
    // 항목 삭제는 즉시 처리 (자동 저장 방지 우회)
    
    // 삭제하려는 항목이 단수정리인지 확인
    const itemToRemove = form.items[index];
    if (itemToRemove && itemToRemove.name === '단수정리') {
      // 단수정리 항목 삭제 시 확인 메시지 표시
      if (!confirm('단수정리 항목을 삭제하시겠습니까? 이 항목은 자동으로 계산되는 항목입니다.')) {
        return;
      }
      console.log('단수정리 항목 삭제 진행');
    }
    
    const newItems = form.items.filter((_, i) => i !== index);
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = newItems
      .filter(item => !item?.isSpacer && !item?.isTotal && !item?.isVat && !item?.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = newItems.findIndex(item => item?.isTotal);
    if (totalIndex !== -1) {
      newItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = newItems.findIndex(item => item?.isVat);
    if (vatIndex !== -1) {
      newItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 계약금액(부가세포함) 업데이트
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = newItems.findIndex(item => item?.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      newItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    // 계약금액 자동 업데이트
    const autoContractAmount = getAutoContractAmount(newItems);
    
    setForm(prev => ({ 
      ...prev, 
      items: newItems,
      contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : prev.contractAmount
    }));
    
    // Firebase에 실시간 저장 (수정 모드일 때만)
    if (selectedSite && isEditing) {
      try {
        console.log('🔄 Firebase에 항목 삭제 저장 시작...');
        
        // sites 컬렉션 업데이트 (재시도 로직 포함)
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            await updateDoc(doc(db, 'sites', selectedSite.id), {
              items: newItems,
              contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
              updatedAt: new Date()
            });
            console.log('✅ sites 컬렉션 업데이트 완료');
            break;
          } catch (siteError) {
            retryCount++;
            console.warn(`⚠️ sites 업데이트 실패 (${retryCount}/${maxRetries}):`, siteError);
            if (retryCount === maxRetries) {
              throw siteError;
            }
            // 잠시 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
        
        // materialEstimates 컬렉션도 함께 업데이트 (선택적)
        try {
          const materialQuery = query(
            collection(db, 'materialEstimates'),
            where('siteId', '==', selectedSite.id)
          );
          const materialDocs = await getDocs(materialQuery);
          
          if (!materialDocs.empty) {
            const materialDoc = materialDocs.docs[0];
            const materialData = materialDoc.data();
            
            // 삭제된 항목을 materialEstimates의 items에서도 제거
            const updatedItems = materialData.items.filter((_, i) => i !== index);
            
            await updateDoc(doc(db, 'materialEstimates', materialDoc.id), {
              items: updatedItems,
              updatedAt: serverTimestamp()
            });
            
            console.log('✅ materialEstimates 컬렉션에서도 품목 삭제 완료');
          }
        } catch (materialError) {
          console.warn('⚠️ materialEstimates 업데이트 실패 (무시함):', materialError);
          // materialEstimates 업데이트 실패는 무시하고 계속 진행
        }
        
        console.log('✅ 항목 삭제 완료');
        
      } catch (error) {
        console.error('❌ 품목 삭제 실시간 저장 오류:', error);
        
        // 사용자에게 오류 알림
        alert('항목 삭제 중 오류가 발생했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
        
        // 로컬 상태 롤백 (실패 시 원래 상태로 복원)
        // setForm 호출 이전 상태로 되돌리기는 복잡하므로, 사용자에게 새로고침 권장
      }
    }
  };

  // 물량내역 업로드 관련 함수들
  const handleOpenUploadDialog = () => {
    // 수정 모드가 아닌 경우 업로드 불가
    if (selectedSite && !isEditing) {
      alert('수정 모드에서만 업로드할 수 있습니다.');
      return;
    }
    
    setUploadedItems([]);
    setUploadDialogOpen(true);
  };

  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setUploadedItems([]);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!selectedSite) {
      alert('현장을 선택해주세요.');
      return;
    }

    try {
      console.log('🚀 물량 데이터 업로드 시작:', { siteId: selectedSite?.id, siteName: selectedSite?.name });
      
      // materialUploadUtils의 함수 사용
      const result = await uploadMaterialData(file, selectedSite?.id, selectedSite?.name);
      
      if (result.success) {
        console.log('✅ 물량 데이터 업로드 성공:', result);
        alert(result.message);
        
        // 업로드된 데이터를 현재 폼에 반영
        if (result.data && result.data.items) {
          const uploadedItems = result.data.items.map(item => ({
            name: item?.name,
            specification: item.specification || '',
            unit: item.unit || '',
            quantity: item.quantity || 0,
            price: item.unitPrice || 0,
            amount: item.amount || 0,
            isTotal: false,
            isVat: false,
            isTotalWithVat: false,
            isAdjustment: false
          }));
          
          setUploadedItems(uploadedItems);
          console.log('📊 업로드된 아이템들:', uploadedItems);
        }
        
        // 요약 정보도 업데이트
        if (result.data && result.data.summary) {
          const summary = result.data.summary;
          console.log('💰 요약 정보:', summary);
        }
        
        // 업로드 완료 후 즉시 데이터 확인
        console.log('🔍 업로드 완료 후 데이터 확인 시작...');
        const checkResult = await getMaterialDataFromFirebase(selectedSite.id);
        console.log('📊 데이터 확인 결과:', checkResult);
        
      } else {
        console.error('❌ 물량 데이터 업로드 실패:', result.error);
        alert('업로드 실패: ' + result.error);
      }
      
    } catch (error) {
      console.error('❌ 업로드 중 오류:', error);
      alert('업로드 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleSaveUploadedItems = async () => {
    if (uploadedItems.length === 0) {
      alert('저장할 데이터가 없습니다.');
      return;
    }

    try {
      // 업로드된 아이템들에 기본 구조 추가 (총 공사계, 부가세, 계약금액 포함)
      const updatedItems = [
        ...uploadedItems, // 업로드된 아이템들
        { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' }, // 총 공사계
        { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' }, // 부가세
        { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' } // 계약금액
      ];
      
      // 총 공사계 자동 계산
      const totalAmount = uploadedItems
        .filter(item => !item?.isSpacer && !item?.isTotal && !item?.isVat && !item?.isTotalWithVat)
        .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
      
      // 총 공사계 업데이트
      const totalIndex = updatedItems.findIndex(item => item.isTotal);
      if (totalIndex !== -1) {
        updatedItems[totalIndex].amount = totalAmount.toString();
      }
      
      // 부가세 업데이트 (총공사계의 10%)
      const vatAmount = Math.round(totalAmount * 0.1);
      const vatIndex = updatedItems.findIndex(item => item.isVat);
      if (vatIndex !== -1) {
        updatedItems[vatIndex].amount = vatAmount.toString();
      }
      
      // 총계 업데이트 (총공사계 + 부가세)
      const totalWithVat = totalAmount + vatAmount;
      const totalWithVatIndex = updatedItems.findIndex(item => item.isTotalWithVat);
      if (totalWithVatIndex !== -1) {
        updatedItems[totalWithVatIndex].amount = totalWithVat.toString();
      }
      
      // 계약금액 자동 업데이트
      const autoContractAmount = getAutoContractAmount(updatedItems);
      
      // Firebase에 실시간 저장
      if (selectedSite) {
        // 기존 현장 수정
        await updateDoc(doc(db, 'sites', selectedSite.id), {
          items: updatedItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
          updatedAt: new Date()
        });
      } else {
        // 새 현장 생성
        const newSiteData = {
          ...form,
          items: updatedItems,
          contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : form.contractAmount,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await addDoc(collection(db, 'sites'), newSiteData);
      }

      // 로컬 상태 업데이트
      setForm(prev => ({
        ...prev,
        items: updatedItems,
        contractAmount: autoContractAmount > 0 ? autoContractAmount.toString() : prev.contractAmount
      }));

      console.log('저장된 아이템들:', updatedItems);
      alert('물량내역이 성공적으로 저장되었습니다. 총 공사계, 부가세, 계약금액이 자동으로 추가되었습니다.');
      handleCloseUploadDialog();
    } catch (error) {
      console.error('물량내역 저장 오류:', error);
      alert('물량내역 저장 중 오류가 발생했습니다: ' + error.message);
    }
  };

  const handleEditUploadedItem = (index, field, value) => {
    const updatedItems = [...uploadedItems];
    
    // 총 공사계는 편집 불가
    if (updatedItems[index].isTotal) {
      return;
    }
    
    // 단가와 금액의 경우 쉼표 제거 후 저장
    if (field === 'price' || field === 'amount') {
      const numericValue = value.replace(/,/g, '');
      updatedItems[index] = { ...updatedItems[index], [field]: numericValue };
    } else {
      updatedItems[index] = { ...updatedItems[index], [field]: value };
    }
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = updatedItems
      .filter(item => !item?.isSpacer && !item?.isTotal && !item?.isVat && !item?.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = updatedItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      updatedItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트 (총공사계의 10%)
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = updatedItems.findIndex(item => item.isVat);
    if (vatIndex !== -1) {
      updatedItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 총계 업데이트 (총공사계 + 부가세)
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = updatedItems.findIndex(item => item.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      updatedItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    setUploadedItems(updatedItems);
  };

  const handleDeleteUploadedItem = (index) => {
    // 총 공사계는 삭제 불가
    if (uploadedItems[index].isTotal) {
      return;
    }
    
    const updatedItems = uploadedItems.filter((_, i) => i !== index);
    
    // 총 공사계 자동 재계산 (단수정리 포함)
    const totalAmount = updatedItems
      .filter(item => !item?.isSpacer && !item?.isTotal && !item?.isVat && !item?.isTotalWithVat)
      .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    
    // 총 공사계 업데이트
    const totalIndex = updatedItems.findIndex(item => item.isTotal);
    if (totalIndex !== -1) {
      updatedItems[totalIndex].amount = totalAmount.toString();
    }
    
    // 부가세 업데이트 (총공사계의 10%)
    const vatAmount = Math.round(totalAmount * 0.1);
    const vatIndex = updatedItems.findIndex(item => item.isVat);
    if (vatIndex !== -1) {
      updatedItems[vatIndex].amount = vatAmount.toString();
    }
    
    // 총계 업데이트 (총공사계 + 부가세)
    const totalWithVat = totalAmount + vatAmount;
    const totalWithVatIndex = updatedItems.findIndex(item => item.isTotalWithVat);
    if (totalWithVatIndex !== -1) {
      updatedItems[totalWithVatIndex].amount = totalWithVat.toString();
    }
    
    setUploadedItems(updatedItems);
  };
  const handleNewSite = (skipEditing = false) => {
    console.log('🔍 handleNewSite 호출됨:', { isMobile, skipEditing });
    
    setSelectedSite(null);
    setSiteIntegratedStatus(null);
    
    // 기본 구조의 물량내역 생성 (총 공사계, 부가세, 계약금액 포함)
    const defaultItems = [
      { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 1
      { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 2
      { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 3
      { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' }, // 총 공사계
      { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' }, // 부가세
      { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' } // 계약금액
    ];
    
    setForm({
      name: '',
      contractType: '계약없음',
      manager: '',
      startDate: '',
      endDate: '',
      status: '진행',
      isFavorite: false,
      items: defaultItems
    });
    
    // 모바일에서는 항상 편집 모드로 전환, PC에서는 skipEditing 옵션 적용
    if (isMobile) {
      console.log('📱 모바일에서 편집 모드로 전환');
      setIsEditing(true);
    } else {
      console.log('💻 PC에서 편집 모드 설정:', !skipEditing);
      setIsEditing(!skipEditing);
    }
    
    console.log('✅ handleNewSite 완료');
  };
  const handleEditClick = () => setIsEditing(true);

  // 견적페이지와 연동하는 함수
  const syncWithEstimates = async (manager, companyName) => {
    if (manager && manager.trim()) {
      try {
        // 1. 거래처관리(vendors)에 저장
        const vendorData = {
          name: manager.trim(),
          position: '', // 현장관리에서는 직위 정보가 없음
          companyName: companyName && companyName.trim() ? companyName.trim() : '',
          source: 'new_sites',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 거래처가 있는지 확인
        const existingVendorQuery = query(
          collection(db, 'vendors'),
          where('name', '==', manager.trim())
        );
        const existingVendorSnapshot = await getDocs(existingVendorQuery);
        
        if (existingVendorSnapshot.empty) {
          console.log('새로운 거래처 추가:', vendorData);
          await addDoc(collection(db, 'vendors'), vendorData);
        } else {
          console.log('기존 거래처 업데이트:', vendorData);
          const existingVendorDoc = existingVendorSnapshot.docs[0];
          await updateDoc(doc(db, 'vendors', existingVendorDoc.id), {
            companyName: vendorData.companyName,
            updatedAt: new Date()
          });
        }
        
        // 2. 견적페이지에서 사용할 의뢰자 데이터 생성
        const requesterData = {
          name: manager.trim(),
          title: '', // 현장관리에서는 직위 정보가 없음
          fullName: manager.trim(),
          company: companyName && companyName.trim() ? companyName.trim() : '',
          source: 'new_sites',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // 기존에 같은 이름의 의뢰자가 있는지 확인
        const existingRequesterQuery = query(
          collection(db, 'requesters'),
          where('name', '==', manager.trim())
        );
        const existingRequesterSnapshot = await getDocs(existingRequesterQuery);
        
        if (existingRequesterSnapshot.empty) {
          console.log('새로운 의뢰자 추가:', requesterData);
          await addDoc(collection(db, 'requesters'), requesterData);
        } else {
          console.log('기존 의뢰자 업데이트:', requesterData);
          const existingRequesterDoc = existingRequesterSnapshot.docs[0];
          await updateDoc(doc(db, 'requesters', existingRequesterDoc.id), {
            company: requesterData.company,
            updatedAt: new Date()
          });
        }
      } catch (error) {
        console.error('의뢰자 데이터 저장 오류:', error);
      }
    }
  };

  // 중복 저장 방지를 위한 상태
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // 중복 저장 방지
    if (isSaving) {
      console.log('이미 저장 중입니다. 중복 호출 방지');
      return;
    }

    console.log('현장 저장 시작:', { selectedSite: !!selectedSite, formData: form });

    // 기타 선택 시 견적 비고 필수 검증
    if (form.estimateStatus === '기타' && !form.estimateNote?.trim()) {
      alert('기타 선택 시 견적 비고를 반드시 입력해야 합니다.');
      estimateNoteRef.current?.focus();
      return;
    }

    setIsSaving(true);

    try {
      // 물량 개수 계산 (템플릿 타입은 저장하지 않음, 다운로드 시마다 자동 결정)
      // 자동계산 항목만 제외하고 빈 항목은 포함해서 계산
      const actualItems = form.items?.filter(item => 
        !item?.isTotal && !item?.isVat && !item?.isTotalWithVat
      ) || [];
      const itemCount = actualItems.length;
      
      const formDataToSave = { 
        ...form, 
        startDate: formatDateForStorage(form.startDate), 
        endDate: formatDateForStorage(form.endDate)
        // templateType 제거 - 다운로드 시마다 물량 개수에 따라 자동 결정
      };
      
      console.log(`📋 물량 데이터: ${itemCount}개 (템플릿 타입은 다운로드 시 자동 결정)`);
      
      if (selectedSite) {
        if (window.confirm('수정하시겠습니까?')) {
          console.log('현장 수정 시작:', selectedSite.id);
          await updateSite(selectedSite.id, formDataToSave);
          // 견적페이지와 연동
          await syncWithEstimates(form.manager, form.companyName);
          setIsEditing(false);
          console.log('현장 수정 완료');
        }
      } else {
        // 등록 확인 메시지
        const confirmMessage = `다음 현장을 등록하시겠습니까?\n\n현장명: ${form.name}\n계약구분: ${form.contractType}\n담당자: ${form.manager}\n시작일: ${form.startDate}\n종료일: ${form.endDate}\n물량: ${itemCount}개 (템플릿은 다운로드 시 자동 결정)`;
        
        if (!window.confirm(confirmMessage)) {
          setIsSaving(false);
          return;
        }
        
        console.log('현장 등록 시작');
        await addSite(formDataToSave);
        // 견적페이지와 연동
        await syncWithEstimates(form.manager, form.companyName);
        alert('현장이 성공적으로 등록되었습니다.');
        handleNewSite(true); // skipEditing = true로 설정하여 편집 모드로 전환하지 않음
        console.log('현장 등록 완료');
      }
    } catch (error) { 
      console.error("Failed to save site:", error);
      alert(selectedSite ? '현장 수정에 실패했습니다.' : '현장 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
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

  const handleGisung = () => {
    if (selectedSite) {
      // 기성관리 페이지로 이동하면서 해당 현장 선택
      // 현장별 기성현황 탭에 자동으로 해당 현장이 선택되도록 설정
      navigate(`/progress?siteId=${selectedSite.id}&viewMode=site&autoSelect=true`, {
        state: {
          fromSiteInfo: true,
          selectedSiteId: selectedSite?.id,
          selectedSiteName: selectedSite?.name,
          autoSelectSite: true
        }
      });
    } else {
      navigate('/progress');
    }
  };

  const handleWholeList = () => navigate('/whole-list');
  
  const handleDistributionView = () => {
    navigate('/company-distribution');
  };

  // 회사별 현장 분포 계산
  const companyDistribution = useMemo(() => {
    if (!showDistributionView) return [];
    
    const today = new Date();
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
    
    // 1년 내 현장들만 필터링
    const recentSites = sites.filter(site => {
      if (!site.startDate) return false;
      try {
        const startDate = new Date(site.startDate);
        return !isNaN(startDate.getTime()) && startDate >= oneYearAgo;
      } catch (error) {
        return false;
      }
    });

    // 회사별로 그룹화
    const companyMap = new Map();
    
    recentSites.forEach(site => {
      const companyName = site.companyName || '미지정';
      const contractAmount = Number(site.contractAmount) || 0;
      
      if (!companyMap.has(companyName)) {
        companyMap.set(companyName, {
          companyName,
          sites: [],
          totalContractAmount: 0,
          siteCount: 0,
          statusCounts: { '예정': 0, '진행': 0, '완료': 0, '미정': 0 }
        });
      }
      
      const company = companyMap.get(companyName);
      company.sites.push({
        id: site.id,
        name: site?.name,
        status: site.status,
        startDate: site.startDate,
        endDate: site.endDate,
        contractAmount: contractAmount,
        manager: site.manager
      });
      
      company.totalContractAmount += contractAmount;
      company.siteCount += 1;
      company.statusCounts[site.status] = (company.statusCounts[site.status] || 0) + 1;
    });

    // 계약금액 순으로 정렬
    return Array.from(companyMap.values())
      .sort((a, b) => b.totalContractAmount - a.totalContractAmount);
  }, [sites, showDistributionView]);
  const isReadOnly = !isEditing;

  // 스크롤 위치 저장 및 복원을 위한 상태
  const [savedScrollPosition, setSavedScrollPosition] = useState(0);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // 스크롤 위치 저장
  const saveScrollPosition = () => {
    const container = containerRef.current;
    if (container) {
      setSavedScrollPosition(container.scrollTop);
    }
  };

  // 스크롤 위치 복원
  const restoreScrollPosition = () => {
    const container = containerRef.current;
    if (container && savedScrollPosition > 0) {
      setTimeout(() => {
        container.scrollTop = savedScrollPosition;
        setSavedScrollPosition(0); // 복원 후 초기화
      }, 100);
    }
  };

  const scrollFocus = (ref) => () => {
    // 폼 제출 중이면 스크롤 조정하지 않음
    if (isFormSubmitting) {
      return;
    }

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
  const windowCompanyRef = useRef();
  const noteRef = useRef();

  // 중복 단수정리 항목 정리 함수
  // 엑셀 다운로드 함수 (NEWgisung.xlsx 템플릿 사용)



  const handleCleanupDuplicateAdjustments = async () => {
    if (!selectedSite) {
      alert('현장을 선택해주세요.');
      return;
    }

    const currentItems = [...(form.items || [])];
    const adjustmentItems = currentItems.filter(item => item?.name === '단수정리');
    
    if (adjustmentItems.length <= 1) {
      alert('중복된 단수정리 항목이 없습니다.');
      return;
    }

    if (!confirm(`중복된 단수정리 항목 ${adjustmentItems.length}개를 정리하시겠습니까?`)) {
      return;
    }

    try {
      // 첫 번째 단수정리 항목만 남기고 나머지 제거
      let foundFirst = false;
      const cleanedItems = currentItems.filter(item => {
        if (item?.name === '단수정리') {
          if (!foundFirst) {
            foundFirst = true;
            return true; // 첫 번째는 유지
          } else {
            return false; // 나머지는 제거
          }
        }
        return true; // 단수정리가 아닌 항목들은 모두 유지
      });

      // Firebase에 저장
      await updateDoc(doc(db, 'sites', selectedSite.id), {
        items: cleanedItems,
        updatedAt: new Date()
      });

      // 로컬 상태 업데이트
      setSites(prev => prev.map(site => 
        site.id === selectedSite.id 
          ? { ...site, items: cleanedItems }
          : site
      ));

      // 선택된 현장 상태도 업데이트
      setSelectedSite(prev => prev ? { ...prev, items: cleanedItems } : null);

      // 폼 상태도 업데이트
      setForm(prev => ({ ...prev, items: cleanedItems }));

      alert(`중복된 단수정리 항목이 정리되었습니다. (${adjustmentItems.length}개 → 1개)`);
    } catch (error) {
      console.error('중복 단수정리 정리 오류:', error);
      alert('중복 단수정리 정리 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // 물량내역 초기화 함수
  const handleClearItems = async () => {
    if (!selectedSite) {
      alert('현장을 선택해주세요.');
      return;
    }

    if (!confirm('물량내역을 모두 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      // 기본 구조의 물량내역 생성 (총 공사계, 부가세, 계약금액 포함)
      const defaultItems = [
        { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 1
        { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 2
        { isSpacer: true, name: '', quantity: '', price: '', amount: '' }, // 보이지 않는 빈칸 3
        { isTotal: true, name: '총 공사계(부가세별도)', quantity: '', price: '', amount: '0' }, // 총 공사계
        { isVat: true, name: '부가세', quantity: '', price: '', amount: '0' }, // 부가세
        { isTotalWithVat: true, name: '계약금액(부가세포함)', quantity: '', price: '', amount: '0' } // 계약금액
      ];

      // materialEstimates 컬렉션에서 해당 현장의 데이터 삭제
      const materialQuery = query(
        collection(db, 'materialEstimates'),
        where('siteId', '==', selectedSite.id)
      );
      const materialDocs = await getDocs(materialQuery);
      
      // 기존 materialEstimates 문서들 삭제
      const deletePromises = materialDocs.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // 선택된 현장의 물량내역을 기본 구조로 초기화
      await updateDoc(doc(db, 'sites', selectedSite.id), {
        items: defaultItems,
        materialEstimateId: null // materialEstimateId도 초기화
      });

      // 로컬 상태 업데이트
      setSites(prev => prev.map(site => 
        site.id === selectedSite.id 
          ? { ...site, items: defaultItems }
          : site
      ));

      // 선택된 현장 상태도 업데이트
      setSelectedSite(prev => prev ? { ...prev, items: defaultItems } : null);

      // 폼 상태도 초기화
      setForm(prev => ({ ...prev, items: defaultItems }));

      alert('물량내역이 성공적으로 초기화되었습니다. 총 공사계, 부가세, 계약금액이 자동으로 추가되었습니다.');
    } catch (error) {
      console.error('물량내역 초기화 오류:', error);
      alert('물량내역 초기화 중 오류가 발생했습니다: ' + error.message);
    }
  };


  // 견적서 보기 함수
  const handleViewEstimate = async () => {
    try {
      console.log('📄 견적서 보기 시작');
      
      if (!selectedSite) {
        console.warn('⚠️ 선택된 현장이 없습니다.');
        alert('현장을 선택해주세요.');
        return;
      }

      // selectedSite 유효성 검사 추가
      if (!selectedSite?.name || !selectedSite?.id) {
        console.error('❌ 선택된 현장 정보가 올바르지 않습니다:', selectedSite);
        alert('선택된 현장 정보가 올바르지 않습니다. 현장을 다시 선택해주세요.');
        return;
      }

      setDownloadLoading(true);
      
      console.log('📄 견적서 생성 시작:', selectedSite?.name, 'ID:', selectedSite?.id);
      
      // getMaterialDataFromFirebase 함수 존재 확인
      if (typeof getMaterialDataFromFirebase !== 'function') {
        console.error('❌ getMaterialDataFromFirebase 함수가 정의되지 않았습니다.');
        alert('물량 데이터 조회 함수를 찾을 수 없습니다.');
        return;
      }
      
      // 물량 데이터 가져오기
      const materialResult = await getMaterialDataFromFirebase(selectedSite?.id);
      console.log('📊 물량 데이터 조회 결과:', materialResult);

      // 물량 데이터 유효성 검사
      if (!materialResult || typeof materialResult !== 'object') {
        console.error('❌ 물량 데이터 조회 결과가 유효하지 않습니다:', materialResult);
        alert('물량 데이터를 불러올 수 없습니다.');
        return;
      }

      let materialData = materialResult.success ? (materialResult.data || { items: [] }) : { items: [] };
      
      // materialData 유효성 검사
      if (!materialData || typeof materialData !== 'object') {
        console.error('❌ materialData가 유효하지 않습니다:', materialData);
        materialData = { items: [] };
      }
      
      if (!materialData.items || !Array.isArray(materialData.items)) {
        console.warn('⚠️ materialData.items가 유효하지 않습니다:', materialData.items);
        materialData.items = [];
      }
      
      if (materialData.items.length === 0) {
        console.log('⚠️ 견적서 경로 폴백: materialEstimates 비어있음 → sites.items 조회');
        try {
          const { getDoc } = await import('firebase/firestore');
          const siteSnap = await getDoc(doc(db, 'sites', selectedSite?.id));
          if (siteSnap.exists()) {
            const siteDataDoc = siteSnap.data();
            const siteItems = Array.isArray(siteDataDoc.items) ? siteDataDoc.items : [];
            if (siteItems.length > 0) {
              materialData = { items: siteItems };
              console.log('✅ 견적서 폴백 성공: sites.items', siteItems.length, '개');
            } else {
              console.log('⚠️ 견적서 폴백 실패: sites.items 비어있음');
            }
          } else {
            console.log('⚠️ 견적서 폴백 실패: sites 문서 없음');
          }
        } catch (fbErr) {
          console.warn('⚠️ 견적서 폴백 오류:', fbErr);
        }
      }

      // 물량 데이터가 여전히 없는 경우
      if (!materialData.items || materialData.items.length === 0) {
        console.warn('⚠️ 물량 데이터가 없습니다.');
        alert('이 현장에는 업로드된 물량 데이터가 없습니다. 먼저 견적서를 업로드해주세요.');
        return;
      }

      // 실제 물량 항목이 있는지 확인 (총계, 부가세 제외)
      const actualItems = materialData.items.filter((item, index) => {
        try {
          if (!item || typeof item !== 'object') {
            console.warn(`⚠️ 항목 ${index}: 유효하지 않은 물량 항목:`, item);
            return false;
          }
          
          if (!item?.name) {
            console.warn(`⚠️ 항목 ${index}: name 속성이 없음:`, item);
            return false;
          }
          
          const isExcluded = item?.isTotal || item?.isVat || item?.isTotalWithVat || item?.isAdjustment;
          if (isExcluded) {
            console.log(`⏭️ 항목 ${index}: 제외 (${item?.name})`);
            return false;
          }
          
          console.log(`✅ 항목 ${index}: 포함 (${item?.name})`);
          return true;
        } catch (filterError) {
          console.error(`❌ 항목 ${index} 필터링 중 오류:`, filterError.message, item);
          return false;
        }
      });

      if (actualItems.length === 0) {
        console.warn('⚠️ 실제 물량 항목이 없습니다.');
        alert('이 현장에는 실제 물량 항목이 없습니다. 먼저 견적서를 업로드해주세요.');
        return;
      }

      console.log('📋 물량 데이터 확인:', materialData.items.length, '개 항목');

      // 물량 개수에 따른 템플릿 타입 계산
      const itemCount = materialData.items.length;
      const templateType = itemCount > 20 ? 'L' : 'N';
      const templateTypeText = templateType === 'L' ? 'LONG' : 'NEW';
      
      // 로딩 메시지 설정 (템플릿 타입 포함)
      setLoadingMessage(`열심히 제작중에 있습니다.\n견적서 [${templateTypeText}]을 생산하고 있습니다.`);

      // 견적서 생성 (물량 타입 정보 포함)
      const siteDataWithTemplate = {
        ...selectedSite,
        templateType: 'AUTO' // 물량 개수에 따라 자동 설정
      };
      
      // 견적서 전용 함수 import 및 호출
      console.log('🚀 createEstimate 호출 시작');
      console.log('📊 siteDataWithTemplate:', siteDataWithTemplate);
      console.log('📊 materialData:', materialData);
      
      const { createEstimate } = await import('../utils/estimateUtils');
      const fileName = `(견적서)${siteDataWithTemplate?.name || '현장'} 중 유리공사`;
      const result = await createEstimate(siteDataWithTemplate, materialData.items || [], fileName);
      
      if (!result) {
        console.error('❌ createEstimate이 undefined를 반환했습니다.');
        alert('견적서 생성에 실패했습니다.');
        return;
      }
      
      if (result.success) {
        console.log('✅ 견적서 생성 성공:', result.message);
        alert(result.message || '견적서가 생성되었습니다.');
      } else {
        console.error('❌ 견적서 생성 실패:', result.error);
        alert('견적서 생성 실패: ' + (result.error || '알 수 없는 오류'));
      }
      
    } catch (error) {
      console.error('❌ 견적서 생성 오류:', error);
      alert('견적서 생성 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setDownloadLoading(false);
      setLoadingMessage(''); // 로딩 메시지 초기화
    }
  };



  return (
    <Box 
      ref={containerRef}
      sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        position: 'relative',
        pt: isMobile ? 5.5 : 5.5
      }}
    >
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: isMobile ? 8 : 3,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', md: 'row' }, 
            height: { xs: 'auto', md: 'calc(100vh - 120px)' },
            bgcolor: '#1a1d21', 
            p: 0, 
            gap: 2, 
            overflow: { xs: 'auto', md: 'hidden' },
            borderRadius: 2,
            boxShadow: 3,
            WebkitOverflowScrolling: 'touch', // 터치 스크롤 활성화
            touchAction: 'pan-y', // 세로 스크롤만 허용
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
          bgcolor: '#f5f5f5',
          mt: 2,
          ml: 1,
          mr: 1,
          width: 'calc(100% - 16px)',
          maxWidth: 'calc(100% - 16px)',
          gap: 1,
          pb: 2
        }
      }}
    >
      {/* 스마트폰 전용 Left Panel - 현장 목록 */}
      <Paper elevation={3} sx={{ 
        width: { xs: '100%', md: '20%' }, 
        minWidth: { md: '200px' }, 
        height: { xs: 'auto', md: '100%' }, // 모바일에서는 자동 높이
        display: { xs: isMobile && isEditing ? 'none' : 'flex', md: 'flex' },
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 1 : 2, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '0px' : 'auto',
        overflow: 'visible', // 모바일에서 스크롤 허용
        flexShrink: 0,
        mb: '30px', // 아래쪽 마진 30px 추가
        // 스마트폰에서만 적용
        '@media (max-width: 767px)': {
          bgcolor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          p: 2,
          mb: 2
        }
      }}>
        <Tabs 
          value={statusTab} 
          onChange={(e, v) => {
            setStatusTab(v);
            // 완료 탭을 벗어날 때 숨겨진 목록 보기 상태 초기화
            if (v !== '완료') {
              setShowHiddenCompleted(false);
            }
          }} 
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
              minHeight: isMobile ? '32px' : 'auto',
              // 스마트폰에서만 적용
              '@media (max-width: 767px)': {
                px: 0.5,
                py: 0.5,
                fontSize: '0.8rem',
                minHeight: '40px',
                color: '#666'
              }
            },
            // 스마트폰에서만 적용
            '@media (max-width: 767px)': {
              '& .Mui-selected': {
                color: '#2E7D32 !important'
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#2E7D32'
              }
            }
          }}
        >
          {STATUS_OPTIONS.map(opt => (
            <Tab 
              key={opt} 
              label={
                opt === '완료' && hiddenCompletedSites > 0 
                  ? `${opt} (${statusCounts[opt] - hiddenCompletedSites}+${hiddenCompletedSites})` 
                  : `${opt} (${statusCounts[opt]})`
              }
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
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton 
                  size="small" 
                  onClick={() => setSearchTerm('')}
                  sx={{ mr: 0.5 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            )
          }}
          sx={{ 
            mb: isMobile ? 1 : 2, 
            input: { color: '#fff', fontSize: isMobile ? '0.8rem' : 'inherit' }, 
            fieldset: { borderColor: '#444' } 
          }} 
        />
        
        {/* 완료 탭에서 숨겨진 현장 안내 메시지와 토글 버튼 */}
        {statusTab === '완료' && hiddenCompletedSites > 0 && (
          <Box sx={{ 
            mb: 1, 
            p: 1, 
            bgcolor: 'rgba(255, 152, 0, 0.1)', 
            border: '1px solid rgba(255, 152, 0, 0.3)', 
            borderRadius: 1,
            fontSize: isMobile ? '0.7rem' : '0.75rem'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#ff9800', flex: 1 }}>
                💡 준공일이 60일 이상 지난 현장 {hiddenCompletedSites}개는 목록에서 숨겨졌습니다
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setShowHiddenCompleted(!showHiddenCompleted)}
                sx={{
                  minWidth: 'auto',
                  px: 1,
                  py: 0.5,
                  fontSize: isMobile ? '0.6rem' : '0.7rem',
                  color: '#ff9800',
                  borderColor: '#ff9800',
                  '&:hover': {
                    bgcolor: 'rgba(255, 152, 0, 0.1)',
                    borderColor: '#f57c00'
                  }
                }}
              >
                {showHiddenCompleted ? '숨기기' : '숨긴목록보기'}
              </Button>
            </Box>
          </Box>
        )}
        

        {/* 모바일에서만 현장 추가 버튼 표시 */}
        {isMobile && (
          <Button 
            variant="contained" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('📱 모바일 새현장 추가 버튼 클릭됨');
              handleNewSite();
            }} 
            size="small" 
            fullWidth
            sx={{ 
              mb: 1,
              bgcolor: '#4caf50',
              color: '#fff',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              minHeight: '44px', // 아이패드 터치 최적화
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
              '&:hover': {
                bgcolor: '#388e3c'
              }
            }}
          >
            + 새 현장 추가
          </Button>
        )}
        <List sx={{ 
          overflowY: 'auto', 
          flex: 1,
          minHeight: 0,
          maxHeight: { xs: 'none', md: '100%' }, // 모바일에서는 제한 없음
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          '&::-webkit-scrollbar': {
            width: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: '#1a1d21',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#444',
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#666'
          }
        }}>
          {filteredSites.map(site => {
            const progress = calculateProgress(site);
            const dateRange = formatDateRange(site.startDate, site.endDate);
            
            // 숨겨진 완료 현장인지 확인
            const isHiddenCompleted = site.status === '완료' && site.endDate && (() => {
              try {
                const today = new Date();
                const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));
                const endDate = new Date(site.endDate);
                return !isNaN(endDate.getTime()) && endDate < sixtyDaysAgo;
              } catch (error) {
                return false;
              }
            })();
            
            // 입금처리가 안된 현장인지 확인 (완료 현장 중 60일 지난 현장만)
            const paymentStatus = paymentStatusMap[site.name];
            const isUnpaid = site.status === '완료' && site.endDate && (() => {
              try {
                const today = new Date();
                const sixtyDaysAgo = new Date(today.getTime() - (60 * 24 * 60 * 60 * 1000));
                const endDate = new Date(site.endDate);
                const isOver60Days = !isNaN(endDate.getTime()) && endDate < sixtyDaysAgo;
                return isOver60Days && paymentStatus && !paymentStatus.isFullyPaid;
              } catch (error) {
                return false;
              }
            })();
            
            return (
              <ListItem 
                key={site.id} 
                selected={selectedSite?.id === site.id} 
                onClick={() => handleSelectSite(site)}
                onTouchStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectSite(site);
                }} 
                sx={{ 
                  mb: isMobile ? 0.25 : 0.5, 
                  borderRadius: 1,
                  py: isMobile ? 0.25 : 0.5,
                  border: '1px solid',
                  borderColor: selectedSite?.id === site.id ? '#90caf9' : 
                              isUnpaid ? '#f44336' : // 입금처리 안된 현장은 빨간색
                              isHiddenCompleted ? '#ff9800' : '#333',
                  bgcolor: selectedSite?.id === site.id ? '#1e3a5f' : 
                          isUnpaid ? 'rgba(244, 67, 54, 0.1)' : // 입금처리 안된 현장은 빨간색 배경
                          isHiddenCompleted ? 'rgba(255, 152, 0, 0.1)' : 'transparent',
                  '&:hover': {
                    bgcolor: selectedSite?.id === site.id ? '#1e3a5f' : 
                            isUnpaid ? 'rgba(244, 67, 54, 0.2)' : // 입금처리 안된 현장은 빨간색 호버
                            isHiddenCompleted ? 'rgba(255, 152, 0, 0.2)' : '#2a2d35',
                    borderColor: '#90caf9'
                  }
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1, overflow: 'hidden' }}>
                      <Typography 
                        sx={{ 
                          fontSize: isMobile ? '0.8rem' : 'inherit',
                          fontWeight: selectedSite?.id === site.id ? 'bold' : 'normal',
                          color: selectedSite?.id === site.id ? '#90caf9' : 
                                 isUnpaid ? '#f44336' : // 입금처리 안된 현장은 빨간색 텍스트
                                 '#fff',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {site.name}
                      </Typography>
                      {isUnpaid && (
                        <Box
                          sx={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            bgcolor: '#f44336',
                            flexShrink: 0,
                            mr: 0.5
                          }}
                          title="입금처리 미완료 현장"
                        />
                      )}
                      {isHiddenCompleted && (
                        <Box
                          sx={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            bgcolor: '#ff9800',
                            flexShrink: 0
                          }}
                          title="준공일이 60일 이상 지난 완료 현장"
                        />
                      )}
                    </Box>
                    {dateRange && (
                      <Typography 
                        sx={{ 
                          fontSize: isMobile ? '0.65rem' : '0.7rem',
                          color: selectedSite?.id === site.id ? '#90caf9' : '#888',
                          ml: 1,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {dateRange}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        sx={{ 
                          fontSize: isMobile ? '0.7rem' : 'inherit',
                          color: selectedSite?.id === site.id ? '#90caf9' : '#aaa'
                        }}
                      >
                        {site.status}
                      </Typography>
                      
                      {/* 물량 타입 표시 (견적서/납품계약서 템플릿 기준) */}
                      {/* 물량 개수에 따른 템플릿 타입 표시 (실시간 계산) */}
                      {site.items && site.items.length > 0 && (
                        <Chip
                          label={site.items.length > 20 ? 'L' : 'N'}
                          size="small"
                          sx={{
                            backgroundColor: site.items.length > 20 ? '#ff9800' : '#4caf50',
                            color: '#fff',
                            fontWeight: 'bold',
                            fontSize: '0.6rem',
                            height: '18px',
                            minWidth: 'auto',
                            px: 0.5
                          }}
                          title={`${site.items.length > 20 ? 'LONG' : 'NEW'} 템플릿 (${site.items.length}개) - 견적서/납품계약서 다운로드 시 자동 선택`}
                        />
                      )}
                      
                      {/* 정산완료 표시 - 현장명 중앙에 겹치게 */}
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
                    
                    {progress !== null && (
                      <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                        <Box sx={{ 
                          width: isMobile ? '40px' : '50px', 
                          height: isMobile ? '6px' : '8px', 
                          bgcolor: '#333', 
                          borderRadius: '4px',
                          overflow: 'hidden',
                          mr: 0.5
                        }}>
                          <Box sx={{ 
                            width: `${progress}%`, 
                            height: '100%', 
                            bgcolor: progress >= 100 ? '#f44336' : progress > 80 ? '#ff9800' : '#4caf50',
                            transition: 'width 0.3s ease'
                          }} />
                        </Box>
                        <Typography 
                          sx={{ 
                            fontSize: isMobile ? '0.7rem' : '0.8rem',
                            color: selectedSite?.id === site.id ? '#90caf9' : '#888',
                            minWidth: '25px'
                          }}
                        >
                          {Math.round(progress)}%
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
      </Paper>
      
      {/* Center Panel - 현장 상세정보 */}
      <Paper elevation={3} sx={{ 
        flex: { xs: 'none', md: 1 }, 
        width: { xs: '100%', md: 'auto' },
        display: { xs: isMobile && isEditing ? 'flex' : 'none', md: 'flex' },
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 1 : 3, 
        borderRadius: 2, 
        minWidth: 0, 
        height: { xs: 'auto', md: '100%' }, // 모바일에서는 자동 높이
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '0px' : 'auto',
        overflow: 'visible', // 모바일에서는 스크롤 허용
        mb: '30px' // 아래쪽 마진 30px 추가
      }}>
         <Box sx={{ display: 'flex', alignItems: 'center', mb: isMobile ? 1 : 2 }}>
           <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
             {isMobile && isEditing && !selectedSite ? '새 현장 등록' : '현장 상세 정보'}
           </Typography>
           <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
             {/* 모바일에서 편집 모드이고 새 현장 등록 중일 때 취소 버튼 표시 */}
             {isMobile && isEditing && !selectedSite ? (
               <Button 
                 variant="outlined" 
                 onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   setIsEditing(false);
                 }} 
                 size="small" 
                 sx={{ 
                   fontSize: '0.7rem',
                   color: '#f44336',
                   borderColor: '#f44336',
                   '&:hover': {
                     borderColor: '#d32f2f',
                     bgcolor: 'rgba(244, 67, 54, 0.1)'
                   }
                 }}
               >
                 취소
               </Button>
             ) : (
               <>
                 <Button 
                   variant="contained" 
                   onClick={(e) => {
                     e.preventDefault();
                     e.stopPropagation();
                     handleNewSite();
                   }} 
                   size={isMobile ? 'small' : 'small'} 
                   sx={{ 
                     fontSize: isMobile ? '0.7rem' : 'inherit',
                     bgcolor: '#4caf50',
                     minHeight: '44px', // 아이패드 터치 최적화
                     touchAction: 'manipulation',
                     WebkitTapHighlightColor: 'transparent',
                     '&:hover': {
                       bgcolor: '#388e3c'
                     }
                   }}
                 >
                   + 새현장
                 </Button>
                 <Button variant="outlined" onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   handleWholeList();
                 }} size={isMobile ? 'small' : 'small'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit', display: isMobile ? 'none' : 'inline-flex' }}>
                   전체 List
                 </Button>
                 <Button variant="text" onClick={(e) => {
                   e.preventDefault();
                   e.stopPropagation();
                   handleDistributionView();
                 }} size={isMobile ? 'small' : 'small'} sx={{ 
                   fontSize: isMobile ? '0.7rem' : 'inherit', 
                   display: isMobile ? 'none' : 'inline-flex',
                   ml: 1,
                   minWidth: 'auto',
                   px: 1,
                   border: 'none',
                   color: '#ffffff',
                   '&:hover': {
                     bgcolor: 'rgba(255, 255, 255, 0.1)'
                   }
                 }}
                 title="회사별 현장 분포도 보기"
                 >
                   <AccountTreeIcon sx={{ fontSize: '2rem', color: '#ffffff' }} />
                 </Button>
               </>
             )}
           </Box>
         </Box>
         {/* 통합 현황 표시 */}
         {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite)) && (
           <Box sx={{ 
             mb: 1, 
             p: 1.5, 
             bgcolor: '#424242', 
             borderRadius: 1,
             border: '1px solid #616161'
           }}>
             <Typography variant="body1" sx={{ mb: 0.5, fontWeight: 'bold', color: '#ffffff', fontSize: isMobile ? '0.9rem' : '1rem' }}>
               {selectedSite ? `${selectedSite?.name} 통합 현황` : '전체 현장 통합 현황'}
             </Typography>
             <Grid container spacing={1}>
               <Grid size={{ xs: 4 }}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h5" sx={{ color: '#4caf50', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                     {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalEstimateAmount ? Math.round((siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalEstimateAmount).toLocaleString() : '0'}
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>계약금액</Typography>
                 </Box>
               </Grid>
               <Grid size={{ xs: 4 }}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                     {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalClaimAmount ? Math.round((siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalClaimAmount).toLocaleString() : '0'}
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>누계기성 (선급금 포함)</Typography>
                 </Box>
               </Grid>
               <Grid size={{ xs: 4 }}>
                 <Box sx={{ textAlign: 'center' }}>
                   <Typography variant="h5" sx={{ color: '#ff9800', fontWeight: 'bold', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                     {(siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalCostAmount ? Math.round((siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalCostAmount).toLocaleString() : '0'}
                   </Typography>
                   <Typography variant="caption" sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>지출</Typography>
                 </Box>
               </Grid>
             </Grid>
             <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #616161' }}>
               <Grid container spacing={1}>
                 <Grid size={{ xs: 12, sm: 4 }}>
                   <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                     계약금액: {formatNumber((siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalEstimateAmount || 0, true)}
                   </Box>
                 </Grid>
                 <Grid size={{ xs: 12, sm: 4 }}>
                   <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                     누계기성: {formatNumber((siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalClaimAmount || 0, true)} (선급금 포함)
                   </Box>
                 </Grid>
                 <Grid size={{ xs: 12, sm: 4 }}>
                   <Box sx={{ color: '#ffffff', fontSize: isMobile ? '0.7rem' : '0.8rem' }}>
                     지출 총액: {formatNumber((siteIntegratedStatus || (totalIntegratedStatus && !selectedSite))?.summary?.totalCostAmount || 0, true)}
                   </Box>
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
           height: { xs: 'auto', md: 'calc(100% - 100px)' }, // 모바일에서는 자동 높이
           minHeight: { xs: 'auto', md: 'auto' }, // 모바일에서 자동 높이
           overflowY: 'auto', // 모바일에서도 스크롤 허용
           WebkitOverflowScrolling: 'touch',
           scrollBehavior: 'smooth',
           touchAction: 'pan-y',
           '&::-webkit-scrollbar': {
             width: '8px'
           },
           '&::-webkit-scrollbar-track': {
             background: '#1a1d21',
             borderRadius: '4px'
           },
           '&::-webkit-scrollbar-thumb': {
             background: '#444',
             borderRadius: '4px'
           },
           '&::-webkit-scrollbar-thumb:hover': {
             background: '#666'
           }
         }}>
           <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: isMobile ? 'none' : 8 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 현장명
               </Typography>
               <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                 <TextField 
                   name="name" 
                   value={form.name ?? ''} 
                   onChange={handleChange} 
                   size="small" 
                   disabled={isReadOnly} 
                   sx={{ 
                     flex: 6,
                     '& .MuiOutlinedInput-root': {
                       '& fieldset': { borderColor: '#ffffff' },
                       '&:hover fieldset': { borderColor: '#ffffff' },
                       '&.Mui-focused fieldset': { borderColor: '#ffffff' }
                     },
                     '& .MuiInputLabel-root': { color: '#bbb' },
                     '& .MuiInputBase-input': { color: '#fff' }
                   }} 
                   inputRef={inputRef1} 
                   onFocus={scrollFocus(inputRef1)} 
                 />
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1.5 }}>
                   <Typography variant="body2" sx={{ fontSize: isMobile ? '0.6rem' : '0.75rem' }}>주요현장</Typography>
                   <IconButton 
                     onClick={() => handleChange({ target: { name: 'isFavorite', value: !(form.isFavorite ?? false) } })} 
                     size="small" 
                     sx={{ ml: 0.5 }} 
                     disabled={isReadOnly}
                   >
                     {(form.isFavorite ?? false) ? <StarIcon sx={{ color: 'gold' }} /> : <StarBorderIcon />}
                   </IconButton>
                 </Box>
                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 2.5 }}>
                   <Typography variant="body1" sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>사용인감</Typography>
                   <FormControl size="small" sx={{ flex: 1 }}>
                     <Select 
                       name="stampType" 
                       value={form.stampType ?? '인감없음'} 
                       onChange={handleChange} 
                       disabled={isReadOnly}
                       sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
                     >
                       <MenuItem value="인감없음">인감없음</MenuItem>
                       <MenuItem value="A인감">A인감</MenuItem>
                       <MenuItem value="□인감">□인감</MenuItem>
                       <MenuItem value="○인감">○인감</MenuItem>
                       <MenuItem value="☆인감">☆인감</MenuItem>
                       <MenuItem value="△인감">△인감</MenuItem>
                       <MenuItem value="♤인감">♤인감</MenuItem>
                       <MenuItem value="♧인감">♧인감</MenuItem>
                       <MenuItem value="♡인감">♡인감</MenuItem>
                       <MenuItem value="11인감">11인감</MenuItem>
                       <MenuItem value="기타">기타</MenuItem>
                     </Select>
                   </FormControl>
                 </Box>
               </Box>
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', flexDirection: 'row' }}>
             <Box sx={{ flex: isMobile ? 1 : 3 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 계약구분
               </Typography>
               <FormControl fullWidth size="small">
                 <Select name="contractType" value={form.contractType ?? '계약없음'} onChange={handleChange} disabled={isReadOnly}>
                   {CONTRACT_TYPE_OPTIONS.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                 </Select>
               </FormControl>
             </Box>
             <Box sx={{ flex: isMobile ? 1 : 3, pb: 0.5 }}>
               <FormControlLabel 
                 control={<Checkbox name="subcontractGuardian" checked={form.subcontractGuardian ?? false} onChange={handleChange} disabled={isReadOnly} />} 
                 label="하도급지킴이"
                 sx={{ 
                   '& .MuiFormControlLabel-label': {
                     wordBreak: 'keep-all', 
                     fontSize: isMobile ? '0.6rem' : 'inherit' 
                   }
                 }}
               />
             </Box>
             <Box sx={{ flex: isMobile ? 1 : 3 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 진행상황
               </Typography>
               <FormControl fullWidth size="small">
                 <Select 
                   name="status" 
                   value={form.status ?? '진행'} 
                   onChange={handleChange} 
                   disabled={false}
                   sx={{
                     '& .MuiSelect-select': {
                       backgroundColor: form.status === '예정' ? '#ff9800' : 
                                      form.status === '진행' ? '#1976d2' : 
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
                                     opt === '진행' ? '#1976d2' : 
                                     opt === '완료' ? '#43a047' : 
                                     opt === '미정' ? '#757575' : '#757575',
                       color: 'white',
                       '&:hover': {
                         backgroundColor: opt === '예정' ? '#f57c00' : 
                                        opt === '진행' ? '#1565c0' : 
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
           
           <Box sx={{ display: 'flex', gap: 1, mt: isMobile ? 0.3 : 0.5, flexDirection: isMobile ? 'column' : 'row' }}>
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
                <TextField name="safetyCost" value={isReadOnly ? formatSafetyCost(form.safetyCost) : (form.safetyCost ?? '')} onChange={handleChange} fullWidth size="small" disabled={isReadOnly} />
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
           
           <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
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
           
           <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 회사명 (선택 또는 입력)
               </Typography>
                <Autocomplete
                  options={[...new Set(vendors.map(v => (v.companyName ?? '').toString()))].filter(Boolean)}
                  value={form.companyName ?? ''}
                  onChange={(event, newValue) => {
                    const e = { target: { name: 'companyName', value: (newValue ?? '').toString() } };
                    handleChange(e);
                  }}
                  onInputChange={(event, newInputValue) => {
                    const e = { target: { name: 'companyName', value: (newInputValue ?? '').toString() } };
                    handleChange(e);
                  }}
                  onFocus={() => setCompanyFocused(true)}
                  onBlur={() => setCompanyFocused(false)}
                  freeSolo
                  selectOnFocus={false}
                  clearOnBlur={false}
                  autoSelect={false}
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
           
           <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
             <Box sx={{ flex: 1 }}>
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
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 창호업체
               </Typography>
               <TextField 
                 name="windowCompany" 
                 value={form.windowCompany ?? ''} 
                 onChange={handleChange} 
                 fullWidth
                 size="small" 
                 disabled={isReadOnly}
                 placeholder="창호업체명을 입력하세요"
                 sx={{
                   '& .MuiOutlinedInput-root': {
                     '& fieldset': { borderColor: '#ffffff' },
                     '&:hover fieldset': { borderColor: '#ffffff' },
                     '&.Mui-focused fieldset': { borderColor: '#ffffff' }
                   },
                   '& .MuiInputLabel-root': { color: '#bbb' },
                   '& .MuiInputBase-input': { color: '#fff' }
                 }}
                 inputRef={windowCompanyRef}
                 onFocus={scrollFocus(windowCompanyRef)}
               />
             </Box>
             <Box sx={{ flex: 1 }}>
               <Typography variant="caption" display="block" sx={{mb: 0.2, textAlign: 'left', fontSize: isMobile ? '0.7rem' : 'inherit'}}>
                 비고
               </Typography>
               <TextField 
                 name="note" 
                 value={form.note ?? ''} 
                 onChange={handleChange} 
                 fullWidth 
                 size="small" 
                 disabled={isReadOnly} 
                 inputRef={noteRef}
                 onFocus={scrollFocus(noteRef)}
                 placeholder="비고 사항"
               />
             </Box>
           </Box>
           
           <Box sx={{ display: 'flex', gap: 1, flexDirection: isMobile ? 'column' : 'row' }}>
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
          <Box sx={{ mt: 'auto', pt: isMobile ? 0.5 : 1, display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap' }}>
           {/* 실물량파악 버튼 */}
           <Button 
             variant="outlined" 
             color="warning" 
             onClick={(e) => {
               e.preventDefault();
               e.stopPropagation();
               handleQuantityCheck();
             }} 
             disabled={!selectedSite} 
             size={isMobile ? 'small' : 'medium'} 
             sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
           >
             실물량파악
           </Button>
           
           {isEditing ? (
             <Button 
               variant="contained" 
               color="primary" 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 handleSave();
               }} 
               disabled={isSaving}
               size={isMobile ? 'small' : 'medium'} 
               sx={{ 
                 fontSize: isMobile ? '0.7rem' : 'inherit',
                 minHeight: '44px', // 아이패드 터치 최적화
                 touchAction: 'manipulation',
                 WebkitTapHighlightColor: 'transparent'
               }}
             >
               {isSaving ? '저장 중...' : (selectedSite ? '저장하기' : '등록하기')}
             </Button>
           ) : (
             <Button 
               variant="contained" 
               color="primary" 
               onClick={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 handleEditClick();
               }} 
               disabled={!selectedSite} 
               size={isMobile ? 'small' : 'medium'} 
               sx={{ 
                 fontSize: isMobile ? '0.7rem' : 'inherit',
                 minHeight: '44px', // 아이패드 터치 최적화
                 touchAction: 'manipulation',
                 WebkitTapHighlightColor: 'transparent'
               }}
             >
               수정하기
             </Button>
           )}
           <Button variant="outlined" color="info" onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             handleViewEstimate();
           }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             견적서보기
           </Button>


           {form?.contractType === '납품계약' && (
             <Button variant="contained" color="primary" onClick={(e) => {
               e.preventDefault();
               e.stopPropagation();
               handleDownloadNapfoomContract();
             }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
               납품계약서
             </Button>
           )}

           <Button variant="outlined" color="secondary" onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             handleDelete();
           }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             삭제
           </Button>

           <Button variant="contained" color="success" onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             handleGisung();
           }} disabled={!selectedSite} size={isMobile ? 'small' : 'medium'} sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}>
             기성현황
           </Button>

         </Box>
      </Paper>
      
      {/* Right Panel - 물량 내역 */}
      <Paper elevation={3} sx={{ 
        width: { xs: '95%', md: '30%' }, // 모바일에서 가로폭 95%로 줄임
        minWidth: { md: '280px' }, 
        height: { xs: 'auto', md: '100%' }, // 모바일에서는 자동 높이
        display: { xs: isMobile && isEditing ? 'flex' : 'none', md: 'flex' }, // 모바일에서는 편집 모드일 때만 표시
        flexDirection: 'column', 
        bgcolor: '#232734', 
        p: isMobile ? 1 : 3, 
        borderRadius: 2, 
        position: isMobile ? 'relative' : 'static',
        top: isMobile ? '0px' : 'auto',
        left: isMobile ? '1%' : 'auto', // 모바일에서 중앙 정렬
        overflow: 'auto', // 모바일에서 스크롤 허용
        mb: '30px' // 아래쪽 마진 30px 추가
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: isMobile ? 1 : 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" fontWeight="bold" sx={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>
              물량 내역
            </Typography>
            {/* 물량 타입 표시 (견적서/납품계약서 템플릿 선택 기준) */}
            {form.items && form.items.length > 0 && (
              <Chip
                label={(() => {
                  const actualItems = form.items.filter(item => 
                    !item?.isTotal && !item?.isVat && !item?.isTotalWithVat
                  );
                  return actualItems.length > 20 ? 'L' : 'N';
                })()}
                size="small"
                sx={{
                  backgroundColor: (() => {
                    const actualItems = form.items.filter(item => 
                      !item.isTotal && !item.isVat && !item.isTotalWithVat
                    );
                    return actualItems.length > 20 ? '#ff9800' : '#4caf50';
                  })(),
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.7rem',
                  minWidth: 'auto',
                  height: '24px',
                  px: 1
                }}
                title={
                  (() => {
                    const actualItems = form.items.filter(item => 
                      !item.isTotal && !item.isVat && !item.isTotalWithVat
                    );
                    const templateType = actualItems.length > 20 ? 'L' : 'N';
                    return `${actualItems.length}개 → ${templateType === 'L' ? 'LONG' : 'NEW'} 템플릿 사용 - 견적서/납품계약서 다운로드 시 자동 선택`;
                  })()
                }
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button 
              variant="outlined" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddItem();
              }} 
              size={isMobile ? 'small' : 'medium'} 
              sx={{ fontSize: isMobile ? '0.7rem' : 'inherit' }}
              disabled={isReadOnly}
            >
              품목추가
            </Button>


            <Button 
              variant="outlined" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenUploadDialog();
              }} 
              size={isMobile ? 'small' : 'medium'} 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : 'inherit',
                color: '#4caf50',
                borderColor: '#4caf50',
                '&:hover': {
                  borderColor: '#388e3c',
                  backgroundColor: 'rgba(76, 175, 80, 0.04)'
                }
              }}
              startIcon={<UploadIcon />}
              disabled={isReadOnly}
            >
              업로드
            </Button>

            <Button 
              variant="outlined" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClearItems();
              }} 
              size={isMobile ? 'small' : 'medium'} 
              sx={{ 
                fontSize: isMobile ? '0.7rem' : 'inherit',
                color: '#f44336',
                borderColor: '#f44336',
                '&:hover': {
                  borderColor: '#d32f2f',
                  backgroundColor: 'rgba(244, 67, 54, 0.04)'
                }
              }}
              disabled={isReadOnly}
            >
              초기화
            </Button>
          </Box>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          gap: 1, 
          mb: 1, 
          color: 'text.secondary', 
          borderBottom: 1, 
          borderColor: 'divider', 
          pb: 1 
        }}>
          <Typography sx={{ width: '35%', fontWeight: 'bold', fontSize: isMobile ? '0.6rem' : '0.75rem' }}>항목</Typography>
          <Typography sx={{ width: '15%', fontWeight: 'bold', fontSize: isMobile ? '0.6rem' : '0.75rem' }}>물량</Typography>
          <Typography sx={{ width: '20%', fontWeight: 'bold', fontSize: isMobile ? '0.6rem' : '0.75rem' }}>단가</Typography>
          <Typography sx={{ width: '20%', fontWeight: 'bold', fontSize: isMobile ? '0.6rem' : '0.75rem' }}>금액</Typography>
        </Box>
        <Box
          sx={{
            height: 'calc(100vh - 300px)',
            overflowY: 'auto',
            border: '1px solid #444',
            borderRadius: '4px',
            p: 1,
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': { display: 'none' } // Chrome, Safari
          }}
        >
          {(form.items || []).map((item, index) => (
            <Box key={index} sx={{ 
              display: item?.isSpacer ? 'none' : 'flex', 
              gap: isMobile ? 0.5 : 1, 
              mb: isMobile ? 0.5 : 1, 
              alignItems: 'center', 
              flexWrap: 'nowrap',
              ...(isMobile && {
                bgcolor: '#1e252b',
                borderRadius: 1,
                p: 1,
                border: '1px solid #333',
                mb: 0.5
              })
            }}>
              {item?.isTotal ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 120px',
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: isMobile ? '0.7rem' : '0.9rem',
                    whiteSpace: 'nowrap', // 한 줄로 표시
                  }}
                >
                  {isMobile ? '총공사계' : '총 공사계(부가세별도)'}
                </Typography>
              ) : item?.isVat ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 120px',
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: isMobile ? '0.9rem' : '1.1rem'
                  }}
                >
                  부가세
                </Typography>
              ) : item?.isTotalWithVat ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 120px',
                    fontWeight: 'bold',
                    color: 'primary.main',
                    fontSize: isMobile ? '0.7rem' : '0.9rem',
                    whiteSpace: 'nowrap', // 한 줄로 표시
                  }}
                >
                  {isMobile ? '계약금액' : '계약금액(부가세포함)'}
                </Typography>
              ) : item?.isAdjustment ? (
                <TextField 
                  value={item?.name ?? ''} 
                  onChange={(e) => handleItemsChange(index, 'name', e.target.value)} 
                  size="small" 
                  sx={{ flex: '1 1 120px' }} 
                  placeholder="단수정리" 
                  disabled={isReadOnly}
                  inputProps={{ style: { fontSize: isMobile ? '0.6rem' : '0.7rem' } }}
                />
              ) : (
                <TextField 
                  value={item?.name ?? ''} 
                  onChange={(e) => handleItemsChange(index, 'name', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 120px',
                    minWidth: isMobile ? '80px' : '120px',
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#777' },
                      '&.Mui-focused fieldset': { borderColor: '#90caf9' }
                    },
                    '& .MuiInputBase-input': { 
                      color: '#fff',
                      fontSize: isMobile ? '0.6rem' : '0.7rem',
                      fontWeight: '500'
                    }
                  }} 
                  placeholder="항목" 
                  disabled={isReadOnly}
                />
              )}
              
              {item?.isTotal || item?.isVat || item?.isTotalWithVat ? (
                <Typography variant="body2" sx={{ flex: '1 1 50px', textAlign: 'center' }}>
                  {item.isTotal || item.isVat || item.isTotalWithVat ? '' : ''}
                </Typography>
              ) : (
                <TextField 
                  value={formatQuantity(item.quantity)} 
                  onChange={(e) => handleItemsChange(index, 'quantity', e.target.value)} 
                  onFocus={(e) => {
                    // 포커스 시 "물량" 텍스트가 있으면 자동으로 지우기
                    if (e.target.value.includes('물량')) {
                      handleItemsChange(index, 'quantity', '');
                    }
                  }}
                  size="small" 
                  sx={{ 
                    flex: '1 1 60px',
                    minWidth: isMobile ? '50px' : '60px',
                    '& .MuiInputBase-input': { 
                      fontSize: isMobile ? '0.6rem' : '0.7rem',
                      textAlign: 'right'
                    }
                  }} 
                  placeholder="물량" 
                  disabled={isReadOnly}
                  inputProps={{ 
                    type: 'text',
                    maxLength: 15
                  }}
                />
              )}
              
              {item?.isTotal || item?.isVat || item?.isTotalWithVat ? (
                <Typography variant="body2" sx={{ flex: '1 1 60px', textAlign: 'center' }}>
                  {item.isTotal || item.isVat || item.isTotalWithVat ? '' : ''}
                </Typography>
              ) : (
                <TextField 
                  value={formatPrice(item.price)} 
                  onChange={(e) => handleItemsChange(index, 'price', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 70px',
                    minWidth: isMobile ? '60px' : '70px',
                    '& .MuiInputBase-input': { 
                      fontSize: isMobile ? '0.6rem' : '0.7rem',
                      textAlign: 'right'
                    }
                  }} 
                  placeholder="단가" 
                  disabled={isReadOnly}
                />
              )}
              
              {item?.isTotal || item?.isVat || item?.isTotalWithVat ? (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    flex: '1 1 70px',
                    minWidth: isMobile ? '60px' : '70px',
                    textAlign: 'right',
                    fontWeight: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'bold' : 'normal',
                    color: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'primary.main' : 'text.primary',
                    fontSize: (item.isTotal || item.isVat || item.isTotalWithVat) ? (isMobile ? '0.7rem' : '0.9rem') : (isMobile ? '0.6rem' : '0.7rem')
                  }}
                >
                  {(item.isTotal || item.isVat || item.isTotalWithVat) ? formatAmount(item.amount) : ''}
                </Typography>
              ) : (
                <TextField 
                  value={formatAmount(item.amount)} 
                  onChange={(e) => handleItemsChange(index, 'amount', e.target.value)} 
                  size="small" 
                  sx={{ 
                    flex: '1 1 70px',
                    minWidth: isMobile ? '60px' : '70px',
                    '& .MuiInputBase-input': { 
                      fontSize: isMobile ? '0.6rem' : '0.7rem',
                      textAlign: 'right'
                    }
                  }} 
                  placeholder="금액" 
                  disabled={isReadOnly}
                />
              )}
              
              {!item.isTotal && !item.isVat && !item.isTotalWithVat && (
                <IconButton 
                  onClick={() => handleRemoveItem(index)} 
                  size="small" 
                  disabled={isReadOnly}
                  sx={{ 
                    opacity: isReadOnly ? 0.5 : 1,
                    '&:hover': {
                      backgroundColor: isReadOnly ? 'transparent' : 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <DeleteIcon sx={{ fontSize: isMobile ? '1rem' : 'inherit' }} />
                </IconButton>
              )}
            </Box>
          ))}
        </Box>
      </Paper>

      {/* 물량내역 업로드 다이얼로그 */}
      <Dialog open={uploadDialogOpen} onClose={handleCloseUploadDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          물량내역 업로드
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              엑셀 파일의 "내역서" 시트에서 A, B, C, D, K, L열의 데이터를 추출합니다. (5번째 줄부터)
            </Typography>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <label htmlFor="excel-upload">
              <Button
                variant="outlined"
                component="span"
                startIcon={<UploadIcon />}
                sx={{ mb: 2 }}
              >
                엑셀 파일 선택
              </Button>
            </label>
          </Box>

          {uploadedItems.length > 0 && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                추출된 물량내역 ({uploadedItems.length}개)
              </Typography>
              <TableContainer component={Paper} sx={{ 
                maxHeight: { xs: 'none', md: 400 }, 
                overflow: 'auto',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y',
                '&::-webkit-scrollbar': {
                  width: '8px'
                },
                '&::-webkit-scrollbar-track': {
                  background: '#1a1d21',
                  borderRadius: '4px'
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#444',
                  borderRadius: '4px'
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#666'
                }
              }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>항목명</TableCell>
                      <TableCell>물량</TableCell>
                      <TableCell>단가</TableCell>
                      <TableCell>금액</TableCell>
                      <TableCell>관리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadedItems.map((item, index) => (
                      <TableRow key={item.id || `uploaded-item-${index}`}>
                        <TableCell>
                          {item?.isTotal ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '1.2rem'
                              }}
                            >
                              총 공사계(부가세별도)
                            </Typography>
                          ) : item?.isVat ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '1.1rem'
                              }}
                            >
                              부가세
                            </Typography>
                          ) : item?.isTotalWithVat ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '1.2rem'
                              }}
                            >
                              계약금액(부가세포함)
                            </Typography>
                          ) : item?.isAdjustment ? (
                            <TextField
                              size="small"
                              value={item?.name}
                              onChange={(e) => handleEditUploadedItem(index, 'name', e.target.value)}
                              fullWidth
                            />
                          ) : (
                            <TextField
                              size="small"
                              value={item?.name}
                              onChange={(e) => handleEditUploadedItem(index, 'name', e.target.value)}
                              fullWidth
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isTotal || item.isVat || item.isTotalWithVat || item.isAdjustment ? (
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {(item.isTotal || item.isVat || item.isTotalWithVat) ? '' : ''}
                            </Typography>
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={formatQuantity(item.quantity)}
                              onChange={(e) => handleEditUploadedItem(index, 'quantity', e.target.value)}
                              fullWidth
                              inputProps={{ step: '0.01' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isTotal || item.isVat || item.isTotalWithVat || item.isAdjustment ? (
                            <Typography variant="body2" sx={{ textAlign: 'center' }}>
                              {(item.isTotal || item.isVat || item.isTotalWithVat) ? '' : ''}
                            </Typography>
                          ) : (
                            <TextField
                              size="small"
                              value={formatPrice(item.price)}
                              onChange={(e) => handleEditUploadedItem(index, 'price', e.target.value)}
                              fullWidth
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {item.isTotal || item.isVat || item.isTotalWithVat || item.isAdjustment ? (
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                textAlign: 'center',
                                fontWeight: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'bold' : 'normal',
                                color: (item.isTotal || item.isVat || item.isTotalWithVat) ? 'primary.main' : 'inherit',
                                fontSize: (item.isTotal || item.isVat || item.isTotalWithVat) ? '1.2rem' : 'inherit'
                              }}
                            >
                              {(item.isTotal || item.isVat || item.isTotalWithVat) ? formatAmount(item.amount) : (item.isAdjustment ? formatAmount(item.amount) : '')}
                            </Typography>
                          ) : (
                            <TextField
                              size="small"
                              value={formatAmount(item.amount)}
                              onChange={(e) => handleEditUploadedItem(index, 'amount', e.target.value)}
                              fullWidth
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {!item.isTotal && !item.isVat && !item.isTotalWithVat && !item.isAdjustment && (
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteUploadedItem(index)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>
            취소
          </Button>
          <Button
            onClick={handleSaveUploadedItems}
            variant="contained"
            disabled={uploadedItems.length === 0}
          >
            추가
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
            {loadingMessage || '문서를 생성하고 있습니다.'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
            잠시만 기다려주세요...
          </Typography>
        </Box>
      </Dialog>
      
      {/* 실물량파악 비밀번호 입력 다이얼로그 */}
      <Dialog 
        open={showQuantityDialog} 
        maxWidth="sm" 
        fullWidth
        onClose={handleQuantityDialogClose}
        PaperProps={{
          sx: {
            bgcolor: '#181f2e',
            color: '#fff',
            borderRadius: 4,
            p: 4
          }
        }}
      >
        <DialogTitle sx={{ color: '#fff', textAlign: 'center', pb: 1 }}>
          실물량파악 접근
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Typography variant="body1" sx={{ color: '#bbb', textAlign: 'center', mb: 2 }}>
              실물량파악 페이지에 접근하려면 비밀번호를 입력하세요.
            </Typography>
            <TextField
              type="password"
              label="비밀번호"
              value={quantityPassword}
              onChange={(e) => setQuantityPassword(e.target.value)}
              error={!!quantityPasswordError}
              helperText={quantityPasswordError}
              fullWidth
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleQuantityPasswordSubmit();
                }
              }}
              sx={{
                '& .MuiInputBase-root': { 
                  bgcolor: '#232b3b',
                  color: '#fff'
                },
                '& .MuiInputLabel-root': { 
                  color: '#bbb'
                },
                '& .MuiOutlinedInput-notchedOutline': { 
                  borderColor: '#444'
                },
                '& .MuiFormHelperText-root': { 
                  color: '#f44336'
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button 
            onClick={handleQuantityDialogClose}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button 
            onClick={handleQuantityPasswordSubmit}
            variant="contained"
            sx={{ 
              bgcolor: '#ff9800',
              '&:hover': { bgcolor: '#f57c00' }
            }}
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 마이그레이션 로딩 팝업 */}
      <Dialog 
        open={loading} 
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
          <CircularProgress size={60} sx={{ color: '#ff9800', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#ff9800', fontWeight: 600, mb: 1 }}>
            L/N 설정 업데이트 중
          </Typography>
          <Typography variant="body1" sx={{ color: '#bbb', whiteSpace: 'pre-line', textAlign: 'center' }}>
            {loadingMessage || '현장 데이터를 분석하고 있습니다...'}
          </Typography>
          <Typography variant="body2" sx={{ color: '#999', mt: 1 }}>
            잠시만 기다려주세요...
          </Typography>
        </Box>
      </Dialog>
        </Box>
      </Container>
    </Box>
  );
};

export default NewSites;
