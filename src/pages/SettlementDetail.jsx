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
  Autocomplete
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
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { formatContractAmount, formatGisungAmount, formatBalanceAmount } from '../utils/formatUtils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

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
  const [materialForm, setMaterialForm] = useState({
    item: '',
    month: '',
    company: '',
    amount: '',
    차수: 1,
    note: ''
  });
  const [materialData, setMaterialData] = useState([]);
  const [savedCompanies, setSavedCompanies] = useState([]);
  const [materialItems] = useState(['복층', '강화', '접합', '기타']);
  const [safetyData, setSafetyData] = useState([]);
  const [scheduleData, setScheduleData] = useState([]);

  // 현장 정보 로드
  useEffect(() => {
    const fetchSiteData = async () => {
      try {
        setLoading(true);
        
        // 현장 정보 가져오기
        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        const sitesData = sitesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const currentSite = sitesData.find(s => s.id === siteId);
        
        if (!currentSite) {
          setSnackbar({
            open: true,
            message: '현장 정보를 찾을 수 없습니다.',
            severity: 'error'
          });
          navigate('/important-sites');
          return;
        }
        
        setSite(currentSite);
        
        // 기성금 데이터 가져오기
         try {
           const gisungQuery = query(
             collection(db, 'gisung'),
             where('siteId', '==', siteId)
           );
           const gisungSnapshot = await getDocs(gisungQuery);
           const gisungItems = gisungSnapshot.docs.map(doc => ({
             id: doc.id,
             ...doc.data()
           })).sort((a, b) => {
             const dateA = new Date(a.gisungDate || 0);
             const dateB = new Date(b.gisungDate || 0);
             return dateA - dateB;
           });
           console.log('기성금 쿼리 성공:', gisungItems);
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

    if (siteId) {
      fetchSiteData();
    }
  }, [siteId, navigate]);

  // 기성금 합계 계산 (청구완료 및 입금완료만)
  const totalGisungAmount = useMemo(() => {
    const filtered = gisungData.filter(item => item.claimStatus === '청구완료' && item.paymentStatus === '입금완료');
    const total = filtered.reduce((sum, item) => sum + (Number(item.gisungAmount) || 0), 0);
    console.log('기성금 데이터:', gisungData);
    console.log('필터링된 기성금:', filtered);
    console.log('기성금 합계:', total);
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

  // 자재비 추가 함수 (메모이제이션으로 불필요한 재렌더링 방지)
  const handleAddMaterial = useCallback(async () => {
    if (materialForm.item && materialForm.month && materialForm.company && materialForm.amount) {
      try {
        const newMaterial = {
          id: Date.now(),
          ...materialForm,
          amount: Number(materialForm.amount.replace(/,/g, '')), // 쉼표 제거 후 숫자 변환
          siteId: siteId,
          createdAt: new Date()
        };
        
        // Firebase에 저장
        const docRef = await addDoc(collection(db, 'material_costs'), newMaterial);
        
        // 로컬 상태 업데이트 (Firebase ID 포함)
        const materialWithId = { ...newMaterial, firebaseId: docRef.id };
        const updatedMaterialData = [...materialData, materialWithId];
        setMaterialData(updatedMaterialData);
        
        // 회사명 저장 (중복 제거)
        if (!savedCompanies.includes(materialForm.company)) {
          setSavedCompanies([...savedCompanies, materialForm.company]);
        }
        
        // 차수 계산 (업데이트된 데이터 기준)
        const new차수 = updatedMaterialData.filter(item => item.company === materialForm.company).length;
        
        setMaterialForm({
          item: '',
          month: '',
          company: materialForm.company, // 회사명 유지
          amount: '',
          차수: new차수,
          note: ''
        });
        setSnackbar({ open: true, message: '자재비가 추가되었습니다.', severity: 'success' });
      } catch (error) {
        console.error('자재비 저장 오류:', error);
        setSnackbar({ open: true, message: '자재비 저장에 실패했습니다.', severity: 'error' });
      }
    }
  }, [materialForm, materialData, siteId, savedCompanies]);

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

  // 자재비 상세내역 표시 (항목별로 정리)
  const showMaterialDetails = () => {
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

    // 월별 기성금 데이터
    const gisungByMonth = {};
    gisungData.forEach(item => {
      console.log('기성금 항목:', item);
      // gisungMonth 필드 사용 (예: '2025-07')
      if (item.gisungMonth && item.gisungAmount) {
        // gisungMonth를 차트 라벨 형식으로 변환 (2025-07 -> 2025.07)
        const monthKey = item.gisungMonth.replace('-', '.');
        if (!gisungByMonth[monthKey]) {
          gisungByMonth[monthKey] = 0;
        }
        gisungByMonth[monthKey] += Number(item.gisungAmount) || 0;
        console.log('기성금 추가됨:', { monthKey, amount: item.gisungAmount });
      }
    });
    
    console.log('차트용 기성금 데이터:', gisungByMonth);
    console.log('기성금 원본 데이터:', gisungData);

    // 월별 지출 데이터를 항목별로 분리
    const laborByMonth = {}; // 노무비
    const materialByMonth = {}; // 자재비 (materialData에서)
    const otherByMonth = {}; // 나머지 지출 (부자재비 포함)
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
        } else {
          // 자재비를 제외한 모든 지출 (부자재비, 장비비, 경비, 기타 등)
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
    console.log('차트용 기타 지출 데이터:', otherByMonth);
    console.log('차트용 월별 공수 데이터:', workersByMonth);
    console.log('일정 데이터:', scheduleData);

    const gisungValues = labels.map(label => gisungByMonth[label] || 0);
    const laborValues = labels.map(label => laborByMonth[label] || 0);
    const materialValues = labels.map(label => materialByMonth[label] || 0);
    const otherValues = labels.map(label => otherByMonth[label] || 0);
    const workersValues = labels.map(label => workersByMonth[label] || 0);
    
    console.log('월별 공수 값들:', workersValues);
    
    // 지출 총합계 계산 (노무비 + 자재비 + 기타지출)
    const totalCostValues = labels.map((label, index) => 
      (laborValues[index] || 0) + (materialValues[index] || 0) + (otherValues[index] || 0)
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
    console.log('노무비 값들:', laborValues);
    console.log('자재비 값들:', materialValues);
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
          label: '기타 지출',
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

      navigate('/important-sites');
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
              onClick={() => navigate('/important-sites')}
              sx={{ 
                color: '#90caf9',
                '&:hover': { bgcolor: '#333' }
              }}
            >
              뒤로가기
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#fff' }}>
              {site.name}_{todayString} 기준 정산내역
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip 
              icon={<AttachMoneyIcon />}
              label="정산관리" 
              color="primary" 
              variant="outlined"
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
              엑셀 다운로드
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialog({ open: true, siteId, siteName: site.name })}
              sx={{ 
                color: '#f44336',
                '&:hover': { bgcolor: 'rgba(244, 67, 54, 0.1)' }
              }}
            >
              정산 삭제
            </Button>
          </Box>
        </Box>
      </Box>

      {/* 모든 내용을 한 페이지에 배치 */}
      <Box sx={{ px: 3 }}>
        {/* 현장정보, 순수익정보, 지출정보를 한 줄에 배치 */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 현장정보 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '100%' }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, color: '#43e97b', display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon /> 현장정보
                </Typography>
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
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 순수익정보 */}
          <Grid item xs={12} md={4}>
            <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '100%', width: '280px' }}>
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
                <Card sx={{ bgcolor: '#232b3b', color: '#fff', height: '100%', width: '280px' }}>
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

              {/* 상세내역 */}
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
                        onClick={() => setMaterialDialog({ open: true })}
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
        onClose={() => setMaterialDialog({ open: false })}
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
          <AttachMoneyIcon /> 자재비 관리
        </DialogTitle>
        <DialogContent sx={scrollbarHiddenStyle}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>자재비 추가</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#bbb' }}>항목</InputLabel>
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
                  >
                    {materialItems.map((item) => (
                      <MenuItem key={item} value={item} sx={{ color: '#fff' }}>
                        {item}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
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
                            <MenuItem key={monthKey} value={monthKey} sx={{ color: '#fff' }}>
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
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={savedCompanies}
                  value={materialForm.company}
                  onChange={(event, newValue) => {
                    const company = newValue || '';
                    const 차수 = materialData.filter(item => item.company === company).length + 1;
                    setMaterialForm({...materialForm, company, 차수});
                  }}
                  onInputChange={(event, newInputValue) => {
                    const company = newInputValue || '';
                    const 차수 = materialData.filter(item => item.company === company).length + 1;
                    setMaterialForm({...materialForm, company, 차수});
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
                추가
              </Button>
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
            <Typography variant="h6" sx={{ mb: 2, color: '#fff' }}>등록된 자재비</Typography>
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
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      mb: 1,
                      bgcolor: '#333',
                      borderRadius: 1,
                      border: '1px solid #555'
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>
                        {item.item} ({item.company}) - {item.차수}차
                      </Typography>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>
                        {item.month} | {formatGisungAmount(item.amount)}
                      </Typography>
                      {item.note && (
                        <Typography sx={{ color: '#888', fontSize: '0.8rem', mt: 0.5, fontStyle: 'italic' }}>
                          비고: {item.note}
                        </Typography>
                      )}
                    </Box>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleDeleteMaterial(item.id)}
                      sx={{ minWidth: 'auto', p: 1 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </Button>
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
            onClick={() => setMaterialDialog({ open: false })}
            sx={{ color: '#bbb' }}
          >
            닫기
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
    </Box>
  );
}
