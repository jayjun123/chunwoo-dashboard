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
  Download as DownloadIcon
} from '@mui/icons-material';
import { Line } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler
} from 'chart.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where, orderBy, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatContractAmount, formatGisungAmount, formatBalanceAmount } from '../utils/formatUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, ChartTooltip, Legend, Filler);

export default function SettlementDetail() {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
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
          setLoading(false); // 로딩 해제
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
             const dateA = new Date(a.gisungDate || 0);
             const dateB = new Date(b.gisungDate || 0);
             return dateA - dateB;
           });
           
           console.log('최종 기성금 데이터:', gisungItems);
           console.log('기성금 데이터 상세:', gisungItems.map(item => ({
             id: item.id,
             name: item.name,
             gisungAmount: item.gisungAmount,
             claimStatus: item.claimStatus,
             paymentStatus: item.paymentStatus
           })));
           
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
                 ...doc.data()
               }));
             }
           }

           costItems = costItems.sort((a, b) => {
             const dateA = new Date(a.date || 0);
             const dateB = new Date(b.date || 0);
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
             const dateA = new Date(a.createdAt || 0);
             const dateB = new Date(b.createdAt || 0);
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
           
           // 여전히 찾지 못했다면 전체 안전관리비 데이터 확인 (디버깅용)
           if (safetyItems.length === 0) {
             console.log('안전관리비 데이터를 찾지 못함, 전체 데이터 확인...');
             const allSafetyQuery = query(collection(db, 'safety_costs'));
             const allSafetySnapshot = await getDocs(allSafetyQuery);
             const allSafetyItems = allSafetySnapshot.docs.map(doc => ({
               id: doc.id,
               ...doc.data()
             }));
             console.log('전체 안전관리비 데이터:', allSafetyItems);
             
             // 금사동 관련 데이터만 필터링해서 확인
             const geumsaItems = allSafetyItems.filter(item => 
               item.siteName && item.siteName.includes('금사동')
             );
             console.log('금사동 관련 안전관리비 데이터:', geumsaItems);
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
        console.error('오류 상세:', error.message);
        console.error('오류 코드:', error.code);
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

    // 자재비 실시간 리스너
    const materialQuery = query(
      collection(db, 'material_costs'),
      where('siteId', '==', siteId)
    );
    const unsubscribeMaterial = onSnapshot(materialQuery, (snapshot) => {
      const materialItems = snapshot.docs.map(doc => ({
        id: doc.data().id || doc.id,
        firebaseId: doc.id,
        ...doc.data()
      }));
      setMaterialData(materialItems);
      console.log('자재비 데이터 실시간 업데이트:', materialItems.length, '개');
    }, (error) => {
      console.error('자재비 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeMaterial);

    // 실물량 데이터 실시간 리스너
    const quantityQuery = query(
      collection(db, 'quantity_info'),
      where('siteId', '==', siteId)
    );
    const unsubscribeQuantity = onSnapshot(quantityQuery, (snapshot) => {
      const quantityItems = snapshot.docs.map(doc => ({
        id: doc.data().id || doc.id,
        firebaseId: doc.id,
        ...doc.data()
      }));
      setQuantityData(quantityItems);
      console.log('실물량 데이터 실시간 업데이트:', quantityItems.length, '개');
    }, (error) => {
      console.error('실물량 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeQuantity);

    // 지출 데이터 실시간 리스너
    const costQuery = query(
      collection(db, 'costs'),
      where('siteId', '==', siteId)
    );
    const unsubscribeCost = onSnapshot(costQuery, (snapshot) => {
      const costItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
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
        const dateA = new Date(a.gisungDate || 0);
        const dateB = new Date(b.gisungDate || 0);
        return dateA - dateB;
      });
      setGisungData(gisungItems);
      console.log('기성금 데이터 실시간 업데이트:', gisungItems.length, '개');
    }, (error) => {
      console.error('기성금 실시간 리스너 오류:', error);
    });
    unsubscribers.push(unsubscribeGisung);

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
      
      console.log('지출 항목 처리:', { itemType, amount, item });

      if (itemType === '노무비') {
        breakdown.labor += amount;
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
      console.log('자재비 항목 처리:', { item: item.item, amount });
    });

    console.log('지출 항목별 분류:', breakdown);
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

  // 총 공수 계산 (일정 데이터에서)
  const totalWorkers = useMemo(() => {
    let total = 0;
    
    // 일정 데이터에서 공수 추출
    scheduleData.forEach(schedule => {
      if (schedule.desc) {
        const manpower = extractManpowerFromDescription(schedule.desc);
        total += manpower;
      }
    });
    
    // 노무비 데이터에서도 공수 추출 (기존 방식)
    const laborItems = costData.filter(item => item.itemType === '노무비');
    laborItems.forEach(item => {
      const workers = Number(item.workers) || 0;
      total += workers;
    });
    
    console.log('총 공수 (일정 + 노무비):', total);
    return total;
  }, [scheduleData, costData]);

  // 순수익 계산
  const netProfit = totalGisungAmount - totalCostAmount;

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
                console.log('실물량 정보 저장됨:', quantityDocRef.id, quantityItem.siteItem);
                
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
    } catch (error) {
      console.error('자재비 삭제 오류:', error);
      setSnackbar({ open: true, message: '자재비 삭제에 실패했습니다.', severity: 'error' });
    }
  }, [materialData]);

  // 현장 등록된 모든 항목 정보 가져오기
  const getRegisteredItems = useMemo(() => {
    if (!site || !site.items) {
      return [];
    }

    // 현장의 items에서 실제 항목들만 필터링 (합계, 부가세 등 제외)
    const registeredItems = site.items.filter(item => 
      !item.isTotal && !item.isVat && !item.isTotalWithVat && !item.isAdjustment
    ).map(item => ({
      name: item.name,
      quantity: item.quantity || item.qty || 0,
      unit: item.unit || 'M2',
      price: item.price || 0,
      amount: item.amount || 0,
      specification: item.specification || ''
    }));

    return registeredItems;
  }, [site]);

  // 현장 물량내역에서 품목 옵션 추출 (규격 포함)
  const siteItemOptions = useMemo(() => {
    if (!getRegisteredItems || getRegisteredItems.length === 0) {
      return [];
    }
    
    // 품목명과 규격을 함께 포함하는 객체 배열 생성
    const itemsWithSpec = getRegisteredItems.map(item => ({
      name: item.name,
      specification: item.specification || '',
      unit: item.unit,
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
  }, [getRegisteredItems, hideGlassWords]);

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

  // 실물량 항목 삭제 함수
  const removeQuantityItem = (id) => {
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
        const latestTime = latest.createdAt?.toDate?.() || new Date(latest.createdAt || 0);
        const currentTime = current.createdAt?.toDate?.() || new Date(current.createdAt || 0);
        return currentTime > latestTime ? current : latest;
      });
      usedQuantity = latestQuantity.actualQuantity || 0;
    }
    
    // 원래 등록된 물량 (품목명 + 규격으로 매칭)
    const originalItem = getRegisteredItems.find(item => 
      item.name === itemName && 
      (item.specification || '') === (specification || '')
    );
    if (!originalItem) return null;
    
    const remaining = originalItem.quantity - usedQuantity;
    return {
      used: usedQuantity,
      remaining: remaining,
      unit: originalItem.unit
    };
  }, [quantityData, getRegisteredItems, quantityCalculationMode]);


  // 전체 물량 대비 사용 퍼센트 계산 함수 (유리 항목만 필터링)
  const getQuantityPercentage = useCallback(() => {
    if (!getRegisteredItems || getRegisteredItems.length === 0 || !quantityData || quantityData.length === 0) {
      return 0;
    }
    
    // 유리가 포함된 항목들만 필터링
    const glassItems = getRegisteredItems.filter(item => 
      item.name.includes('유리')
    );
    
    if (glassItems.length === 0) return 0;
    
    // 유리 항목들의 총 개수
    const totalGlassItems = glassItems.length;
    
    let usedGlassItems;
    
    if (quantityCalculationMode === 'cumulative') {
      // 차수별 누적: 사용된 유리 품목 개수 (품목명 + 규격 조합으로 중복 제거)
      const usedGlassItemKeys = [...new Set(quantityData
        .filter(qty => qty.siteItem.includes('유리'))
        .map(qty => `${qty.siteItem}|${qty.specification || ''}`)
      )];
      usedGlassItems = usedGlassItemKeys.length;
    } else {
      // 최신 데이터만: 각 품목별로 최신 데이터만 고려
      const glassQuantityData = quantityData.filter(qty => qty.siteItem.includes('유리'));
      
      // 품목명 + 규격별로 그룹화하여 최신 데이터만 선택
      const latestByItem = {};
      glassQuantityData.forEach(qty => {
        const key = `${qty.siteItem}|${qty.specification || ''}`;
        const currentTime = qty.createdAt?.toDate?.() || new Date(qty.createdAt || 0);
        
        if (!latestByItem[key] || currentTime > (latestByItem[key].createdAt?.toDate?.() || new Date(latestByItem[key].createdAt || 0))) {
          latestByItem[key] = qty;
        }
      });
      
      // 최신 데이터 중에서 실제 물량이 있는 항목만 카운트
      usedGlassItems = Object.values(latestByItem).filter(qty => qty.actualQuantity > 0).length;
    }
    
    return totalGlassItems > 0 ? Math.round((usedGlassItems / totalGlassItems) * 100) : 0;
  }, [getRegisteredItems, quantityData, quantityCalculationMode]);

  // 자재비 상세내역 표시 (항목별로 정리)
  const showMaterialDetails = () => {
    setShowDetailBox(true); // 상세내역 박스 표시
    // 자재비를 항목별로 분류
    const 복층Items = materialData.filter(item => item.item === '복층').map(item => ({
      name: `복층 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: item.month,
      type: '복층',
      차수: item.차수 || 1
    }));
    
    const 강화Items = materialData.filter(item => item.item === '강화').map(item => ({
      name: `강화 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: item.month,
      type: '강화',
      차수: item.차수 || 1
    }));
    
    const 접합Items = materialData.filter(item => item.item === '접합').map(item => ({
      name: `접합 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: item.month,
      type: '접합',
      차수: item.차수 || 1
    }));
    
    const 기타Items = materialData.filter(item => item.item === '기타').map(item => ({
      name: `기타 - ${item.company}`,
      amount: Number(item.amount) || 0,
      date: item.month,
      type: '기타',
      차수: item.차수 || 1
    }));
    
    // 모든 항목을 합쳐서 정렬 (최신 월이 위에)
    const allItems = [...복층Items, ...강화Items, ...접합Items, ...기타Items].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA;
    });
    
    setDetailDialog({
      open: true,
      title: '자재비',
      items: allItems
    });
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    try {
      // 워크북 생성
      const workbook = XLSX.utils.book_new();
      
      // 1. 대시보드 시트 (브리프용)
      const dashboardData = [
        // 헤더
        ['', '', '', '', '', ''],
        ['', '', '🏗️ 현장 정산 대시보드', '', '', ''],
        ['', '', `${site?.name || '현장명'} - ${new Date().toLocaleDateString()} 기준`, '', '', ''],
        ['', '', '', '', '', ''],
        
        // 현장 기본 정보
        ['📋 현장 기본 정보', '', '', '', '', ''],
        ['현장명', site?.name || '', '', '', '', ''],
        ['계약회사', site?.companyName || site?.company || '', '', '', '', ''],
        ['현장소장', site?.manager || '', '', '', '', ''],
        ['공사기간', `${site?.startDate || ''} ~ ${site?.endDate || ''}`, '', '', '', ''],
        ['계약유형', site?.contractType || '', '', '', '', ''],
        ['', '', '', '', '', ''],
        
        // 정산 현황
        ['💰 정산 현황', '', '', '', '', ''],
        ['계약금액', site?.contractAmount ? formatContractAmount(site.contractAmount) : '0원', '', '', '', ''],
        ['기성금액 (입금완료)', formatGisungAmount(totalGisungAmount), '', '', '', ''],
        ['청구완료 (미지급)', formatGisungAmount(totalClaimedUnpaidAmount), '', '', '', ''],
        ['총 지출', formatGisungAmount(totalCostAmount), '', '', '', ''],
        ['차액', formatBalanceAmount(totalGisungAmount - totalCostAmount), '', '', '', ''],
        ['', '', '', '', '', ''],
        
        // 지출 세부 내역
        ['💸 지출 세부 내역', '', '', '', '', ''],
        ['노무비', formatGisungAmount(costBreakdown.labor), '', '', '', ''],
        ['자재비', formatGisungAmount(costBreakdown.material), '', '', '', ''],
        ['부자재비', formatGisungAmount(costBreakdown.subMaterial), '', '', '', ''],
        ['장비비', formatGisungAmount(costBreakdown.equipment), '', '', '', ''],
        ['경비', formatGisungAmount(costBreakdown.expense), '', '', '', ''],
        ['기타', formatGisungAmount(costBreakdown.other), '', '', '', ''],
        ['', '', '', '', '', ''],
        
        // 공수 정보
        ['👷 공수 정보', '', '', '', '', ''],
        ['총 공수', `${totalWorkers.toLocaleString()}명`, '', '', '', ''],
        ['', '', '', '', '', ''],
        
        // 월별 정산 요약 (최근 6개월)
        ['📊 월별 정산 요약', '', '', '', '', ''],
        ['월', '기성금', '지출', '자재비', '수지', ''],
      ];
      
      // 월별 데이터 추가
      const dashboardMonths = new Set();
      gisungData.forEach(item => {
        if (item.gisungDate) {
          const date = new Date(item.gisungDate);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          dashboardMonths.add(month);
        }
      });
      costData.forEach(item => {
        if (item.date) {
          const date = new Date(item.date);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          dashboardMonths.add(month);
        }
      });
      materialData.forEach(item => {
        if (item.month) {
          dashboardMonths.add(item.month);
        }
      });
      
      const dashboardSortedMonths = Array.from(dashboardMonths).sort().slice(-6); // 최근 6개월
      dashboardSortedMonths.forEach(month => {
        const monthGisung = gisungData
          .filter(item => {
            if (!item.gisungDate) return false;
            const date = new Date(item.gisungDate);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          })
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthCost = costData
          .filter(item => {
            if (!item.date) return false;
            const date = new Date(item.date);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          })
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthMaterial = materialData
          .filter(item => item.month === month)
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        dashboardData.push([
          month,
          formatGisungAmount(monthGisung),
          formatContractAmount(monthCost),
          formatContractAmount(monthMaterial),
          formatContractAmount(monthGisung - monthCost - monthMaterial),
          ''
        ]);
      });
      
      const dashboardSheet = XLSX.utils.aoa_to_sheet(dashboardData);
      
      // 컬럼 너비 설정
      dashboardSheet['!cols'] = [
        { wch: 20 }, // A열
        { wch: 25 }, // B열
        { wch: 15 }, // C열
        { wch: 15 }, // D열
        { wch: 15 }, // E열
        { wch: 10 }  // F열
      ];
      
      XLSX.utils.book_append_sheet(workbook, dashboardSheet, '📊 대시보드');
      
      // 2. 현장 정보 시트
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
      
      const siteInfoSheet = XLSX.utils.aoa_to_sheet(siteInfoData);
      XLSX.utils.book_append_sheet(workbook, siteInfoSheet, '현장정보');
      
      // 3. 기성금 내역 시트
      const gisungExcelData = gisungData.map(item => [
        item.gisungDate ? new Date(item.gisungDate).toLocaleDateString() : '',
        item.gisungAmount ? formatGisungAmount(item.gisungAmount) : '0원',
        item.claimStatus || '',
        item.paymentStatus || '',
        item.description || ''
      ]);
      gisungExcelData.unshift(['기성일', '기성금액', '청구상태', '입금상태', '비고']);
      
      const gisungSheet = XLSX.utils.aoa_to_sheet(gisungExcelData);
      XLSX.utils.book_append_sheet(workbook, gisungSheet, '기성금내역');
      
      // 4. 지출 내역 시트
      const costExcelData = costData.map(item => [
        item.date ? new Date(item.date).toLocaleDateString() : '',
        item.itemType || '',
        item.itemName || '',
        item.quantity || 0,
        item.unitPrice || 0,
        item.totalValue ? formatContractAmount(item.totalValue) : '0원',
        item.차수 || 1,
        item.description || ''
      ]);
      costExcelData.unshift(['지출일', '항목', '세부항목', '수량', '단가', '금액', '차수', '비고']);
      
      const costSheet = XLSX.utils.aoa_to_sheet(costExcelData);
      XLSX.utils.book_append_sheet(workbook, costSheet, '지출내역');
      
      // 5. 자재비 내역 시트
      const materialExcelData = materialData.map(item => [
        item.month || '',
        item.item || '',
        item.company || '',
        item.amount ? formatContractAmount(item.amount) : '0원',
        item.차수 || 1,
        item.description || ''
      ]);
      materialExcelData.unshift(['월', '항목', '업체', '금액', '차수', '비고']);
      
      const materialSheet = XLSX.utils.aoa_to_sheet(materialExcelData);
      XLSX.utils.book_append_sheet(workbook, materialSheet, '자재비내역');
      
      // 6. 월별 정산 요약 시트
      const monthlySummary = [];
      const summaryMonths = new Set();
      
      // 기성금 월별 집계
      gisungData.forEach(item => {
        if (item.gisungDate) {
          const date = new Date(item.gisungDate);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          summaryMonths.add(month);
        }
      });
      
      // 지출 월별 집계
      costData.forEach(item => {
        if (item.date) {
          const date = new Date(item.date);
          const month = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
          summaryMonths.add(month);
        }
      });
      
      // 자재비 월별 집계
      materialData.forEach(item => {
        if (item.month) {
          summaryMonths.add(item.month);
        }
      });
      
      // 월별 데이터 정리
      const summarySortedMonths = Array.from(summaryMonths).sort();
      summarySortedMonths.forEach(month => {
        const monthGisung = gisungData
          .filter(item => {
            if (!item.gisungDate) return false;
            const date = new Date(item.gisungDate);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          })
          .reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
        
        const monthCost = costData
          .filter(item => {
            if (!item.date) return false;
            const date = new Date(item.date);
            const itemMonth = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
            return itemMonth === month;
          })
          .reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);
        
        const monthMaterial = materialData
          .filter(item => item.month === month)
          .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
        
        monthlySummary.push([
          month,
          formatGisungAmount(monthGisung),
          formatContractAmount(monthCost),
          formatContractAmount(monthMaterial),
          formatContractAmount(monthGisung - monthCost - monthMaterial)
        ]);
      });
      
      monthlySummary.unshift(['월', '기성금', '지출', '자재비', '수지']);
      
      const summarySheet = XLSX.utils.aoa_to_sheet(monthlySummary);
      XLSX.utils.book_append_sheet(workbook, summarySheet, '월별정산요약');
      
      // 파일 다운로드
      const fileName = `${site?.name || '정산내역'}_${new Date().toISOString().substring(0, 10)}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
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
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      // 곤도라
      const gondolaItems = equipmentItems.filter(item => item.itemType === '곤도라').map(item => ({
        name: `곤도라 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      // 지게차
      const forkliftItems = equipmentItems.filter(item => item.itemType === '지게차').map(item => ({
        name: `지게차 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      items = [...skyItems, ...gondolaItems, ...forkliftItems].sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
    } else if (itemType === 'expense') {
      // 경비를 세부 항목별로 나누어 표시
      const expenseItems = costData.filter(item => ['월세', '임대료', '식대', '유류비'].includes(item.itemType));
      
      // 월세
      const rentItems = expenseItems.filter(item => item.itemType === '월세').map(item => ({
        name: `월세 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      // 임대료
      const rentalItems = expenseItems.filter(item => item.itemType === '임대료').map(item => ({
        name: `임대료 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      // 식대
      const mealItems = expenseItems.filter(item => item.itemType === '식대').map(item => ({
        name: `식대 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      // 유류비
      const fuelItems = expenseItems.filter(item => item.itemType === '유류비').map(item => ({
        name: `유류비 - ${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      }));
      
      items = [...rentItems, ...rentalItems, ...mealItems, ...fuelItems].sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
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
                date: gisung.gisungDate ? new Date(gisung.gisungDate).toLocaleDateString() : '-',
                type: '부자재',
                description: item.description || item.remark || '-'
              });
            }
          });
        }
      });
      
      // costData에서도 부자재 항목들 찾기
      const costSubMaterialItems = costData.filter(item => item.itemType === '부자재').map(item => ({
        name: `${item.itemName || '부자재'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: '부자재',
        description: item.description || '-'
      }));
      
      items = [...subMaterialItems, ...costSubMaterialItems].sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
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
        name: `${item.itemName || '-'}${item.차수 ? ` (${item.차수}차)` : ''}`,
        amount: Number(item.totalValue) || 0,
        date: item.date ? new Date(item.date).toLocaleDateString() : '-',
        type: item.itemType || '-'
      })).sort((a, b) => {
        // 월 기준으로 정렬 (최신 월이 위에)
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
    }

    setDetailDialog({
      open: true,
      title: title,
      items: items
    });
  };

  // 차트 데이터 생성 (메모이제이션으로 불필요한 재렌더링 방지)
  const chartData = useMemo(() => {
    if (!site) return null;

    // 공사기간 월별 데이터 생성
    const startDate = new Date(site.startDate);
    const endDate = new Date(site.endDate);
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
    // 월별 입금완료 금액 데이터
    const paidGisungByMonth = {};
    
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
        
        // 입금완료만 별도 계산
        if (item.paymentStatus === '입금완료') {
          if (!paidGisungByMonth[monthKey]) {
            paidGisungByMonth[monthKey] = 0;
          }
          paidGisungByMonth[monthKey] += amount;
        }
        
        console.log('기성금 추가됨:', { monthKey, amount: item.gisungAmount, paymentStatus: item.paymentStatus });
      }
    });
    
    console.log('차트용 기성금 데이터:', gisungByMonth);
    console.log('기성금 원본 데이터:', gisungData);

    // 월별 지출 데이터를 항목별로 분리
    const laborByMonth = {}; // 노무비
    const materialByMonth = {}; // 자재비 (materialData에서)
    const expenseByMonth = {}; // 경비
    const otherByMonth = {}; // 기타 지출 (부자재비, 장비비 등)
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
    
    costData.forEach(item => {
      if (item.date) {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const amount = Number(item.totalValue) || 0;
        
        if (item.itemType === '노무비') {
          if (!laborByMonth[monthKey]) laborByMonth[monthKey] = 0;
          laborByMonth[monthKey] += amount;
          
          // 공수 데이터 추가
          const workers = Number(item.workers) || 0;
          if (!workersByMonth[monthKey]) workersByMonth[monthKey] = 0;
          workersByMonth[monthKey] += workers;
        } else if (item.itemType === '경비') {
          // 경비 별도 처리
          if (!expenseByMonth[monthKey]) expenseByMonth[monthKey] = 0;
          expenseByMonth[monthKey] += amount;
        } else {
          // 기타 지출 (부자재비, 장비비, 기타 등)
          if (!otherByMonth[monthKey]) otherByMonth[monthKey] = 0;
          otherByMonth[monthKey] += amount;
        }
      }
    });
    
    // 일정 데이터에서 월별 공수 계산
    scheduleData.forEach(schedule => {
      if (schedule.date) {
        let date;
        if (schedule.date.toDate) {
          date = schedule.date.toDate();
        } else if (schedule.date instanceof Date) {
          date = schedule.date;
        } else {
          date = new Date(schedule.date);
        }
        
        const monthKey = `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        const manpower = extractManpowerFromDescription(schedule.desc || '');
        
        if (!workersByMonth[monthKey]) workersByMonth[monthKey] = 0;
        workersByMonth[monthKey] += manpower;
      }
    });
    
    console.log('차트용 노무비 데이터:', laborByMonth);
    console.log('차트용 자재비 데이터:', materialByMonth);
    console.log('차트용 경비 데이터:', expenseByMonth);
    console.log('차트용 기타 지출 데이터:', otherByMonth);
    console.log('차트용 월별 공수 데이터:', workersByMonth);
    console.log('차트용 입금완료 데이터:', paidGisungByMonth);
    console.log('일정 데이터:', scheduleData);

    const gisungValues = labels.map(label => gisungByMonth[label] || 0);
    const paidGisungValues = labels.map(label => paidGisungByMonth[label] || 0);
    const laborValues = labels.map(label => laborByMonth[label] || 0);
    const materialValues = labels.map(label => materialByMonth[label] || 0);
    const expenseValues = labels.map(label => expenseByMonth[label] || 0);
    const otherValues = labels.map(label => otherByMonth[label] || 0);
    const workersValues = labels.map(label => workersByMonth[label] || 0);
    
    console.log('월별 공수 값들:', workersValues);
    
    // 지출 총합계 계산 (노무비 + 자재비 + 경비 + 기타지출)
    const totalCostValues = labels.map((label, index) => 
      (laborValues[index] || 0) + (materialValues[index] || 0) + (expenseValues[index] || 0) + (otherValues[index] || 0)
    );

    // 차트 라벨에 공수 정보 추가 (공수가 있는 경우에만)
    const labelsWithWorkers = labels.map((label, index) => {
      const workers = workersValues[index] || 0;
      return workers > 0 ? `${label}\n(${workers}명)` : label;
    });
    
    console.log('최종 차트 라벨:', labelsWithWorkers);

    console.log('차트 라벨:', labels);
    console.log('차트 라벨 (공수 포함):', labelsWithWorkers);
    console.log('기성금 값들:', gisungValues);
    console.log('입금완료 값들:', paidGisungValues);
    console.log('노무비 값들:', laborValues);
    console.log('자재비 값들:', materialValues);
    console.log('경비 값들:', expenseValues);
    console.log('기타 지출 값들:', otherValues);
    console.log('월별 공수 값들:', workersValues);
    console.log('지출 총합계 값들:', totalCostValues);

    return {
      labels: labelsWithWorkers,
      datasets: [
        {
          label: '기성금',
          data: gisungValues,
          borderColor: '#43e97b',
          backgroundColor: 'rgba(67, 233, 123, 0.1)',
          tension: 0,
          fill: false
        },
        {
          label: '입금완료',
          data: paidGisungValues,
          borderColor: '#00bcd4',
          backgroundColor: 'rgba(0, 188, 212, 0.1)',
          tension: 0,
          fill: false
        },
        {
          label: '지출 총합계',
          data: totalCostValues,
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          tension: 0,
          fill: false,
          borderWidth: 3
        },
        {
          label: '노무비',
          data: laborValues,
          borderColor: '#ffeb3b',
          backgroundColor: 'rgba(255, 235, 59, 0.1)',
          tension: 0,
          fill: false
        },
        {
          label: '자재비',
          data: materialValues,
          borderColor: '#9c27b0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          tension: 0,
          fill: false
        },
        {
          label: '경비',
          data: expenseValues,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0,
          fill: false
        },
        {
          label: '기타',
          data: otherValues,
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          tension: 0,
          fill: false
        }
      ]
    };
  }, [site, gisungData, costData, materialData, scheduleData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    // 아이패드/터치 디바이스 최적화
    interaction: {
      intersect: false,
      mode: 'index'
    },
    // 애니메이션 비활성화 (아이패드 성능 개선)
    animation: {
      duration: 0
    },
    // 터치 이벤트 최적화
    onHover: (event, activeElements) => {
      event.native.target.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#fff',
          font: { size: 12 },
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: false
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#43e97b',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { 
          color: '#333',
          drawBorder: false
        },
        ticks: { 
          color: '#bbb',
          maxRotation: 0,
          minRotation: 0,
          padding: 30,
          font: {
            size: 14
          }
        }
      },
      y: {
        grid: { 
          color: '#333',
          drawBorder: false
        },
        ticks: { 
          color: '#bbb',
          font: {
            size: 12
          },
          callback: function(value) {
            return value.toLocaleString() + '원';
          }
        }
      }
    }
  }), []);

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
      minHeight: '100vh', 
      bgcolor: '#1a1d21', 
      color: '#fff',
      pb: 4,
      pt: 8  // 64px 아래로 내리기 위해 상단 패딩 추가
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        bgcolor: '#232b3b', 
        p: 3, 
        mb: 3,
        borderBottom: '2px solid #333'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              color: '#fff',
              display: { xs: 'none', md: 'block' }
            }}>
              {site.name}_{todayString} 기준 정산내역
            </Typography>
            {/* 아이패드용 짧은 제목 */}
            <Typography variant="h4" sx={{ 
              fontWeight: 'bold', 
              color: '#fff',
              display: { xs: 'block', md: 'none' }
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
      <Box sx={{ px: 3 }}>
        {/* 현장정보, 물량내역, 정산내역, 지출정보를 한 줄에 배치 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 현장정보 */}
          <Grid item xs={12} md={showQuantityExpanded ? 2 : 3}>
            <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '382px' }}>
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
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#bbb' }}>현장명:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.name}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#bbb' }}>회사명:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.companyName || site.company || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#bbb' }}>계약금액:</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: '#43e97b' }}>
                      {formatContractAmount(site.contractAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#bbb' }}>공사기간:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>
                      {site.startDate} ~ {site.endDate}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography sx={{ color: '#bbb' }}>현장장:</Typography>
                    <Typography sx={{ fontWeight: 'bold' }}>{site.manager || '-'}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
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
            <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '382px', width: '100%' }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" sx={{ color: '#90caf9', display: 'flex', alignItems: 'center', gap: 1 }}>
                    📋 물량 내역 ({getRegisteredItems.length}개)
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
                {getRegisteredItems.length > 0 ? (
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
                    {getRegisteredItems.map((item, index) => (
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
                                전체: {item.quantity.toLocaleString()} {item.unit}
                              </Typography>
                              {remainingInfo && remainingInfo.used > 0 && (
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

          {/* 순수익정보 */}
          <Grid item xs={12} md={showQuantityExpanded ? 4 : 4}>
            <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '382px', width: '290px' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#ff9800', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AttachMoneyIcon /> 정산내역
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#bbb' }}>기성금:</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: '#43e97b', fontSize: '1.1rem' }}>
                      {formatGisungAmount(totalGisungAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#bbb' }}>청구완료(미지급):</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: '#ff9800', fontSize: '1.1rem' }}>
                      {formatGisungAmount(totalClaimedUnpaidAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#bbb' }}>총 지출:</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: '#f44336', fontSize: '1.1rem' }}>
                      {formatGisungAmount(totalCostAmount)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#bbb' }}>차액:</Typography>
                    <Typography sx={{ 
                      fontWeight: 'bold', 
                      fontSize: '1.1rem',
                      color: (totalGisungAmount - totalCostAmount) >= 0 ? '#43e97b' : '#f44336'
                    }}>
                      {formatBalanceAmount(totalGisungAmount - totalCostAmount)}
                    </Typography>
                  </Box>
                  <Divider sx={{ bgcolor: '#333', my: 1 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: '#bbb' }}>안전관리비:</Typography>
                    <Typography sx={{ fontWeight: 'bold', color: '#ff9800', fontSize: '1.1rem' }}>
                      {formatGisungAmount(totalSafetyAmount)}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 지출정보와 상세내역을 나란히 배치 */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={2}>
              {/* 지출정보 */}
              <Grid item xs={12} md={6}>
                <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '382px', width: '260px' }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, color: '#f44336', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <TrendingDownIcon /> 지출정보
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
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
                <Grid item xs={12} md={6}>
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
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, height: '300px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                        // 부자재비는 다른 항목들과 같은 형식으로 표시
                        detailDialog.items.map((item, index) => {
                          const date = new Date(item.date);
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
                        })
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                                  const date = new Date(item.date);
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
                            const date = new Date(item.date);
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
              )}
            </Grid>
          </Grid>
        </Grid>



        {/* 차트분석 */}
        <Card sx={{ bgcolor: '#232b3b', color: '#fff', width: '100%' }}>
          <CardContent sx={{ width: '100%' }}>
            <Typography variant="h6" sx={{ mb: 3, color: '#43e97b' }}>
              월별 기성금 및 지출 추이 분석
            </Typography>
            {chartData ? (
              <Box sx={{ 
                height: '400px', 
                width: '100%',
                // 아이패드 최적화
                touchAction: 'manipulation',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                // 하드웨어 가속 활성화
                transform: 'translateZ(0)',
                willChange: 'transform'
              }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
            ) : (
              <Box sx={{ 
                height: '400px', 
                width: '100%',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                bgcolor: '#333',
                borderRadius: 2
              }}>
                <Typography sx={{ color: '#bbb' }}>
                  차트 데이터를 불러오는 중...
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
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
            borderRadius: 2
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
                        onClick={() => removeQuantityItem(item.id)}
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
              <Box sx={{ maxHeight: '300px', overflowY: 'auto', ...scrollbarHiddenStyle }}>
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
                        {item.month} | {formatGisungAmount(item.amount)}
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
