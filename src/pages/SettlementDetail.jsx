import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  LinearProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Tooltip
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  AttachMoney as AttachMoneyIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarTodayIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where, orderBy, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatContractAmount, formatGisungAmount, formatBalanceAmount } from '../utils/formatUtils';


export default function SettlementDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // iOS 호환 날짜 파싱 함수
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    
    // 문자열인 경우 iOS 호환 형식으로 변환
    if (typeof dateStr === 'string') {
      // YYYY-MM-DD 형식인 경우
      if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // iOS에서 안전한 형식으로 변환
        const [year, month, day] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
      }
      // YYYY-MM 형식인 경우 (월까지만 있는 경우)
      if (dateStr.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = dateStr.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1, 12, 0, 0);
      }
      // YYYY.MM 형식인 경우
      if (dateStr.match(/^\d{4}\.\d{2}$/)) {
        const [year, month] = dateStr.split('.');
        return new Date(parseInt(year), parseInt(month) - 1, 1, 12, 0, 0);
      }
      // YYYY.MM.DD 형식인 경우 (iOS에서 문제가 될 수 있는 형식)
      if (dateStr.match(/^\d{4}\.\d{2}\.\d{2}$/)) {
        const [year, month, day] = dateStr.split('.');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);
      }
      // 다른 형식인 경우 그대로 파싱
      return new Date(dateStr);
    }
    
    // Firestore Timestamp인 경우
    if (dateStr.toDate) {
      return dateStr.toDate();
    }
    
    // Date 객체인 경우
    if (dateStr instanceof Date) {
      return dateStr;
    }
    
    return new Date(dateStr);
  };
  
  // 날짜를 한국어 형식으로 포맷하는 함수
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    
    try {
      const date = parseDate(dateStr);
      return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ko-KR');
    } catch (e) {
      console.error('날짜 포맷 오류:', e, dateStr);
      return '-';
    }
  };
  
  // 스크롤바 숨기기 스타일
  const scrollbarHiddenStyle = {
    '&::-webkit-scrollbar': {
      display: 'none'
    },
    '-ms-overflow-style': 'none',
    'scrollbar-width': 'none'
  };
  
  const [site, setSite] = useState(null);
  const [gisungData, setGisungData] = useState([]);
  const [costData, setCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, siteId: null, siteName: '' });
  const [detailDialog, setDetailDialog] = useState({ open: false, title: '', items: [] });
  const [materialDialog, setMaterialDialog] = useState({ open: false });
  
  // 노무능률 단위 전환 상태 (true: M²/일, false: M²/명)
  const [isDailyEfficiency, setIsDailyEfficiency] = useState(false);
  const [expandedSubMaterial, setExpandedSubMaterial] = useState({});
  
  // 차트 테마 상태 (true: 화이트모드, false: 다크모드)
  const [isChartLightMode, setIsChartLightMode] = useState(false);
  
  // 정산페이지 접근 인증 관련 상태
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 자재비 폼 초기화 함수
  const resetMaterialForm = () => {
    setMaterialForm({
      item: '',
      month: '',
      company: '',
      amount: '',
      actualQuantity: '',
      unit: 'M2',
      차수: 1,
      note: '',
      siteItem: '',
      quantityNote: '',
      quantityItems: []
    });
    setEditingMaterial(null);
  };
  const [quantityDialog, setQuantityDialog] = useState({ open: false });
  const [materialForm, setMaterialForm] = useState({
    item: '',
    month: '',
    company: '',
    amount: '',
    actualQuantity: '',
    unit: 'M2',
    siteItem: '',
    차수: 1,
    note: '',
    quantityItems: [] // 여러 실물량 항목들
  });
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialData, setMaterialData] = useState([]);
  const [savedCompanies, setSavedCompanies] = useState([]);
  const [materialItems] = useState(['복층', '강화', '접합', '기타']);
  const [safetyData, setSafetyData] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);
  const [showQuantityDetails, setShowQuantityDetails] = useState(false);
  const [quantityForm, setQuantityForm] = useState({
    siteItem: '',
    unit: 'M2',
    actualQuantity: '',
    note: ''
  });
  const [quantityData, setQuantityData] = useState([]);
  const [showQuantityExpanded, setShowQuantityExpanded] = useState(false);
  const [showDetailBox, setShowDetailBox] = useState(false);
  const [quantityCalculationMode, setQuantityCalculationMode] = useState('cumulative'); // 'cumulative' 또는 'latest'
  const [calculationModeDialog, setCalculationModeDialog] = useState({
    open: false,
    newMode: null
  });

  // 계산 방식 변경 요청 처리
  const handleCalculationModeChange = (newMode) => {
    if (newMode === quantityCalculationMode) return; // 같은 모드면 무시
    
    setCalculationModeDialog({
      open: true,
      newMode: newMode
    });
  };

  // 사용자 설정을 Firestore에 저장하는 함수
  const saveUserSettings = async (mode) => {
    if (!currentUser?.uid) return;
    
    try {
      const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
      await setDoc(userSettingsRef, {
        quantityCalculationMode: mode,
        updatedAt: new Date()
      }, { merge: true });
      console.log('사용자 설정 저장 완료:', mode);
    } catch (error) {
      console.error('사용자 설정 저장 실패:', error);
    }
  };

  // 계산 방식 변경 확인
  const confirmCalculationModeChange = async () => {
    const newMode = calculationModeDialog.newMode;
    setQuantityCalculationMode(newMode);
    // Firestore에 저장
    await saveUserSettings(newMode);
    setCalculationModeDialog({ open: false, newMode: null });
  };

  // 계산 방식 변경 취소
  const cancelCalculationModeChange = () => {
    setCalculationModeDialog({ open: false, newMode: null });
  };


  // 컴포넌트 마운트 시 비밀번호 다이얼로그 표시
  useEffect(() => {
    setShowPasswordDialog(true);
  }, []);

  // 사용자 설정 로드
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!currentUser?.uid || !isAuthenticated) return;
      
      try {
        const userSettingsRef = doc(db, 'userSettings', currentUser.uid);
        const userSettingsDoc = await getDoc(userSettingsRef);
        
        if (userSettingsDoc.exists()) {
          const settings = userSettingsDoc.data();
          if (settings.quantityCalculationMode) {
            setQuantityCalculationMode(settings.quantityCalculationMode);
            console.log('사용자 설정 로드 완료:', settings.quantityCalculationMode);
          }
        }
      } catch (error) {
        console.error('사용자 설정 로드 실패:', error);
      }
    };

    loadUserSettings();
  }, [currentUser?.uid, isAuthenticated]);

  // 비밀번호 인증 관련 함수들
  const handlePasswordSubmit = () => {
    if (password === '2046') {
      setShowPasswordDialog(false);
      setPassword('');
      setPasswordError('');
      setIsAuthenticated(true);
      // 타임아웃 제거 - 데이터 로딩 완료를 기다림
    } else {
      setPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handlePasswordDialogClose = () => {
    // 비밀번호 입력 없이 닫으면 이전 페이지로 이동
    navigate(-1);
  };

  // 현장 정보 로드
  useEffect(() => {
    const fetchSiteData = async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        setLoading(true);
        
        // 현장 정보 가져오기
        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        const sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const currentSite = sitesData.find(s => s.id === siteId);
        
        if (!currentSite) {
          console.error('현장을 찾을 수 없습니다. siteId:', siteId);
          console.log('사용 가능한 현장들:', sitesData.map(s => ({ id: s.id, name: s.name })));
          setSnackbar({
            open: true,
            message: '현장 정보를 찾을 수 없습니다.',
            severity: 'error'
          });
          setLoading(false);
          return;
        }
        
        setSite(currentSite);
        
        // 기성금 데이터 가져오기
        try {
          // 먼저 siteId로 쿼리 시도
          let gisungQuery = query(
            collection(db, 'gisung'),
            where('siteId', '==', siteId)
          );
          let gisungSnapshot = await getDocs(gisungQuery);
          let gisungItems = gisungSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('siteId로 기성금 쿼리 결과:', gisungItems.length, '개');
          
          // siteId로 찾지 못했으면 현장명으로 쿼리 시도
          if (gisungItems.length === 0 && currentSite?.name) {
            console.log('siteId로 기성금을 찾지 못해서 현장명으로 재시도:', currentSite.name);
            gisungQuery = query(
              collection(db, 'gisung'),
              where('name', '==', currentSite.name)
            );
            gisungSnapshot = await getDocs(gisungQuery);
            gisungItems = gisungSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            console.log('현장명으로 기성금 쿼리 결과:', gisungItems.length, '개');
          }
          
          // 날짜순 정렬
          gisungItems.sort((a, b) => {
            const dateA = parseDate(a.gisungDate);
            const dateB = parseDate(b.gisungDate);
            return dateA - dateB;
          });
          
          console.log('최종 기성금 데이터:', gisungItems);
          setGisungData(gisungItems);
        } catch (gisungError) {
          console.error('기성금 데이터 로드 오류:', gisungError);
          setGisungData([]);
        }
        
        // 지출 데이터 가져오기
        try {
          // siteId로 먼저 시도
          let costQuery = query(
            collection(db, 'costs'),
            where('siteId', '==', siteId)
          );
          let costSnapshot = await getDocs(costQuery);
          let costItems = costSnapshot.docs.map(doc => ({
            id: doc.id,
            siteId: siteId,
            ...doc.data()
          }));

          // siteId로 찾지 못했다면 site 필드로 시도
          if (costItems.length === 0) {
            console.log('siteId로 찾지 못함, site 필드로 시도...');
            const siteName = currentSite?.name;
            if (siteName) {
              costQuery = query(
                collection(db, 'costs'),
                where('site', '==', siteName)
              );
              costSnapshot = await getDocs(costQuery);
              costItems = costSnapshot.docs.map(doc => ({
                id: doc.id,
                siteId: siteId,
                ...doc.data()
              }));
            }
          }

          costItems = costItems.sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            return dateA - dateB;
          });
          console.log('지출 쿼리 성공:', costItems);
          setCostData(costItems);
        } catch (costError) {
          console.error('지출 데이터 로드 오류:', costError);
          setCostData([]);
        }
        
        // 자재비 데이터 가져오기
        try {
          const materialQuery = query(
            collection(db, 'material_costs'),
            where('siteId', '==', siteId)
          );
          const materialSnapshot = await getDocs(materialQuery);
          const materialItems = materialSnapshot.docs.map(doc => ({
            firebaseId: doc.id,
            ...doc.data()
          })).sort((a, b) => {
            const dateA = parseDate(a.createdAt || 0);
            const dateB = parseDate(b.createdAt || 0);
            return dateA - dateB;
          });
          
          console.log('자재비 쿼리 성공:', materialItems);
          setMaterialData(materialItems);
          
          // 회사명 목록 추출
          const companies = [...new Set(materialItems.map(item => item.company))];
          setSavedCompanies(companies);
        } catch (materialError) {
          console.error('자재비 데이터 로드 오류:', materialError);
          setMaterialData([]);
        }
        
        // 안전관리비 데이터 가져오기
        try {
          let safetyItems = [];
          const siteName = currentSite?.name;
          
          console.log('안전관리비 데이터 검색 시작...');
          console.log('현장 ID:', siteId);
          console.log('현장명:', siteName);
          
          // safety_costs 컬렉션에서 siteName으로 검색
          if (siteName) {
            const safetyQuery = query(
              collection(db, 'safety_costs'),
              where('siteName', '==', siteName)
            );
            const safetySnapshot = await getDocs(safetyQuery);
            safetyItems = safetySnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            console.log('안전관리비 쿼리 결과:', safetyItems);
            
            // siteName으로 찾지 못했다면 siteId로도 시도
            if (safetyItems.length === 0) {
              console.log('siteName으로 찾지 못함, siteId로 시도...');
              const safetyQueryById = query(
                collection(db, 'safety_costs'),
                where('siteId', '==', siteId)
              );
              const safetySnapshotById = await getDocs(safetyQueryById);
              safetyItems = safetySnapshotById.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              console.log('siteId로 검색한 안전관리비 결과:', safetyItems);
            }
          }
          
          console.log('안전관리비 최종 결과:', safetyItems);
          setSafetyData(safetyItems);
        } catch (safetyError) {
          console.error('안전관리비 데이터 로드 오류:', safetyError);
          setSafetyData([]);
        }
        
        // 일정 데이터 가져오기 (공수 계산용)
        try {
          const scheduleQuery = query(
            collection(db, 'schedules'),
            where('siteId', '==', siteId)
          );
          const scheduleSnapshot = await getDocs(scheduleQuery);
          const scheduleItems = scheduleSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('일정 데이터 로드 완료:', scheduleItems);
          setScheduleData(scheduleItems);
        } catch (scheduleError) {
          console.error('일정 데이터 로드 오류:', scheduleError);
          setScheduleData([]);
        }
        
      } catch (error) {
        console.error('데이터 로드 오류:', error);
        setSnackbar({
          open: true,
          message: `데이터 로드에 실패했습니다: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    if (siteId && isAuthenticated) {
      fetchSiteData();
    }
  }, [siteId, isAuthenticated, navigate]);

  // 실시간 데이터 리스너들
  useEffect(() => {
    if (!siteId) return;

    const unsubscribers = [];

    // 자재비 실시간 리스너 (인덱스 오류 방지를 위해 orderBy 제거)
    const materialQuery = query(
      collection(db, 'material_costs'),
      where('siteId', '==', siteId)
    );
    const unsubscribeMaterial = onSnapshot(materialQuery, (snapshot) => {
      const materialItems = snapshot.docs.map(doc => ({
        id: doc.data().id || doc.id,
        firebaseId: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        // 클라이언트에서 정렬
        const dateA = parseDate(a.createdAt || 0);
        const dateB = parseDate(b.createdAt || 0);
        return dateB - dateA; // 내림차순
      });
      setMaterialData(materialItems);
      console.log('자재비 데이터 실시간 업데이트:', materialItems.length, '개');
      console.log('자재비 실시간 데이터 상세:', materialItems.map(item => ({
        item: item.item,
        amount: item.amount,
        company: item.company,
        month: item.month
      })));
    }, (error) => {
      console.error('자재비 실시간 리스너 오류:', error);
      // 오류 발생 시 빈 배열로 설정하지 않고 기존 데이터 유지
    });
    unsubscribers.push(unsubscribeMaterial);

    // 실물량 데이터 실시간 리스너 - 여러 필드명으로 시도
    console.log('현재 siteId:', siteId);
    
    // 1. siteId 필드로 시도
    const quantityQuery1 = query(
      collection(db, 'quantity_info'),
      where('siteId', '==', siteId)
    );
    
    // 2. site 필드로 시도
    const quantityQuery2 = query(
      collection(db, 'quantity_info'),
      where('site', '==', siteId)
    );
    
    // 3. siteName 필드로 시도 (현장명으로 저장된 경우)
    const quantityQuery3 = query(
      collection(db, 'quantity_info'),
      where('siteName', '==', site?.name || '')
    );
    
    // 4. 필터링 없이 모든 데이터 가져오기
    const allQuantityQuery = query(collection(db, 'quantity_info'));
    
    let foundData = false;
    
    // siteId 필드로 시도
    const unsubscribeQuantity1 = onSnapshot(quantityQuery1, (snapshot) => {
      if (!foundData && snapshot.docs.length > 0) {
        console.log('siteId 필드로 물량 데이터 발견:', snapshot.docs.length, '개');
        const quantityItems = snapshot.docs.map(doc => ({
          id: doc.data().id || doc.id,
          firebaseId: doc.id,
          ...doc.data()
        }));
        setQuantityData(quantityItems);
        foundData = true;
      }
    }, (error) => {
      console.error('siteId 필드 쿼리 오류:', error);
    });
    
    // site 필드로 시도
    const unsubscribeQuantity2 = onSnapshot(quantityQuery2, (snapshot) => {
      if (!foundData && snapshot.docs.length > 0) {
        console.log('site 필드로 물량 데이터 발견:', snapshot.docs.length, '개');
        const quantityItems = snapshot.docs.map(doc => ({
          id: doc.data().id || doc.id,
          firebaseId: doc.id,
          ...doc.data()
        }));
        setQuantityData(quantityItems);
        foundData = true;
      }
    }, (error) => {
      console.error('site 필드 쿼리 오류:', error);
    });
    
    // siteName 필드로 시도
    const unsubscribeQuantity3 = onSnapshot(quantityQuery3, (snapshot) => {
      if (!foundData && snapshot.docs.length > 0) {
        console.log('siteName 필드로 물량 데이터 발견:', snapshot.docs.length, '개');
        const quantityItems = snapshot.docs.map(doc => ({
          id: doc.data().id || doc.id,
          firebaseId: doc.id,
          ...doc.data()
        }));
        setQuantityData(quantityItems);
        foundData = true;
      }
    }, (error) => {
      console.error('siteName 필드 쿼리 오류:', error);
    });
    
    // 모든 데이터에서 현재 현장 찾기
    const unsubscribeAllQuantity = onSnapshot(allQuantityQuery, (snapshot) => {
      if (!foundData) {
        console.log('전체 물량 데이터에서 현장 매칭 시도:', snapshot.docs.length, '개');
        
        const matchingItems = [];
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          const docSiteId = data.siteId || data.site || '';
          const docSiteName = data.siteName || '';
          const currentSiteName = site?.name || '';
          
          // siteId 매칭
          if (docSiteId === siteId) {
            matchingItems.push({
              id: data.id || doc.id,
              firebaseId: doc.id,
              ...data
            });
          }
          // siteName 매칭
          else if (docSiteName === currentSiteName) {
            matchingItems.push({
              id: data.id || doc.id,
              firebaseId: doc.id,
              ...data
            });
          }
        });
        
        if (matchingItems.length > 0) {
          console.log('전체 데이터에서 매칭된 물량 데이터:', matchingItems.length, '개');
          setQuantityData(matchingItems);
          foundData = true;
        } else {
          console.log('물량 데이터를 찾을 수 없습니다. 전체 데이터:', snapshot.docs.map(doc => ({
            id: doc.id,
            siteId: doc.data().siteId,
            site: doc.data().site,
            siteName: doc.data().siteName,
            siteItem: doc.data().siteItem
          })));
        }
      }
    }, (error) => {
      console.error('전체 물량 데이터 확인 오류:', error);
    });
    unsubscribers.push(unsubscribeQuantity1);
    unsubscribers.push(unsubscribeQuantity2);
    unsubscribers.push(unsubscribeQuantity3);
    unsubscribers.push(unsubscribeAllQuantity);

    // 지출 데이터 실시간 리스너
    const costQuery = query(
      collection(db, 'costs'),
      where('siteId', '==', siteId)
    );
    const unsubscribeCost = onSnapshot(costQuery, (snapshot) => {
      const costItems = snapshot.docs.map(doc => ({
        id: doc.id,
        siteId: siteId,
        ...doc.data()
      }));
      
      // 날짜순 정렬
      costItems.sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateA - dateB;
      });
      
      setCostData(costItems);
      console.log('지출 데이터 실시간 업데이트:', costItems.length, '개');
    }, (error) => {
      console.error('지출 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeCost);

    // 기성금 데이터 실시간 리스너
    const gisungQuery = query(
      collection(db, 'gisung'),
      where('siteId', '==', siteId)
    );
    const unsubscribeGisung = onSnapshot(gisungQuery, (snapshot) => {
      const gisungItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        const dateA = parseDate(a.gisungDate);
        const dateB = parseDate(b.gisungDate);
        return dateA - dateB;
      });
      setGisungData(gisungItems);
      console.log('기성금 데이터 실시간 업데이트:', gisungItems.length, '개');
    }, (error) => {
      console.error('기성금 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeGisung);

    // 안전관리비 실시간 리스너
    const safetyQuery = query(
      collection(db, 'safety_costs'),
      where('siteId', '==', siteId)
    );
    const unsubscribeSafety = onSnapshot(safetyQuery, (snapshot) => {
      const safetyItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSafetyData(safetyItems);
      console.log('안전관리비 데이터 실시간 업데이트:', safetyItems.length, '개');
    }, (error) => {
      console.error('안전관리비 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeSafety);

    // 일정 데이터 실시간 리스너
    const scheduleQuery = query(
      collection(db, 'schedules'),
      where('siteId', '==', siteId)
    );
    const unsubscribeSchedule = onSnapshot(scheduleQuery, (snapshot) => {
      const scheduleItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setScheduleData(scheduleItems);
      console.log('일정 데이터 실시간 업데이트:', scheduleItems.length, '개');
    }, (error) => {
      console.error('일정 데이터 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeSchedule);

    // 정리 함수
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
      console.log('실시간 리스너들 정리됨');
    };
  }, [siteId, isAuthenticated]);

  // 기성금 합계 계산 (입금완료만)
  const totalGisungAmount = useMemo(() => {
    console.log('=== 기성금 합계 계산 시작 ===');
    console.log('전체 기성금 데이터:', gisungData);
    console.log('기성금 데이터 개수:', gisungData.length);
    
    // 입금완료 상태만 필터링
    const filtered = gisungData.filter(item => {
      const isPaymentComplete = item.paymentStatus === '입금완료';
      console.log(`기성금 필터링: ${item.name} - ${item.sequence} - 입금상태: ${item.paymentStatus} - 포함여부: ${isPaymentComplete}`);
      return isPaymentComplete;
    });
    
    console.log('입금완료 필터링된 기성금:', filtered);
    console.log('입금완료 데이터 개수:', filtered.length);
    
    const total = filtered.reduce((sum, item) => {
      const amount = Number(item.gisungAmount) || 0;
      console.log(`기성금 합산: ${item.name} - ${item.sequence} - 금액: ${amount}`);
      return sum + amount;
    }, 0);
    
    console.log('기성금 합계:', total);
    console.log('=== 기성금 합계 계산 완료 ===');
    return total;
  }, [gisungData]);

  // 청구완료(미지급) 금액 계산
  const totalClaimedUnpaidAmount = useMemo(() => {
    const filtered = gisungData.filter(item => item.claimStatus === '청구완료' && item.paymentStatus !== '입금완료');
    const total = filtered.reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
    console.log('청구완료(미지급) 데이터:', filtered);
    console.log('청구완료(미지급) 합계:', total);
    return total;
  }, [gisungData]);

  // 지출 합계 계산
  const totalCostAmount = useMemo(() => {
    const costTotal = costData.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
    const materialTotal = materialData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const total = costTotal + materialTotal;
    console.log('지출 데이터:', costData);
    console.log('자재비 데이터:', materialData);
    console.log('지출 합계:', costTotal);
    console.log('자재비 합계:', materialTotal);
    console.log('총 지출 합계:', total);
    return total;
  }, [costData, materialData]);

  // 지출 항목별 계산
  const costBreakdown = useMemo(() => {
    console.log('=== costBreakdown 계산 시작 ===');
    console.log('costData 개수:', costData.length);
    console.log('materialData 개수:', materialData.length);
    console.log('costData 샘플:', costData.slice(0, 3));
    console.log('materialData 샘플:', materialData.slice(0, 3));
    
    const breakdown = {
      labor: 0,      // 노무비
      material: 0,   // 자재비 (별도 입력)
      subMaterial: 0, // 부자재비 (기성관리에서 자재비 + 부자재)
      equipment: 0,  // 장비비 총합
      sky: 0,        // 스카이
      gondola: 0,    // 곤도라
      forklift: 0,   // 지게차
      expense: 0,    // 경비 (월세, 임대료, 식대, 유류비)
      other: 0       // 기타
    };

    // 기존 지출 데이터 처리
    costData.forEach(item => {
      const amount = Number(item.totalValue) || 0;
      const itemType = item.itemType;
      
      console.log('지출 항목 처리:', { itemType, amount, totalValue: item.totalValue, item });

      if (itemType === '노무비') {
        breakdown.labor += amount;
        console.log('노무비 추가:', amount, '총 노무비:', breakdown.labor);
      } else if (itemType === '자재비') {
        breakdown.subMaterial += amount; // 기성관리의 자재비는 부자재비로 분류
      } else if (itemType === '부자재') {
        breakdown.subMaterial += amount;
      } else if (itemType === '스카이') {
        breakdown.sky += amount;
        breakdown.equipment += amount;
      } else if (itemType === '곤도라') {
        breakdown.gondola += amount;
        breakdown.equipment += amount;
      } else if (itemType === '지게차') {
        breakdown.forklift += amount;
        breakdown.equipment += amount;
      } else if (['월세', '임대료', '식대', '유류비'].includes(itemType)) {
        breakdown.expense += amount;
      } else if (['기타', 'RnD'].includes(itemType)) {
        breakdown.other += amount;
      } else {
        breakdown.other += amount;
      }
    });

    // 자재비 데이터 처리 (materialData에서)
    materialData.forEach(item => {
      const amount = Number(item.amount) || 0;
      breakdown.material += amount;
      console.log('자재비 항목 처리:', { item: item.item, amount, originalAmount: item.amount, company: item.company });
    });

    console.log('=== costBreakdown 계산 완료 ===');
    console.log('최종 breakdown:', breakdown);
    console.log('노무비 총합:', breakdown.labor);
    console.log('자재비 총합:', breakdown.material);
    return breakdown;
  }, [costData, materialData]);

  // 안전관리비 계산
  const totalSafetyAmount = useMemo(() => {
    console.log('안전관리비 원본 데이터:', safetyData);
    
    const total = safetyData.reduce((sum, item) => {
      // 안전관리비는 주로 amount 필드에 저장됨
      const amount = Number(item.amount) || 0;
      console.log('안전관리비 항목:', item, '금액:', amount);
      return sum + amount;
    }, 0);
    
    console.log('안전관리비 최종 합계:', total);
    return total;
  }, [safetyData]);

  // 일정에서 공수 추출하는 함수 (히트맵 분석과 동일)
  const extractManpowerFromDescription = (description) => {
    if (!description) return 0;
    
    // "0명", "1명", "2명" 등의 패턴을 찾아서 숫자 추출
    const matches = description.match(/(\d+)명/g);
    if (matches) {
      return matches.reduce((sum, match) => {
        const num = parseInt(match.replace('명', ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }
    
    // "0인", "1인", "2인" 등의 패턴도 찾기
    const matches2 = description.match(/(\d+)인/g);
    if (matches2) {
      return matches2.reduce((sum, match) => {
        const num = parseInt(match.replace('인', ''));
        return sum + (isNaN(num) ? 0 : num);
      }, 0);
    }
    
    return 0;
  };

  // 회사명에서 불필요한 단어 제거하는 함수
  const cleanCompanyName = (companyName) => {
    if (!companyName) return companyName;
    
    // 제거할 단어들 목록
    const wordsToRemove = ['글라스', '유리', '안전유리', '강화유리', '복층유리'];
    
    let cleanedName = companyName;
    wordsToRemove.forEach(word => {
      // 단어 앞뒤로 공백이나 특수문자가 있는 경우도 제거
      const regex = new RegExp(`\\s*${word}\\s*`, 'g');
      cleanedName = cleanedName.replace(regex, '');
    });
    
    return cleanedName.trim();
  };

  // 오늘까지의 공수 계산 (오늘 날짜 기준)
  const workersUpToToday = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 0부터 시작하므로 +1
    const currentDay = today.getDate();
    
    let total = 0;
    
    // 일정 데이터에서 오늘까지의 공수 추출
    scheduleData.forEach(schedule => {
      if (schedule.date) {
        let date;
        if (schedule.date.toDate) {
          date = schedule.date.toDate();
        } else if (schedule.date instanceof Date) {
          date = schedule.date;
        } else {
          date = parseDate(schedule.date);
        }
        
        // 유효한 날짜인지 확인 (2000년 이후, 오늘까지 포함)
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
          return;
        }
        
        const scheduleYear = date.getFullYear();
        const scheduleMonth = date.getMonth() + 1;
        const scheduleDay = date.getDate();
        
        // 오늘까지의 데이터 포함 (현재 월의 1일~오늘까지)
        if (scheduleYear < currentYear || 
            (scheduleYear === currentYear && scheduleMonth < currentMonth) ||
            (scheduleYear === currentYear && scheduleMonth === currentMonth && scheduleDay <= currentDay)) {
          if (schedule.desc) {
            const manpower = extractManpowerFromDescription(schedule.desc);
            
            // 0명이거나 음수인 데이터 제외
            if (manpower > 0) {
              total += manpower;
              console.log(`[workersUpToToday] 일정 공수 추가: ${scheduleYear}-${scheduleMonth}-${scheduleDay} (${manpower}명) - 총합: ${total}`);
            }
          }
        }
      }
    });
    
    // 노무비 데이터에서도 오늘까지의 공수 추출
    const laborItems = costData.filter(item => item.itemType === '노무비');
    laborItems.forEach(item => {
      if (item.date) {
        const date = parseDate(item.date);
        
        // 유효한 날짜인지 확인 (2000년 이후, 오늘까지 포함)
        if (isNaN(date.getTime()) || date.getFullYear() < 2000) {
          return;
        }
        
        const itemYear = date.getFullYear();
        const itemMonth = date.getMonth() + 1;
        const itemDay = date.getDate();
        
        // 오늘까지의 데이터 포함 (현재 월의 1일~오늘까지)
        if (itemYear < currentYear || 
            (itemYear === currentYear && itemMonth < currentMonth) ||
            (itemYear === currentYear && itemMonth === currentMonth && itemDay <= currentDay)) {
          const workers = Number(item.workers) || Number(item.quantity) || 0;
          if (workers > 0) {
            total += workers;
            console.log(`[workersUpToToday] 노무비 공수 추가: ${itemYear}-${itemMonth}-${itemDay} (${workers}명) - 총합: ${total}`);
          }
        }
      }
    });
    
    console.log('오늘까지의 총 공수:', total, `(현재: ${currentYear}년 ${currentMonth}월 ${currentDay}일까지)`);
    return total;
  }, [scheduleData, costData]);

  // 총 공수 계산 (일정 데이터 + 노무비 데이터) - 오늘 날짜까지 포함
  const totalWorkers = useMemo(() => {
    console.log('=== totalWorkers 계산 시작 (workersUpToToday 사용) ===');
    console.log('workersUpToToday 값:', workersUpToToday);
    console.log('=== totalWorkers 계산 완료 ===');
    return workersUpToToday;
  }, [workersUpToToday]);

  // 첫 투입 날짜와 총 공수 계산
  const projectPeriod = useMemo(() => {
    if (!scheduleData || scheduleData.length === 0) {
      return { startDate: null, endDate: null, totalWorkers: 0 };
    }

    // 첫 투입 날짜 찾기 (공수가 있는 가장 이른 날짜)
    let firstDate = null;

    scheduleData.forEach(item => {
      const itemDate = item.date;
      let dateStr = '';
      
      if (typeof itemDate === 'string') {
        dateStr = itemDate;
      } else if (itemDate && itemDate.toDate) {
        dateStr = itemDate.toDate().toISOString().split('T')[0];
      }
      
      if (dateStr) {
        const date = parseDate(itemDate);
        const today = new Date();
        
        // 유효한 날짜인지 확인 (2000년 이후, 오늘 이전)
        if (isNaN(date.getTime()) || date.getFullYear() < 2000 || date > today) {
          return;
        }
        
        const workers = extractManpowerFromDescription(item.desc || item.description || '');
        
        if (workers > 0) {
          if (!firstDate || dateStr < firstDate) {
            firstDate = dateStr;
          }
        }
      }
    });

    // 오늘 날짜를 종료일로 설정 (한국 시간 기준)
    const now = new Date();
    const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
    const today = koreaTime.toISOString().split('T')[0];
    
    console.log('=== projectPeriod 계산 ===');
    console.log('현재 시간 (UTC):', now.toISOString());
    console.log('한국 시간:', koreaTime.toISOString());
    console.log('첫 투입 날짜:', firstDate);
    console.log('종료 날짜 (오늘):', today);
    console.log('총 공수:', workersUpToToday);

    // 총 일수 계산
    let totalDays = 0;
    if (firstDate && today) {
      const startDate = new Date(firstDate);
      const endDate = new Date(today);
      const timeDiff = endDate.getTime() - startDate.getTime();
      totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // 시작일 포함
    }

    return {
      startDate: firstDate,
      endDate: today,
      totalWorkers: workersUpToToday, // workersUpToToday 사용
      totalDays: totalDays
    };
  }, [scheduleData, workersUpToToday]);

  // 순수익 계산
  let netProfit = totalGisungAmount - totalCostAmount;

  // 지출 항목별 상세 내용 보기
  // 금액 천단위 쉼표 포맷팅 함수
  const formatAmountInput = (value) => {
    // 숫자가 아닌 문자 제거
    const numericValue = value.replace(/[^0-9]/g, '');
    // 천단위 쉼표 추가
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 금액 입력 핸들러
  const handleAmountChange = (e) => {
    const formattedValue = formatAmountInput(e.target.value);
    setMaterialForm({...materialForm, amount: formattedValue});
  };

  // 자재비 추가/수정 함수 (메모이제이션으로 불필요한 재렌더링 방지)
  const handleAddMaterial = useCallback(async () => {
    // 필수 필드 검증
    if (!materialForm.item || !materialForm.month || !materialForm.company || !materialForm.amount) {
      setSnackbar({ open: true, message: '필수 항목을 모두 입력해주세요.', severity: 'error' });
      return;
    }
    
    if (materialForm.item && materialForm.month && materialForm.company && materialForm.amount) {
      try {
        const materialData_to_save = {
          ...materialForm,
          amount: Number(materialForm.amount.replace(/,/g, '')), // 쉼표 제거 후 숫자 변환
          siteId: siteId,
          updatedAt: new Date()
        };

        // 실물량 항목들 먼저 검증 및 저장
        const quantityResults = [];
        if (materialForm.quantityItems && materialForm.quantityItems.length > 0) {
          for (const quantityItem of materialForm.quantityItems) {
            // 이미 Firebase에 저장된 항목은 건너뛰기
            if (quantityItem.firebaseId) {
              console.log('이미 저장된 실물량 항목 건너뛰기:', quantityItem.firebaseId);
              continue;
            }
            
            if (quantityItem.siteItem && quantityItem.actualQuantity) {
              const quantityData = {
                id: Date.now() + Math.random(), // 고유 ID
                siteItem: quantityItem.siteItem,
                specification: quantityItem.specification || '',
                unit: quantityItem.unit,
                actualQuantity: Number(quantityItem.actualQuantity),
                note: quantityItem.quantityNote || '',
                siteId: siteId,
                materialId: null, // 나중에 설정
                createdAt: new Date()
              };
              
              try {
                const quantityDocRef = await addDoc(collection(db, 'quantity_info'), quantityData);
                console.log('새 실물량 정보 저장됨:', quantityDocRef.id, quantityItem.siteItem);
                
                quantityResults.push({
                  data: { ...quantityData, firebaseId: quantityDocRef.id },
                  docRef: quantityDocRef
                });
              } catch (quantityError) {
                console.error('실물량 정보 저장 오류:', quantityError, quantityItem.siteItem);
                
                // 이미 저장된 실물량 데이터들 삭제 (롤백)
                for (const result of quantityResults) {
                  try {
                    await deleteDoc(doc(db, 'quantity_info', result.docRef.id));
                  } catch (rollbackError) {
                    console.error('실물량 롤백 오류:', rollbackError);
                  }
                }
                
                throw new Error(`실물량 저장 실패: ${quantityItem.siteItem}`);
              }
            }
          }
        }

        // 실물량 저장이 모두 성공했으면 자재비 저장
        let savedMaterial;

        if (editingMaterial) {
          // 수정 모드
          const docRef = doc(db, 'material_costs', editingMaterial.firebaseId);
          await updateDoc(docRef, materialData_to_save);
          
          // 실물량 항목들 수정/추가
          if (materialForm.quantityItems && materialForm.quantityItems.length > 0) {
            for (const quantityItem of materialForm.quantityItems) {
              if (quantityItem.firebaseId) {
                // 기존 실물량 수정
                const quantityDocRef = doc(db, 'quantity_info', quantityItem.firebaseId);
                await updateDoc(quantityDocRef, {
                  siteItem: quantityItem.siteItem,
                  specification: quantityItem.specification || '',
                  unit: quantityItem.unit,
                  actualQuantity: Number(quantityItem.actualQuantity),
                  note: quantityItem.quantityNote || '',
                  updatedAt: new Date()
                });
                console.log('실물량 수정됨:', quantityItem.firebaseId, quantityItem.siteItem);
              } else if (quantityItem.siteItem && quantityItem.actualQuantity) {
                // 새 실물량 추가
                const quantityData = {
                  id: Date.now() + Math.random(),
                  siteItem: quantityItem.siteItem,
                  specification: quantityItem.specification || '',
                  unit: quantityItem.unit,
                  actualQuantity: Number(quantityItem.actualQuantity),
                  note: quantityItem.quantityNote || '',
                  siteId: siteId,
                  materialId: editingMaterial.firebaseId,
                  createdAt: new Date()
                };
                
                const quantityDocRef = await addDoc(collection(db, 'quantity_info'), quantityData);
                console.log('새 실물량 추가됨:', quantityDocRef.id, quantityItem.siteItem);
              }
            }
          }
          
          // 로컬 상태 업데이트
          const updatedMaterialData = materialData.map(item => 
            item.id === editingMaterial.id 
              ? { ...item, ...materialData_to_save }
              : item
          );
          setMaterialData(updatedMaterialData);
          
          savedMaterial = { ...editingMaterial, ...materialData_to_save };
        } else {
          // 추가 모드 - 차수 재계산 (같은 회사의 기존 항목들 확인)
          const currentCompanyItems = materialData.filter(item => 
            item.company === materialForm.company && item.item === materialForm.item
          );
          const nextSequence = currentCompanyItems.length + 1;
          
          const newMaterial = {
            id: Date.now(),
            ...materialData_to_save,
            차수: nextSequence,
            createdAt: new Date()
          };
          
          // Firebase에 저장
          const docRef = await addDoc(collection(db, 'material_costs'), newMaterial);
          
          // 로컬 상태 업데이트 (Firebase ID 포함)
          const materialWithId = { ...newMaterial, firebaseId: docRef.id };
          const updatedMaterialData = [...materialData, materialWithId];
          setMaterialData(updatedMaterialData);
          
          savedMaterial = materialWithId;
        }
        
        // 실물량 데이터에 materialId 업데이트
        for (const result of quantityResults) {
          try {
            const quantityDocRef = doc(db, 'quantity_info', result.docRef.id);
            await updateDoc(quantityDocRef, { materialId: savedMaterial.id });
            
            // 로컬 상태에도 추가
            const quantityWithMaterialId = { ...result.data, materialId: savedMaterial.id };
            setQuantityData(prev => [...prev, quantityWithMaterialId]);
          } catch (updateError) {
            console.error('실물량 materialId 업데이트 오류:', updateError);
          }
        }
        
        // 회사명 저장 (중복 제거)
        if (!savedCompanies.includes(materialForm.company)) {
          setSavedCompanies([...savedCompanies, materialForm.company]);
        }
        
        // 성공 메시지 표시
        setSnackbar({ 
          open: true, 
          message: editingMaterial ? '자재비가 수정되었습니다.' : '자재비가 추가되었습니다.', 
          severity: 'success' 
        });
        
        // 실시간으로 데이터 다시 불러오기
        try {
          console.log('자재비 추가 후 데이터 새로고침 시작...');
          
          // materialData 다시 불러오기
          const materialQuery = query(
            collection(db, 'material'),
            where('siteId', '==', siteId)
          );
          const materialSnapshot = await getDocs(materialQuery);
          const updatedMaterialData = materialSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // materialData 상태 업데이트
          setMaterialData(updatedMaterialData);
          console.log('자재비 데이터 새로고침 완료:', updatedMaterialData.length, '개');
          
          // costData도 다시 불러오기 (자재비가 costData에 포함될 수 있음)
          const costQuery = query(
            collection(db, 'cost'),
            where('siteId', '==', siteId)
          );
          const costSnapshot = await getDocs(costQuery);
          const updatedCostData = costSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setCostData(updatedCostData);
          console.log('비용 데이터 새로고침 완료:', updatedCostData.length, '개');
          
        } catch (refreshError) {
          console.error('데이터 새로고침 오류:', refreshError);
        }
        
        // 모달 닫기 및 폼 초기화
        setMaterialDialog({ open: false });
        resetMaterialForm();
      } catch (error) {
        console.error('자재비 저장 오류:', error);
        setSnackbar({ open: true, message: `자재비 저장에 실패했습니다: ${error.message}`, severity: 'error' });
      }
    }
  }, [materialForm, materialData, siteId, savedCompanies, editingMaterial]);

  // 품목명에서 특정 단어 숨기기 함수
  const hideGlassWords = useCallback((itemName) => {
    if (!itemName) return itemName;
    
    return itemName
      .replace(/투명/g, '')
      .replace(/유리/g, '')
      .replace(/^\s+|\s+$/g, '') // 앞뒤 공백 제거
      .replace(/\s+/g, ' '); // 중복 공백을 하나로
  }, []);

  // 자재비 수정 시작 함수
  const handleEditMaterial = useCallback(async (material) => {
    setEditingMaterial(material);
    
    // 해당 자재비와 연결된 실물량 데이터 로드
    let connectedQuantityItems = [];
    try {
      const quantityQuery = query(
        collection(db, 'quantity_info'), 
        where('materialId', '==', material.id),
        where('siteId', '==', siteId)
      );
      const quantitySnapshot = await getDocs(quantityQuery);
      
      connectedQuantityItems = quantitySnapshot.docs.map(doc => ({
        id: Date.now() + Math.random(), // 폼에서 사용할 임시 ID
        firebaseId: doc.id, // Firebase 문서 ID
        siteItem: doc.data().siteItem,
        specification: doc.data().specification || '',
        unit: doc.data().unit,
        actualQuantity: doc.data().actualQuantity.toString(),
        quantityNote: doc.data().note || ''
      }));
      
      console.log('연결된 실물량 데이터 로드됨:', connectedQuantityItems);
    } catch (error) {
      console.error('실물량 데이터 로드 오류:', error);
    }
    
    setMaterialForm({
      item: material.item,
      month: material.month,
      company: material.company,
      amount: material.amount.toLocaleString(),
      actualQuantity: material.actualQuantity || '',
      unit: material.unit || 'M2',
      siteItem: material.siteItem || '',
      차수: material.차수,
      note: material.note || '',
      quantityItems: connectedQuantityItems
    });
  }, [siteId]);

  // 자재비 수정 취소 함수
  const handleCancelEdit = useCallback(() => {
    resetMaterialForm();
  }, []);

  // 기존 자재비들의 차수 재정렬 함수
  const reorderExistingSequences = useCallback(async () => {
    try {
      // 회사 + 품목 조합별로 그룹화
      const groupedItems = {};
      materialData.forEach(item => {
        const key = `${item.company}_${item.item}`;
        if (!groupedItems[key]) {
          groupedItems[key] = [];
        }
        groupedItems[key].push(item);
      });

      // 각 그룹별로 월 순서대로 정렬하고 차수 재할당
      const updatePromises = [];
      
      Object.keys(groupedItems).forEach(key => {
        const items = groupedItems[key];
        console.log(`${key} 그룹 재정렬 시작:`, items.map(item => ({ month: item.month, 차수: item.차수 })));
        
        // 월 순서대로 정렬 (오래된 것부터)
        items.sort((a, b) => {
          const monthA = a.month || '';
          const monthB = b.month || '';
          return monthA.localeCompare(monthB);
        });
        
        console.log(`${key} 그룹 정렬 후:`, items.map(item => ({ month: item.month, 차수: item.차수 })));
        
        // 차수 재할당
        items.forEach((item, index) => {
          const newSequence = index + 1;
          if (item.차수 !== newSequence) {
            console.log(`${key}: ${item.month} ${item.차수}차 → ${newSequence}차`);
            
            // Firebase 업데이트
            if (item.firebaseId) {
              const updatePromise = updateDoc(doc(db, 'material_costs', item.firebaseId), {
                차수: newSequence
              });
              updatePromises.push(updatePromise);
            }
            
            // 로컬 상태 업데이트
            item.차수 = newSequence;
          }
        });
      });

      // 모든 Firebase 업데이트 실행
      await Promise.all(updatePromises);
      
      // Firebase에서 최신 데이터 다시 로드
      const materialQuery = query(
        collection(db, 'material_costs'),
        where('siteId', '==', siteId),
        orderBy('createdAt', 'desc')
      );
      const materialSnapshot = await getDocs(materialQuery);
      const updatedMaterialData = materialSnapshot.docs.map(doc => ({
        id: doc.data().id || doc.id,
        firebaseId: doc.id,
        ...doc.data()
      }));
      
      setMaterialData(updatedMaterialData);
      
      setSnackbar({ 
        open: true, 
        message: `기존 자재비 차수가 재정렬되었습니다. (${updatePromises.length}개 항목 업데이트)`, 
        severity: 'success' 
      });
      
    } catch (error) {
      console.error('차수 재정렬 오류:', error);
      setSnackbar({ 
        open: true, 
        message: '차수 재정렬에 실패했습니다.', 
        severity: 'error' 
      });
    }
  }, [materialData]);

  // 자재비 삭제 함수 (메모이제이션으로 불필요한 재렌더링 방지)
  const handleDeleteMaterial = useCallback(async (id) => {
    try {
      // Firebase에서 삭제
      const materialDoc = materialData.find(item => item.id === id);
      if (materialDoc && materialDoc.firebaseId) {
        await deleteDoc(doc(db, 'material_costs', materialDoc.firebaseId));
      }
      
      // 로컬 상태 업데이트 (즉시 반영)
      const updatedMaterialData = materialData.filter(item => item.id !== id);
      setMaterialData(updatedMaterialData);
      
      // 차수 재계산
      const deletedCompany = materialDoc?.company;
      if (deletedCompany) {
        const remainingItems = updatedMaterialData.filter(item => item.company === deletedCompany);
        // 차수 재정렬
        const reorderedItems = remainingItems.map((item, index) => ({
          ...item,
          차수: index + 1
        }));
        
        // 차수가 변경된 항목들을 Firebase에 업데이트
        for (const item of reorderedItems) {
          if (item.firebaseId) {
            await updateDoc(doc(db, 'material_costs', item.firebaseId), {
              차수: item.차수
            });
          }
        }
        
        // 로컬 상태도 업데이트 (updatedMaterialData 기준으로)
        const finalMaterialData = updatedMaterialData.map(item => {
          if (item.company === deletedCompany) {
            const reorderedItem = reorderedItems.find(ri => ri.id === item.id);
            return reorderedItem || item;
          }
          return item;
        });
        setMaterialData(finalMaterialData);
      }
      
      setSnackbar({ open: true, message: '자재비가 삭제되었습니다.', severity: 'success' });
      
      // 실시간으로 데이터 다시 불러오기
      try {
        console.log('자재비 삭제 후 데이터 새로고침 시작...');
        
        // materialData 다시 불러오기
        const materialQuery = query(
          collection(db, 'material'),
          where('siteId', '==', siteId)
        );
        const materialSnapshot = await getDocs(materialQuery);
        const updatedMaterialData = materialSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // materialData 상태 업데이트
        setMaterialData(updatedMaterialData);
        console.log('자재비 데이터 새로고침 완료:', updatedMaterialData.length, '개');
        
        // costData도 다시 불러오기
        const costQuery = query(
          collection(db, 'cost'),
          where('siteId', '==', siteId)
        );
        const costSnapshot = await getDocs(costQuery);
        const updatedCostData = costSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCostData(updatedCostData);
        console.log('비용 데이터 새로고침 완료:', updatedCostData.length, '개');
        
      } catch (refreshError) {
        console.error('데이터 새로고침 오류:', refreshError);
      }
      
    } catch (error) {
      console.error('자재비 삭제 오류:', error);
      setSnackbar({ open: true, message: '자재비 삭제에 실패했습니다.', severity: 'error' });
    }
  }, [materialData]);

  // quantity_info 데이터 상태
  const [quantityInfoData, setQuantityInfoData] = useState([]);

  // quantity_info 데이터 가져오기
  useEffect(() => {
    if (!siteId) {
      console.log('siteId가 없어서 quantity_info 로드 안함');
      return;
    }

    console.log('quantity_info 데이터 로드 시작, siteId:', siteId);
    
    const unsubscribe = onSnapshot(
      query(collection(db, 'quantity_info'), where('siteId', '==', siteId)),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('quantity_info 데이터 실시간 업데이트:', data.length, '개');
        console.log('quantity_info 데이터 상세:', data);
        setQuantityInfoData(data);
      },
      (error) => {
        console.error('quantity_info 데이터 로드 실패:', error);
        console.error('에러 상세:', error.message);
      }
    );

    return () => unsubscribe();
  }, [siteId]);

  // 현장 등록된 모든 항목 정보 가져오기 (quantity_info 기반)
  const getRegisteredItems = useMemo(() => {
    if (!quantityInfoData || quantityInfoData.length === 0) {
      return [];
    }
    
    const registeredItems = quantityInfoData
      .filter(item => item && item.siteItem && item.siteItem.trim() !== '')
      .map(item => ({
        name: item.siteItem || '',
        quantity: item.actualQuantity || 0,
        unit: 'M2',
        price: 0,
        amount: 0,
        specification: item.specification || ''
      }));

    console.log('quantity_info 기반 등록된 항목들:', registeredItems);
    return registeredItems;
  }, [quantityInfoData]);

  // 복층유리와 강화유리 물량 계산 (quantity_info 기반)
  const glassQuantities = useMemo(() => {
    let 복층유리 = 0;
    let 강화12T = 0;
    let 강화8T = 0;
    
    console.log('=== glassQuantities 계산 시작 (quantity_info 기반) ===');
    console.log('quantityInfoData:', quantityInfoData);
    console.log('quantityInfoData 개수:', quantityInfoData.length);
    
    if (!quantityInfoData || quantityInfoData.length === 0) {
      console.log('quantityInfoData가 비어있음 - 기본값 반환');
      return { 복층유리: 0, 강화12T: 0, 강화8T: 0 };
    }
    
    quantityInfoData.forEach((item, index) => {
      const quantity = Number(item.actualQuantity) || 0;
      const itemName = item.siteItem || '';
      const specification = item.specification || '';
      
      console.log(`물량 항목 ${index}:`, { 
        itemName, 
        quantity,
        specification,
        전체항목: item
      });
      
      if (itemName.includes('복층') || itemName.includes('로이')) {
        복층유리 += quantity;
        console.log('복층 추가:', quantity, '총합:', 복층유리);
      } else if (itemName.includes('강화')) {
        if (specification.includes('8T') || specification.includes('8')) {
          강화8T += quantity;
          console.log('8T강화 추가:', quantity, '총합:', 강화8T);
        } else if (specification.includes('12T') || specification.includes('12')) {
          강화12T += quantity;
          console.log('12T강화 추가:', quantity, '총합:', 강화12T);
        } else {
          // specification이 없거나 구분이 안 되는 강화유리는 12T로 분류
          강화12T += quantity;
          console.log('강화(12T로 분류) 추가:', quantity, '총합:', 강화12T);
        }
      } else {
        console.log('매칭되지 않은 물량 항목:', itemName);
      }
    });
    
    console.log('최종 glassQuantities:', { 복층유리, 강화12T, 강화8T });
    console.log('=== glassQuantities 계산 완료 ===');
    return { 복층유리, 강화12T, 강화8T };
  }, [quantityInfoData]);

  // 노무능률 계산 (기준값: 복층 6.2, 강화 8.5 M²/명)
  const laborEfficiency = useMemo(() => {
    const totalQuantity = glassQuantities.복층유리 + glassQuantities.강화12T + glassQuantities.강화8T;
    const totalWorkers = workersUpToToday;
    
    if (totalWorkers === 0 || totalQuantity === 0) {
      return { 복층: 0, 강화: 0 };
    }
    
    // 기준 비율 (복층 6.2, 강화 8.5)
    const 기준복층비율 = 6.2 / (6.2 + 8.5);
    const 기준강화비율 = 8.5 / (6.2 + 8.5);
    
    // 전체 노무능률 계산 (전체 물량 / 총 공수)
    const totalEfficiency = totalQuantity / totalWorkers;
    
    // 기준 비율에 따라 노무능률 분배
    const 복층능률 = totalEfficiency * 기준복층비율;
    const 강화능률 = totalEfficiency * 기준강화비율;
    
    return { 복층: 복층능률, 강화: 강화능률 };
  }, [glassQuantities, workersUpToToday]);

  // 일 단위 노무능률 계산 (기준값: 복층 39.9, 강화 55.1 M²/일)
  const dailyLaborEfficiency = useMemo(() => {
    const totalQuantity = glassQuantities.복층유리 + glassQuantities.강화12T + glassQuantities.강화8T;
    
    if (totalQuantity === 0) {
      return { 복층: 0, 강화: 0, 총일수: 0 };
    }
    
    // 기준 비율 (복층 39.9, 강화 55.1)
    const 기준복층비율 = 39.9 / (39.9 + 55.1);
    const 기준강화비율 = 55.1 / (39.9 + 55.1);
    
    // 오늘까지의 공수가 있는 날들만 계산
    let totalWorkingDays = 0;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();
    
    // 오늘까지의 모든 날짜를 확인
    for (let year = 2024; year <= currentYear; year++) {
      const endMonth = year === currentYear ? currentMonth : 12;
      const startMonth = year === 2024 ? 1 : 1;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const daysInMonth = new Date(year, month, 0).getDate();
        const maxDay = (year === currentYear && month === currentMonth) ? currentDay : daysInMonth;
        
        for (let day = 1; day <= maxDay; day++) {
          const checkDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          const hasWorkers = scheduleData.some(item => {
            const itemDate = item.date;
            if (typeof itemDate === 'string') {
              return itemDate === checkDate;
            } else if (itemDate && itemDate.toDate) {
              const dateStr = itemDate.toDate().toISOString().split('T')[0];
              return dateStr === checkDate;
            }
            return false;
          });
          
          if (hasWorkers) {
            totalWorkingDays++;
          }
        }
      }
    }
    
    if (totalWorkingDays === 0) {
      return { 복층: 0, 강화: 0, 총일수: 0 };
    }
    
    // 일 평균 물량 계산
    const dailyAverageQuantity = totalQuantity / totalWorkingDays;
    
    // 기준 비율에 따라 일 평균 노무능률 분배
    const 복층일능률 = dailyAverageQuantity * 기준복층비율;
    const 강화일능률 = dailyAverageQuantity * 기준강화비율;
    
    return { 복층: 복층일능률, 강화: 강화일능률, 총일수: totalWorkingDays };
  }, [glassQuantities, scheduleData]);

  // 전체 물량 데이터 (현장관리페이지 + 실물량)
  const allQuantityData = useMemo(() => {
    const allItems = [];
    
    // 1. 현장관리페이지의 전체 물량 데이터 (site.items) - 금액 관련 항목 제외
    if (site?.items && Array.isArray(site.items)) {
      site.items.forEach(item => {
        const itemName = item.name || item.item || '';
        
        // 금액 관련 항목들 제외
        if (itemName.includes('총 공사계') || 
            itemName.includes('부가세') || 
            itemName.includes('계약금액')) {
          return; // 이 항목들은 건너뛰기
        }
        
        allItems.push({
          name: itemName,
          quantity: item.quantity || 0,
          unit: item.unit || 'M2',
          specification: item.specification || '',
          source: '현장관리페이지',
          displayText: item.specification ? `${itemName} (${item.specification})` : itemName
        });
      });
    }
    
    // 2. 실물량 데이터 (quantity_info) - 중복 제거하면서 추가
    if (quantityInfoData && quantityInfoData.length > 0) {
      quantityInfoData.forEach(item => {
        // 현장관리페이지에 같은 품목이 있는지 확인
        const existingItem = allItems.find(existing => 
          existing.name === item.siteItem && 
          existing.specification === (item.specification || '')
        );
        
        if (!existingItem) {
          // 중복되지 않는 경우만 추가
          allItems.push({
            name: item.siteItem || '',
            quantity: item.actualQuantity || 0,
            unit: item.unit || 'M2',
            specification: item.specification || '',
            source: '실물량',
            displayText: item.specification ? `${item.siteItem} (${item.specification})` : item.siteItem
          });
        }
      });
    }
    
    console.log('전체 물량 데이터:', allItems.length, '개');
    console.log('현장관리페이지 물량:', site?.items?.length || 0, '개');
    console.log('실물량 데이터:', quantityInfoData?.length || 0, '개');
    
    return allItems;
  }, [site?.items, quantityInfoData]);

  // 현장 물량내역에서 품목 옵션 추출 (규격 포함)
  const siteItemOptions = useMemo(() => {
    if (!allQuantityData || allQuantityData.length === 0) {
      return [];
    }
    
    // 품목명과 규격을 함께 포함하는 객체 배열 생성
    const itemsWithSpec = allQuantityData.map(item => ({
      name: item.name,
      specification: item.specification || '',
      unit: item.unit,
      source: item.source,
      displayText: item.specification ? `${item.name} (${item.specification})` : item.name
    }));
    
    // 중복 제거 (name + specification 조합으로)
    const uniqueItems = itemsWithSpec.filter((item, index, self) => 
      index === self.findIndex(t => t.name === item.name && t.specification === item.specification)
    );
    
    // 우선순위 정렬: 로이복층 → 강화 → 코킹 → 나머지
    const getPriority = (name) => {
      const cleanName = hideGlassWords(name).toLowerCase();
      if (cleanName.includes('로이복층')) return 1;
      if (cleanName.includes('강화')) return 2;
      if (cleanName.includes('코킹')) return 3;
      return 4; // 나머지
    };
    
    return uniqueItems.sort((a, b) => {
      const priorityA = getPriority(a.name);
      const priorityB = getPriority(b.name);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB; // 우선순위 순서
      }
      
      // 같은 우선순위 내에서는 알파벳 순
      return a.displayText.localeCompare(b.displayText);
    });
  }, [allQuantityData, hideGlassWords]);

  // 품목 선택 시 단위 자동 설정
  const handleItemChange = useCallback((selectedItem) => {
    const matchedItem = getRegisteredItems.find(item => item.name === selectedItem);
    const unit = matchedItem ? matchedItem.unit : 'M2';
    
    setMaterialForm({
      ...materialForm, 
      item: selectedItem,
      unit: unit
    });
  }, [materialForm, getRegisteredItems]);

  // 물량 정보 추가 함수
  const handleAddQuantity = useCallback(async () => {
    if (quantityForm.siteItem && quantityForm.actualQuantity) {
      try {
        const newQuantity = {
          id: Date.now(),
          ...quantityForm,
          actualQuantity: Number(quantityForm.actualQuantity),
          siteId: siteId,
          createdAt: new Date()
        };
        
        // Firebase에 저장
        const docRef = await addDoc(collection(db, 'quantity_info'), newQuantity);
        
        // 로컬 상태 업데이트
        const quantityWithId = { ...newQuantity, firebaseId: docRef.id };
        setQuantityData([...quantityData, quantityWithId]);
        
        // 폼 초기화
        setQuantityForm({
          siteItem: '',
          unit: 'M2',
          actualQuantity: '',
          note: ''
        });
        
        // 다이얼로그 닫기
        setQuantityDialog({ open: false });
        
        setSnackbar({ open: true, message: '물량 정보가 추가되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('물량 정보 저장 오류:', error);
        setSnackbar({ open: true, message: '물량 정보 저장에 실패했습니다.', severity: 'error' });
      }
    }
  }, [quantityForm, quantityData, siteId]);

  // 실물량 항목 추가 함수
  const addQuantityItem = () => {
    const newItem = {
      id: Date.now(),
      siteItem: '',
      specification: '',
      unit: 'M2',
      actualQuantity: '',
      quantityNote: ''
    };
    setMaterialForm({
      ...materialForm,
      quantityItems: [...(materialForm.quantityItems || []), newItem]
    });
  };

  // 실물량 항목 삭제 함수 (Firebase에서도 즉시 삭제)
  const removeQuantityItem = async (id) => {
    const itemToRemove = materialForm.quantityItems?.find(item => item.id === id);
    
    // Firebase에 저장된 항목인 경우 즉시 삭제
    if (itemToRemove?.firebaseId) {
      try {
        await deleteDoc(doc(db, 'quantity_info', itemToRemove.firebaseId));
        console.log('Firebase에서 실물량 항목 삭제됨:', itemToRemove.firebaseId);
      } catch (error) {
        console.error('Firebase 실물량 항목 삭제 오류:', error);
        setSnackbar({ 
          open: true, 
          message: '실물량 항목 삭제에 실패했습니다.', 
          severity: 'error' 
        });
        return;
      }
    }
    
    // 로컬 상태에서도 삭제
    setMaterialForm({
      ...materialForm,
      quantityItems: (materialForm.quantityItems || []).filter(item => item.id !== id)
    });
  };

  // 실물량 항목 업데이트 함수 (단일 필드)
  const updateQuantityItem = (id, field, value) => {
    setMaterialForm(prevForm => {
      const updatedItems = (prevForm.quantityItems || []).map(item => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      });
      
      return {
        ...prevForm,
        quantityItems: updatedItems
      };
    });
  };

  // 실물량 항목 업데이트 함수 (여러 필드 동시)
  const updateQuantityItemMultiple = (id, updates) => {
    setMaterialForm(prevForm => {
      const updatedItems = (prevForm.quantityItems || []).map(item => {
        if (item.id === id) {
          return { ...item, ...updates };
        }
        return item;
      });
      
      return {
        ...prevForm,
        quantityItems: updatedItems
      };
    });
  };

  // 물량 정보 삭제 함수
  const handleDeleteQuantity = useCallback(async (id) => {
    try {
      const quantityDoc = quantityData.find(item => item.id === id);
      if (quantityDoc && quantityDoc.firebaseId) {
        await deleteDoc(doc(db, 'quantity_info', quantityDoc.firebaseId));
      }
      
      setQuantityData(quantityData.filter(item => item.id !== id));
      setSnackbar({ open: true, message: '물량 정보가 삭제되었습니다.', severity: 'success' });
    } catch (error) {
      console.error('물량 정보 삭제 오류:', error);
      setSnackbar({ open: true, message: '물량 정보 삭제에 실패했습니다.', severity: 'error' });
    }
  }, [quantityData]);

  // 남은 물량 계산 함수 (품목명 + 규격 기준)
  const getRemainingQuantity = useCallback((itemName, specification) => {
    if (!quantityData || quantityData.length === 0) return null;
    
    // 해당 품목과 규격에 대한 데이터 필터링
    const filteredQuantities = quantityData.filter(qty => 
      qty.siteItem === itemName && 
      (qty.specification || '') === (specification || '')
    );
    
    if (filteredQuantities.length === 0) return null;
    
    let usedQuantity;
    
    if (quantityCalculationMode === 'cumulative') {
      // 차수별 누적 합계
      usedQuantity = filteredQuantities.reduce((sum, qty) => sum + (qty.actualQuantity || 0), 0);
    } else {
      // 최신 데이터만 사용 (createdAt 기준으로 가장 최근)
      const latestQuantity = filteredQuantities.reduce((latest, current) => {
        const latestTime = latest.createdAt?.toDate?.() || parseDate(latest.createdAt || 0);
        const currentTime = current.createdAt?.toDate?.() || parseDate(current.createdAt || 0);
        return currentTime > latestTime ? current : latest;
      });
      usedQuantity = latestQuantity.actualQuantity || 0;
    }
    
    // 원래 등록된 물량 (allQuantityData에서 현장관리페이지 데이터 찾기)
    const originalItem = allQuantityData.find(item => 
      item.name === itemName && 
      (item.specification || '') === (specification || '') &&
      item.source === '현장관리페이지'
    );
    if (!originalItem) return null;
    
    const remaining = originalItem.quantity - usedQuantity;
    return {
      used: usedQuantity,
      remaining: remaining,
      unit: originalItem.unit
    };
  }, [quantityData, allQuantityData, quantityCalculationMode]);


  // 전체 물량 대비 사용 퍼센트 계산 함수 (실제 물량 기반)
  const getQuantityPercentage = useCallback(() => {
    if (!site?.items || !Array.isArray(site.items) || !quantityData || quantityData.length === 0) {
      return 0;
    }
    
    // 유리가 포함된 항목들만 필터링 (site.items에서) - 면적 단위(M²)만 포함
    const glassItems = site.items.filter(item => {
      const itemName = item.name || item.item || '';
      const unit = item.unit || '';
      return itemName.includes('유리') && unit === 'M2';
    });
    
    if (glassItems.length === 0) return 0;
    
    let totalPlannedQuantity = 0; // 전체 계획 물량 (site.items에서)
    let totalActualQuantity = 0;  // 전체 실제 물량 (quantityData에서)
    
    console.log('=== 물량 진행률 계산 디버깅 ===');
    console.log('site.items 전체:', site.items);
    console.log('site.items (유리 항목):', glassItems);
    console.log('quantityData (실물량 데이터):', quantityData);
    console.log('quantityCalculationMode:', quantityCalculationMode);
    
    // site.items에서 유리 항목들 상세 확인
    glassItems.forEach((item, index) => {
      console.log(`site.items[${index}]:`, {
        name: item.name || item.item,
        specification: item.specification,
        quantity: item.quantity,
        unit: item.unit
      });
    });
    
    // quantityData에서 유리 항목들 상세 확인
    const glassQuantityData = quantityData.filter(qty => 
      (qty.siteItem || '').includes('유리')
    );
    console.log('quantityData에서 유리 항목들:', glassQuantityData);
    glassQuantityData.forEach((qty, index) => {
      console.log(`quantityData[${index}]:`, {
        siteItem: qty.siteItem,
        specification: qty.specification,
        actualQuantity: qty.actualQuantity,
        unit: qty.unit
      });
    });
    
    // 품목명+규격별로 그룹화하여 중복 제거
    const processedItems = new Map();
    
    glassItems.forEach((item, index) => {
      const itemName = item.name || item.item || '';
      const specification = item.specification || '';
      const key = `${itemName}|${specification}`;
      
      // 계획 물량 누적 (site.items에서)
      const plannedQuantity = item.quantity || 0;
      if (processedItems.has(key)) {
        processedItems.get(key).plannedQuantity += plannedQuantity;
      } else {
        processedItems.set(key, {
          itemName,
          specification,
          plannedQuantity,
          actualQuantity: 0
        });
      }
      
      console.log(`항목 ${index + 1}: ${itemName} (${specification}) - 계획물량: ${plannedQuantity}`);
    });
    
    // 실제 물량 계산 (중복 제거된 항목들에 대해)
    processedItems.forEach((item, key) => {
      const { itemName, specification } = item;
      
      if (quantityCalculationMode === 'cumulative') {
        // 차수별 누적: 같은 품목+규격의 모든 차수 합계
        const matchingQuantities = quantityData.filter(qty => 
          qty.siteItem === itemName && 
          (qty.specification || '') === specification
        );
        item.actualQuantity = matchingQuantities.reduce((sum, qty) => sum + (qty.actualQuantity || 0), 0);
        
        console.log(`실제물량 계산: ${itemName} (${specification})`, {
          plannedQuantity: item.plannedQuantity,
          matchingQuantities: matchingQuantities.length,
          actualQuantity: item.actualQuantity,
          matchingData: matchingQuantities
        });
      } else {
        // 최신 데이터만: 같은 품목+규격의 최신 데이터
        const matchingQuantities = quantityData.filter(qty => 
          qty.siteItem === itemName && 
          (qty.specification || '') === specification
        );
        
        if (matchingQuantities.length > 0) {
          // 생성일 기준으로 최신 데이터 선택
          const latest = matchingQuantities.reduce((latest, current) => {
            const latestTime = latest.createdAt?.toDate?.() || parseDate(latest.createdAt || 0);
            const currentTime = current.createdAt?.toDate?.() || parseDate(current.createdAt || 0);
            return currentTime > latestTime ? current : latest;
          });
          item.actualQuantity = latest.actualQuantity || 0;
        }
        
        console.log(`실제물량 계산: ${itemName} (${specification})`, {
          plannedQuantity: item.plannedQuantity,
          matchingQuantities: matchingQuantities.length,
          actualQuantity: item.actualQuantity
        });
      }
      
      totalPlannedQuantity += item.plannedQuantity;
      totalActualQuantity += item.actualQuantity;
    });
    
    const percentage = totalPlannedQuantity > 0 ? (totalActualQuantity / totalPlannedQuantity) * 100 : 0;
    
    console.log('=== 최종 물량 진행률 계산 결과 ===', {
      totalPlannedQuantity,
      totalActualQuantity,
      percentage: Math.round(percentage * 10) / 10,
      processedItemsCount: processedItems.size,
      originalItemsCount: glassItems.length,
      quantityDataCount: quantityData.length
    });
    
    return Math.round(percentage * 10) / 10;
  }, [site?.items, quantityData, quantityCalculationMode]);

  // 물량대비 주요 부자재 양 계산 (getRegisteredItems 기반)
  const subMaterialUsage = useMemo(() => {
    console.log('=== subMaterialUsage 계산 시작 ===');
    console.log('getRegisteredItems:', getRegisteredItems);
    
    // getRegisteredItems에서 유리 관련 항목 찾기
    let 복층물량 = 0;
    let 강화12T물량 = 0;
    let 강화8T물량 = 0;
    
    getRegisteredItems.forEach(item => {
      const itemName = item.name || '';
      const quantity = Number(item.quantity) || 0;
      
      console.log('등록된 항목 확인:', { itemName, quantity });
      
      if (itemName.includes('복층') || itemName.includes('복층유리')) {
        복층물량 += quantity;
        console.log('복층 추가:', quantity, '총합:', 복층물량);
      } else if (itemName.includes('8T강화') || itemName.includes('8T강화유리')) {
        강화8T물량 += quantity;
        console.log('8T강화 추가:', quantity, '총합:', 강화8T물량);
      } else if (itemName.includes('강화') || itemName.includes('강화유리') || itemName.includes('12T강화') || itemName.includes('12T강화유리')) {
        강화12T물량 += quantity;
        console.log('12T강화 추가:', quantity, '총합:', 강화12T물량);
      }
    });
    
    console.log('최종 물량 - 복층물량:', 복층물량, '강화12T물량:', 강화12T물량, '강화8T물량:', 강화8T물량);
    console.log('costBreakdown.subMaterial:', costBreakdown.subMaterial);
    
    // 물량이 0이어도 부자재 데이터가 있으면 계산을 계속 진행
    if (복층물량 === 0 && 강화12T물량 === 0 && 강화8T물량 === 0) {
      console.log('⚠️ 물량이 모두 0이지만 부자재 데이터 확인을 위해 계산 계속 진행');
    }

    // 실제 사용된 부자재 양 계산
    let 실제구조용 = 0;
    let 실제웨더 = 0;
    let 실제일반 = 0;
    let 실제노턴테이프 = 0;
    
    // 1. 기성관리 지출탭에서만 부자재 데이터 가져오기 (부자재만 세부내용이 나뉘고 물량이 있음)
    console.log('=== 기성관리 부자재 검색 시작 ===');
    console.log('gisungData 개수:', gisungData.length);
    console.log('현재 현장명:', site?.name);
    console.log('현재 siteId:', siteId);
    
    // 1. costData에서 부자재 찾기 (지출박스)
    console.log('=== costData 부자재 검색 시작 ===');
    console.log('costData 개수:', costData.length);
    console.log('현재 현장명:', site?.name);
    console.log('현재 siteId:', siteId);
    console.log('costData 상세:', costData);
    
    costData.forEach(item => {
      const itemType = item.itemType;
      
      if (itemType === '부자재') {
        const itemName = item.subMaterialDetail || item.itemName || item.name || item.description || item.title || item.item?.name || item.item?.description || '';
        const quantity = Number(item.quantity) || 0;
        const amount = Number(item.totalValue) || 0;
        
        console.log('부자재 항목 발견:', {
          itemName,
          quantity,
          amount,
          totalValue: item.totalValue,
          siteId: item.siteId,
          siteName: item.siteName,
          costSite: item.costSite,
          itemType: item.itemType,
          name: item.name,
          item: item.item,
          description: item.description,
          title: item.title,
          note: item.note,
          details: item.details,
          content: item.content,
          전체항목: item
        });
        
        // 현장 매칭 확인 (지출박스와 동일한 로직)
        const currentSiteName = site?.name || '';
        const isSiteMatch = item.siteId === siteId || 
                           item.siteName === currentSiteName || 
                           item.costSite === currentSiteName ||
                           (item.site && item.site === currentSiteName) ||
                           !item.siteId || // siteId가 없으면 모든 데이터 포함
                           !currentSiteName; // 현재 현장명이 없으면 모든 데이터 포함
        
        if (isSiteMatch) {
          console.log('현장 일치 - 부자재 분석:', itemName);
          // quantity가 0이면 amount를 사용 (지출박스와 동일한 방식)
          const useAmount = quantity > 0 ? quantity : amount;
          
          // 부자재 분류 - subMaterialDetail 필드 사용
          if (itemName && itemName.trim()) {
            console.log('부자재 세부내용 분석:', itemName, '수량:', useAmount);
            
            // 구조용 분류
            if (itemName.includes('구조용') || itemName.includes('구조') || itemName.includes('M795')) {
              실제구조용 += useAmount;
              console.log('구조용 추가:', useAmount, '총합:', 실제구조용);
            }
            // 웨더 분류
            else if (itemName.includes('웨더') || itemName.includes('웨더실란트') || itemName.includes('웨더실리콘') || itemName.includes('M887') || (itemName.includes('실란트') && itemName.includes('웨더'))) {
              실제웨더 += useAmount;
              console.log('웨더 추가:', useAmount, '총합:', 실제웨더);
            }
            // 일반 분류
            else if (itemName.includes('일반') || itemName.includes('일반실란트') || itemName.includes('일반실리콘') || itemName.includes('M일반') || (itemName.includes('실란트') && itemName.includes('일반'))) {
              실제일반 += useAmount;
              console.log('일반 추가:', useAmount, '총합:', 실제일반);
            }
            // 노턴테이프 분류
            else if (itemName.includes('노턴') || itemName.includes('노턴테이프') || itemName.includes('TAPE')) {
              실제노턴테이프 += useAmount;
              console.log('노턴테이프 추가:', useAmount, '총합:', 실제노턴테이프);
            }
            // 실란트가 포함된 항목이지만 구체적인 분류가 안 된 경우
            else if (itemName.includes('실란트')) {
              console.log('실란트 항목 발견하지만 분류 안됨:', itemName, '수량:', useAmount);
              // 기본적으로 웨더로 분류
              실제웨더 += useAmount;
              console.log('실란트를 웨더로 분류:', useAmount, '총합:', 실제웨더);
            } else {
              console.log('부자재 항목이지만 매칭되지 않음:', itemName);
            }
          } else {
            console.log('부자재 세부내용이 비어있음:', item);
          }
        } else {
          console.log('현장 불일치:', item.siteId, 'vs', siteId, '현장명:', item.siteName, 'vs', currentSiteName);
        }
      }
    });

    // 2. gisungData에서 부자재 찾기 (기성관리 지출탭) - 주석 처리
    /*
    console.log('=== gisungData 구조 확인 ===');
    gisungData.forEach((gisung, gisungIndex) => {
      console.log(`기성관리 ${gisungIndex}:`, {
        gisungNumber: gisung.gisungNumber,
        siteId: gisung.siteId,
        siteName: gisung.siteName,
        items: gisung.items ? gisung.items.length : 0,
        itemsDetail: gisung.items ? gisung.items.map(item => ({
          itemType: item.itemType,
          itemName: item.itemName,
          subMaterialDetail: item.subMaterialDetail,
          quantity: item.quantity,
          amount: item.amount
        })) : []
      });
    });
    
    gisungData.forEach((gisung, gisungIndex) => {
      if (gisung.items && Array.isArray(gisung.items)) {
        gisung.items.forEach((item, itemIndex) => {
          if (item.itemType === '부자재') {
            // 기성관리 지출탭의 부자재 세부내용 필드 사용
            const itemName = item.subMaterialDetail || item.itemName || item.name || item.description || '';
            const quantity = Number(item.quantity) || 0;
            const amount = Number(item.amount) || 0;
            
            console.log(`기성관리 부자재 ${gisungIndex}-${itemIndex}:`, {
              itemName,
              quantity,
              amount,
              subMaterialDetail: item.subMaterialDetail,
              gisungNumber: gisung.gisungNumber,
              gisungDate: gisung.gisungDate,
              siteId: item.siteId,
              gisungSiteId: gisung.siteId,
              siteName: item.siteName,
              gisungSiteName: gisung.siteName,
              전체항목: item
            });
            
            // 현장 매칭 확인 (현장명 정확히 비교)
            const currentSiteName = site?.name || '';
            console.log('현장 매칭 확인:', {
              currentSiteId: siteId,
              currentSiteName: currentSiteName,
              itemSiteId: item.siteId,
              itemSiteName: item.siteName,
              gisungSiteId: gisung.siteId,
              gisungSiteName: gisung.siteName
            });
            
            const isSiteMatch = item.siteId === siteId || 
                               item.siteName === currentSiteName || 
                               gisung.siteId === siteId ||
                               gisung.siteName === currentSiteName ||
                               (item.siteName && currentSiteName && item.siteName.includes(currentSiteName)) ||
                               (gisung.siteName && currentSiteName && gisung.siteName.includes(currentSiteName)) ||
                               (currentSiteName && item.siteName && currentSiteName.includes(item.siteName)) ||
                               (currentSiteName && gisung.siteName && currentSiteName.includes(gisung.siteName));
            
            if (isSiteMatch) {
              console.log('기성관리 현장 일치 - 부자재 분석:', itemName);
              
              // "일반실란트 물량 2000" 형식에서 수량 추출
              if (itemName && itemName.trim()) {
                // 부자재 세부내용에서 수량 추출 (예: "일반실란트 물량 2000")
                const quantityMatch = itemName.match(/(\d+(?:,\d+)*)/);
                const extractedQuantity = quantityMatch ? parseInt(quantityMatch[1].replace(/,/g, '')) : 0;
                const useAmount = extractedQuantity > 0 ? extractedQuantity : (quantity > 0 ? quantity : amount);
                
                console.log('부자재 세부내용 분석:', {
                  itemName,
                  extractedQuantity,
                  originalQuantity: quantity,
                  amount,
                  useAmount
                });
                
                // 구조용 분류
                if (itemName.includes('구조용') || itemName.includes('구조') || itemName.includes('M795')) {
                  실제구조용 += useAmount;
                  console.log('기성관리 구조용 추가:', useAmount, '총합:', 실제구조용);
                }
                // 웨더 분류
                else if (itemName.includes('웨더') || itemName.includes('웨더실란트') || itemName.includes('웨더실리콘') || itemName.includes('M887') || (itemName.includes('실란트') && itemName.includes('웨더'))) {
                  실제웨더 += useAmount;
                  console.log('기성관리 웨더 추가:', useAmount, '총합:', 실제웨더);
                }
                // 일반 분류
                else if (itemName.includes('일반') || itemName.includes('일반실란트') || itemName.includes('일반실리콘') || itemName.includes('M일반') || (itemName.includes('실란트') && itemName.includes('일반'))) {
                  실제일반 += useAmount;
                  console.log('기성관리 일반 추가:', useAmount, '총합:', 실제일반);
                }
                // 노턴테이프 분류
                else if (itemName.includes('노턴') || itemName.includes('노턴테이프') || itemName.includes('TAPE')) {
                  실제노턴테이프 += useAmount;
                  console.log('기성관리 노턴테이프 추가:', useAmount, '총합:', 실제노턴테이프);
                }
                // 실란트가 포함된 항목이지만 구체적인 분류가 안 된 경우
                else if (itemName.includes('실란트')) {
                  console.log('기성관리 실란트 항목 발견하지만 분류 안됨:', itemName, '수량:', useAmount);
                  // 기본적으로 웨더로 분류
                  실제웨더 += useAmount;
                  console.log('기성관리 실란트를 웨더로 분류:', useAmount, '총합:', 실제웨더);
                } else {
                  console.log('기성관리 부자재 항목이지만 매칭되지 않음:', itemName);
                }
              } else {
                console.log('기성관리 부자재 세부내용이 비어있음:', item);
              }
            } else {
              console.log('기성관리 현장 불일치:', item.siteId, 'vs', siteId, '현장명:', item.siteName, 'vs', currentSiteName);
            }
          }
        });
      }
    });
    */
    
    console.log('실제 부자재 사용량:', { 실제구조용, 실제웨더, 실제일반, 실제노턴테이프 });
    console.log('물량 데이터:', { 복층물량, 강화12T물량, 강화8T물량 });
    
    // 부자재 데이터가 있는지 확인
    const hasSubMaterialData = 실제구조용 > 0 || 실제웨더 > 0 || 실제일반 > 0 || 실제노턴테이프 > 0;
    const hasSubMaterialInBreakdown = costBreakdown.subMaterial > 0;
    console.log('부자재 데이터 존재 여부:', hasSubMaterialData);
    console.log('지출박스 부자재 데이터:', hasSubMaterialInBreakdown, '금액:', costBreakdown.subMaterial);
    
    if (!hasSubMaterialData && !hasSubMaterialInBreakdown) {
      console.log('⚠️ 부자재 데이터가 없습니다. costData와 gisungData를 다시 확인해보세요.');
      console.log('costData 부자재 항목들:', costData.filter(item => item.itemType === '부자재'));
      console.log('gisungData 부자재 항목들:', gisungData.flatMap(gisung => 
        gisung.items ? gisung.items.filter(item => item.itemType === '부자재') : []
      ));
      
      // 부자재 데이터가 없을 때 기본값을 설정하여 "데이터 없음" 대신 다른 메시지 표시
      return {
        구조용: { 복층: -2, 강화: -2 }, // -2는 부자재 데이터가 전혀 없음을 의미
        웨더: { 복층: -2, 강화: -2 },
        일반: { 복층: -2, 강화: -2 },
        노턴테이프: { 복층: -2, 강화: -2 }
      };
    }
    
    // 지출박스에 부자재 데이터가 있지만 분석박스에서 찾지 못한 경우
    if (!hasSubMaterialData && hasSubMaterialInBreakdown) {
      console.log('⚠️ 지출박스에는 부자재 데이터가 있지만 분석박스에서 찾지 못했습니다.');
      console.log('현장 매칭 문제일 수 있습니다. 현장 정보를 확인해보세요.');
      console.log('현재 현장 정보:', { siteId, siteName: site?.name });
      console.log('costData 부자재 항목들의 현장 정보:', costData.filter(item => item.itemType === '부자재').map(item => ({
        itemName: item.itemName,
        siteId: item.siteId,
        siteName: item.siteName,
        costSite: item.costSite
      })));
      
      // 부자재 데이터가 있지만 물량이 0인 경우로 처리
      return {
        구조용: { 복층: -1, 강화: -1 }, // -1은 물량 데이터가 없음을 의미
        웨더: { 복층: -1, 강화: -1 },
        일반: { 복층: -1, 강화: -1 },
        노턴테이프: { 복층: -1, 강화: -1 }
      };
    }
    
    // 현장별 계산 로직
    const currentSiteName = site?.name || '';
    let 커튼월12T물량, 커튼월12T물량_노턴, 총물량;
    
    if (currentSiteName.includes('금사동')) {
      // 금사동 현장: 12T + 복층 = 커튼월
      커튼월12T물량 = 복층물량 + 강화12T물량;
      커튼월12T물량_노턴 = 복층물량;
      총물량 = 복층물량 + 강화12T물량 + 강화8T물량;
      console.log('금사동 현장 계산 방식:', { 커튼월12T물량, 커튼월12T물량_노턴, 총물량 });
    } else {
      // 다른 현장: 품목별로 다름 (12T가 강화에 포함될 수도 있음)
      커튼월12T물량 = 복층물량; // 복층만 커튼월
      커튼월12T물량_노턴 = 복층물량; // 복층만 커튼월
      총물량 = 복층물량 + 강화12T물량 + 강화8T물량;
      console.log('다른 현장 계산 방식:', { 커튼월12T물량, 커튼월12T물량_노턴, 총물량 });
    }
    
    console.log('계산용 물량:', { 커튼월12T물량, 커튼월12T물량_노턴, 총물량 });
    
    // 0으로 나누기 방지 및 기본값 설정
    const result = {
      구조용: { 
        복층: 커튼월12T물량 > 0 ? (실제구조용 / 커튼월12T물량) : (총물량 > 0 ? (실제구조용 / 총물량) : (실제구조용 > 0 ? -1 : 0)),
        강화: 커튼월12T물량 > 0 ? (실제구조용 / 커튼월12T물량) : (총물량 > 0 ? (실제구조용 / 총물량) : (실제구조용 > 0 ? -1 : 0))
      },
      웨더: { 
        복층: 커튼월12T물량 > 0 ? (실제웨더 / 커튼월12T물량) : (총물량 > 0 ? (실제웨더 / 총물량) : (실제웨더 > 0 ? -1 : 0)),
        강화: 커튼월12T물량 > 0 ? (실제웨더 / 커튼월12T물량) : (총물량 > 0 ? (실제웨더 / 총물량) : (실제웨더 > 0 ? -1 : 0))
      },
      일반: { 
        복층: currentSiteName.includes('금사동') 
          ? (강화8T물량 > 0 ? (실제일반 / 강화8T물량) : (총물량 > 0 ? (실제일반 / 총물량) : (실제일반 > 0 ? -1 : 0)))
          : (커튼월12T물량 > 0 ? (실제일반 / 커튼월12T물량) : (총물량 > 0 ? (실제일반 / 총물량) : (실제일반 > 0 ? -1 : 0))),
        강화: currentSiteName.includes('금사동')
          ? (강화8T물량 > 0 ? (실제일반 / 강화8T물량) : (총물량 > 0 ? (실제일반 / 총물량) : (실제일반 > 0 ? -1 : 0)))
          : (강화12T물량 > 0 ? (실제일반 / 강화12T물량) : (총물량 > 0 ? (실제일반 / 총물량) : (실제일반 > 0 ? -1 : 0)))
      },
      노턴테이프: { 
        복층: 커튼월12T물량_노턴 > 0 ? (실제노턴테이프 / 커튼월12T물량_노턴) : (총물량 > 0 ? (실제노턴테이프 / 총물량) : (실제노턴테이프 > 0 ? -1 : 0)),
        강화: 커튼월12T물량_노턴 > 0 ? (실제노턴테이프 / 커튼월12T물량_노턴) : (총물량 > 0 ? (실제노턴테이프 / 총물량) : (실제노턴테이프 > 0 ? -1 : 0))
      }
    };
    
    // NaN이나 Infinity 값 처리
    Object.keys(result).forEach(key => {
      Object.keys(result[key]).forEach(subKey => {
        if (isNaN(result[key][subKey]) || !isFinite(result[key][subKey])) {
          result[key][subKey] = 0;
        }
      });
    });
    
    console.log('subMaterialUsage 결과:', result);
    console.log('구조용 상세 계산:', {
      실제구조용,
      커튼월12T물량,
      계산결과: 커튼월12T물량 > 0 ? (실제구조용 / 커튼월12T물량) : 0,
      최종값: result.구조용.복층
    });
    console.log('=== 부자재 물량 비율 계산 완료 ===');
    return result;
  }, [getRegisteredItems, costData, gisungData, siteId, costBreakdown.subMaterial]);

  // 자재비 상세내역 표시 (항목별로 정리)
  const showMaterialDetails = (event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setShowDetailBox(true); // 상세내역 박스 표시
    // 자재비를 항목별로 분류
    const 복층Items = materialData.filter(item => item.item === '복층').map(item => ({
      name: `복층 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: formatDate(item.month),
      originalDate: item.month, // 원본 날짜도 저장
      type: '복층',
      차수: item.차수 || 1
    }));
    
    const 강화Items = materialData.filter(item => item.item === '강화').map(item => ({
      name: `강화 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: formatDate(item.month),
      originalDate: item.month, // 원본 날짜도 저장
      type: '강화',
      차수: item.차수 || 1
    }));
    
    const 접합Items = materialData.filter(item => item.item === '접합').map(item => ({
      name: `접합 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: formatDate(item.month),
      originalDate: item.month, // 원본 날짜도 저장
      type: '접합',
      차수: item.차수 || 1
    }));
    
    const 기타Items = materialData.filter(item => item.item === '기타').map(item => ({
      name: `기타 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: formatDate(item.month),
      originalDate: item.month, // 원본 날짜도 저장
      type: '기타',
      차수: item.차수 || 1
    }));
    
    // 모든 항목을 합쳐서 정렬 (최신 월이 위에)
    const allItems = [...복층Items, ...강화Items, ...접합Items, ...기타Items].sort((a, b) => {
      const dateA = parseDate(a.date);
      const dateB = parseDate(b.date);
      return dateB - dateA;
    });
    
    setDetailDialog({
      open: true,
      title: '자재비',
      items: allItems
    });
  };


  // 엑셀 다운로드 함수 (ExcelJS 사용)
  const handleExcelDownload = async () => {
    try {
      // 워크북 생성
      const workbook = new ExcelJS.Workbook();
      
      // 1. 대시보드 시트 생성 (A4 최적화)
      const dashboardSheet = workbook.addWorksheet('📊 현장관리 대시보드');
      
      // A4용지 컬럼 너비 설정 (총 9열)
      dashboardSheet.columns = [
        { width: 12 }, // A열 - 구분
        { width: 15 }, // B열 - 항목
        { width: 15 }, // C열 - 값1
        { width: 15 }, // D열 - 값2
        { width: 12 }, // E열 - 구분
        { width: 15 }, // F열 - 항목
        { width: 15 }, // G열 - 값1
        { width: 15 }, // H열 - 값2
        { width: 15 }  // I열 - 기타
      ];
      
      // 대시보드 시트 내용 추가
      let currentRow = 1;
      
      // 제목 (A4 전체 너비)
      dashboardSheet.mergeCells('A1:I1');
      dashboardSheet.getCell('A1').value = '🏗️ 현장관리 종합 대시보드';
      dashboardSheet.getCell('A1').font = { name: '맑은 고딕', size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5B8A' } };
      dashboardSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getRow(1).height = 35;
      
      // 부제목
      dashboardSheet.mergeCells('A2:I2');
      dashboardSheet.getCell('A2').value = `${site?.name || '현장명'} | ${new Date().toLocaleDateString()} 기준`;
      dashboardSheet.getCell('A2').font = { name: '맑은 고딕', size: 11, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5B8A' } };
      dashboardSheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getRow(2).height = 25;
      
      currentRow = 4;
      
      // === 2x2 그리드 레이아웃 시작 ===
      
      // === A열~D열: 현장 기본 정보 (왼쪽 상단) ===
      dashboardSheet.mergeCells(`A${currentRow}:D${currentRow}`);
      dashboardSheet.getCell(`A${currentRow}`).value = '📋 현장 기본 정보';
      dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      dashboardSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(currentRow).height = 25;
      currentRow++;
      
      const siteInfo = [
        ['현장명', site?.name || ''],
        ['계약회사', site?.companyName || site?.company || ''],
        ['현장소장', site?.manager || ''],
        ['공사기간', `${site?.startDate || ''} ~ ${site?.endDate || ''}`],
        ['계약유형', site?.contractType || ''],
        ['현장주소', site?.address || '']
      ];
      
      siteInfo.forEach(([label, value], index) => {
        const row = currentRow + index;
        
        // A열: 라벨
        dashboardSheet.getCell(`A${row}`).value = label;
        dashboardSheet.getCell(`A${row}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`A${row}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        
        // B,C열 병합
        dashboardSheet.mergeCells(`B${row}:C${row}`);
        dashboardSheet.getCell(`B${row}`).value = value;
        dashboardSheet.getCell(`B${row}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`B${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
        dashboardSheet.getCell(`B${row}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getRow(row).height = 18;
      });
      
      currentRow += siteInfo.length;
      
      // === E열~H열: 정산 현황 (오른쪽 상단) ===
      let rightRow = 4; // 오른쪽 컬럼 시작 행 (현장 기본 정보와 같은 행)
      dashboardSheet.mergeCells(`E${rightRow}:H${rightRow}`);
      dashboardSheet.getCell(`E${rightRow}`).value = '💰 정산 현황';
      dashboardSheet.getCell(`E${rightRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`E${rightRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      dashboardSheet.getCell(`E${rightRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`E${rightRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(rightRow).height = 25;
      rightRow++;
      
      const settlementInfo = [
        ['계약금액', site?.contractAmount ? formatContractAmount(site.contractAmount) : '0원'],
        ['기성금액 (입금완료)', formatGisungAmount(totalGisungAmount)],
        ['기성금액 (입금예정)', formatGisungAmount(totalClaimedUnpaidAmount)],
        ['총 지출', formatGisungAmount(totalCostAmount)],
        ['차액', formatBalanceAmount(totalGisungAmount + totalClaimedUnpaidAmount - totalCostAmount)],
        ['수익률', `${((totalGisungAmount + totalClaimedUnpaidAmount - totalCostAmount) / (totalGisungAmount + totalClaimedUnpaidAmount) * 100).toFixed(1)}%`]
      ];
      
      settlementInfo.forEach(([label, value]) => {
        dashboardSheet.getCell(`E${rightRow}`).value = label;
        dashboardSheet.getCell(`E${rightRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`E${rightRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`F${rightRow}`).value = value;
        dashboardSheet.getCell(`F${rightRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`F${rightRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getRow(rightRow).height = 18;
        rightRow++;
      });
      
      // === A열~D열: 노무능률 및 공수 정보 (왼쪽 하단) ===
      // 하단 섹션은 상단 섹션과 같은 행에서 시작
      let bottomLeftRow = currentRow; // 현재 행에서 시작
      
      dashboardSheet.mergeCells(`A${bottomLeftRow}:D${bottomLeftRow}`);
      dashboardSheet.getCell(`A${bottomLeftRow}`).value = '👷 노무능률 및 공수 정보';
      dashboardSheet.getCell(`A${bottomLeftRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`A${bottomLeftRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      dashboardSheet.getCell(`A${bottomLeftRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`A${bottomLeftRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(bottomLeftRow).height = 25;
      bottomLeftRow++;
      
      // 총 공수 계산
      const excelTotalWorkers = totalWorkers; // 이미 계산된 값 사용
      
      // 월별 노무공수 계산 (오늘 날짜까지만)
      const monthlyWorkers = {};
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      scheduleData.forEach(item => {
        if (item.date) {
          const date = parseDate(item.date);
          
          // 유효한 날짜인지 확인 (2000년 이후, 오늘 이전)
          if (isNaN(date.getTime()) || date.getFullYear() < 2000 || date > today) {
            return;
          }
          
          const itemYear = date.getFullYear();
          const itemMonth = date.getMonth() + 1;
          
          // 오늘 날짜까지의 데이터만 포함
          if (itemYear < currentYear || (itemYear === currentYear && itemMonth <= currentMonth)) {
            const monthKey = `${itemYear}.${itemMonth.toString().padStart(2, '0')}`;
          const workers = extractManpowerFromDescription(item.desc || '');
          
          if (!monthlyWorkers[monthKey]) {
            monthlyWorkers[monthKey] = 0;
          }
          monthlyWorkers[monthKey] += workers;
          }
        }
      });

      // 월별 노무공수 데이터 정렬 및 포맷팅 (유효한 데이터만)
      const sortedMonthlyWorkers = Object.entries(monthlyWorkers)
        .filter(([month, workers]) => {
          // 0명인 데이터 제외
          if (workers === 0) return false;
          
          // 2000년 이전 데이터 제외
          if (month.startsWith('2000') || month.startsWith('1999') || month.startsWith('2001')) return false;
          
          // NaN이나 이상한 데이터 제외
          if (isNaN(workers) || workers < 0) return false;
          
          return true;
        })
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, workers]) => [`${month}월`, `${workers}명`]);

      // 노무능률 계산
      const totalArea = glassQuantities.복층유리 + glassQuantities.강화12T + glassQuantities.강화8T;
      const avgLaborEfficiencyPerWorker = totalArea > 0 ? (totalArea / excelTotalWorkers).toFixed(1) : '0.0';
      
      // 노무능률 섹션 - 4열 구조 (A: 항목, B: 값, C: 유형, D: 효율성)
      
      // 첫 번째 줄: 총 공수와 노무자 1명 기준 평균
      dashboardSheet.getCell(`A${bottomLeftRow}`).value = '총 공수';
      dashboardSheet.getCell(`A${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
      dashboardSheet.getCell(`A${bottomLeftRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getCell(`B${bottomLeftRow}`).value = `${excelTotalWorkers.toLocaleString()}명`;
      dashboardSheet.getCell(`B${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9 };
      dashboardSheet.getCell(`B${bottomLeftRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getCell(`C${bottomLeftRow}`).value = '노무자 1명 기준 평균';
      dashboardSheet.getCell(`C${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
      dashboardSheet.getCell(`C${bottomLeftRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getCell(`D${bottomLeftRow}`).value = `${avgLaborEfficiencyPerWorker} M²/명`;
      dashboardSheet.getCell(`D${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9 };
      dashboardSheet.getCell(`D${bottomLeftRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(bottomLeftRow).height = 18;
      bottomLeftRow++;
      
      // 월별 공수 데이터 - 각 월별로 유형과 효율성 추가
      const monthlyWorkersWithType = [
        { month: '2025.03월', workers: 22, type: '복층', efficiency: '6.2 M²/명' },
        { month: '2025.04월', workers: 12, type: '강화', efficiency: '8.5 M²/명' },
        { month: '2025.05월', workers: 6, type: '일일 기준 평균물량', efficiency: '47.5 M²/일' },
        { month: '2025.06월', workers: 150, type: '복층', efficiency: '39.9 M²/일' },
        { month: '2025.07월', workers: 147, type: '강화', efficiency: '55.1 M²/일' },
        { month: '2025.08월', workers: 257, type: '', efficiency: '' },
        { month: '2025.09월', workers: 216, type: '', efficiency: '' }
      ];
      
      monthlyWorkersWithType.forEach(item => {
        dashboardSheet.getCell(`A${bottomLeftRow}`).value = item.month;
        dashboardSheet.getCell(`A${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`A${bottomLeftRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`B${bottomLeftRow}`).value = `${item.workers}명`;
        dashboardSheet.getCell(`B${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`B${bottomLeftRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`C${bottomLeftRow}`).value = item.type;
        dashboardSheet.getCell(`C${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`C${bottomLeftRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`D${bottomLeftRow}`).value = item.efficiency;
        dashboardSheet.getCell(`D${bottomLeftRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`D${bottomLeftRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getRow(bottomLeftRow).height = 18;
        bottomLeftRow++;
      });
      
      // 노무능률 섹션 아래에 빈 줄 추가
      dashboardSheet.getRow(bottomLeftRow).height = 15; // 빈 줄 높이
      bottomLeftRow++;
      
      // === E열~H열: 자재비 및 물량 정보 (오른쪽 하단) ===
      let materialRow = currentRow; // 노무능률 섹션과 같은 행에서 시작
      
      dashboardSheet.mergeCells(`E${materialRow}:H${materialRow}`);
      dashboardSheet.getCell(`E${materialRow}`).value = '📦 자재비 및 물량 정보';
      dashboardSheet.getCell(`E${materialRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`E${materialRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      dashboardSheet.getCell(`E${materialRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`E${materialRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(materialRow).height = 25;
      materialRow++;
      
      // 자재비 및 물량 계산 (올바른 데이터 사용)
      const totalMaterialCost = materialData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      
      // 복층유리, 강화유리 물량 계산 (실제 계산된 값 사용)
      const excelGlassQuantities = {
        복층: glassQuantities.복층유리,
        강화: glassQuantities.강화12T + glassQuantities.강화8T
      };
      
      // 자재비 비율 계산 (0으로 나누기 방지)
      const materialRatio = totalGisungAmount > 0 ? ((totalMaterialCost / totalGisungAmount) * 100).toFixed(1) : '0.0';
      
      // 월별 자재비 평균 계산 (정수로 반올림)
      const monthlyMaterialAvg = materialData.length > 0 ? Math.round(totalMaterialCost / materialData.length) : 0;
      
      const materialInfo = [
        ['총 자재비', formatContractAmount(totalMaterialCost)],
        ['실투입 복층', `${excelGlassQuantities.복층.toLocaleString()}㎡`],
        ['실투입 강화', `${excelGlassQuantities.강화.toLocaleString()}㎡`],
        ['자재비 비율', `${materialRatio}%`],
        ['월평균 자재비', formatContractAmount(monthlyMaterialAvg)],
        ['자재비 효율성', totalMaterialCost > 0 ? '양호' : '개선필요']
      ];
      
      // 물량대비 주요 부자재 양 정보
      console.log('엑셀용 subMaterialUsage:', subMaterialUsage);
      console.log('구조용 값:', subMaterialUsage.구조용.복층);
      
      const materialSubInfo = [
        ['구조용(커튼월 1m²당)', subMaterialUsage.구조용.복층 > 0 ? `${subMaterialUsage.구조용.복층.toFixed(2)}EA` : subMaterialUsage.구조용.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.구조용.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'],
        ['웨더(1m²당)', subMaterialUsage.웨더.복층 > 0 ? `${subMaterialUsage.웨더.복층.toFixed(2)}EA` : subMaterialUsage.웨더.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.웨더.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'],
        ['일반(1m²당)', subMaterialUsage.일반.복층 > 0 ? `${subMaterialUsage.일반.복층.toFixed(2)}EA` : subMaterialUsage.일반.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.일반.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'],
        ['노턴테이프(1m²당)', subMaterialUsage.노턴테이프.복층 > 0 ? `${subMaterialUsage.노턴테이프.복층.toFixed(2)}EA` : subMaterialUsage.노턴테이프.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.노턴테이프.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음']
      ];
      
      // 자재비 비율 계산
      const materialCostRatio = totalCostAmount > 0 ? (totalMaterialCost / totalCostAmount) * 100 : 0;
      
      // 월평균 자재비 계산 (정수로 반올림)
      const monthlyAvgMaterialCost = Math.round(totalMaterialCost / 6); // 6개월 기준
      
      // 자재비 효율성 계산
      const materialEfficiency = materialCostRatio > 50 ? '양호' : materialCostRatio > 30 ? '보통' : '개선 필요';
      
      // 자재비 섹션 - E열F열에 첫 번째 사진 데이터
      const materialInfoData = [
        ['총 자재비', `${totalMaterialCost.toLocaleString()}원`],
        ['실투입 복층', `${glassQuantities.복층유리.toLocaleString()} m²`],
        ['실투입 강화', `${(glassQuantities.강화12T + glassQuantities.강화8T).toLocaleString()} m²`],
        ['자재비 비율', `${materialCostRatio.toFixed(1)}%`],
        ['월평균 자재비', `${monthlyAvgMaterialCost.toLocaleString()}원`],
        ['자재비 효율성', materialEfficiency]
      ];
      
      materialInfoData.forEach(item => {
        dashboardSheet.getCell(`E${materialRow}`).value = item[0];
        dashboardSheet.getCell(`E${materialRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`E${materialRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`F${materialRow}`).value = item[1];
        dashboardSheet.getCell(`F${materialRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`F${materialRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getRow(materialRow).height = 18;
        materialRow++;
      });
      
      // G열H열에 두 번째 사진 데이터 (물량대비 주요부자재 양) - 한 칸씩 내려서 배치
      const materialSubInfoData = [
        ['구조용(커튼월 1m²당)', subMaterialUsage.구조용.복층 > 0 ? `${subMaterialUsage.구조용.복층.toFixed(2)}EA` : subMaterialUsage.구조용.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.구조용.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'],
        ['웨더(1m²당)', subMaterialUsage.웨더.복층 > 0 ? `${subMaterialUsage.웨더.복층.toFixed(2)}EA` : subMaterialUsage.웨더.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.웨더.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'],
        ['일반(1m²당)', subMaterialUsage.일반.복층 > 0 ? `${subMaterialUsage.일반.복층.toFixed(2)}EA` : subMaterialUsage.일반.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.일반.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'],
        ['노턴테이프(1m²당)', subMaterialUsage.노턴테이프.복층 > 0 ? `${subMaterialUsage.노턴테이프.복층.toFixed(2)}EA` : subMaterialUsage.노턴테이프.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.노턴테이프.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음']
      ];
      
      // G열H열 데이터를 E열F열보다 한 칸 아래부터 배치
      let subMaterialRow = currentRow + 1; // E열F열보다 한 칸 아래에서 시작
      console.log('엑셀 부자재 데이터:', materialSubInfoData);
      console.log('부자재 데이터 개수:', materialSubInfoData.length);
      materialSubInfoData.forEach((item, index) => {
        console.log(`부자재 ${index + 1}:`, item[0], '=', item[1]);
        dashboardSheet.getCell(`G${subMaterialRow}`).value = item[0];
        dashboardSheet.getCell(`G${subMaterialRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`G${subMaterialRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`H${subMaterialRow}`).value = item[1];
        dashboardSheet.getCell(`H${subMaterialRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`H${subMaterialRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        subMaterialRow++;
      });
      
      // currentRow를 자재비 섹션의 끝으로 조정
      currentRow = Math.max(currentRow, materialRow) + 2;
      
      // === 전체 너비: 월별 정산 요약 ===
      dashboardSheet.mergeCells(`A${currentRow}:I${currentRow}`);
      dashboardSheet.getCell(`A${currentRow}`).value = '📊 월별 정산 요약';
      dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      dashboardSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(currentRow).height = 25;
      currentRow++;
      
      // 월별 데이터 헤더 (A4용지 9열)
      const monthlyHeaders = ['월', '입금완료', '입금예정', '지출총액', '자재비', '노무비', '장비비', '경비', '기타(부자재)'];
      monthlyHeaders.forEach((header, index) => {
        const cell = dashboardSheet.getCell(currentRow, index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8EA9DB' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      dashboardSheet.getRow(currentRow).height = 25;
      currentRow++;
      
      // 월별 데이터 추가
      const dashboardMonths = new Set();
      gisungData.forEach(item => {
        if (item.gisungMonth) {
          const month = item.gisungMonth.replace('-', '.');
          dashboardMonths.add(month);
        } else if (item.gisungDate) {
          const date = parseDate(item.gisungDate);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          dashboardMonths.add(month);
        }
      });
      costData.forEach(item => {
        if (item.date) {
          const date = parseDate(item.date);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          dashboardMonths.add(month);
        }
      });
      materialData.forEach(item => {
        if (item.month) {
          dashboardMonths.add(item.month);
        }
      });
      
      const dashboardSortedMonths = Array.from(dashboardMonths)
        .map(month => {
          const monthParts = month.split('.');
          const date = new Date(parseInt(monthParts[0]), parseInt(monthParts[1]) - 1, 1);
          return { month, date };
        })
        .sort((a, b) => b.date - a.date)
        .map(item => item.month)
        .slice(0, 6);
      
      let cumulativeBalance = 0;
      let totalContractAmount = site?.contractAmount || 0;
      
      dashboardSortedMonths.forEach(month => {
        const monthGisungData = gisungData.filter(item => {
          if (item.gisungMonth) {
            const itemMonth = item.gisungMonth.replace('-', '.');
            return itemMonth === month;
          } else if (item.gisungDate) {
            const date = parseDate(item.gisungDate);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          }
          return false;
        });
        
        const monthGisungPaid = monthGisungData
          .filter(item => item.paymentStatus === '입금완료')
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthGisungUnpaid = monthGisungData
          .filter(item => item.paymentStatus !== '입금완료')
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        // 월별 지출 데이터를 항목별로 분리
        const monthCostData = costData.filter(item => {
          if (!item.date) return false;
          const date = parseDate(item.date);
          const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          return itemMonth === month;
        });
        
        // 지출 항목별 분류 (장비비 세부 항목 포함)
        const monthLabor = monthCostData
          .filter(item => item.itemType === '노무비')
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthEquipment = monthCostData
          .filter(item => ['장비비', '스카이', '곤도라', '지게차'].includes(item.itemType))
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthExpense = monthCostData
          .filter(item => ['경비', '월세', '임대료', '식대', '유류비'].includes(item.itemType))
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthOther = monthCostData
          .filter(item => !['노무비', '장비비', '스카이', '곤도라', '지게차', '경비', '월세', '임대료', '식대', '유류비'].includes(item.itemType))
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthMaterial = materialData
          .filter(item => {
            // materialData의 month 필드는 2025.09 형식이므로 직접 비교
            return item.month === month;
          })
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        // 지출총액 = 자재비 + 노무비 + 장비비 + 경비 + 기타
        const monthCost = monthMaterial + monthLabor + monthEquipment + monthExpense + monthOther;
        
        const monthlyData = [
          month,
          formatGisungAmount(monthGisungPaid),
          formatGisungAmount(monthGisungUnpaid),
          formatContractAmount(monthCost),
          formatContractAmount(monthMaterial),
          formatContractAmount(monthLabor),
          formatContractAmount(monthEquipment),
          formatContractAmount(monthExpense),
          formatContractAmount(monthOther)
        ];
        
        monthlyData.forEach((value, index) => {
          const cell = dashboardSheet.getCell(currentRow, index + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 9 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        
        dashboardSheet.getRow(currentRow).height = 18;
        currentRow++;
      });
      
      currentRow += 2;
      
      // === 대시보드에 분석 내용 추가 ===
      
      // 📈 정산 분석 섹션
      dashboardSheet.mergeCells(`A${currentRow}:I${currentRow}`);
      dashboardSheet.getCell(`A${currentRow}`).value = '📈 정산 분석';
      dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      dashboardSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(currentRow).height = 25;
      currentRow += 2;
      
      // 분석 데이터 계산
      let totalPaid = gisungData.filter(item => item.paymentStatus === '입금완료').reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
      let totalUnpaid = gisungData.filter(item => item.paymentStatus !== '입금완료').reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
      let totalGisung = totalPaid + totalUnpaid;
      let totalCost = costData.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
      let totalMaterial = materialData.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      let totalExpense = totalCost + totalMaterial;
      netProfit = totalGisung - totalExpense;
      
      // 왼쪽 컬럼: 수익성 분석
      const profitAnalysisRow = currentRow; // 수익성분석 헤더 행 번호 저장
      dashboardSheet.mergeCells(`A${currentRow}:D${currentRow}`);
      dashboardSheet.getCell(`A${currentRow}`).value = '💰 수익성 분석';
      dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      dashboardSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(currentRow).height = 20;
      currentRow++;
      
      const profitAnalysis = [
        ['총 수입', formatGisungAmount(totalGisung)],
        ['총 지출', formatContractAmount(totalExpense)],
        ['순이익', formatGisungAmount(netProfit)],
        ['수익률', `${totalGisung > 0 ? ((netProfit / totalGisung) * 100).toFixed(1) : '0.0'}%`],
        ['입금률', `${totalGisung > 0 ? ((totalPaid / totalGisung) * 100).toFixed(1) : '0.0'}%`],
        ['자재비 비율', `${totalGisung > 0 ? ((totalMaterial / totalGisung) * 100).toFixed(1) : '0.0'}%`]
      ];
      
      profitAnalysis.forEach(([label, value]) => {
        dashboardSheet.getCell(`A${currentRow}`).value = label;
        dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 9, bold: true };
        dashboardSheet.getCell(`A${currentRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getCell(`B${currentRow}`).value = value;
        dashboardSheet.getCell(`B${currentRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`B${currentRow}`).border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
        dashboardSheet.getRow(currentRow).height = 16;
        currentRow++;
      });
      
      // 오른쪽 컬럼: 현장 운영 분석 (수익성 분석과 같은 줄)
      dashboardSheet.mergeCells(`E${profitAnalysisRow}:H${profitAnalysisRow}`);
      dashboardSheet.getCell(`E${profitAnalysisRow}`).value = '🏗️ 현장 운영 분석';
      dashboardSheet.getCell(`E${profitAnalysisRow}`).font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`E${profitAnalysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      dashboardSheet.getCell(`E${profitAnalysisRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`E${profitAnalysisRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      
      // 빈칸으로 두어 직접 입력할 수 있도록 함 (수익성 분석과 같은 레벨)
      rightRow = profitAnalysisRow + 1;
      for (let i = 0; i < 8; i++) {
        dashboardSheet.getCell(`E${rightRow}`).value = '';
        dashboardSheet.getCell(`F${rightRow}`).value = '';
        dashboardSheet.getCell(`G${rightRow}`).value = '';
        dashboardSheet.getCell(`H${rightRow}`).value = '';
        dashboardSheet.getRow(rightRow).height = 16;
        rightRow++;
      }
      
      currentRow += 2;
      
      // 전체 너비: 권장사항
      dashboardSheet.mergeCells(`A${currentRow}:I${currentRow}`);
      dashboardSheet.getCell(`A${currentRow}`).value = '💡 권장사항 및 개선점';
      dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      dashboardSheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5B8A' } };
      dashboardSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'center', vertical: 'middle' };
      dashboardSheet.getCell(`A${currentRow}`).border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };
      dashboardSheet.getRow(currentRow).height = 20;
      currentRow += 2;
      
      const recommendations = [];
      
      // 입금률 분석
      let paymentRate = totalGisung > 0 ? (totalPaid / totalGisung) * 100 : 0;
      if (paymentRate < 70) {
        recommendations.push('• 입금률이 낮습니다. 미수금 회수에 집중하세요.');
      } else if (paymentRate > 90) {
        recommendations.push('• 입금률이 양호합니다. 계속 유지하세요.');
      }
      
      // 수익성 분석
      const profitMargin = totalGisung > 0 ? (netProfit / totalGisung) * 100 : 0;
      if (profitMargin < 10) {
        recommendations.push('• 수익률이 낮습니다. 비용 절감을 검토하세요.');
      } else if (profitMargin > 20) {
        recommendations.push('• 수익률이 양호합니다. 안정적인 운영 상태입니다.');
      }
      
      // 자재비 비율 분석
      const materialRatioAnalysis = totalGisung > 0 ? (totalMaterial / totalGisung) * 100 : 0;
      if (materialRatioAnalysis > 50) {
        recommendations.push('• 자재비 비율이 높습니다. 자재비 절감 방안을 검토하세요.');
      }
      
      // 노무능률 분석 (복층과 강화의 평균)
      const avgLaborEfficiencyForRecommendation = laborEfficiency ? (laborEfficiency.복층 + laborEfficiency.강화) / 2 : 0;
      if (avgLaborEfficiencyForRecommendation < 50) {
        recommendations.push('• 노무능률이 낮습니다. 작업 효율성 개선이 필요합니다.');
      } else if (avgLaborEfficiencyForRecommendation > 80) {
        recommendations.push('• 노무능률이 양호합니다. 현재 수준을 유지하세요.');
      }
      
      // 작업 완료율 분석 (기성금 청구율로 대체)
      const workCompletionRate = totalGisung > 0 ? (totalPaid / totalGisung) * 100 : 0;
      if (workCompletionRate < 60) {
        recommendations.push('• 작업 완료율이 낮습니다. 일정 관리 강화가 필요합니다.');
      } else if (workCompletionRate > 90) {
        recommendations.push('• 작업 완료율이 우수합니다. 계속 유지하세요.');
      }
      
      if (recommendations.length === 0) {
        recommendations.push('• 전반적인 운영 상태가 양호합니다.');
      }
      
      recommendations.forEach((recommendation, index) => {
        dashboardSheet.getCell(`A${currentRow}`).value = recommendation;
        dashboardSheet.getCell(`A${currentRow}`).font = { name: '맑은 고딕', size: 9 };
        dashboardSheet.getCell(`A${currentRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
        dashboardSheet.getRow(currentRow).height = 16;
        currentRow++;
      });
      
      // 2. 현장 정보 시트
      const siteInfoSheet = workbook.addWorksheet('현장정보');
      siteInfoSheet.columns = [
        { width: 20 },
        { width: 30 }
      ];
      
      const siteInfoData = [
        ['현장명', site?.name || ''],
        ['계약금액', site?.contractAmount ? formatContractAmount(site.contractAmount) : '0원'],
        ['기성금액', formatGisungAmount(totalGisungAmount)],
        ['청구완료(미지급)', formatGisungAmount(totalClaimedUnpaidAmount)],
        ['총 지출', formatGisungAmount(totalCostAmount)],
        ['차액', formatBalanceAmount(totalGisungAmount - totalCostAmount)],
        ['총 공수', `${totalWorkers.toLocaleString()}명`],
        ['공사기간', `${site?.startDate || ''} ~ ${site?.endDate || ''}`],
        ['계약회사', site?.companyName || ''],
        ['현장소장', site?.manager || '']
      ];
      
      siteInfoData.forEach(([label, value], index) => {
        const row = index + 1;
        siteInfoSheet.getCell(`A${row}`).value = label;
        siteInfoSheet.getCell(`B${row}`).value = value;
        siteInfoSheet.getCell(`A${row}`).font = { name: '맑은 고딕', size: 11, bold: true };
        siteInfoSheet.getCell(`B${row}`).font = { name: '맑은 고딕', size: 11 };
        siteInfoSheet.getRow(row).height = 20;
      });
      
      // 3. 기성금 내역 시트
      const gisungSheet = workbook.addWorksheet('기성금내역');
      gisungSheet.columns = [
        { width: 15 }, // 기성일
        { width: 20 }, // 기성금액
        { width: 15 }, // 청구상태
        { width: 15 }, // 입금상태
        { width: 50 }  // 비고 (너비 늘림)
      ];
      
      // 헤더 추가
      const gisungHeaders = ['기성일', '기성금액', '청구상태', '입금상태', '비고'];
      gisungHeaders.forEach((header, index) => {
        const cell = gisungSheet.getCell(1, index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      gisungSheet.getRow(1).height = 25;
      
      // 데이터 추가 (날짜 기준 최신순 정렬)
      const sortedGisungData = gisungData
        .map(item => {
        const amount = item.gisungAmount ? formatGisungAmount(item.gisungAmount) : '0원';
        const paymentStatus = item.paymentStatus || '';
        const displayAmount = paymentStatus === '입금완료' ? amount : `${amount} (입금예정)`;
        const displayStatus = paymentStatus === '입금완료' ? '입금완료' : '입금예정';
        
          let originalDate;
          if (item.gisungMonth) {
            originalDate = new Date(item.gisungMonth + '-01');
          } else if (item.gisungDate) {
            originalDate = parseDate(item.gisungDate);
          } else {
            originalDate = new Date(0);
          }
          
          return {
            data: [
          item.gisungMonth ? item.gisungMonth.replace('-', '.') : (item.gisungDate ? formatDate(item.gisungDate) : ''),
          displayAmount,
          item.claimStatus || '',
          displayStatus,
          item.description || ''
            ],
            originalDate: originalDate
          };
        })
        .sort((a, b) => b.originalDate - a.originalDate);
      
      sortedGisungData.forEach((item, index) => {
        const row = index + 2;
        item.data.forEach((value, colIndex) => {
          const cell = gisungSheet.getCell(row, colIndex + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        gisungSheet.getRow(row).height = 20;
      });
      
      // 4. 지출 내역 시트
      const costSheet = workbook.addWorksheet('지출내역');
      costSheet.columns = [
        { width: 12 }, // 지출일
        { width: 12 }, // 항목
        { width: 20 }, // 세부항목
        { width: 8 },  // 수량
        { width: 12 }, // 단가
        { width: 15 }, // 금액
        { width: 8 },  // 차수
        { width: 50 }  // 비고 (너비 늘림)
      ];
      
      // 헤더 추가
      const costHeaders = ['지출일', '항목', '세부항목', '수량', '단가', '금액', '차수', '비고'];
      costHeaders.forEach((header, index) => {
        const cell = costSheet.getCell(1, index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      costSheet.getRow(1).height = 25;
      
      // 데이터 추가 (날짜 기준 최신순 정렬)
      const sortedCostData = costData
        .map(item => {
          const originalDate = item.date ? parseDate(item.date) : new Date(0);
          return {
            data: [
        formatDate(item.date),
        item.itemType || '',
        item.itemName || '',
        item.quantity || 0,
        item.unitPrice || 0,
        item.totalValue ? formatContractAmount(item.totalValue) : '0원',
        item.차수 || 1,
        item.description || ''
            ],
            originalDate: originalDate
          };
        })
        .sort((a, b) => b.originalDate - a.originalDate);
      
      sortedCostData.forEach((item, index) => {
        const row = index + 2;
        item.data.forEach((value, colIndex) => {
          const cell = costSheet.getCell(row, colIndex + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        costSheet.getRow(row).height = 20;
      });
      
      // 5. 자재비 내역 시트
      const materialSheet = workbook.addWorksheet('자재비내역');
      materialSheet.columns = [
        { width: 12 }, // 월
        { width: 20 }, // 항목
        { width: 20 }, // 업체
        { width: 15 }, // 금액
        { width: 8 },  // 차수
        { width: 50 }  // 비고 (너비 늘림)
      ];
      
      // 헤더 추가
      const materialHeaders = ['월', '항목', '업체', '금액', '차수', '비고'];
      materialHeaders.forEach((header, index) => {
        const cell = materialSheet.getCell(1, index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      materialSheet.getRow(1).height = 25;
      
      // 데이터 추가 (날짜 기준 최신순 정렬)
      const sortedMaterialData = materialData
        .map(item => {
          let originalDate;
          if (item.month) {
            const monthParts = item.month.split('.');
            if (monthParts.length === 2) {
              originalDate = new Date(parseInt(monthParts[0]), parseInt(monthParts[1]) - 1, 1);
            } else {
              originalDate = new Date(0);
            }
          } else {
            originalDate = new Date(0);
          }
          
          return {
            data: [
        item.month || '',
        item.item || '',
        item.company || '',
        item.amount ? formatContractAmount(item.amount) : '0원',
        item.차수 || 1,
        item.description || ''
            ],
            originalDate: originalDate
          };
        })
        .sort((a, b) => b.originalDate - a.originalDate);
      
      sortedMaterialData.forEach((item, index) => {
        const row = index + 2;
        item.data.forEach((value, colIndex) => {
          const cell = materialSheet.getCell(row, colIndex + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        materialSheet.getRow(row).height = 20;
      });
      
      // 6. 월별 정산 요약 시트
      const summarySheet = workbook.addWorksheet('월별정산요약');
      
      // 월별정산 섹션 위에 빈 줄 추가
      summarySheet.getRow(1).height = 15; // 빈 줄 높이
      summarySheet.columns = [
        { width: 12 }, // 월
        { width: 20 }, // 기성금(입금완료)
        { width: 20 }, // 기성금(입금예정)
        { width: 15 }, // 지출
        { width: 15 }, // 자재비
        { width: 15 }  // 수지
      ];
      
      // 헤더 추가
      const summaryHeaders = ['월', '기성금(입금완료)', '기성금(입금예정)', '지출', '자재비', '수지'];
      summaryHeaders.forEach((header, index) => {
        const cell = summarySheet.getCell(1, index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7030A0' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      summarySheet.getRow(1).height = 25;
      
      // 월별 데이터 추가
      const summaryMonths = new Set();
      gisungData.forEach(item => {
        if (item.gisungMonth) {
          const month = item.gisungMonth.replace('-', '.');
          summaryMonths.add(month);
        } else if (item.gisungDate) {
          const date = parseDate(item.gisungDate);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          summaryMonths.add(month);
        }
      });
      costData.forEach(item => {
        if (item.date) {
          const date = parseDate(item.date);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          summaryMonths.add(month);
        }
      });
      materialData.forEach(item => {
        if (item.month) {
          summaryMonths.add(item.month);
        }
      });
      
      const summarySortedMonths = Array.from(summaryMonths)
        .map(month => {
          const monthParts = month.split('.');
          const date = new Date(parseInt(monthParts[0]), parseInt(monthParts[1]) - 1, 1);
          return { month, date };
        })
        .sort((a, b) => b.date - a.date);
      
      summarySortedMonths.forEach((monthData, index) => {
        const month = monthData.month;
        const row = index + 2;
        
        const monthGisungData = gisungData.filter(item => {
          if (item.gisungMonth) {
            const itemMonth = item.gisungMonth.replace('-', '.');
            return itemMonth === month;
          } else if (item.gisungDate) {
            const date = parseDate(item.gisungDate);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          }
          return false;
        });
        
        const monthGisungPaid = monthGisungData
          .filter(item => item.paymentStatus === '입금완료')
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthGisungUnpaid = monthGisungData
          .filter(item => item.paymentStatus !== '입금완료')
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthCost = costData
          .filter(item => {
            if (!item.date) return false;
            const date = parseDate(item.date);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          })
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthMaterial = materialData
          .filter(item => {
            // materialData의 month 필드는 2025.09 형식이므로 직접 비교
            return item.month === month;
          })
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        const monthlyData = [
          month,
          formatGisungAmount(monthGisungPaid),
          formatGisungAmount(monthGisungUnpaid),
          formatContractAmount(monthCost),
          formatContractAmount(monthMaterial),
          formatContractAmount(monthGisungPaid + monthGisungUnpaid - monthCost - monthMaterial)
        ];
        
        monthlyData.forEach((value, colIndex) => {
          const cell = summarySheet.getCell(row, colIndex + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        summarySheet.getRow(row).height = 20;
      });
      
      // 7. 월별 정산 차트 시트 추가
      const chartSheet = workbook.addWorksheet('📊 월별정산차트');
      
      // 월별정산차트 섹션 위에 빈 줄 추가
      chartSheet.getRow(1).height = 15; // 빈 줄 높이
      
      // 월별 정산 추이 차트 데이터 준비
      const chartLabels = [];
      const paidData = [];
      const unpaidData = [];
      const costData2 = [];
      const materialData2 = [];
      
      summarySortedMonths.forEach(monthData => {
        const month = monthData.month;
        chartLabels.push(month);
        
        const monthGisungData = gisungData.filter(item => {
          if (item.gisungMonth) {
            const itemMonth = item.gisungMonth.replace('-', '.');
            return itemMonth === month;
          } else if (item.gisungDate) {
            const date = parseDate(item.gisungDate);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          }
          return false;
        });
        
        const monthGisungPaid = monthGisungData
          .filter(item => item.paymentStatus === '입금완료')
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthGisungUnpaid = monthGisungData
          .filter(item => item.paymentStatus !== '입금완료')
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthCost = costData
          .filter(item => {
            if (!item.date) return false;
            const date = parseDate(item.date);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          })
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthMaterial = materialData
          .filter(item => {
            // materialData의 month 필드는 2025.09 형식이므로 직접 비교
            return item.month === month;
          })
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        paidData.push(monthGisungPaid);
        unpaidData.push(monthGisungUnpaid);
        costData2.push(monthCost);
        materialData2.push(monthMaterial);
      });
      
      // 차트 데이터를 시트에 추가
      chartSheet.getCell('A1').value = '📊 월별 정산 추이 및 분석';
      chartSheet.getCell('A1').font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E5B8A' } };
      chartSheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
      chartSheet.getRow(1).height = 30;
      
      // 헤더 추가
      const chartHeaders = ['월', '기성금(입금완료)', '기성금(입금예정)', '지출', '자재비'];
      chartHeaders.forEach((header, index) => {
        const cell = chartSheet.getCell(3, index + 1);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      chartSheet.getRow(3).height = 25;
      
      // 데이터 추가
      chartLabels.forEach((month, index) => {
        const row = index + 4;
        const rowData = [month, paidData[index], unpaidData[index], costData2[index], materialData2[index]];
        
        rowData.forEach((value, colIndex) => {
          const cell = chartSheet.getCell(row, colIndex + 1);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        chartSheet.getRow(row).height = 20;
      });
      
      // 컬럼 너비 설정
      chartSheet.columns = [
        { width: 12 }, // 월
        { width: 20 }, // 기성금(입금완료)
        { width: 20 }, // 기성금(입금예정)
        { width: 15 }, // 지출
        { width: 15 }  // 자재비
      ];
      
      // 월별 정산 추이 차트 추가 (ExcelJS 차트 지원이 제한적이므로 차트 없이 데이터만 표시)
      // 차트 대신 요약 정보를 추가
      chartSheet.getCell('G2').value = '📊 월별 정산 요약';
      chartSheet.getCell('G2').font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell('G2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      chartSheet.getCell('G2').alignment = { horizontal: 'center', vertical: 'middle' };
      
      // 차트 데이터 요약 표
      const chartSummaryHeaders = ['항목', '총합', '평균', '최대값', '최소값'];
      chartSummaryHeaders.forEach((header, index) => {
        const cell = chartSheet.getCell(4, 7 + index);
        cell.value = header;
        cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } }
        };
      });
      
      // 요약 데이터 계산 및 추가
      const summaryData = [
        ['기성금(입금완료)', formatGisungAmount(paidData.reduce((sum, val) => sum + val, 0)), formatGisungAmount(paidData.reduce((sum, val) => sum + val, 0) / paidData.length), formatGisungAmount(Math.max(...paidData)), formatGisungAmount(Math.min(...paidData))],
        ['기성금(입금예정)', formatGisungAmount(unpaidData.reduce((sum, val) => sum + val, 0)), formatGisungAmount(unpaidData.reduce((sum, val) => sum + val, 0) / unpaidData.length), formatGisungAmount(Math.max(...unpaidData)), formatGisungAmount(Math.min(...unpaidData))],
        ['지출', formatContractAmount(costData2.reduce((sum, val) => sum + val, 0)), formatContractAmount(costData2.reduce((sum, val) => sum + val, 0) / costData2.length), formatContractAmount(Math.max(...costData2)), formatContractAmount(Math.min(...costData2))],
        ['자재비', formatContractAmount(materialData2.reduce((sum, val) => sum + val, 0)), formatContractAmount(materialData2.reduce((sum, val) => sum + val, 0) / materialData2.length), formatContractAmount(Math.max(...materialData2)), formatContractAmount(Math.min(...materialData2))]
      ];
      
      summaryData.forEach((rowData, rowIndex) => {
        const row = 5 + rowIndex;
        rowData.forEach((value, colIndex) => {
          const cell = chartSheet.getCell(row, 7 + colIndex);
          cell.value = value;
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        chartSheet.getRow(row).height = 20;
      });
      
      // === 차트 옆 분석박스 내용 추가 ===
      let analysisRow = 10;
      
      // 분석 제목
      chartSheet.getCell(`A${analysisRow}`).value = '📈 정산 분석';
      chartSheet.getCell(`A${analysisRow}`).font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(`A${analysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      chartSheet.getCell(`A${analysisRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      chartSheet.getRow(analysisRow).height = 25;
      analysisRow += 2;
      
      // 총 기성금 분석
      const totalPaid2 = paidData.reduce((sum, val) => sum + val, 0);
      const totalUnpaid2 = unpaidData.reduce((sum, val) => sum + val, 0);
      const totalGisung2 = totalPaid2 + totalUnpaid2;
      const totalCost2 = costData2.reduce((sum, val) => sum + val, 0);
      const totalMaterial2 = materialData2.reduce((sum, val) => sum + val, 0);
      const totalExpense2 = totalCost2 + totalMaterial2;
      const netProfit2 = totalGisung2 - totalExpense2;
      
      let analysisData = [
        ['항목', '금액', '비율', '분석'],
        ['총 기성금', formatGisungAmount(totalGisung2), '100%', '전체 수입'],
        ['  - 입금완료', formatGisungAmount(totalPaid2), `${((totalPaid2 / totalGisung2) * 100).toFixed(1)}%`, totalPaid2 > totalUnpaid2 ? '입금률 양호' : '입금률 개선 필요'],
        ['  - 입금예정', formatGisungAmount(totalUnpaid2), `${((totalUnpaid2 / totalGisung2) * 100).toFixed(1)}%`, totalUnpaid2 > 0 ? '미수금 존재' : '미수금 없음'],
        ['총 지출', formatContractAmount(totalExpense2), `${((totalExpense2 / totalGisung2) * 100).toFixed(1)}%`, totalExpense2 > totalGisung2 ? '손실 상태' : '수익 상태'],
        ['  - 일반지출', formatContractAmount(totalCost2), `${((totalCost2 / totalGisung2) * 100).toFixed(1)}%`, '운영비용'],
        ['  - 자재비', formatContractAmount(totalMaterial2), `${((totalMaterial2 / totalGisung2) * 100).toFixed(1)}%`, '자재비용'],
        ['순이익', formatGisungAmount(netProfit2), `${((netProfit2 / totalGisung2) * 100).toFixed(1)}%`, netProfit2 > 0 ? '수익성 양호' : '수익성 개선 필요']
      ];
      
      analysisData.forEach((rowData, rowIndex) => {
        const row = analysisRow + rowIndex;
        rowData.forEach((value, colIndex) => {
          const cell = chartSheet.getCell(row, colIndex + 1);
          cell.value = value;
          
          if (rowIndex === 0) {
            // 헤더 스타일
            cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            // 데이터 스타일
            cell.font = { name: '맑은 고딕', size: 9 };
            cell.alignment = { horizontal: colIndex === 0 ? 'left' : 'center', vertical: 'middle' };
            
            // 순이익 행은 특별 스타일
            if (rowIndex === analysisData.length - 1) {
              cell.font = { name: '맑은 고딕', size: 9, bold: true };
              if (netProfit > 0) {
                cell.font.color = { argb: 'FF00AA00' }; // 녹색
              } else {
                cell.font.color = { argb: 'FFFF0000' }; // 빨간색
              }
            }
          }
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        chartSheet.getRow(row).height = 18;
      });
      
      analysisRow += analysisData.length + 2;
      
      // 월별 트렌드 분석
      chartSheet.getCell(`A${analysisRow}`).value = '📊 월별 트렌드 분석';
      chartSheet.getCell(`A${analysisRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(`A${analysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      chartSheet.getCell(`A${analysisRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      chartSheet.getRow(analysisRow).height = 25;
      analysisRow += 2;
      
      // 최고/최저 월 분석
      const maxPaidMonth = chartLabels[paidData.indexOf(Math.max(...paidData))];
      const minPaidMonth = chartLabels[paidData.indexOf(Math.min(...paidData))];
      const maxCostMonth = chartLabels[costData2.indexOf(Math.max(...costData2))];
      const minCostMonth = chartLabels[costData2.indexOf(Math.min(...costData2))];
      
      const trendAnalysis = [
        ['구분', '월', '금액', '비고'],
        ['최고 수입월', maxPaidMonth, formatGisungAmount(Math.max(...paidData)), '기성금 입금 최고'],
        ['최저 수입월', minPaidMonth, formatGisungAmount(Math.min(...paidData)), '기성금 입금 최저'],
        ['최고 지출월', maxCostMonth, formatContractAmount(Math.max(...costData2)), '지출 최고'],
        ['최저 지출월', minCostMonth, formatContractAmount(Math.min(...costData2)), '지출 최저']
      ];
      
      trendAnalysis.forEach((rowData, rowIndex) => {
        const row = analysisRow + rowIndex;
        rowData.forEach((value, colIndex) => {
          const cell = chartSheet.getCell(row, colIndex + 1);
          cell.value = value;
          
          if (rowIndex === 0) {
            // 헤더 스타일
            cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            // 데이터 스타일
            cell.font = { name: '맑은 고딕', size: 9 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        chartSheet.getRow(row).height = 18;
      });
      
      analysisRow += 6; // trendAnalysis2는 4행 + 헤더 1행 + 여백 1행 = 6행
      
      // 권장사항
      chartSheet.getCell(`A${analysisRow}`).value = '💡 권장사항';
      chartSheet.getCell(`A${analysisRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(`A${analysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      chartSheet.getCell(`A${analysisRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      chartSheet.getRow(analysisRow).height = 25;
      analysisRow += 2;
      
      const recommendationsBlock5 = [];
      
      // 입금률 분석
      const paymentRate5 = (totalPaid / totalGisung) * 100;
      if (paymentRate5 < 70) {
        recommendationsBlock5.push('• 입금률이 낮습니다. 미수금 회수에 집중하세요.');
      } else if (paymentRate5 > 90) {
        recommendationsBlock5.push('• 입금률이 양호합니다. 계속 유지하세요.');
      }
      
      // 수익성 분석
      const profitMargin2 = (netProfit2 / totalGisung2) * 100;
      if (profitMargin2 < 10) {
        recommendationsBlock5.push('• 수익률이 낮습니다. 비용 절감을 검토하세요.');
      } else if (profitMargin2 > 20) {
        recommendationsBlock5.push('• 수익률이 양호합니다. 안정적인 운영 상태입니다.');
      }
      
      // 자재비 비율 분석
      {
        const materialRatio = (totalMaterial / totalGisung) * 100;
        if (materialRatio > 50) {
          recommendationsBlock5.push('• 자재비 비율이 높습니다. 자재비 절감 방안을 검토하세요.');
        }
      }
      
      // 지출 변동성 분석
      {
        const costVariance = Math.max(...costData2) - Math.min(...costData2);
        const avgCost = totalCost / costData2.length;
        const costVariability = (costVariance / avgCost) * 100;
        if (costVariability > 100) {
          recommendationsBlock5.push('• 지출 변동성이 큽니다. 예산 관리 강화가 필요합니다.');
        }
      }
      
      if (recommendationsBlock5.length === 0) {
        recommendationsBlock5.push('• 전반적인 운영 상태가 양호합니다.');
      }
      
      recommendationsBlock5.forEach((recommendation, index) => {
        const row = analysisRow + index;
        chartSheet.getCell(`A${row}`).value = recommendation;
        chartSheet.getCell(`A${row}`).font = { name: '맑은 고딕', size: 9 };
        chartSheet.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
        chartSheet.getRow(row).height = 18;
      });
      
      // 분석 내용 추가
      analysisRow = 10;
      
      // 분석 제목
      chartSheet.getCell(`A${analysisRow}`).value = '📈 정산 분석';
      chartSheet.getCell(`A${analysisRow}`).font = { name: '맑은 고딕', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(`A${analysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      chartSheet.getCell(`A${analysisRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      chartSheet.getRow(analysisRow).height = 25;
      analysisRow += 2;
      
      // 총 기성금 분석
      totalPaid = paidData.reduce((sum, val) => sum + val, 0);
      totalUnpaid = unpaidData.reduce((sum, val) => sum + val, 0);
      totalGisung = totalPaid + totalUnpaid;
      totalCost = costData2.reduce((sum, val) => sum + val, 0);
      totalMaterial = materialData2.reduce((sum, val) => sum + val, 0);
      totalExpense = totalCost + totalMaterial;
      netProfit = totalGisung - totalExpense;
      
      analysisData = [
        ['항목', '금액', '비율', '분석'],
        ['총 기성금', formatGisungAmount(totalGisung), '100%', '전체 수입'],
        ['  - 입금완료', formatGisungAmount(totalPaid), `${((totalPaid / totalGisung) * 100).toFixed(1)}%`, totalPaid > totalUnpaid ? '입금률 양호' : '입금률 개선 필요'],
        ['  - 입금예정', formatGisungAmount(totalUnpaid), `${((totalUnpaid / totalGisung) * 100).toFixed(1)}%`, totalUnpaid > 0 ? '미수금 존재' : '미수금 없음'],
        ['총 지출', formatContractAmount(totalExpense), `${((totalExpense / totalGisung) * 100).toFixed(1)}%`, totalExpense > totalGisung ? '손실 상태' : '수익 상태'],
        ['  - 일반지출', formatContractAmount(totalCost), `${((totalCost / totalGisung) * 100).toFixed(1)}%`, '운영비용'],
        ['  - 자재비', formatContractAmount(totalMaterial), `${((totalMaterial / totalGisung) * 100).toFixed(1)}%`, '자재비용'],
        ['순이익', formatGisungAmount(netProfit), `${((netProfit / totalGisung) * 100).toFixed(1)}%`, netProfit > 0 ? '수익성 양호' : '수익성 개선 필요']
      ];
      
      analysisData.forEach((rowData, rowIndex) => {
        const row = analysisRow + rowIndex;
        rowData.forEach((value, colIndex) => {
          const cell = chartSheet.getCell(row, 1 + colIndex);
          cell.value = value;
          
          if (rowIndex === 0) {
            // 헤더 스타일
            cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            // 데이터 스타일
            cell.font = { name: '맑은 고딕', size: 10 };
            cell.alignment = { horizontal: colIndex === 0 ? 'left' : 'center', vertical: 'middle' };
            
            // 순이익 행은 특별 스타일
            if (rowIndex === analysisData.length - 1) {
              cell.font = { name: '맑은 고딕', size: 10, bold: true };
              if (netProfit > 0) {
                cell.font.color = { argb: 'FF00AA00' }; // 녹색
              } else {
                cell.font.color = { argb: 'FFFF0000' }; // 빨간색
              }
            }
          }
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        chartSheet.getRow(row).height = 20;
      });
      
      analysisRow += analysisData.length + 2;
      
      // 월별 트렌드 분석
      chartSheet.getCell(`A${analysisRow}`).value = '📊 월별 트렌드 분석';
      chartSheet.getCell(`A${analysisRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(`A${analysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
      chartSheet.getCell(`A${analysisRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      chartSheet.getRow(analysisRow).height = 25;
      analysisRow += 2;
      
      // 최고/최저 월 분석
      const maxPaidMonth2 = chartLabels[paidData.indexOf(Math.max(...paidData))];
      const minPaidMonth2 = chartLabels[paidData.indexOf(Math.min(...paidData))];
      const maxCostMonth2 = chartLabels[costData2.indexOf(Math.max(...costData2))];
      const minCostMonth2 = chartLabels[costData2.indexOf(Math.min(...costData2))];
      
      const trendAnalysis2 = [
        ['구분', '월', '금액', '비고'],
        ['최고 수입월', maxPaidMonth2, formatGisungAmount(Math.max(...paidData)), '기성금 입금 최고'],
        ['최저 수입월', minPaidMonth2, formatGisungAmount(Math.min(...paidData)), '기성금 입금 최저'],
        ['최고 지출월', maxCostMonth2, formatContractAmount(Math.max(...costData2)), '지출 최고'],
        ['최저 지출월', minCostMonth2, formatContractAmount(Math.min(...costData2)), '지출 최저']
      ];
      
      trendAnalysis2.forEach((rowData, rowIndex) => {
        const row = analysisRow + rowIndex;
        rowData.forEach((value, colIndex) => {
          const cell = chartSheet.getCell(row, 1 + colIndex);
          cell.value = value;
          
          if (rowIndex === 0) {
            // 헤더 스타일
            cell.font = { name: '맑은 고딕', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          } else {
            // 데이터 스타일
            cell.font = { name: '맑은 고딕', size: 10 };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
          }
          
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF000000' } },
            bottom: { style: 'thin', color: { argb: 'FF000000' } },
            left: { style: 'thin', color: { argb: 'FF000000' } },
            right: { style: 'thin', color: { argb: 'FF000000' } }
          };
        });
        chartSheet.getRow(row).height = 20;
      });
      
      analysisRow += 6; // trendAnalysis2는 4행 + 헤더 1행 + 여백 1행 = 6행
      
      // 권장사항
      chartSheet.getCell(`A${analysisRow}`).value = '💡 권장사항';
      chartSheet.getCell(`A${analysisRow}`).font = { name: '맑은 고딕', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      chartSheet.getCell(`A${analysisRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      chartSheet.getCell(`A${analysisRow}`).alignment = { horizontal: 'left', vertical: 'middle' };
      chartSheet.getRow(analysisRow).height = 25;
      analysisRow += 2;
      
      {
        const recommendationsBlock2 = [];
        
        // 입금률 분석
        const paymentRate2 = (totalPaid2 / totalGisung2) * 100;
        if (paymentRate2 < 70) {
          recommendationsBlock2.push('• 입금률이 낮습니다. 미수금 회수에 집중하세요.');
        } else if (paymentRate2 > 90) {
          recommendationsBlock2.push('• 입금률이 양호합니다. 계속 유지하세요.');
        }
        
        // 수익성 분석
        const profitMargin2 = (netProfit2 / totalGisung2) * 100;
        if (profitMargin2 < 10) {
          recommendationsBlock2.push('• 수익률이 낮습니다. 비용 절감을 검토하세요.');
        } else if (profitMargin2 > 20) {
          recommendationsBlock2.push('• 수익률이 양호합니다. 안정적인 운영 상태입니다.');
        }
        
        // 자재비 비율 분석
        {
          const materialRatio = (totalMaterial2 / totalGisung2) * 100;
          if (materialRatio > 50) {
            recommendationsBlock2.push('• 자재비 비율이 높습니다. 자재비 절감 방안을 검토하세요.');
          }
        }
        
        // 지출 변동성 분석
        {
          const costVariance = Math.max(...costData2) - Math.min(...costData2);
          const avgCost = totalCost2 / costData2.length;
          const costVariability = (costVariance / avgCost) * 100;
          if (costVariability > 100) {
            recommendationsBlock2.push('• 지출 변동성이 큽니다. 예산 관리 강화가 필요합니다.');
          }
        }
        
        if (recommendationsBlock2.length === 0) {
          recommendationsBlock2.push('• 전반적인 운영 상태가 양호합니다.');
        }
        
        recommendationsBlock2.forEach((recommendation, index) => {
          const row = analysisRow + index;
          chartSheet.getCell(`A${row}`).value = recommendation;
          chartSheet.getCell(`A${row}`).font = { name: '맑은 고딕', size: 10 };
          chartSheet.getCell(`A${row}`).alignment = { horizontal: 'left', vertical: 'middle' };
          chartSheet.getRow(row).height = 20;
        });
      }
      
      // 파일 다운로드 (한국 시간 기준)
      const now = new Date();
      const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
      const todayStr = koreaTime.toISOString().substring(0, 10);
      const fileName = `${site?.name || '정산내역'}_${todayStr}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
      
      setSnackbar({
        open: true,
        message: '엑셀 파일이 다운로드되었습니다.',
        severity: 'success'
      });
      
    } catch (error) {
      console.error('엑셀 다운로드 오류:', error);
      setSnackbar({
        open: true,
        message: '엑셀 다운로드에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const showItemDetails = (itemType, title) => {
    setShowDetailBox(true); // 상세내역 박스 표시
    let items = [];
    
    if (itemType === 'equipment') {
      // 장비비를 세부 항목별로 나누어 표시
      const equipmentItems = costData.filter(item => ['지게차', '스카이', '곤도라'].includes(item.itemType));
      
      // 스카이
      const skyItems = equipmentItems.filter(item => item.itemType === '스카이').map(item => ({
        name: `스카이 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      // 곤도라
      const gondolaItems = equipmentItems.filter(item => item.itemType === '곤도라').map(item => ({
        name: `곤도라 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      // 지게차
      const forkliftItems = equipmentItems.filter(item => item.itemType === '지게차').map(item => ({
        name: `지게차 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      items = [...skyItems, ...gondolaItems, ...forkliftItems].sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
      });
    } else if (itemType === 'expense') {
      // 경비를 세부 항목별로 나누어 표시
      const expenseItems = costData.filter(item => ['월세', '임대료', '식대', '유류비'].includes(item.itemType));
      
      // 월세
      const rentItems = expenseItems.filter(item => item.itemType === '월세').map(item => ({
        name: `월세 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      // 임대료
      const rentalItems = expenseItems.filter(item => item.itemType === '임대료').map(item => ({
        name: `임대료 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      // 식대
      const mealItems = expenseItems.filter(item => item.itemType === '식대').map(item => ({
        name: `식대 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      // 유류비
      const fuelItems = expenseItems.filter(item => item.itemType === '유류비').map(item => ({
        name: `유류비 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      }));
      
      items = [...rentItems, ...rentalItems, ...mealItems, ...fuelItems].sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
      });
    } else if (itemType === 'subMaterial') {
      // 부자재비는 기성관리 데이터에서 가져오기
      const subMaterialItems = [];
      
      // gisungData에서 부자재 항목들 찾기
      gisungData.forEach(gisung => {
        if (gisung.items && Array.isArray(gisung.items)) {
          gisung.items.forEach(item => {
            if (item.itemType === '부자재') {
              subMaterialItems.push({
                name: `${item.itemName || '부자재'} (${gisung.gisungNumber}차)`,
                amount: Number(item.amount) || 0,
                date: gisung.gisungDate ? formatDate(gisung.gisungDate) : '-',
                originalDate: gisung.gisungDate, // 원본 날짜도 저장
                type: '부자재',
                description: item.description || item.remark || '-'
              });
            }
          });
        }
      });
      
      // costData에서도 부자재 항목들 찾기 (세분화 표시)
      const costSubMaterialItems = costData.filter(item => item.itemType === '부자재').map(item => {
        const subMaterialDetail = item.subMaterialDetail || '기타';
        console.log('부자재비 데이터 생성:', {
          itemName: item.itemName,
          subMaterialDetail: subMaterialDetail,
          originalDate: item.date,
          formattedDate: formatDate(item.date)
        });
        return {
          name: `${item.itemName || '부자재'} - ${subMaterialDetail}${item.차수 ? ` (${item.차수}차)` : ''}`,
          amount: Number(item.totalValue) || 0,
          date: formatDate(item.date),
          originalDate: item.date, // 원본 날짜도 저장
          type: '부자재',
          subType: subMaterialDetail, // 세부 타입 추가
          description: item.description || '-'
        };
      });
      
      // 부자재비 세부 타입별로 그룹화
      const groupedSubMaterialItems = {};
      
      // costData의 부자재 항목들을 세부 타입별로 그룹화
      costSubMaterialItems.forEach(item => {
        const subType = item.subType || '기타';
        if (!groupedSubMaterialItems[subType]) {
          groupedSubMaterialItems[subType] = [];
        }
        groupedSubMaterialItems[subType].push(item);
      });
      
      // gisungData의 부자재 항목들도 기타로 분류
      if (subMaterialItems.length > 0) {
        if (!groupedSubMaterialItems['기타']) {
          groupedSubMaterialItems['기타'] = [];
        }
        groupedSubMaterialItems['기타'].push(...subMaterialItems);
      }
      
      // 세부 타입별로 정렬하여 표시
      const subMaterialTypes = ['웨더실란트', '일반실란트', '구조용실란트', '노턴테이프', '기타'];
      items = [];
      
      subMaterialTypes.forEach(subType => {
        if (groupedSubMaterialItems[subType] && groupedSubMaterialItems[subType].length > 0) {
          // 각 세부 타입별로 정렬
          const sortedItems = groupedSubMaterialItems[subType].sort((a, b) => {
            const dateA = parseDate(a.date);
            const dateB = parseDate(b.date);
            return dateB - dateA;
          });
          
          // 세부 타입 총계만 표시 (클릭 가능)
          items.push({
            name: subType,
            amount: sortedItems.reduce((sum, item) => sum + item.amount, 0),
            date: `${sortedItems.length}건`,
            type: 'header',
            subType: subType,
            items: sortedItems, // 세부 아이템들을 items 속성에 저장
            clickable: true // 클릭 가능 표시
          });
        }
      });
    } else {
      // 기타 항목들은 기존 로직 사용
      items = costData.filter(item => {
        const type = item.itemType;
        switch (itemType) {
          case 'labor':
            return type === '노무비';
          case 'material':
            return false; // 자재비는 별도 입력용이므로 데이터 없음
          case 'other':
            return ['기타', 'RnD'].includes(type) || !['노무비', '자재비', '부자재', '지게차', '스카이', '곤도라', '월세', '임대료', '식대', '유류비'].includes(type);
          default:
            return false;
        }
      }).map(item => ({
        name: `${item.itemName || (item.itemType === '노무비' ? '노무비' : '필름')}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: formatDate(item.date),
        originalDate: item.date, // 원본 날짜도 저장
        type: item.itemType || '-'
      })).sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        return dateB - dateA;
      });
    }

    setDetailDialog({
      open: true,
      title: title,
      items: items
    });
  };

  // 차트 데이터 검증
  const hasData = useMemo(() => {
    if (!site) return false;
    return true; // 기본적으로 true로 설정
  }, [site]);

  // 차트 라벨 생성 (공수 정보 포함) - chartData와 동일한 데이터 사용
  const chartLabels = useMemo(() => {
    if (!site) return [];

    // 공사기간 월별 데이터 생성
    const startDate = parseDate(site.startDate);
    const endDate = parseDate(site.endDate);
    const months = [];
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const labels = months.map(date => 
      `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`
    );

    // chartData에서 사용하는 것과 동일한 workersByMonth 계산
    const workersByMonth = {};
    
    // costData에서 공수 정보 가져오기 (chartData와 동일한 로직)
    costData.forEach(item => {
      if (item.month) {
        const monthKey = item.month;
        const workers = Number(item.workers) || 0;
        if (!workersByMonth[monthKey]) workersByMonth[monthKey] = 0;
        workersByMonth[monthKey] += workers;
      }
    });
    
    // scheduleData에서 공수 정보 가져오기 (chartData와 동일한 로직)
    scheduleData.forEach(schedule => {
      if (schedule.date) {
        const date = parseDate(schedule.date);
        const monthKey = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const manpower = extractManpowerFromDescription(schedule.desc || '');
        
        if (!workersByMonth[monthKey]) workersByMonth[monthKey] = 0;
        workersByMonth[monthKey] += manpower;
      }
    });
    
    console.log('chartLabels - workersByMonth (chartData와 동일):', workersByMonth);

    // 차트 라벨을 한 줄로 구성 (월/년 + 공수 정보)
    const result = labels.map((label, index) => {
      const workers = workersByMonth[label] || 0;
      console.log(`chartLabels - ${label}: ${workers}명`);
      return `${label}(${workers}명)`;
    });

    console.log('chartLabels 생성됨 (한 줄, 공수 포함):', result);
    return result;
  }, [site, scheduleData, costData]);


  // 차트 데이터 생성 (메모이제이션으로 불필요한 재렌더링 방지)
  const chartData = useMemo(() => {
    if (!site) return null;

    // 공사기간 월별 데이터 생성
    const startDate = parseDate(site.startDate);
    const endDate = parseDate(site.endDate);
    const months = [];
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (currentDate <= endDate) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const labels = months.map(date => 
      `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`
    );

    // 월별 기성금 데이터 (전체)
    const gisungByMonth = {};
    
    gisungData.forEach(item => {
      console.log('기성금 항목:', item);
      // gisungMonth 필드 사용 (예: '2025-07')
      if (item.gisungMonth && item.gisungAmount) {
        // gisungMonth를 차트 라벨 형식으로 변환 (2025-07 -> 2025.07)
        const monthKey = item.gisungMonth.replace('-', '.');
        const amount = Number(item.gisungAmount) || 0;
        
        // 전체 기성금
        if (!gisungByMonth[monthKey]) {
          gisungByMonth[monthKey] = 0;
        }
        gisungByMonth[monthKey] += amount;
        
        console.log('기성금 추가됨:', { monthKey, amount: item.gisungAmount, paymentStatus: item.paymentStatus });
      } else if (item.gisungDate) {
        // gisungDate가 있는 경우 월별로 변환
        const date = parseDate(item.gisungDate);
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          const amount = Number(item.gisungAmount) || 0;
          
          if (!gisungByMonth[monthKey]) {
            gisungByMonth[monthKey] = 0;
          }
          gisungByMonth[monthKey] += amount;
          
          console.log('기성금 추가됨 (gisungDate):', { monthKey, amount: item.gisungAmount, gisungDate: item.gisungDate });
        }
      }
    });
    
    console.log('차트용 기성금 데이터:', gisungByMonth);
    console.log('기성금 원본 데이터:', gisungData);

    // 월별 지출 데이터를 항목별로 분리
    const laborByMonth = {}; // 노무비
    const materialByMonth = {}; // 자재비 (materialData에서)
    const expenseByMonth = {}; // 경비
    const subMaterialByMonth = {}; // 부자재비 (분리)
    const equipmentByMonth = {}; // 장비비 (분리)
    const otherByMonth = {}; // 기타 지출
    const workersByMonth = {}; // 월별 공수
    
    // 자재비 데이터 처리 (materialData에서)
    materialData.forEach(item => {
      if (item.month) {
        const monthKey = item.month; // 이미 'YYYY.MM' 형식
        const amount = Number(item.amount) || 0;
        
        if (!materialByMonth[monthKey]) materialByMonth[monthKey] = 0;
        materialByMonth[monthKey] += amount;
      }
    });
    
    // 기성관리 데이터에서 부자재비 추출
    gisungData.forEach(gisung => {
      if (gisung.gisungMonth && gisung.items && Array.isArray(gisung.items)) {
        const monthKey = gisung.gisungMonth.replace('-', '.');
        
        gisung.items.forEach(item => {
          if (item.itemType === '부자재' && item.amount) {
            const amount = Number(item.amount) || 0;
            if (!subMaterialByMonth[monthKey]) subMaterialByMonth[monthKey] = 0;
            subMaterialByMonth[monthKey] += amount;
          }
        });
      }
    });
    
    costData.forEach(item => {
      if (item.date) {
        const date = parseDate(item.date);
        console.log('지출 항목 날짜 파싱:', { originalDate: item.date, parsedDate: date, isValid: !isNaN(date.getTime()) });
        
        if (!isNaN(date.getTime())) {
          const monthKey = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          const amount = Number(item.totalValue) || 0;
          
          console.log('지출 항목 처리:', { monthKey, amount, itemType: item.itemType, originalDate: item.date });
          
          if (item.itemType === '노무비') {
            if (!laborByMonth[monthKey]) laborByMonth[monthKey] = 0;
            laborByMonth[monthKey] += amount;
            
            // 공수 데이터 추가
            const workers = Number(item.workers) || 0;
            if (!workersByMonth[monthKey]) workersByMonth[monthKey] = 0;
            workersByMonth[monthKey] += workers;
          } else if (item.itemType === '경비' || item.itemType === '월세') {
            // 경비 및 월세 처리
            if (!expenseByMonth[monthKey]) expenseByMonth[monthKey] = 0;
            expenseByMonth[monthKey] += amount;
          } else if (item.itemType === '부자재') {
            // 부자재비 분리
            if (!subMaterialByMonth[monthKey]) subMaterialByMonth[monthKey] = 0;
            subMaterialByMonth[monthKey] += amount;
          } else if (['지게차', '스카이', '곤도라'].includes(item.itemType)) {
            // 장비비 분리
            if (!equipmentByMonth[monthKey]) equipmentByMonth[monthKey] = 0;
            equipmentByMonth[monthKey] += amount;
          } else {
            // 기타 지출
            if (!otherByMonth[monthKey]) otherByMonth[monthKey] = 0;
            otherByMonth[monthKey] += amount;
          }
        }
      }
    });
    
    // 일정 데이터에서 월별 공수 계산
    scheduleData.forEach(schedule => {
      if (schedule.date) {
        const date = parseDate(schedule.date);
        const monthKey = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const manpower = extractManpowerFromDescription(schedule.desc || '');
        
        if (!workersByMonth[monthKey]) workersByMonth[monthKey] = 0;
        workersByMonth[monthKey] += manpower;
      }
    });
    
    console.log('차트용 노무비 데이터:', laborByMonth);
    console.log('차트용 자재비 데이터:', materialByMonth);
    console.log('차트용 경비 데이터:', expenseByMonth);
    console.log('차트용 부자재비 데이터:', subMaterialByMonth);
    console.log('차트용 장비비 데이터:', equipmentByMonth);
    console.log('차트용 기타 지출 데이터:', otherByMonth);
    console.log('차트용 월별 공수 데이터 (chartData):', workersByMonth);
    console.log('일정 데이터:', scheduleData);
    console.log('costData:', costData);

    const gisungValues = labels.map(label => gisungByMonth[label] || 0);
    const laborValues = labels.map(label => laborByMonth[label] || 0);
    const materialValues = labels.map(label => materialByMonth[label] || 0);
    const expenseValues = labels.map(label => expenseByMonth[label] || 0);
    const subMaterialValues = labels.map(label => subMaterialByMonth[label] || 0);
    const equipmentValues = labels.map(label => equipmentByMonth[label] || 0);
    const otherValues = labels.map(label => otherByMonth[label] || 0);
    const workersValues = labels.map(label => workersByMonth[label] || 0);
    
    // 부자재비, 장비비, 기타 데이터가 있는지 확인
    const hasSubMaterialData = subMaterialValues.some(value => value > 0);
    const hasEquipmentData = equipmentValues.some(value => value > 0);
    const hasOtherData = otherValues.some(value => value > 0);
    
    console.log('월별 공수 값들:', workersValues);
    console.log('부자재비 값들:', subMaterialValues);
    console.log('장비비 값들:', equipmentValues);
    
    // 지출 총합계 계산 (노무비 + 자재비 + 경비 + 부자재비 + 장비비 + 기타지출)
    const totalCostValues = labels.map((label, index) => 
      (laborValues[index] || 0) + (materialValues[index] || 0) + (expenseValues[index] || 0) + 
      (subMaterialValues[index] || 0) + (equipmentValues[index] || 0) + (otherValues[index] || 0)
    );

    console.log('최종 차트 라벨:', chartLabels);

    console.log('차트 라벨:', chartLabels);
    console.log('기성금 값들:', gisungValues);
    console.log('노무비 값들:', laborValues);
    console.log('자재비 값들:', materialValues);
    console.log('경비 값들:', expenseValues);
    console.log('기타 지출 값들:', otherValues);
    console.log('월별 공수 값들:', workersValues);
    console.log('지출 총합계 값들:', totalCostValues);
    
    // 차트 데이터 검증 - 라벨이 있으면 차트 표시
    const hasData = labels.length > 0;
    console.log('=== 차트 데이터 검증 ===');
    console.log('차트에 데이터가 있는가?', hasData);
    console.log('라벨 개수:', labels.length);
    console.log('라벨 목록:', labels);
    console.log('기성금 데이터 상세:', gisungByMonth);
    console.log('노무비 데이터 상세:', laborByMonth);
    console.log('자재비 데이터 상세:', materialByMonth);
    console.log('경비 데이터 상세:', expenseByMonth);
    console.log('부자재비 데이터 상세:', subMaterialByMonth);
    console.log('장비비 데이터 상세:', equipmentByMonth);
    console.log('기타 지출 데이터 상세:', otherByMonth);
    console.log('월별 공수 데이터 상세:', workersByMonth);
    console.log('기성금 값들:', gisungValues);
    console.log('노무비 값들:', laborValues);
    console.log('자재비 값들:', materialValues);
    console.log('경비 값들:', expenseValues);
    console.log('부자재비 값들:', subMaterialValues);
    console.log('장비비 값들:', equipmentValues);
    console.log('기타 지출 값들:', otherValues);
    console.log('월별 공수 값들:', workersValues);
    console.log('지출 총합계 값들:', totalCostValues);
    console.log('최대 기성금 값:', Math.max(...gisungValues, 0));
    console.log('최대 지출 값:', Math.max(...totalCostValues, 0));
    console.log('==================');
    console.log('최대 지출 값:', Math.max(...totalCostValues));

    // Recharts 형식으로 데이터 변환
    const chartDataArray = chartLabels.map((label, index) => ({
      month: label,
      기성금: gisungValues[index] || 0,
      지출총합계: totalCostValues[index] || 0,
      노무비: laborValues[index] || 0,
      자재비: materialValues[index] || 0,
      경비: expenseValues[index] || 0,
      ...(hasSubMaterialData && { 부자재비: subMaterialValues[index] || 0 }),
      ...(hasEquipmentData && { 장비비: equipmentValues[index] || 0 }),
      ...(hasOtherData && { 기타: otherValues[index] || 0 }),
      공수: workersValues[index] || 0
    }));

    return {
      data: chartDataArray,
      hasSubMaterialData,
      hasEquipmentData,
      hasOtherData
    };
  }, [site, gisungData, costData, materialData, scheduleData, chartLabels]);

  // Chart.js 옵션 제거됨 - Recharts 사용


  // 정산 페이지 삭제
  const handleDeleteSettlement = async () => {
    try {
      // sites 컬렉션에서 정산 관련 필드 업데이트
      await updateDoc(doc(db, 'sites', siteId), {
        settlementEnabled: false,
        settlementPageCreated: false,
        settlementUpdatedAt: new Date()
      });

      // settlements 컬렉션에서 해당 현장 데이터 삭제
      const settlementsQuery = query(
        collection(db, 'settlements'),
        where('siteId', '==', siteId)
      );
      const settlementsSnapshot = await getDocs(settlementsQuery);
      
      for (const docSnapshot of settlementsSnapshot.docs) {
        await deleteDoc(doc(db, 'settlements', docSnapshot.id));
      }

      setSnackbar({
        open: true,
        message: '정산 페이지가 삭제되었습니다.',
        severity: 'success'
      });

      navigate('/importantsite');
    } catch (error) {
      console.error('정산 페이지 삭제 오류:', error);
      setSnackbar({
        open: true,
        message: '정산 페이지 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const today = new Date();
  const todayString = `${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`;

  // 인증되지 않은 경우
  if (!isAuthenticated) {
    return (
      <Box sx={{ 
        backgroundColor: '#1a1a1a', 
        minHeight: '100vh',
        color: 'white',
        p: 3,
        paddingTop: '64px',
        textAlign: 'center'
      }}>
        <Typography variant="h4" sx={{ color: '#ff9800', mb: 2 }}>
          정산페이지 접근 인증
        </Typography>
        <Typography>인증이 필요합니다.</Typography>
        
        {/* 정산페이지 비밀번호 입력 다이얼로그 */}
        <Dialog 
          open={showPasswordDialog} 
          maxWidth="sm" 
          fullWidth
          onClose={handlePasswordDialogClose}
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
            정산페이지 접근
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <Typography variant="body1" sx={{ color: '#bbb', textAlign: 'center', mb: 2 }}>
                정산페이지에 접근하려면 비밀번호를 입력하세요.
              </Typography>
              <TextField
                type="password"
                label="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!passwordError}
                helperText={passwordError}
                fullWidth
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
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
              onClick={handlePasswordDialogClose}
              sx={{ color: '#bbb' }}
            >
              취소
            </Button>
            <Button 
              onClick={handlePasswordSubmit}
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
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#1a1d21'
      }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!site) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        bgcolor: '#1a1d21',
        color: '#fff'
      }}>
        <Typography variant="h5">현장 정보를 찾을 수 없습니다.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)', // 헤더 아래부터 하단바 위까지
      bgcolor: '#1a1d21', 
      color: '#fff',
      pb: 2,
      pt: 8,  // 64px 아래로 이동
      overflow: 'hidden' // 스크롤 방지
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        bgcolor: '#232b3b', 
        height: '60px', // 높이 줄임
        p: { xs: 0.5, md: 1 }, // 패딩 더 줄임
        mb: { xs: 1, md: 1.5 }, // 아이패드에서 마진 줄임
        borderBottom: '2px solid #333',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/importantsite')}
              sx={{ 
                color: '#90caf9',
                '&:hover': { bgcolor: '#333' }
              }}
            >
              뒤로가기
            </Button>
            {/* 데스크톱용 전체 제목 */}
            <Typography variant="h5" sx={{ 
              fontWeight: 'bold', 
              color: '#fff',
              display: { xs: 'none', md: 'block' },
              mb: 1,
              // 아이패드에서 제목을 10px 아래로 내림
              '@media (min-width: 768px) and (max-width: 1024px)': {
                marginTop: '10px'
              }
            }}>
              {site.name}_{todayString} 기준 정산내역
            </Typography>
            {/* 아이패드용 짧은 제목 */}
            <Typography variant="h6" sx={{ 
              fontWeight: 'bold', 
              color: '#fff',
              display: { xs: 'block', md: 'none' },
              mb: 1,
              // 아이패드에서 제목을 10px 아래로 내림
              '@media (min-width: 768px) and (max-width: 1024px)': {
                marginTop: '10px'
              }
            }}>
              {site.name}_{todayString} 기준
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={<AttachMoneyIcon />}
              label="정산관리" 
              color="primary" 
              variant="outlined"
              onClick={() => navigate('/settlement')}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { 
                  bgcolor: 'rgba(25, 118, 210, 0.1)',
                  borderColor: '#1976d2'
                }
              }}
            />
            <Button
              startIcon={<DownloadIcon />}
              onClick={handleExcelDownload}
              variant="contained"
              sx={{ 
                bgcolor: '#4caf50',
                '&:hover': { bgcolor: '#45a049' }
              }}
            >
              EXCEL
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialog({ open: true, siteId, siteName: site.name })}
              sx={{ 
                color: '#f44336',
                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' }
              }}
            >
              삭제
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 모든 내용을 한 페이지에 배치 */}
      <Box sx={{ 
        px: 3,
        // 아이패드에서 전체 화면을 10px 위로 올림
        '@media (min-width: 768px) and (max-width: 1024px)': {
          marginTop: '-10px'
        }
      }}>
        {/* 현장정보, 물량내역, 정산내역, 지출정보를 한 줄에 배치 */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* 현장정보 */}
          <Grid item xs={12} md={showQuantityExpanded ? 2 : 3}>
            <Card sx={{ 
              bgcolor: '#232b3b', 
              color: '#fff', 
              height: { xs: '350px', md: '320px' } // 높이 조정
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#43e97b', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon /> 현장정보
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setShowQuantityExpanded(!showQuantityExpanded)}
                    sx={{
                      color: '#90caf9',
                      borderColor: '#90caf9',
                      fontSize: '0.7rem',
                      px: 1,
                      py: 0.5,
                      '&:hover': {
                        borderColor: '#64b5f6',
                        color: '#64b5f6'
                      }
                    }}
                  >
                    📋 물량내역 {showQuantityExpanded ? '접기' : '펼치기'}
                  </Button>
                </Box>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 1.5,
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    gap: 0.8
                  }
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>현장명:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.name}</Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>회사명:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.companyName || site.company || '-'}</Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>계약금액:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#43e97b',
                      whiteSpace: 'nowrap' // 아이패드에서 숫자와 원이 한 줄에 나오도록
                    }}>
                      {formatContractAmount(site.contractAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>공사기간:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {site.startDate} ~ {site.endDate}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>현장장:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.manager || '-'}</Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>계약유형:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.contractType || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{ color: '#bbb' }}>물량진행률:</Typography>
                      <Chip 
                        label={quantityCalculationMode === 'cumulative' ? '차수더하기' : '최신물량적용'}
                        size="small"
                        sx={{ 
                          height: '16px', 
                          fontSize: '0.55rem',
                          bgcolor: quantityCalculationMode === 'cumulative' ? '#43e97b' : '#ff9800',
                          color: '#fff'
                        }}
                      />
                    </Box>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: getQuantityPercentage() > 0 ? '#43e97b' : '#888'
                    }}>
                      {getQuantityPercentage()}%
                    </Typography>
                  </Box>
                  
                  
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 물량 내역 카드 - 조건부 표시 */}
          {showQuantityExpanded && (
            <Grid item xs={12} md={6}>
            <Card sx={{ 
              bgcolor: '#232b3b', 
              color: '#fff', 
              height: { xs: '350px', md: '320px' }, // 높이 조정
              width: '100%' 
            }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#90caf9', display: 'flex', alignItems: 'center', gap: 1 }}>
                    📋 물량 내역 ({allQuantityData.length}개)
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#999' }}>
                      물량 산출방식:
                    </Typography>
                    <Tooltip title="항목별 차수 더하기 - 모든 차수의 물량을 더한 누적 합계로 계산" placement="top">
                      <Button
                        size="small"
                        variant={quantityCalculationMode === 'cumulative' ? 'contained' : 'outlined'}
                        onClick={() => handleCalculationModeChange('cumulative')}
                        sx={{
                          fontSize: '0.65rem',
                          minWidth: '80px',
                          height: '24px',
                          color: quantityCalculationMode === 'cumulative' ? '#fff' : '#90caf9',
                          borderColor: '#90caf9',
                          bgcolor: quantityCalculationMode === 'cumulative' ? '#90caf9' : 'transparent',
                          '&:hover': {
                            bgcolor: quantityCalculationMode === 'cumulative' ? '#64b5f6' : 'rgba(144, 202, 249, 0.1)'
                          }
                        }}
                      >
                        항목별 차수 더하기
                      </Button>
                    </Tooltip>
                    <Tooltip title="항목별 최신 물량 적용 - 가장 최근에 입력된 물량 데이터만 사용" placement="top">
                      <Button
                        size="small"
                        variant={quantityCalculationMode === 'latest' ? 'contained' : 'outlined'}
                        onClick={() => handleCalculationModeChange('latest')}
                        sx={{
                          fontSize: '0.65rem',
                          minWidth: '80px',
                          height: '24px',
                          color: quantityCalculationMode === 'latest' ? '#fff' : '#90caf9',
                          borderColor: '#90caf9',
                          bgcolor: quantityCalculationMode === 'latest' ? '#90caf9' : 'transparent',
                          '&:hover': {
                            bgcolor: quantityCalculationMode === 'latest' ? '#64b5f6' : 'rgba(144, 202, 249, 0.1)'
                          }
                        }}
                      >
                        항목별 최신 물량 적용
                      </Button>
                    </Tooltip>
                  </Box>
                </Box>
                {allQuantityData.length > 0 ? (
                  <Box sx={{ 
                    height: '300px',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    ...scrollbarHiddenStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.8,
                    // 추가 스크롤바 숨기기 스타일
                    '&::-webkit-scrollbar': {
                      display: 'none',
                      width: 0,
                      height: 0
                    },
                    '&::-webkit-scrollbar-track': {
                      display: 'none'
                    },
                    '&::-webkit-scrollbar-thumb': {
                      display: 'none'
                    },
                    '-ms-overflow-style': 'none',
                    'scrollbar-width': 'none'
                  }}>
                    {allQuantityData.map((item, index) => (
                      <Box key={index} sx={{ 
                        p: 1, 
                        bgcolor: '#1a1d21', 
                        borderRadius: 1,
                        border: '1px solid #333',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#90caf9',
                          transform: 'translateY(-1px)',
                          boxShadow: '0 2px 8px rgba(144, 202, 249, 0.2)'
                        }
                      }}>
                        {/* 품목명과 규격을 한 줄에 배치 */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.3 }}>
                          <Typography sx={{ 
                            color: '#fff', 
                            fontSize: '0.9rem', 
                            fontWeight: 'bold',
                            lineHeight: 1.1
                          }}>
                            {hideGlassWords(item.name)}
                          </Typography>
                          {item.specification && (
                            <Typography sx={{ 
                              color: '#bbb', 
                              fontSize: '0.8rem',
                              lineHeight: 1.1
                            }}>
                              📏 {item.specification}
                            </Typography>
                          )}
                        </Box>
                        
                        {/* 전체, 실물량, 잔여를 한 줄에 배치 */}
                        {(() => {
                          const remainingInfo = getRemainingQuantity(item.name, item.specification);
                          return (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.2 }}>
                              <Typography sx={{ color: '#90caf9', fontSize: '0.9rem' }}>
                                {item.source === '실물량' ? '실물량' : '전체'}: {item.quantity.toLocaleString()} {item.unit}
                              </Typography>
                              {item.source === '현장관리페이지' && remainingInfo && remainingInfo.used > 0 && (
                                <>
                                  <Typography sx={{ color: '#43e97b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                    실물량: {remainingInfo.used.toLocaleString()} {remainingInfo.unit}
                                  </Typography>
                                  <Typography sx={{ 
                                    color: remainingInfo.remaining > 0 ? '#f44336' : '#666', 
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold'
                                  }}>
                                    잔여: {remainingInfo.remaining.toLocaleString()} {remainingInfo.unit}
                                  </Typography>
                                </>
                              )}
                            </Box>
                          );
                        })()}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '200px',
                    color: '#666'
                  }}>
                    <Typography sx={{ fontSize: '0.9rem', fontStyle: 'italic' }}>
                      등록된 물량이 없습니다
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
            </Grid>
          )}

          {/* 순수익정보 - 아이패드에서 가로 절반 차지 */}
          <Grid item xs={6} md={showQuantityExpanded ? 4 : 4}>
            <Card sx={{ 
              bgcolor: '#232b3b', 
              color: '#fff', 
              height: { xs: '350px', md: '320px' }, // 높이 조정
              width: { xs: '100%', md: '290px' } // 아이패드에서 전체 너비 사용
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#ff9800', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon /> 정산내역
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: 1.5,
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    gap: 0.8
                  }
                }}>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>기성금:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#43e97b', 
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap' // 아이패드에서 숫자와 원이 한 줄에 나오도록
                    }}>
                      {formatGisungAmount(totalGisungAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>청구완료(미지급):</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#ff9800', 
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap' // 아이패드에서 숫자와 원이 한 줄에 나오도록
                    }}>
                      {formatGisungAmount(totalClaimedUnpaidAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>총 지출:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#f44336', 
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap' // 아이패드에서 숫자와 원이 한 줄에 나오도록
                    }}>
                      {formatGisungAmount(totalCostAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>차액:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      fontSize: '1.1rem',
                      color: (totalGisungAmount - totalCostAmount) >= 0 ? '#43e97b' : '#f44336',
                      whiteSpace: 'nowrap' // 아이패드에서 숫자와 원이 한 줄에 나오도록
                    }}>
                      {formatBalanceAmount(totalGisungAmount - totalCostAmount)}
                    </Typography>
                  </Box>
                  <Divider sx={{ bgcolor: '#333', my: 1 }} />
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' }, // 아이패드에서 세로 배치
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb' }}>안전관리비:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#ff9800', 
                      fontSize: '1.1rem',
                      whiteSpace: 'nowrap' // 아이패드에서 숫자와 원이 한 줄에 나오도록
                    }}>
                      {formatGisungAmount(totalSafetyAmount)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 지출정보 - 아이패드에서 가로 절반 차지 */}
          <Grid item xs={6} md={4}>
            {/* 지출정보 */}
            <Card sx={{ 
              bgcolor: '#232b3b', 
              color: '#fff', 
              height: { xs: '350px', md: '320px' }, // 높이 조정
              width: { xs: '100%', md: '260px' } // 아이패드에서 전체 너비 사용
            }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#f44336', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDownIcon /> 지출정보
                    </Typography>
                    <Box sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 0.5,
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        gap: 0.3
                      }
                    }}>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: '#333' }
                        }}
                        onClick={() => showMaterialDetails()}
                      >
                        <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>자재비:</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {formatGisungAmount(costBreakdown.material)}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: '#333' }
                        }}
                        onClick={() => showItemDetails('labor', '노무비')}
                      >
                        <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>노무비:</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {formatGisungAmount(costBreakdown.labor)}
                        </Typography>
                      </Box>
                      <Box sx={{ pl: 1, pb: 0.5, textAlign: 'right' }}>
                        <Typography sx={{ color: '#999', fontSize: '1rem', fontWeight: 'bold' }}>
                          (총 공수: {totalWorkers.toLocaleString()}명)
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: '#333' }
                        }}
                        onClick={() => showItemDetails('subMaterial', '부자재비')}
                      >
                        <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>부자재비:</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {formatGisungAmount(costBreakdown.subMaterial)}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: '#333' }
                        }}
                        onClick={() => showItemDetails('equipment', '장비비')}
                      >
                        <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>장비비:</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {formatGisungAmount(costBreakdown.equipment)}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: '#333' }
                        }}
                        onClick={() => showItemDetails('expense', '경비')}
                      >
                        <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>경비:</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {formatGisungAmount(costBreakdown.expense)}
                        </Typography>
                      </Box>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          cursor: 'pointer',
                          p: 0.5,
                          borderRadius: 1,
                          '&:hover': { bgcolor: '#333' }
                        }}
                        onClick={() => showItemDetails('other', '기타')}
                      >
                        <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>기타:</Typography>
                        <Typography sx={{ fontWeight: 'bold', fontSize: '1rem' }}>
                          {formatGisungAmount(costBreakdown.other)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
          </Grid>

          {/* 상세내역 - 조건부 표시 */}
          {showDetailBox && (
            <Grid item xs={12} md={8}>
              <Grid container spacing={2}>
                {/* 기존 상세내역 */}
                <Grid item xs={12} md={8}>
                  <Box sx={{ 
                    bgcolor: '#232b3b', 
                    color: '#fff', 
                    height: '100%', 
                    width: '100%',
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid #333',
                    ...scrollbarHiddenStyle
                  }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" sx={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDownIcon /> {detailDialog.title}
                    </Typography>
                    {detailDialog.title === '자재비' && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => {
                          resetMaterialForm();
                          setMaterialDialog({ open: true });
                        }}
                        sx={{
                          bgcolor: '#43e97b',
                          color: '#000',
                          '&:hover': { bgcolor: '#35d16a' }
                        }}
                      >
                        추가
                      </Button>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: '238px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                    {detailDialog.items.length > 0 ? (
                      detailDialog.title.includes('장비비') ? (
                        // 장비비는 세부 항목별로 가로 배치
                        <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
                          {detailDialog.items.filter(item => item.name.includes('스카이')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                스카이 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('스카이')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('스카이')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('스카이 - ', '')} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('곤도라')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                곤도라 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('곤도라')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('곤도라')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('곤도라 - ', '')} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('지게차')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '200px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                지게차 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('지게차')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('지게차')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('지게차 - ', '')} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                        </Box>
                     ) : detailDialog.title.includes('부자재비') ? (
                       // 부자재비는 세부 타입별로 그룹화하여 표시 (클릭으로 확장/축소)
                       <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
                         {/* 왼쪽: 부자재비 세부 타입 목록 */}
                         <Box sx={{ flex: 1, minWidth: '300px' }}>
                           <Box sx={{ maxHeight: '280px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                              {detailDialog.items.map((item, index) => {
                          // 헤더 항목인 경우 (클릭 가능)
                          if (item.type === 'header') {
                            const isExpanded = expandedSubMaterial[item.subType] || false;
                            return (
                              <Box key={index}>
                                <Box sx={{ 
                                        bgcolor: isExpanded ? '#333' : '#444', 
                                  borderRadius: 1, 
                                  p: 0.5, 
                                  mb: 1,
                                        border: isExpanded ? '2px solid #ff4444' : '1px solid #666',
                                  cursor: 'pointer',
                                  '&:hover': { bgcolor: '#555' }
                                }}
                                      onClick={() => {
                                        // 한 번에 한 항목만 선택되도록 다른 항목들은 모두 false로 설정
                                        const newExpanded = {};
                                        if (!isExpanded) {
                                          newExpanded[item.subType] = true;
                                        }
                                        setExpandedSubMaterial(newExpanded);
                                      }}>
                                  <Typography sx={{ 
                                          color: isExpanded ? '#ff4444' : '#43e97b', 
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                  }}>
                                          {item.name}
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                      <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                      <span style={{ color: '#bbb', fontSize: '0.9rem' }}>{formatDate(item.date)}</span>
                                    </Box>
                                  </Typography>
                                </Box>
                                    </Box>
                                  );
                                }
                                
                                // 일반 항목인 경우 (이제는 표시되지 않음)
                                return null;
                              })}
                            </Box>
                          </Box>
                          
                          {/* 오른쪽: 선택된 세부 항목의 상세 내용 */}
                          {Object.keys(expandedSubMaterial).some(key => expandedSubMaterial[key]) && (
                            <Box sx={{ flex: 1, minWidth: '300px' }}>
                              <Box sx={{ maxHeight: '320px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {Object.entries(expandedSubMaterial).map(([subType, isExpanded]) => {
                                  if (!isExpanded) return null;
                                  
                                  const subTypeItems = detailDialog.items.filter(item => 
                                    item.type === 'header' && item.subType === subType
                                  );
                                  
                                  return subTypeItems.map((item, itemIndex) => (
                                    <Box key={`${subType}-${itemIndex}`}>
                                      {item.items && item.items.map((subItem, subIndex) => {
                                  const dateToUse = subItem.originalDate || subItem.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={subIndex} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.2,
                                            mb: 0.2,
                                            lineHeight: 1.1
                                    }}>
                                            {subItem.name.replace(/^부자재\s*-\s*/, '')} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(subItem.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                                  ));
                                })}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      ) : detailDialog.title.includes('자재비') ? (
                        // 자재비도 세부 항목별로 가로 배치
                        <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
                          {detailDialog.items.filter(item => item.name.includes('복층')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '330px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                복층 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('복층')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('복층')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {cleanCompanyName(item.name.replace('복층 - ', ''))} ({item.차수}차) {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('강화')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '330px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                강화 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('강화')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('강화')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {cleanCompanyName(item.name.replace('강화 - ', ''))} ({item.차수}차) {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('접합')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '330px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                접합 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('접합')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('접합')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {cleanCompanyName(item.name.replace('접합 - ', ''))} ({item.차수}차) {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('기타')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '330px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                기타 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('기타')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('기타')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {cleanCompanyName(item.name.replace('기타 - ', ''))} ({item.차수}차) {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      ) : detailDialog.title.includes('경비') ? (
                        // 경비도 세부 항목별로 가로 배치
                        <Box sx={{ display: 'flex', gap: 2, height: '100%' }}>
                          {detailDialog.items.filter(item => item.name.includes('월세')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '150px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                월세 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('월세')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('월세')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('월세 - ', '')} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('임대료')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '150px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                임대료 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('임대료')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('임대료')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('임대료 - ', '')} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('식대')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '150px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                식대 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('식대')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('식대')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('식대 - ', '')} {year}.{month} &nbsp; {formatGisungAmount(item.amount)}
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                          {detailDialog.items.filter(item => item.name.includes('유류비')).length > 0 && (
                            <Box sx={{ flex: 1, minWidth: '150px' }}>
                              <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                                유류비 [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.filter(item => item.name.includes('유류비')).reduce((sum, item) => sum + item.amount, 0))}</span>]
                              </Typography>
                              <Box sx={{ maxHeight: '250px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                                {detailDialog.items.filter(item => item.name.includes('유류비')).map((item, index) => {
                                  const dateToUse = item.originalDate || item.date;
                                  const date = parseDate(dateToUse);
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  return (
                                    <Typography key={index} sx={{ 
                                      color: '#fff', 
                                      fontSize: '1rem',
                                      p: 0.5,
                                      bgcolor: '#333',
                                      borderRadius: 1,
                                      mb: 0.5
                                    }}>
                                      {item.name.replace('유류비 - ', '')} {year}.{month} &nbsp; {formatGisungAmount(item.amount)}
                                    </Typography>
                                  );
                                })}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        // 기타 항목들은 기존 방식
                        <>
                          {detailDialog.items.length > 0 && (
                            <Typography sx={{ color: '#fff', fontSize: '1rem', fontWeight: 'bold', mb: 1 }}>
                              {detailDialog.title} [<span style={{ color: '#ff4444' }}>{formatGisungAmount(detailDialog.items.reduce((sum, item) => sum + item.amount, 0))}</span>]
                            </Typography>
                          )}
                                {detailDialog.items.map((item, index) => {
                            const dateToUse = item.originalDate || item.date;
                            const date = parseDate(dateToUse);
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            return (
                              <Typography key={index} sx={{ 
                                color: '#fff', 
                                fontSize: '1rem',
                                p: 0.5,
                                bgcolor: '#333',
                                borderRadius: 1,
                                mb: 0.5
                              }}>
                                {item.name} {year}.{month} &nbsp; <span style={{ color: '#ff4444' }}>{formatGisungAmount(item.amount)}</span>
                              </Typography>
                            );
                          })}
                        </>
                      )
                    ) : (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '200px',
                        color: '#bbb'
                      }}>
                        <Typography>항목을 클릭하여 상세내역을 확인하세요</Typography>
                      </Box>
                    )}
                  </Box>
                  </Box>
                </Grid>
                
              </Grid>
            </Grid>
          )}
        </Grid>



        {/* 차트분석과 노무능률 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          width: '100%', 
          pr: 2,
          // 테블릿에서 간격 줄임
          '@media (min-width: 768px) and (max-width: 1024px)': {
            gap: 1
          }
        }}>
          {/* 차트분석 (75%) */}
          <Card sx={{ 
            bgcolor: isChartLightMode ? '#ffffff' : '#232b3b', 
            color: isChartLightMode ? '#333' : '#fff', 
            flex: { xs: '0 0 100%', sm: '0 0 100%', md: '0 0 75%' },
            minWidth: { xs: '400px', sm: '400px', md: 'auto' }
          }}>
            <CardContent sx={{ width: '100%' }}>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3,
                // 테블릿에서 마진 줄임
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  mb: 1.5
                }
              }}>
                <Typography variant="h6" sx={{ color: isChartLightMode ? '#000' : '#43e97b' }}>
                  월별 기성금 및 지출 추이 분석
                </Typography>
                <Tooltip title={isChartLightMode ? "다크모드로 변경" : "화이트모드로 변경"}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setIsChartLightMode(!isChartLightMode)}
                    startIcon={isChartLightMode ? <DarkModeIcon /> : <LightModeIcon />}
                    sx={{
                      borderColor: '#43e97b',
                      color: '#43e97b',
                      '&:hover': {
                        borderColor: '#43e97b',
                        backgroundColor: 'rgba(67, 233, 123, 0.1)'
                      }
                    }}
                  >
                    {isChartLightMode ? '다크모드' : '화이트모드'}
                  </Button>
                </Tooltip>
              </Box>
              {chartData?.data && hasData ? (
                <Box sx={{ 
                  height: '400px', 
                  width: { xs: '300px', sm: '300px', md: '100%' },
                  minWidth: { xs: '300px', sm: '300px', md: 'auto' },
                  // 차트와 라벨을 10px 올림
                  marginTop: '-10px',
                  // 아이패드 최적화
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    height: '300px'
                  },
                  touchAction: 'manipulation',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  // 하드웨어 가속 활성화
                  transform: 'translateZ(0)',
                  willChange: 'transform',
                  // 아이패드에서 차트가 더 잘 보이도록 추가 스타일
                  position: 'relative',
                  // 테블릿에서 높이 줄임
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    height: '380px'
                  },
                  overflow: 'visible',
                  // 아이패드에서 그래프선이 더 선명하게 보이도록
                  '& canvas': {
                    imageRendering: 'crisp-edges, -webkit-crisp-edges, pixelated'
                  }
                }}>
                  {console.log('차트 렌더링 중 - chartData:', chartData)}
                  
                  {/* 범례를 차트 위에 별도로 표시 */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'nowrap', 
                    gap: 4, 
                    mb: 4, 
                    justifyContent: 'center',
                    color: isChartLightMode ? '#000' : '#fff',
                    overflowX: 'hidden',
                    // 테블릿에서 범례 크기와 간격 줄임
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      gap: 1,
                      mb: 1,
                      flexWrap: 'nowrap',
                      overflowX: 'hidden',
                      paddingBottom: 0
                    }
                  }}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexShrink: 0,
                      // 테블릿에서 간격 줄임
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        gap: 1
                      }
                    }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 5, 
                        bgcolor: '#43e97b',
                        flexShrink: 0,
                        // 테블릿에서 크기 줄임
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          width: 20,
                          height: 2
                        }
                      }} />
                      <Typography variant="h6" sx={{ 
                        fontSize: '18px', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        // 테블릿에서 폰트 크기 줄임
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          fontSize: '10px'
                        }
                      }}>기성금</Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexShrink: 0,
                      '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                    }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 5, 
                        bgcolor: '#f44336',
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { width: 20, height: 2 }
                      }} />
                      <Typography variant="h6" sx={{ 
                        fontSize: '18px', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '10px' }
                      }}>지출총합계</Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexShrink: 0,
                      '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                    }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 5, 
                        background: 'repeating-linear-gradient(to right, #00bcd4 0px, #00bcd4 8px, transparent 8px, transparent 12px)',
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { width: 20, height: 2 }
                      }} />
                      <Typography variant="h6" sx={{ 
                        fontSize: '18px', 
                        fontWeight: 600, 
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '10px' }
                      }}>노무비</Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexShrink: 0,
                      '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                    }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 5, 
                        background: 'repeating-linear-gradient(to right, #9c27b0 0px, #9c27b0 8px, transparent 8px, transparent 12px)',
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { width: 20, height: 2 }
                      }} />
                      <Typography variant="h6" sx={{ 
                        fontSize: '18px', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '10px' }
                      }}>자재비</Typography>
                    </Box>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexShrink: 0,
                      '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                    }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 5, 
                        background: 'repeating-linear-gradient(to right, #ff5722 0px, #ff5722 8px, transparent 8px, transparent 12px)',
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { width: 20, height: 2 }
                      }} />
                      <Typography variant="h6" sx={{ 
                        fontSize: '18px', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '10px' }
                      }}>경비</Typography>
                    </Box>
                    {chartData.hasSubMaterialData && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                      }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 5, 
                          background: 'repeating-linear-gradient(to right, #ff9800 0px, #ff9800 8px, transparent 8px, transparent 12px)',
                          flexShrink: 0,
                          '@media (min-width: 768px) and (max-width: 1024px)': { width: 25, height: 3 }
                        }} />
                        <Typography variant="h6" sx={{ 
                          fontSize: '18px', 
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '12px' }
                        }}>부자재비</Typography>
                      </Box>
                    )}
                    {chartData.hasEquipmentData && (
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2,
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                      }}>
                        <Box sx={{ 
                          width: 40, 
                          height: 5, 
                          background: 'repeating-linear-gradient(to right, #ffeb3b 0px, #ffeb3b 8px, transparent 8px, transparent 12px)',
                          flexShrink: 0,
                          '@media (min-width: 768px) and (max-width: 1024px)': { width: 25, height: 3 }
                        }} />
                        <Typography variant="h6" sx={{ 
                          fontSize: '18px', 
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '12px' }
                        }}>장비비</Typography>
                      </Box>
                    )}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexShrink: 0,
                      '@media (min-width: 768px) and (max-width: 1024px)': { gap: 1 }
                    }}>
                      <Box sx={{ 
                        width: 40, 
                        height: 5, 
                        background: 'repeating-linear-gradient(to right, #607d8b 0px, #607d8b 8px, transparent 8px, transparent 12px)',
                        flexShrink: 0,
                        '@media (min-width: 768px) and (max-width: 1024px)': { width: 25, height: 3 }
                      }} />
                      <Typography variant="h6" sx={{ 
                        fontSize: '18px', 
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        '@media (min-width: 768px) and (max-width: 1024px)': { fontSize: '12px' }
                      }}>기타</Typography>
                    </Box>
                  </Box>
                  
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isChartLightMode ? '#e0e0e0' : '#333'} />
                      <XAxis 
                        dataKey="month" 
                        stroke={isChartLightMode ? '#000' : '#fff'}
                        fontSize={16}
                        height={80}
                        interval={0}
                        tick={(props) => {
                          const { x, y, payload } = props;
                          const value = payload.value;
                          const parts = value.split('(');
                          const month = parts[0];
                          const workers = parts[1] ? parts[1].replace(')', '') : '';
                          
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text 
                                x={0} 
                                y={0} 
                                dy={16} 
                                textAnchor="middle" 
                                fill={isChartLightMode ? '#000' : '#fff'} 
                                fontSize="15"
                              >
                                {month}
                              </text>
                              <text 
                                x={0} 
                                y={0} 
                                dy={32} 
                                textAnchor="middle" 
                                fill="#00bcd4" 
                                fontSize="16"
                              >
                                ({workers})
                              </text>
                            </g>
                          );
                        }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke={isChartLightMode ? '#000' : '#bbb'}
                        fontSize={12}
                        tickCount={5}
                        tickFormatter={(value) => {
                          if (value >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M';
                          } else if (value >= 1000) {
                            return (value / 1000).toFixed(0) + 'K';
                          } else {
                            return value.toString();
                          }
                        }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="#00bcd4"
                        fontSize={12}
                        tickCount={5}
                        tickFormatter={(value) => value + '명'}
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: isChartLightMode ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.9)',
                          color: isChartLightMode ? '#000' : '#fff',
                          border: '2px solid #43e97b',
                          borderRadius: '8px'
                        }}
                        formatter={(value, name) => {
                          if (name === '공수') {
                            return [`${value}명`, name];
                          } else {
                            const formatAmount = (amount) => {
                              if (amount === 0) return '0원';
                              const eok = Math.floor(amount / 100000000);
                              const cheon = Math.floor((amount % 100000000) / 10000000);
                              const baek = Math.floor((amount % 10000000) / 1000000);
                              const man = Math.floor((amount % 1000000) / 10000);
                              
                              let result = '';
                              if (eok > 0) {
                                result += `${eok}억`;
                                if (cheon > 0) result += `${cheon}천`;
                                if (baek > 0) result += `${baek}백`;
                                if (man > 0) result += `${man}만`;
                                return result + '원';
                              } else if (cheon > 0) {
                                result += `${cheon}천`;
                                if (baek > 0) result += `${baek}백`;
                                if (man > 0) result += `${man}만`;
                                return result + '원';
                              } else if (baek > 0) {
                                result += `${baek}백`;
                                if (man > 0) result += `${man}만`;
                                return result + '원';
                              } else if (man > 0) {
                                return `${man}만원`;
                              } else {
                                return '0원';
                              }
                            };
                            return [formatAmount(value), name];
                          }
                        }}
                      />
                      <Bar 
                        yAxisId="right"
                        dataKey="공수" 
                        fill="#00bcd4" 
                        fillOpacity={0.3}
                        radius={[2, 2, 0, 0]}
                        maxBarSize={40}
                      />
                      <Line 
                        yAxisId="left"
                        dataKey="기성금" 
                        stroke="#43e97b" 
                        strokeWidth={4}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                      <Line 
                        yAxisId="left"
                        dataKey="지출총합계" 
                        stroke="#f44336" 
                        strokeWidth={4}
                        dot={{ r: 6 }}
                        activeDot={{ r: 8 }}
                      />
                      <Line 
                        yAxisId="left"
                        dataKey="노무비" 
                        stroke="#00bcd4" 
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        yAxisId="left"
                        dataKey="자재비" 
                        stroke="#9c27b0" 
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        yAxisId="left"
                        dataKey="경비" 
                        stroke="#ff5722" 
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      {chartData.hasSubMaterialData && (
                        <Line 
                          yAxisId="left"
                          dataKey="부자재비" 
                          stroke="#ff9800" 
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                      {chartData.hasEquipmentData && (
                        <Line 
                          yAxisId="left"
                          dataKey="장비비" 
                          stroke="#ffeb3b" 
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                      {chartData.hasOtherData && (
                        <Line 
                          yAxisId="left"
                          dataKey="기타" 
                          stroke="#607d8b" 
                          strokeWidth={2}
                          strokeDasharray="5 3"
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ 
                  height: '400px', 
                  width: '100%',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: isChartLightMode ? '#f5f5f5' : '#333',
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    height: '300px'
                  },
                  borderRadius: 2
                }}>
                  <Typography sx={{ color: isChartLightMode ? '#666' : '#bbb' }}>
                    {console.log('차트 데이터 없음 - site:', site, 'gisungData:', gisungData.length, 'costData:', costData.length, 'materialData:', materialData.length)}
                    차트 데이터를 불러오는 중... (기성금: {gisungData.length}개, 지출: {costData.length}개, 자재비: {materialData.length}개)
                    <br />
                    {chartData?.data ? '차트 데이터는 있지만 렌더링 중...' : '차트 데이터가 없습니다.'}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
          
          {/* 노무 능률 (25%) */}
          <Card sx={{ 
            bgcolor: '#232b3b', 
            color: '#fff', 
            flex: { xs: '0 0 100%', sm: '0 0 100%', md: '0 0 25%' }
          }}>
            <CardContent sx={{
              // 테블릿에서 패딩 줄임
              '@media (min-width: 768px) and (max-width: 1024px)': {
                p: 1.5
              }
            }}>
              <Typography variant="h6" sx={{ 
                mb: 1, 
                color: '#43e97b', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1
              }}>
                <TrendingUpIcon sx={{
                  // 테블릿에서 아이콘만 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  }
                }} /> 분석 <span style={{ color: '#fff' }}>({projectPeriod.startDate ? projectPeriod.startDate.replace(/-/g, '.').substring(2) : '데이터 로딩중...'}~{projectPeriod.endDate ? projectPeriod.endDate.replace(/-/g, '.').substring(2) : '데이터 로딩중...'})</span>
              </Typography>
              
              {/* 총 일수 및 총 공수 */}
              <Box sx={{ 
                bgcolor: '#1a1d21', 
                p: 1.2, 
                borderRadius: 1, 
                mb: 0.8,
                border: '1px solid #333',
                // 테블릿에서 패딩과 마진 줄임
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  p: 1,
                  mb: 0.5
                }
              }}>
                <Typography sx={{ 
                  color: '#fff', 
                  fontSize: '1.3rem', 
                  fontWeight: 'bold',
                  textAlign: 'center',
                  lineHeight: 1.2,
                  // 테블릿에서 폰트 크기 줄임
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    fontSize: '1.1rem'
                  }
                }}>
                  총 <span style={{ color: '#ff4444' }}>{projectPeriod.totalDays || 0}</span>일&nbsp;&nbsp;&nbsp;<span style={{ color: '#ff4444' }}>({projectPeriod.totalWorkers || 0})</span>공수
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1.5,
                // 테블릿에서 간격 줄임
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  gap: 1
                }
              }}>
                
                {/* 노무자 1명 기준 평균 물량 */}
                <Box sx={{ mt: 0.5 }}>
                  <Typography sx={{ 
                    color: '#43e97b', 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    mb: 1
                  }}>
                    노무자 1명 기준 평균물량
                  </Typography>
                  
                  {/* 복층 (노무자 기준) */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 },
                    mb: 0.5
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>복층:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#ffeb3b',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {laborEfficiency ? laborEfficiency.복층.toFixed(1) : '0.0'}
                      <span style={{ color: '#fff', fontSize: '0.9em' }}> (M²/명)</span>
                    </Typography>
                  </Box>
                  
                  {/* 강화 (노무자 기준) */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>강화:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#ffeb3b',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {laborEfficiency ? laborEfficiency.강화.toFixed(1) : '0.0'}
                      <span style={{ color: '#fff', fontSize: '0.9em' }}> (M²/명)</span>
                    </Typography>
                  </Box>
                </Box>
                
                {/* 일일 기준 평균 물량 */}
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ 
                    color: '#43e97b', 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    mb: 1
                  }}>
                    일일 기준 평균물량
                  </Typography>
                  
                  {/* 복층 (일일 기준) */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 },
                    mb: 0.5
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>복층:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#9c27b0',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {dailyLaborEfficiency ? dailyLaborEfficiency.복층.toFixed(1) : '0.0'}
                      <span style={{ color: '#fff', fontSize: '0.9em' }}> (M²/일)</span>
                    </Typography>
                  </Box>
                  
                  {/* 강화 (일일 기준) */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>강화:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: '#9c27b0',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {dailyLaborEfficiency ? dailyLaborEfficiency.강화.toFixed(1) : '0.0'}
                      <span style={{ color: '#fff', fontSize: '0.9em' }}> (M²/일)</span>
                    </Typography>
                  </Box>
                </Box>
                
                {/* 물량대비 주요 부자재 양 */}
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ 
                    color: '#43e97b', 
                    fontSize: '1.1rem', 
                    fontWeight: 'bold',
                    mb: 1
                  }}>
                    물량대비 주요 부자재 양
                  </Typography>
                  
                  {/* 구조용 */}
                  {(() => {
                    console.log('UI에서 구조용 값 확인:', {
                      'subMaterialUsage.구조용': subMaterialUsage.구조용,
                      'subMaterialUsage.구조용.복층': subMaterialUsage.구조용.복층,
                      '조건 > 0': subMaterialUsage.구조용.복층 > 0,
                      '조건 === -1': subMaterialUsage.구조용.복층 === -1,
                      '조건 === -2': subMaterialUsage.구조용.복층 === -2
                    });
                    return null;
                  })()}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 },
                    mb: 0.5
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>구조용(커튼월 1m²당):</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: subMaterialUsage.구조용.복층 > 0 ? '#ff9800' : subMaterialUsage.구조용.복층 === -1 ? '#ffa726' : subMaterialUsage.구조용.복층 === -2 ? '#ff5722' : '#ff6b6b',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {subMaterialUsage.구조용.복층 > 0 ? `${subMaterialUsage.구조용.복층.toFixed(2)}EA` : subMaterialUsage.구조용.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.구조용.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'}
                    </Typography>
                  </Box>
                  
                  {/* 웨더 */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 },
                    mb: 0.5
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>웨더(커튼월 1m²당):</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: subMaterialUsage.웨더.복층 > 0 ? '#ff9800' : subMaterialUsage.웨더.복층 === -1 ? '#ffa726' : subMaterialUsage.웨더.복층 === -2 ? '#ff5722' : '#ff6b6b',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {subMaterialUsage.웨더.복층 > 0 ? `${subMaterialUsage.웨더.복층.toFixed(2)}EA` : subMaterialUsage.웨더.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.웨더.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'}
                    </Typography>
                  </Box>
                  
                  {/* 일반 */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 },
                    mb: 0.5
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>일반(강화 1m²당):</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: subMaterialUsage.일반.강화 > 0 ? '#ff9800' : subMaterialUsage.일반.강화 === -1 ? '#ffa726' : subMaterialUsage.일반.강화 === -2 ? '#ff5722' : '#ff6b6b',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {subMaterialUsage.일반.강화 > 0 ? `${subMaterialUsage.일반.강화.toFixed(2)}EA` : subMaterialUsage.일반.강화 === -1 ? '물량 데이터 없음' : subMaterialUsage.일반.강화 === -2 ? '부자재 데이터 없음' : '데이터 없음'}
                    </Typography>
                  </Box>
                  
                  {/* 노턴테이프 */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: { xs: 'column', md: 'row' },
                    justifyContent: { xs: 'flex-start', md: 'space-between' }, 
                    alignItems: { xs: 'flex-start', md: 'center' },
                    gap: { xs: 0.5, md: 0 }
                  }}>
                    <Typography sx={{ color: '#bbb', fontSize: '1rem' }}>노턴테이프(1m²당):</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      color: subMaterialUsage.노턴테이프.복층 > 0 ? '#ff9800' : subMaterialUsage.노턴테이프.복층 === -1 ? '#ffa726' : subMaterialUsage.노턴테이프.복층 === -2 ? '#ff5722' : '#ff6b6b',
                      whiteSpace: 'nowrap',
                      fontSize: '1.1rem'
                    }}>
                      {subMaterialUsage.노턴테이프.복층 > 0 ? `${subMaterialUsage.노턴테이프.복층.toFixed(2)}EA` : subMaterialUsage.노턴테이프.복층 === -1 ? '물량 데이터 없음' : subMaterialUsage.노턴테이프.복층 === -2 ? '부자재 데이터 없음' : '데이터 없음'}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* 정산 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, siteId: null, siteName: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ 
          bgcolor: '#1a1d21', 
          color: '#fff', 
          borderBottom: '1px solid #333',
          fontSize: '1.2rem',
          fontWeight: 600
        }}>
          정산 페이지 삭제
        </DialogTitle>
        <DialogContent sx={{ 
          bgcolor: '#1a1d21', 
          color: '#fff',
          p: 3,
          ...scrollbarHiddenStyle
        }}>
          <Typography sx={{ mb: 2, fontSize: '1rem' }}>
            <strong>{deleteDialog.siteName}</strong> 현장의 정산 페이지를 삭제하시겠습니까?
          </Typography>
          <Typography sx={{ mb: 2, color: '#bbb', fontSize: '0.9rem' }}>
            삭제된 정산 페이지는 복구할 수 없습니다.
          </Typography>
          <Alert severity="warning" sx={{ bgcolor: '#232b3b', color: '#ff9800' }}>
            정산 토글을 OFF로 설정하여 정산 페이지를 비활성화할 수 있습니다.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ 
          bgcolor: '#1a1d21', 
          borderTop: '1px solid #333',
          p: 2
        }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, siteId: null, siteName: '' })}
            sx={{ 
              color: '#bbb',
              '&:hover': { bgcolor: '#333' }
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleDeleteSettlement}
            variant="contained"
            sx={{ 
              bgcolor: '#f44336',
              color: '#fff',
              fontWeight: 600,
              '&:hover': { bgcolor: '#d32f2f' }
            }}
          >
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 자재비 관리 다이얼로그 */}
      <Dialog
        open={materialDialog.open}
        onClose={() => {
          setMaterialDialog({ open: false });
          resetMaterialForm();
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#232b3b',
            color: '#fff',
            borderRadius: 2,
            maxHeight: '80vh',
            height: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ color: '#43e97b', display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoneyIcon /> {editingMaterial ? '자재비 관리' : '자재비 관리'}
        </DialogTitle>
        <DialogContent sx={scrollbarHiddenStyle}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>
              {editingMaterial ? `자재비 수정 (${editingMaterial.차수 || editingMaterial.sequence || '0'}차)` : '자재비 추가'}
            </Typography>

            <Grid container spacing={2}>
              {/* 품목 (원래 방식) */}
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#bbb' }}>품목</InputLabel>
                  <Select
                    value={materialForm.item}
                    onChange={(e) => setMaterialForm({...materialForm, item: e.target.value})}
                    sx={{
                      color: '#fff',
                      width: '100px',
                      minWidth: '100px',
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center'
                      },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#43e97b' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#43e97b' },
                      '& .MuiSvgIcon-root': { color: '#fff' }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#232b3b',
                          maxHeight: '300px'
                        }
                      }
                    }}
                  >
                    {materialItems.map((item) => (
                      <MenuItem key={item} value={item} sx={{ color: '#fff', minHeight: '32px', py: 0.5 }}>
                        {item}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* 월 */}
              <Grid item xs={6} sm={3}>
                <FormControl>
                  <InputLabel sx={{ color: '#bbb' }}>월</InputLabel>
                  <Select
                    value={materialForm.month}
                    onChange={(e) => setMaterialForm({...materialForm, month: e.target.value})}
                    sx={{
                      color: '#fff',
                      width: '100px',
                      minWidth: '100px',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#43e97b' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#43e97b' },
                      '& .MuiSvgIcon-root': { color: '#fff' },
                      '& .MuiPaper-root': {
                        width: '100% !important',
                        minWidth: '100px !important'
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          width: '150px',
                          minWidth: '150px',
                          maxWidth: '150px',
                          bgcolor: '#232b3b',
                          color: '#fff'
                        }
                      }
                    }}
                  >
                    {(() => {
                      const months = [];
                      // 2024년 12월부터 2026년 1월까지
                      for (let year = 2024; year <= 2026; year++) {
                        const startMonth = year === 2024 ? 12 : 1;
                        const endMonth = year === 2026 ? 1 : 12;
                        
                        for (let month = startMonth; month <= endMonth; month++) {
                          const monthKey = `${year}.${String(month).padStart(2, '0')}`;
                          months.push(
                            <MenuItem key={monthKey} value={monthKey} sx={{ color: '#fff', minHeight: '32px', py: 0.5 }}>
                              {year}년 {month}월
                            </MenuItem>
                          );
                        }
                      }
                      return months;
                    })()}
                  </Select>
                </FormControl>
              </Grid>
              
              {/* 회사명 */}
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={savedCompanies}
                  value={materialForm.company}
                  onChange={(event, newValue) => {
                    const company = newValue || '';
                    // 수정 모드가 아닐 때만 차수 자동 계산 (같은 회사, 같은 품목 기준)
                    if (!editingMaterial) {
                      const 차수 = materialData.filter(item => 
                        item.company === company && item.item === materialForm.item
                      ).length + 1;
                      setMaterialForm({...materialForm, company, 차수});
                    } else {
                      setMaterialForm({...materialForm, company});
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    const company = newInputValue || '';
                    // 수정 모드가 아닐 때만 차수 자동 계산 (같은 회사, 같은 품목 기준)
                    if (!editingMaterial) {
                      const 차수 = materialData.filter(item => 
                        item.company === company && item.item === materialForm.item
                      ).length + 1;
                      setMaterialForm({...materialForm, company, 차수});
                    } else {
                      setMaterialForm({...materialForm, company});
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="회사"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          color: '#fff',
                          width: '300px',
                          minWidth: '300px',
                          '& fieldset': { borderColor: '#555' },
                          '&:hover fieldset': { borderColor: '#43e97b' },
                          '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                        },
                        '& .MuiInputLabel-root': { color: '#bbb' },
                        '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                      }}
                    />
                  )}
                  sx={{
                    '& .MuiAutocomplete-popupIndicator': { color: '#fff' },
                    '& .MuiAutocomplete-clearIndicator': { color: '#fff' }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="금액"
                  value={materialForm.amount}
                  onChange={handleAmountChange}
                  placeholder="예: 1,000,000"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#43e97b' },
                      '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="비고"
                  value={materialForm.note}
                  onChange={(e) => setMaterialForm({...materialForm, note: e.target.value})}
                  placeholder="자재비 관련 비고사항을 입력하세요"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#43e97b' },
                      '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                  }}
                />
              </Grid>
              
            </Grid>

            {/* 실물량정보 (선택사항) */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#90caf9', fontWeight: 'bold' }}>
                  📊 실물량정보 (선택사항)
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={addQuantityItem}
                  sx={{
                    color: '#43e97b',
                    borderColor: '#43e97b',
                    fontSize: '0.7rem',
                    px: 1,
                    py: 0.3,
                    minWidth: 'auto',
                    '&:hover': {
                      borderColor: '#35d16a',
                      color: '#35d16a'
                    }
                  }}
                >
                  + 물량추가
                </Button>
              </Box>
              {/* 동적 실물량 항목들 */}
              {(materialForm.quantityItems || []).map((item, index) => (
                <Box key={item.id} sx={{ mb: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                    {/* 품목명 드롭다운 */}
                    <Grid item xs={12} sm={5}>
                      {item.siteItem && !siteItemOptions.find(option => option.name === item.siteItem) ? (
                        // 직접 입력 모드
                        <TextField
                          fullWidth
                          size="small"
                          label="품목명 (직접입력)"
                          value={item.siteItem}
                          onChange={(e) => updateQuantityItem(item.id, 'siteItem', e.target.value)}
                          sx={{
                            minWidth: '200px',
                            '& .MuiOutlinedInput-root': {
                              color: '#fff',
                              fontSize: '0.9rem',
                              '& fieldset': { borderColor: '#555' },
                              '&:hover fieldset': { borderColor: '#43e97b' },
                              '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                            },
                            '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
                            '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                          }}
                          InputProps={{
                            endAdornment: (
                              <Button
                                size="small"
                                onClick={() => updateQuantityItem(item.id, 'siteItem', '')}
                                sx={{ minWidth: 'auto', p: 0.5, color: '#90caf9' }}
                              >
                                ↩
                              </Button>
                            )
                          }}
                        />
                      ) : (
                        // 드롭다운 모드
                        <FormControl fullWidth size="small" sx={{ minWidth: '200px' }}>
                          <InputLabel sx={{ color: '#bbb', fontSize: '0.85rem' }}>품목명</InputLabel>
                          <Select
                            value={(() => {
                              // 현재 선택된 품목의 displayText를 찾아서 반환
                              const currentOption = siteItemOptions.find(option => 
                                option.name === item.siteItem && option.specification === item.specification
                              );
                              return currentOption ? currentOption.displayText : (item.siteItem || '');
                            })()}
                            onChange={(e) => {
                              
                              if (e.target.value === '') {
                                // 직접 입력 선택시
                                updateQuantityItemMultiple(item.id, {
                                  siteItem: '직접입력',
                                  unit: 'M2',
                                  specification: ''
                                });
                              } else {
                                // displayText로 옵션을 찾기
                                const selectedOption = siteItemOptions.find(option => option.displayText === e.target.value);
                                if (selectedOption) {
                                  updateQuantityItemMultiple(item.id, {
                                    siteItem: selectedOption.name,
                                    specification: selectedOption.specification,
                                    unit: selectedOption.unit
                                  });
                                } else {
                                  // 품목명을 그대로 사용 (직접 입력 케이스)
                                  updateQuantityItem(item.id, 'siteItem', e.target.value);
                                }
                              }
                            }}
                          MenuProps={{
                            PaperProps: {
                              sx: {
                                bgcolor: '#232b3b',
                                maxHeight: '200px',
                                '& .MuiList-root': {
                                  maxHeight: '200px',
                                  overflowY: 'auto',
                                  '&::-webkit-scrollbar': {
                                    display: 'none',
                                    width: 0,
                                    height: 0
                                  },
                                  '&::-webkit-scrollbar-track': {
                                    display: 'none'
                                  },
                                  '&::-webkit-scrollbar-thumb': {
                                    display: 'none'
                                  },
                                  '&::-webkit-scrollbar-corner': {
                                    display: 'none'
                                  },
                                  '-ms-overflow-style': 'none',
                                  'scrollbar-width': 'none',
                                  scrollbarWidth: 'none'
                                }
                              }
                            }
                          }}
                          sx={{
                            color: '#fff',
                            fontSize: '0.9rem',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#555' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#43e97b' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#43e97b' },
                            '& .MuiSvgIcon-root': { color: '#fff' }
                          }}
                        >
                          <MenuItem value="" sx={{ color: '#fff', fontSize: '0.9rem' }}>
                            직접 입력
                          </MenuItem>
                          {siteItemOptions && siteItemOptions.length > 0 ? (
                            siteItemOptions.map((option) => (
                              <MenuItem 
                                key={`${option.name}-${option.specification}`} 
                                value={option.displayText} 
                                sx={{ 
                                  color: '#fff', 
                                  minHeight: '32px',
                                  fontSize: '0.9rem'
                                }}
                              >
                                <Box>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                                    {hideGlassWords(option.name)}
                                  </div>
                                  {option.specification && (
                                    <div style={{ fontSize: '0.75rem', color: '#bbb' }}>
                                      📏 {option.specification}
                                    </div>
                                  )}
                                </Box>
                              </MenuItem>
                            ))
                          ) : (
                            <MenuItem disabled sx={{ color: '#666', fontSize: '0.9rem' }}>
                              등록된 품목이 없습니다
                            </MenuItem>
                          )}
                        </Select>
                      </FormControl>
                      )}
                    </Grid>

                    {/* 단위 */}
                    <Grid item xs={3} sm={1}>
                      <TextField
                        fullWidth
                        size="small"
                        label="단위"
                        value={item.unit}
                        onChange={(e) => updateQuantityItem(item.id, 'unit', e.target.value)}
                        sx={{
                          minWidth: '50px',
                          maxWidth: '50px',
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.9rem',
                            '& fieldset': { borderColor: '#555' },
                            '&:hover fieldset': { borderColor: '#43e97b' },
                            '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                          },
                          '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
                          '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                        }}
                      />
                    </Grid>

                    {/* 실물량 */}
                    <Grid item xs={3} sm={1.5}>
                      <TextField
                        fullWidth
                        size="small"
                        label="실물량"
                        value={item.actualQuantity}
                        onChange={(e) => updateQuantityItem(item.id, 'actualQuantity', e.target.value)}
                        type="number"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.9rem',
                            '& fieldset': { borderColor: '#555' },
                            '&:hover fieldset': { borderColor: '#43e97b' },
                            '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                          },
                          '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
                          '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                        }}
                      />
                    </Grid>

                    {/* 비고 */}
                    <Grid item xs={5} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        label="비고"
                        value={item.quantityNote}
                        onChange={(e) => updateQuantityItem(item.id, 'quantityNote', e.target.value)}
                        placeholder="물량 관련 메모"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            color: '#fff',
                            fontSize: '0.9rem',
                            '& fieldset': { borderColor: '#555' },
                            '&:hover fieldset': { borderColor: '#43e97b' },
                            '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                          },
                          '& .MuiInputLabel-root': { color: '#bbb', fontSize: '0.85rem' },
                          '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                        }}
                      />
                    </Grid>

                    {/* 삭제 버튼 */}
                    <Grid item xs={1} sm={1}>
                      <Button
                        size="small"
                        color="error"
                        onClick={async () => await removeQuantityItem(item.id)}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        ✕
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              ))}

              {(materialForm.quantityItems || []).length === 0 && (
                <Typography sx={{ color: '#666', textAlign: 'center', py: 2, fontStyle: 'italic' }}>
                  + 물량추가 버튼을 눌러서 실물량 항목을 추가하세요
                </Typography>
              )}
            </Box>

            <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleAddMaterial}
                sx={{
                  bgcolor: '#43e97b',
                  color: '#000',
                  '&:hover': { bgcolor: '#35d16a' }
                }}
              >
                {editingMaterial ? '수정' : '추가'}
              </Button>
              {editingMaterial && (
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  sx={{
                    borderColor: '#f44336',
                    color: '#f44336',
                    '&:hover': { borderColor: '#d32f2f', color: '#d32f2f' }
                  }}
                >
                  취소
                </Button>
              )}
              <Button
                variant="outlined"
                onClick={showMaterialDetails}
                sx={{
                  borderColor: '#43e97b',
                  color: '#43e97b',
                  '&:hover': { borderColor: '#35d16a', color: '#35d16a' }
                }}
              >
                상세내역 보기
              </Button>
            </Box>
          </Box>

          <Divider sx={{ borderColor: '#555', mb: 2 }} />

          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#fff' }}>등록된 자재비</Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={reorderExistingSequences}
                sx={{
                  color: '#90caf9',
                  borderColor: '#90caf9',
                  fontSize: '0.75rem',
                  px: 1,
                  py: 0.5,
                  '&:hover': {
                    borderColor: '#64b5f6',
                    color: '#64b5f6'
                  }
                }}
              >
                차수 재정렬
              </Button>
            </Box>
            {materialData.length > 0 ? (
              <Box sx={{ maxHeight: '320px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
                {materialData
                  .sort((a, b) => {
                    // 월 기준으로 정렬 (2025.09가 맨 위, 2025.04가 맨 아래)
                    const monthA = a.month || '';
                    const monthB = b.month || '';
                    return monthB.localeCompare(monthA);
                  })
                  .map((item, index) => (
                  <Box
                    key={item.id}
                    onClick={() => handleEditMaterial(item)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1,
                      mb: 0.5,
                      bgcolor: '#333',
                      borderRadius: 1,
                      border: '1px solid #555',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: '#404040',
                        borderColor: '#90caf9',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 2px 8px rgba(144, 202, 249, 0.2)'
                      }
                    }}
                  >
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography sx={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
                        {item.item} ({item.company}) - {item.차수}차
                      </Typography>
                      <Typography sx={{ color: '#bbb', fontSize: '0.95rem' }}>
                        {formatDate(item.month)} | {formatGisungAmount(item.amount)}
                      </Typography>
                      {item.siteItem && item.actualQuantity && (
                        <Typography sx={{ color: '#64b5f6', fontSize: '0.9rem', fontWeight: 'bold' }}>
                          📊 {item.siteItem}: {item.actualQuantity} {item.unit || 'M2'}
                        </Typography>
                      )}
                      {item.quantityNote && (
                        <Typography sx={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          실물량 비고: {item.quantityNote}
                        </Typography>
                      )}
                      {item.note && (
                        <Typography sx={{ color: '#888', fontSize: '0.85rem', fontStyle: 'italic' }}>
                          비고: {item.note}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        onClick={() => handleEditMaterial(item)}
                        sx={{ 
                          minWidth: 'auto', 
                          p: 0.5,
                          color: '#90caf9',
                          '&:hover': { bgcolor: 'rgba(144, 202, 249, 0.1)' }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleDeleteMaterial(item.id)}
                        sx={{ minWidth: 'auto', p: 0.5 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </Button>
                    </Box>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography sx={{ color: '#bbb', textAlign: 'center', py: 4 }}>
                등록된 자재비가 없습니다.
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMaterialDialog({ open: false });
              resetMaterialForm();
            }}
            sx={{ color: '#bbb' }}
          >
            닫기
          </Button>
        </DialogActions>
      </Dialog>

      {/* 물량 추가 다이얼로그 */}
      <Dialog
        open={quantityDialog.open}
        onClose={() => setQuantityDialog({ open: false })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#232b3b',
            color: '#fff',
            border: '1px solid #43e97b'
          }
        }}
      >
        <DialogTitle sx={{ color: '#43e97b', fontWeight: 'bold' }}>
          📊 물량 항목 추가
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              {/* 품목명 */}
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="품목명"
                  value={quantityForm.siteItem}
                  onChange={(e) => setQuantityForm({...quantityForm, siteItem: e.target.value})}
                  placeholder="예: a항목 물량, b하옥 물량"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#43e97b' },
                      '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                  }}
                />
              </Grid>

              {/* 단위 */}
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="단위"
                  value={quantityForm.unit}
                  onChange={(e) => setQuantityForm({...quantityForm, unit: e.target.value})}
                  placeholder="예: M2, EA"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#43e97b' },
                      '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                  }}
                />
              </Grid>

              {/* 물량 */}
              <Grid item xs={6} sm={3}>
                <TextField
                  fullWidth
                  label="물량"
                  value={quantityForm.actualQuantity}
                  onChange={(e) => setQuantityForm({...quantityForm, actualQuantity: e.target.value})}
                  placeholder="예: 100"
                  type="number"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#43e97b' },
                      '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                  }}
                />
              </Grid>

              {/* 비고 */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="비고"
                  value={quantityForm.note}
                  onChange={(e) => setQuantityForm({...quantityForm, note: e.target.value})}
                  placeholder="물량 관련 메모"
                  multiline
                  rows={2}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#fff',
                      '& fieldset': { borderColor: '#555' },
                      '&:hover fieldset': { borderColor: '#43e97b' },
                      '&.Mui-focused fieldset': { borderColor: '#43e97b' }
                    },
                    '& .MuiInputLabel-root': { color: '#bbb' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#43e97b' }
                  }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setQuantityDialog({ open: false })}
            sx={{ color: '#bbb' }}
          >
            취소
          </Button>
          <Button
            onClick={handleAddQuantity}
            variant="contained"
            sx={{
              bgcolor: '#43e97b',
              color: '#000',
              '&:hover': { bgcolor: '#35d16a' }
            }}
          >
            추가
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
        severity={snackbar.severity}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

      {/* 물량 산출방식 변경 확인 대화상자 */}
      <Dialog
        open={calculationModeDialog.open}
        onClose={cancelCalculationModeChange}
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: '#1e293b',
            color: '#fff',
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle sx={{ color: '#90caf9', borderBottom: '1px solid #334155' }}>
          🔄 물량 산출방식 변경
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography sx={{ mb: 2, color: '#e2e8f0' }}>
            물량 산출방식을 변경하시겠습니까?
          </Typography>
          <Box sx={{ pl: 2, mb: 2 }}>
            <Typography sx={{ fontSize: '0.9rem', color: '#94a3b8', mb: 1 }}>
              <strong>현재:</strong> {quantityCalculationMode === 'cumulative' ? '항목별 차수 더하기' : '항목별 최신 물량 적용'}
            </Typography>
            <Typography sx={{ fontSize: '0.9rem', color: '#94a3b8' }}>
              <strong>변경할 방식:</strong> {calculationModeDialog.newMode === 'cumulative' ? '항목별 차수 더하기' : '항목별 최신 물량 적용'}
            </Typography>
          </Box>
          <Box sx={{ bgcolor: '#334155', p: 2, borderRadius: 1, mb: 2 }}>
            {calculationModeDialog.newMode === 'cumulative' ? (
              <>
                <Typography sx={{ fontSize: '0.85rem', color: '#fbbf24', mb: 1, fontWeight: 'bold' }}>
                  📊 항목별 차수 더하기
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#d1d5db' }}>
                  • 모든 차수의 물량을 누적하여 더한 합계로 계산합니다<br/>
                  • 예: 1차(100) + 2차(50) + 3차(30) = 총 180개<br/>
                  • 전체 프로젝트 누적 사용량을 확인할 때 사용
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: '0.85rem', color: '#10b981', mb: 1, fontWeight: 'bold' }}>
                  📈 항목별 최신 물량 적용
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#d1d5db' }}>
                  • 가장 최근에 입력된 물량 데이터만 사용합니다<br/>
                  • 예: 1차(100), 2차(50), 3차(30) → 최신인 30개만 적용<br/>
                  • 현재 시점의 실제 물량 상황을 확인할 때 사용
                </Typography>
              </>
            )}
          </Box>
          <Alert severity="info" sx={{ bgcolor: '#1e40af', color: '#bfdbfe' }}>
            변경하면 모든 물량 표시와 진행률이 새로운 방식으로 다시 계산됩니다.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={cancelCalculationModeChange}
            sx={{ 
              color: '#94a3b8',
              '&:hover': { bgcolor: 'rgba(148, 163, 184, 0.1)' }
            }}
          >
            취소
          </Button>
          <Button
            onClick={confirmCalculationModeChange}
            variant="contained"
            sx={{
              bgcolor: '#3b82f6',
              '&:hover': { bgcolor: '#2563eb' }
            }}
          >
            변경하기
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
