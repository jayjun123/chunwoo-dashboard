import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  Card,
  CardContent,
  useMediaQuery,
  useTheme,
  Switch,
  FormControlLabel,
  Divider,
  InputAdornment,
  Tooltip,
  Tabs,
  Tab,
  Checkbox,
  Container
} from '@mui/material';
import MobileSidebar from '../components/MobileSidebar';
import Grid from '@mui/material/Grid';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  Calculate as CalculateIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  Receipt as ReceiptIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { formatNumber } from '../utils/formatUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar as ChartBar, Pie as ChartPie } from 'react-chartjs-2';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, LabelList, LineChart, Line, CartesianGrid, ReferenceLine, ComposedChart } from 'recharts';
import { PieChart, Pie, Cell } from 'recharts';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const SettlementManagement = () => {
  const { siteId } = useParams();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 화면 크기 감지
  const [isIpad, setIsIpad] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsIpad(window.innerWidth >= 768 && window.innerWidth <= 1024);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // 상태 관리
  const [sites, setSites] = useState([]);
  const [settlements, setSettlements] = useState([]);
  const [costs, setCosts] = useState([]);
  const [safetyCosts, setSafetyCosts] = useState([]);
  const [gisungData, setGisungData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSite, setSelectedSite] = useState('');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, settlementId: null, siteName: '' });
  const [showCalculation, setShowCalculation] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [expensePage, setExpensePage] = useState(0);
  const [safetyPage, setSafetyPage] = useState(0);
  const [gisungPage, setGisungPage] = useState(0);
  
  // 차트 테마 상태 (true: 화이트모드, false: 다크모드)
  const [isChartLightMode, setIsChartLightMode] = useState(false);

  // 기성률에 따른 색상 결정 함수
  const getGisungRateColor = (rate) => {
    if (rate >= 100) return '#43e97b'; // 초록색
    if (rate >= 66) return '#ffeb3b';  // 노랑색
    if (rate >= 33) return '#ff9800';  // 주황색
    return '#f44336'; // 빨간색
  };

  // 백만원을 억원 단위로 변환하는 함수
  const formatMillionToEok = (value) => {
    const isNegative = value < 0;
    const absValue = Math.abs(value);
    const eok = Math.floor(absValue / 100); // 억 단위
    const remainder = absValue % 100; // 나머지 (백만원 단위)
    
    let result = '';
    
    if (eok === 0) {
      if (remainder < 10) {
        result = `${remainder}백만원`;
      } else {
        const cheonman = Math.floor(remainder / 10); // 천만원 단위
        const baekman = remainder % 10; // 백만원 단위
        if (baekman === 0) {
          result = `${cheonman}천만원`;
        } else {
          result = `${cheonman}천${baekman}백만원`;
        }
      }
    } else if (remainder === 0) {
      result = `${eok}억원`;
    } else {
      if (remainder < 10) {
        result = `${eok}억${remainder}백만원`;
      } else {
        const cheonman = Math.floor(remainder / 10); // 천만원 단위
        const baekman = remainder % 10; // 백만원 단위
        if (baekman === 0) {
          result = `${eok}억${cheonman}천만원`;
        } else {
          result = `${eok}억${cheonman}천${baekman}백만원`;
        }
      }
    }
    
    return isNegative ? `-${result}` : result;
  };
  const [settlementPage, setSettlementPage] = useState(0);
  const itemsPerPage = 10;
  
  // 체크박스 필터링 상태 (차트용)
  const [selectedSites, setSelectedSites] = useState(new Set());
  const [isAllSelected, setIsAllSelected] = useState(true);
  
  // 테이블 정렬 상태
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  
  // 체크박스 핸들러 함수들
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedSites(new Set());
      setIsAllSelected(false);
    } else {
      setSelectedSites(new Set(settlements.map(s => s.siteId)));
      setIsAllSelected(true);
    }
  };
  
  const handleSiteSelect = (siteId) => {
    const newSelected = new Set(selectedSites);
    if (newSelected.has(siteId)) {
      newSelected.delete(siteId);
    } else {
      newSelected.add(siteId);
    }
    setSelectedSites(newSelected);
    setIsAllSelected(newSelected.size === settlements.length);
  };
  
  // 정렬 핸들러
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // 정산페이지 접근 인증 관련 상태
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // 차트 데이터 생성 함수
  const getChartData = (site, totalGisung) => {
    const contract = Number(site.contractAmount) || 0;
    const balance = contract - totalGisung; // 잔액 계산
    // 천단위로 변환
    const contractInThousand = Math.round(contract / 1000);
    const totalGisungInThousand = Math.round(totalGisung / 1000);
    const balanceInThousand = Math.round(balance / 1000);
    const chartData = {
      labels: ['계약금', '기성', '잔액'],
      datasets: [
        {
          label: '금액(천원)',
          data: [contractInThousand, totalGisungInThousand, balanceInThousand],
          backgroundColor: [
            '#1976d2', // 계약금 - 파랑
            '#43e97b', // 기성 - 연두
            '#f44336', // 잔액 - 빨강
          ],
          borderRadius: 8,
          barPercentage: 0.7,
          categoryPercentage: 0.5
        }
      ]
    };
    return chartData;
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      title: { display: false }
    },
    scales: {
      x: {
        grid: { color: '#333' },
        ticks: { color: '#bbb', font: { weight: 700 } }
      },
      y: {
        grid: { color: '#222' },
        ticks: { color: '#bbb', font: { weight: 700 } }
      }
    }
  };

  // 차트용 필터링된 settlements 데이터 (체크박스 기준)
  const chartFilteredSettlements = settlements.filter(settlement => 
    isAllSelected || selectedSites.has(settlement.siteId)
  );
  
  // 테이블용 정렬된 settlements 데이터 (모든 데이터 표시, 정렬만 적용)
  const sortedSettlements = [...settlements].sort((a, b) => {
    if (!sortField) return 0;
    
    let aVal = a[sortField] || 0;
    let bVal = b[sortField] || 0;
    
    // 숫자 필드들
    if (['contractAmount', 'gisungAmount', 'gisungRate', 'materialCost', 'laborCost', 'subMaterialCost', 'equipmentCost', 'expenseCost', 'safetyCost'].includes(sortField)) {
      aVal = Number(aVal);
      bVal = Number(bVal);
    }
    // 문자열 필드들
    else if (sortField === 'siteName') {
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  // 꺾은선 차트 데이터 생성 (백만원 단위)
  const getLineChartData = () => {
    return chartFilteredSettlements.map(settlement => {
      const contractAmount = settlement.contractAmount || 0;
      const gisungAmount = settlement.gisungAmount || 0;
      const gisungRate = contractAmount > 0 ? Math.round((gisungAmount / contractAmount) * 100) : 0;
      const balanceAmount = contractAmount - gisungAmount;
      
      return {
        name: settlement.siteName ? settlement.siteName.substring(0, 6) : '',
        계약금액: Math.round(contractAmount / 1000000),
        기성금액: Math.round(gisungAmount / 1000000),
        잔액: Math.round(balanceAmount / 1000000),
        기성률: gisungRate, // 퍼센트
        총비용: Math.round(((settlement.materialCost || 0) + (settlement.laborCost || 0) + 
                (settlement.subMaterialCost || 0) + (settlement.equipmentCost || 0) + 
                (settlement.expenseCost || 0) + (settlement.safetyCost || 0)) / 1000000),
        순이익: Math.round(((settlement.gisungAmount || 0) - 
                ((settlement.materialCost || 0) + (settlement.laborCost || 0) + 
                 (settlement.subMaterialCost || 0) + (settlement.equipmentCost || 0) + 
                 (settlement.expenseCost || 0) + (settlement.safetyCost || 0))) / 1000000),
        // 개별 지출 항목들 (툴팁용)
        materialCost: Math.round((settlement.materialCost || 0) / 1000000),
        laborCost: Math.round((settlement.laborCost || 0) / 1000000),
        subMaterialCost: Math.round((settlement.subMaterialCost || 0) / 1000000),
        equipmentCost: Math.round((settlement.equipmentCost || 0) / 1000000),
        expenseCost: Math.round((settlement.expenseCost || 0) / 1000000),
        safetyCost: Math.round((settlement.safetyCost || 0) / 1000000)
      };
    });
  };

  // 통계 데이터 계산
  const getStats = () => {
    const totalContract = chartFilteredSettlements.reduce((sum, s) => sum + (s.contractAmount || 0), 0);
    const totalGisung = chartFilteredSettlements.reduce((sum, s) => sum + (s.gisungAmount || 0), 0);
    const totalCost = chartFilteredSettlements.reduce((sum, s) => 
      sum + (s.materialCost || 0) + (s.laborCost || 0) + (s.subMaterialCost || 0) + 
      (s.equipmentCost || 0) + (s.expenseCost || 0) + (s.safetyCost || 0), 0);
    const totalProfit = totalGisung - totalCost;
    
    return {
      totalContract,
      totalGisung,
      totalCost,
      totalProfit,
      profitRate: totalGisung > 0 ? Math.round((totalProfit / totalGisung) * 100) : 0
    };
  };
  
  // 정산 데이터 상태
  const [formData, setFormData] = useState({
    siteName: '',
    projectName: '',
    contractAmount: 0,
    advanceAmount: 0,
    progressData: {
      spandrel: { m2: 0, pyeong: 0 },
      vision: { m2: 0, pyeong: 0 },
      reinforced12: { m2: 0, pyeong: 0 },
      reinforced8: { m2: 0, pyeong: 0 }
    },
    laborCost: {
      equipment24T: { unitPrice: 1500, quantity: 0, totalCost: 0 },
      equipment12T: { unitPrice: 1500, quantity: 0, totalCost: 0 },
      equipment8T: { unitPrice: 1000, quantity: 0, totalCost: 0 }
    },
    payments: [],
    settlementStatus: '진행중',
    notes: ''
  });

  // 현장 데이터 로드 (인증된 경우에만)
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadSites = async () => {
      try {
        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        const sitesData = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSites(sitesData);
        console.log('현장 데이터 로드 완료:', sitesData.length, '개');
      } catch (error) {
        console.error('현장 데이터 로드 실패:', error);
        setSites([]); // 오류 시 빈 배열로 설정
      }
    };
    loadSites();
  }, [isAuthenticated]);

  // 정산 데이터 로드 (기성관리페이지에서 데이터 가져오기)
  useEffect(() => {
    if (!isAuthenticated || sites.length === 0) return;
    
    const loadSettlements = async () => {
      try {
        console.log('정산 데이터 로드 시작...');
        
        // 기성금 데이터 로드
        const gisungSnapshot = await getDocs(collection(db, 'gisung'));
        const gisungData = gisungSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

  // 지출 데이터 로드
        const costsSnapshot = await getDocs(collection(db, 'costs'));
        const costsData = costsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

  // 안전관리비 데이터 로드
        const safetySnapshot = await getDocs(collection(db, 'safety_costs'));
        const safetyData = safetySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // 자재비 데이터 로드 (정산 상세페이지에서 입력된 자재비)
        const materialSnapshot = await getDocs(collection(db, 'material_costs'));
        const materialData = materialSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // 정산페이지가 생성된 현장만 필터링 (sites가 로드되었을 때만)
        const sitesWithSettlement = sites.length > 0 ? sites.filter(site => site.settlementPageCreated === true) : [];
        console.log('전체 현장 수:', sites.length);
        console.log('정산페이지가 있는 현장 수:', sitesWithSettlement.length);
        console.log('정산페이지가 있는 현장들:', sitesWithSettlement.map(s => s.name));
        
        // 현장별로 데이터 집계 (정산페이지가 생성된 현장만)
        const siteSummary = {};
        
        // 정산페이지가 생성된 현장들만 초기화 (데이터 소스별로 정리)
        sitesWithSettlement.forEach(site => {
          siteSummary[site.id] = {
            siteId: site.id,
            // 현장관리페이지 (sites 컬렉션)에서 가져오는 데이터
            siteName: site.name,                    // 현장명
            contractAmount: Number(site.contractAmount) || 0,  // 계약금액
            notes: site.notes || '',                // 비고
            
            // 기성금관리페이지 (gisung 컬렉션)에서 가져오는 데이터
            gisungAmount: 0,                        // 기성금액
            
            // 지출관리페이지 (costs 컬렉션)에서 가져오는 데이터
            materialCost: 0,                        // 자재비 (상세페이지에서 입력)
            laborCost: 0,                           // 노무비
            subMaterialCost: 0,                     // 부자재비 (기성관리 자재비 포함)
            equipmentCost: 0,                       // 장비비 (지게차, 스카이, 곤도라)
            expenseCost: 0,                         // 경비 (월세, 임대료, 식대, 유류비)
            
            // 안전관리비관리페이지 (safety_costs 컬렉션)에서 가져오는 데이터
            safetyCost: 0                           // 안전관리비
          };
        });
        
        // 기성금관리페이지 (gisung 컬렉션)에서 데이터 집계
        console.log('기성금 데이터 총 개수:', gisungData.length);
        const statusCounts = {};
        gisungData.forEach(gisung => {
          // 모든 필드 출력
          console.log('기성금 데이터 전체:', gisung);
          
          // 상태별 카운트 (여러 가능한 필드명 확인)
          const status = gisung.claimStatus || gisung.status || gisung.paymentStatus || gisung.state;
          statusCounts[status] = (statusCounts[status] || 0) + 1;
          
          // siteId로 먼저 매칭 시도
          let matchedSiteId = null;
          if (gisung.siteId && siteSummary[gisung.siteId]) {
            matchedSiteId = gisung.siteId;
          } 
          // siteId가 없거나 매칭되지 않으면 현장명으로 매칭 시도
          else if (gisung.name) {
            const matchedSite = sitesWithSettlement.find(site => site.name === gisung.name);
            if (matchedSite && siteSummary[matchedSite.id]) {
              matchedSiteId = matchedSite.id;
            }
          }
          
          if (matchedSiteId) {
            console.log(`기성금 매칭 성공: 현장=${gisung.name || gisung.siteId}, siteId=${matchedSiteId}, 상태=${status}, 금액=${gisung.gisungAmount}`);
            // 입금완료 상태의 기성금만 포함
            if (gisung.paymentStatus === '입금완료') {
              // 기성금관리페이지의 기성금액 (입금완료만)
              siteSummary[matchedSiteId].gisungAmount += Number(gisung.gisungAmount) || 0;
              console.log(`✅ 입금완료 기성금 추가: ${gisung.name} - ${Number(gisung.gisungAmount) || 0}원`);
            } else {
              console.log(`❌ 기성금 제외: ${gisung.name} - ${Number(gisung.gisungAmount) || 0}원 (claimStatus: ${gisung.claimStatus}, paymentStatus: ${gisung.paymentStatus || '미설정'})`);
            }
          } else {
            console.log(`기성금 매칭 실패: 현장=${gisung.name || gisung.siteId}, siteId=${gisung.siteId}`);
          }
        });
        console.log('기성금 상태별 개수:', statusCounts);
        
        // 지출관리페이지 (costs 컬렉션)에서 데이터 집계
        costsData.forEach(cost => {
          if (cost.site && cost.site !== '여러현장' && cost.site !== '공통비용') {
            const siteId = sites.find(s => s.name === cost.site)?.id;
            if (siteId && siteSummary[siteId]) {
              const amount = Number(cost.totalValue) || 0;
              switch (cost.itemType) {
                case '자재비':
                  // 기성관리페이지의 자재비는 부자재비로 분류
                  siteSummary[siteId].subMaterialCost += amount;
                  break;
                case '노무비':
                case '필름':
                  // 지출관리페이지의 노무비 (필름 포함)
                  siteSummary[siteId].laborCost += amount;
                  break;
                case '부자재':
                  // 지출관리페이지의 부자재
                  siteSummary[siteId].subMaterialCost += amount;
                  break;
                case '지게차':
                case '스카이':
                case '곤도라':
                  // 지출관리페이지의 장비비 (지게차, 스카이, 곤도라)
                  siteSummary[siteId].equipmentCost += amount;
                  break;
                case '월세':
                case '임대료':
                case '식대':
                case '유류비':
                  // 지출관리페이지의 경비 (월세, 임대료, 식대, 유류비)
                  siteSummary[siteId].expenseCost += amount;
                  break;
                default:
                  // 기타 지출은 경비로 분류
                  siteSummary[siteId].expenseCost += amount;
              }
            }
          }
        });
        
        // 안전관리비관리페이지 (safety_costs 컬렉션)에서 데이터 집계
        safetyData.forEach(safety => {
          if (safety.siteName) {
            const siteId = sites.find(s => s.name === safety.siteName)?.id;
            if (siteId && siteSummary[siteId]) {
              // 안전관리비관리페이지의 안전관리비
              siteSummary[siteId].safetyCost += Number(safety.amount) || 0;
            }
          }
        });

        // 자재비 (material_costs 컬렉션)에서 데이터 집계
        materialData.forEach(material => {
          if (material.siteId && siteSummary[material.siteId]) {
            // 정산 상세페이지에서 입력된 자재비 (amount 필드 사용)
            siteSummary[material.siteId].materialCost += Number(material.amount) || 0;
          }
        });
        
        const settlementsData = Object.values(siteSummary).map(settlement => {
          // 기성률 계산 추가
          const contractAmount = settlement.contractAmount || 0;
          const gisungAmount = settlement.gisungAmount || 0;
          const gisungRate = contractAmount > 0 ? Math.round((gisungAmount / contractAmount) * 100) : 0;
          
          return {
            ...settlement,
            gisungRate: gisungRate
          };
        });
        console.log('정산 데이터 로드 완료:', settlementsData);
        setSettlements(settlementsData);
        
        // 기본적으로 모든 사이트 선택
        setSelectedSites(new Set(settlementsData.map(s => s.siteId)));
        setIsAllSelected(true);
        
        setLoading(false);
      } catch (error) {
        console.error('정산 데이터 로드 실패:', error);
        setSettlements([]);
        setLoading(false);
      }
    };
    loadSettlements();
  }, [isAuthenticated, sites]);

  // 컴포넌트 마운트 시 비밀번호 다이얼로그 표시
  useEffect(() => {
    setShowPasswordDialog(true);
  }, []);

  // 비밀번호 인증 관련 함수들
  const handlePasswordSubmit = () => {
    if (password === '2046') {
      setShowPasswordDialog(false);
      setPassword('');
      setPasswordError('');
      setIsAuthenticated(true);
      setLoading(true); // 인증 후 데이터 로딩 시작
      
      // 3초 후 로딩 해제 (데이터 로딩 완료를 기다리지 않고)
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } else {
      setPasswordError('비밀번호가 올바르지 않습니다.');
    }
  };

  const handlePasswordDialogClose = () => {
    // 비밀번호 입력 없이 닫으면 이전 페이지로 이동
    navigate(-1);
  };

  // 히트맵 엑셀 다운로드 함수 (ExcelJS - 견적 기타 구분 포함)
  const handleHeatmapExcelDownload = async () => {
    try {
      console.log('📊 히트맵 엑셀 다운로드 시작');
      
      if (!settlements || settlements.length === 0) {
        alert('다운로드할 정산 데이터가 없습니다.');
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('정산내역 히트맵');

      // 제목 행 추가
      const titleRow = worksheet.addRow(['천우건업(주) 정산내역 히트맵']);
      titleRow.font = { size: 16, bold: true, color: { argb: 'FF2E7D32' } };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.mergeCells('A1:L1');
      
      // 빈 행 추가
      worksheet.addRow([]);
      
      // 날짜 행 추가
      const dateRow = worksheet.addRow([`작성일: ${new Date().toLocaleDateString('ko-KR')}`]);
      dateRow.font = { size: 12, color: { argb: 'FF666666' } };
      dateRow.alignment = { horizontal: 'right' };
      worksheet.mergeCells('A3:L3');
      
      // 빈 행 추가
      worksheet.addRow([]);

      // 헤더 행 추가
      const headers = [
        '번호', '현장명', '기성률', '계약금액', '누계기성', '지급금액', 
        '미지급금액', '안전관리비', '견적상태', '계약구분', '정산일', '비고'
      ];
      
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2E7D32' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } }
      };

      // 데이터 행 추가
      settlements.forEach((settlement, index) => {
        const contractAmount = Number(settlement.contractAmount) || 0;
        const totalGisung = Number(settlement.totalGisung) || 0;
        const paidAmount = Number(settlement.paidAmount) || 0;
        const unpaidAmount = Number(settlement.unpaidAmount) || 0;
        const safetyCost = Number(settlement.safetyCost) || 0;
        
        // 기성률 계산
        const gisungRate = contractAmount > 0 ? ((totalGisung / contractAmount) * 100).toFixed(1) : '0.0';
        
        // 견적상태 구분 (기성률에 따른)
        let estimateStatus = '';
        if (parseFloat(gisungRate) >= 100) {
          estimateStatus = '완료';
        } else if (parseFloat(gisungRate) >= 80) {
          estimateStatus = '진행중';
        } else if (parseFloat(gisungRate) >= 20) {
          estimateStatus = '견적';
        } else {
          estimateStatus = '기타';
        }

        const dataRow = worksheet.addRow([
          index + 1, // 번호
          settlement.siteName || '', // 현장명
          `${gisungRate}%`, // 기성률
          contractAmount.toLocaleString(), // 계약금액
          totalGisung.toLocaleString(), // 누계기성
          paidAmount.toLocaleString(), // 지급금액
          unpaidAmount.toLocaleString(), // 미지급금액
          safetyCost.toLocaleString(), // 안전관리비
          estimateStatus, // 견적상태
          settlement.contractType || '', // 계약구분
          settlement.settlementDate || '', // 정산일
          settlement.notes || '' // 비고
        ]);

        // 행 스타일 적용
        dataRow.font = { size: 11 };
        dataRow.alignment = { 
          horizontal: 'center', 
          vertical: 'middle' 
        };
        dataRow.border = {
          top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
          right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
        };

        // 현장명은 왼쪽 정렬
        dataRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        
        // 금액 컬럼들은 오른쪽 정렬
        dataRow.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }; // 계약금액
        dataRow.getCell(5).alignment = { horizontal: 'right', vertical: 'middle' }; // 누계기성
        dataRow.getCell(6).alignment = { horizontal: 'right', vertical: 'middle' }; // 지급금액
        dataRow.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' }; // 미지급금액
        dataRow.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' }; // 안전관리비
        
        // 비고는 왼쪽 정렬
        dataRow.getCell(12).alignment = { horizontal: 'left', vertical: 'middle' };

        // 견적상태에 따른 색상 적용
        const statusCell = dataRow.getCell(9);
        switch (estimateStatus) {
          case '완료':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F5E8' }
            };
            statusCell.font = { color: { argb: 'FF2E7D32' }, bold: true };
            break;
          case '진행중':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF3E5F5' }
            };
            statusCell.font = { color: { argb: 'FF7B1FA2' }, bold: true };
            break;
          case '견적':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE3F2FD' }
            };
            statusCell.font = { color: { argb: 'FF1976D2' }, bold: true };
            break;
          case '기타':
            statusCell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF3E0' }
            };
            statusCell.font = { color: { argb: 'FFF57C00' }, bold: true };
            break;
        }

        // 기성률에 따른 색상 적용 (히트맵 효과)
        const rateCell = dataRow.getCell(3);
        const rate = parseFloat(gisungRate);
        if (rate >= 100) {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4CAF50' }
          };
          rateCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else if (rate >= 80) {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF8BC34A' }
          };
          rateCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else if (rate >= 60) {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFEB3B' }
          };
          rateCell.font = { color: { argb: 'FF000000' }, bold: true };
        } else if (rate >= 40) {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF9800' }
          };
          rateCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else {
          rateCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF44336' }
          };
          rateCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        }
      });

      // 컬럼 너비 설정
      worksheet.columns = [
        { width: 8 },  // 번호
        { width: 25 }, // 현장명
        { width: 10 }, // 기성률
        { width: 15 }, // 계약금액
        { width: 15 }, // 누계기성
        { width: 15 }, // 지급금액
        { width: 15 }, // 미지급금액
        { width: 15 }, // 안전관리비
        { width: 10 }, // 견적상태
        { width: 12 }, // 계약구분
        { width: 12 }, // 정산일
        { width: 30 }  // 비고
      ];

      // 파일명 생성
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const fileName = `천우건업(주)_정산내역_히트맵_${dateStr}.xlsx`;

      // 파일 다운로드
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log('✅ 히트맵 엑셀 다운로드 완료');
      alert('정산내역 히트맵 엑셀 파일이 다운로드되었습니다.');
      
    } catch (error) {
      console.error('❌ 히트맵 엑셀 다운로드 실패:', error);
      alert('엑셀 다운로드에 실패했습니다.');
    }
  };

  // 지출 데이터 로드
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadCosts = async () => {
      try {
        const costsSnapshot = await getDocs(collection(db, 'costs'));
        const costsData = costsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCosts(costsData);
      } catch (error) {
        console.error('지출 데이터 로드 실패:', error);
      }
    };
    loadCosts();
  }, [isAuthenticated]);

  // 인증되지 않은 경우 비밀번호 다이얼로그만 표시
  if (!isAuthenticated) {
    return (
      <>
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
        </Box>
        
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
      </>
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        backgroundColor: '#1a1a1a', 
        minHeight: '100vh',
        color: 'white',
        p: 3,
        textAlign: 'center'
      }}>
        <Typography variant="h4" sx={{ color: '#ff9800', mb: 2 }}>
          {siteId ? '정산 상세' : '정산 관리'}
        </Typography>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: 'relative'
    }}>
      {/* 모바일 사이드바 */}
      <MobileSidebar />
      
      {/* 메인 콘텐츠 */}
      <Container 
        maxWidth={false} 
        sx={{ 
          pt: 2,
          pb: 3,
          px: 1,
          ml: 0,
          mr: 0,
          maxWidth: '100%'
        }}
      >
        <Box sx={{ 
          backgroundColor: '#1a1a1a', 
          minHeight: '100vh',
          color: 'white',
          p: { xs: 1, md: 3 },
          borderRadius: 2,
          boxShadow: 3,
          pt: { xs: '49px', md: '74px' }
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: { xs: 2, md: 3 }, // 아이패드에서 마진 줄임
        p: { xs: 2, md: 0 } // 아이패드에서 패딩 추가
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AttachMoneyIcon sx={{ fontSize: '2rem', color: '#ff9800' }} />
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
            정산내역
          </Typography>
          <Chip 
            label={`총 ${settlements.length}개`} 
            size="medium"
            sx={{ 
              backgroundColor: '#ff9800', 
              color: '#fff',
              fontSize: '1rem'
            }} 
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => navigate('/whole-list')}
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#ff9800' }
            }}
          >
            전체현장 엑셀 다운로드
          </Button>
          {!siteId && (
            <Button
              variant="contained"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(-1)}
              sx={{
                backgroundColor: '#ff9800',
                '&:hover': { backgroundColor: '#f57c00' }
              }}
            >
              돌아가기
            </Button>
          )}
        </Box>
      </Box>

      {/* 통계 카드들 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={4}>
          <Card sx={{ 
            p: 2, 
            height: '100%', 
            bgcolor: '#181f2e', 
            color: '#fff',
            border: '1px solid #232b3b',
            minHeight: '120px'
          }}>
            <CardContent>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: '#bbb', 
                  mb: 1,
                  fontSize: '0.9rem'
                }}
              >
                총 계약금액
              </Typography>
              <Typography 
                variant="h4" 
                color="#43e97b" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.8rem'
                }}
              >
                {formatNumber(getStats().totalContract)}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <Card sx={{ 
            p: 2, 
            height: '100%', 
            bgcolor: '#181f2e', 
            color: '#fff',
            border: '1px solid #232b3b',
            minHeight: '120px'
          }}>
            <CardContent>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: '#bbb', 
                  mb: 1,
                  fontSize: '0.9rem'
                }}
              >
                총 기성금액
              </Typography>
              <Typography 
                variant="h4" 
                color="#43e97b" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.8rem'
                }}
              >
                {formatNumber(getStats().totalGisung)}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          <Card sx={{ 
            p: 2, 
            height: '100%', 
            bgcolor: '#181f2e', 
            color: '#fff',
            border: '1px solid #232b3b',
            minHeight: '120px'
          }}>
            <CardContent>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: '#bbb', 
                  mb: 1,
                  fontSize: '0.9rem'
                }}
              >
                총 비용
              </Typography>
              <Typography 
                variant="h4" 
                color="#ef5350" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.8rem'
                }}
              >
                {formatNumber(getStats().totalCost)}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card sx={{ 
            p: 2, 
            height: '100%', 
            bgcolor: '#181f2e', 
            color: '#fff',
            border: '1px solid #232b3b',
            minHeight: '120px'
          }}>
            <CardContent>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  color: '#bbb', 
                  mb: 1,
                  fontSize: '0.9rem'
                }}
              >
                순이익
              </Typography>
              <Typography 
                variant="h4" 
                color={getStats().totalProfit >= 0 ? '#43e97b' : '#f44336'} 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.8rem'
                }}
              >
                {formatNumber(getStats().totalProfit)}원
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 차트 섹션 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2, 
        mb: 3, 
        width: '100%',
        maxWidth: '100%'
      }}>
        <Paper sx={{ 
          p: 3, 
          height: '400px', 
          flex: 1,
          bgcolor: isChartLightMode ? '#ffffff' : '#181f2e',
          border: isChartLightMode ? '1px solid #e0e0e0' : '1px solid #232b3b'
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ 
                color: isChartLightMode ? '#333' : '#fff', 
                fontWeight: 'bold' 
              }}>
                현장별 기성/지출 현황(유리자재 별도)
              </Typography>
              <Tooltip title={isChartLightMode ? "다크모드로 변경" : "화이트모드로 변경"}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setIsChartLightMode(!isChartLightMode)}
                  startIcon={isChartLightMode ? <DarkModeIcon /> : <LightModeIcon />}
                  sx={{
                    borderColor: isChartLightMode ? '#666' : '#43e97b',
                    color: isChartLightMode ? '#666' : '#43e97b',
                    '&:hover': {
                      borderColor: isChartLightMode ? '#333' : '#43e97b',
                      backgroundColor: isChartLightMode ? 'rgba(0, 0, 0, 0.1)' : 'rgba(67, 233, 123, 0.1)'
                    }
                  }}
                >
                  {isChartLightMode ? '다크모드' : '화이트모드'}
                </Button>
              </Tooltip>
            </Box>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getLineChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke={isChartLightMode ? '#e0e0e0' : '#333'} />
                <XAxis 
                  dataKey="name" 
                  stroke={isChartLightMode ? '#666' : '#bbb'}
                  tick={{ fontSize: 16, fontWeight: 'bold', dx: 0, dy: 0, fill: isChartLightMode ? '#333' : '#bbb' }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  stroke={isChartLightMode ? '#666' : '#bbb'} 
                  fontSize={12}
                  tick={{ fill: isChartLightMode ? '#333' : '#bbb' }}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  label={{ value: '금액 (백만원)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: isChartLightMode ? '#333' : '#bbb' } }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isChartLightMode ? '#ffffff' : '#2a2a2a', 
                    border: isChartLightMode ? '1px solid #e0e0e0' : '1px solid #333',
                    color: isChartLightMode ? '#333' : '#fff',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: isChartLightMode ? '#ffffff' : '#2a2a2a',
                          border: isChartLightMode ? '1px solid #e0e0e0' : '1px solid #333',
                          borderRadius: '8px',
                          minWidth: '200px'
                        }}>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 'bold', 
                            mb: 1,
                            color: isChartLightMode ? '#333' : '#fff'
                          }}>
                            {label}
                          </Typography>
                          
                          {/* 기성금 섹션 */}
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#43e97b', 
                              fontWeight: 'bold',
                              display: 'block',
                              mb: 0.5
                            }}>
                              [기성금]
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              기성금액: {formatMillionToEok(data.기성금액)}
                            </Typography>
                          </Box>

                          {/* 수입 섹션 */}
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#2196f3', 
                              fontWeight: 'bold',
                              display: 'block',
                              mb: 0.5
                            }}>
                              -수입-
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: '#2196f3',
                              ml: 1,
                              fontWeight: 'bold'
                            }}>
                              입금완료: {formatMillionToEok(data.기성금액)}
                            </Typography>
                          </Box>

                          {/* 지출 섹션 */}
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#ef5350', 
                              fontWeight: 'bold',
                              display: 'block',
                              mb: 0.5
                            }}>
                              -지출-
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              노무비: {formatMillionToEok(data.laborCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              부자재비: {formatMillionToEok(data.subMaterialCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              장비비: {formatMillionToEok(data.equipmentCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              경비: {formatMillionToEok(data.expenseCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              안전관리비: {formatMillionToEok(data.safetyCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              기타: {formatMillionToEok(data.materialCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: '#f44336',
                              ml: 1,
                              fontWeight: 'bold',
                              mt: 1,
                              pt: 1,
                              borderTop: `1px solid ${isChartLightMode ? '#e0e0e0' : '#333'}`
                            }}>
                              총지출금액: {formatMillionToEok((data.laborCost || 0) + (data.subMaterialCost || 0) + (data.equipmentCost || 0) + (data.expenseCost || 0) + (data.safetyCost || 0) + (data.materialCost || 0))}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend />
                <ReferenceLine y={0} stroke="#ff0000" strokeDasharray="5 5" strokeWidth={2} />
                <Line 
                  type="monotone" 
                  dataKey="기성금액" 
                  stroke="#43e97b" 
                  strokeWidth={2}
                  name="기성금액"
                />
                <Line 
                  type="monotone" 
                  dataKey="총비용" 
                  stroke="#ef5350" 
                  strokeWidth={2}
                  name="총비용"
                />
                <Line 
                  type="monotone" 
                  dataKey="순이익" 
                  stroke="#ff9800" 
                  strokeWidth={2}
                  name="순이익"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        <Paper sx={{ 
          p: 3, 
          height: '400px', 
          flex: 1,
          bgcolor: isChartLightMode ? '#ffffff' : '#181f2e',
          border: isChartLightMode ? '1px solid #e0e0e0' : '1px solid #232b3b'
        }}>
            <Typography variant="h6" sx={{ 
              color: isChartLightMode ? '#333' : '#fff', 
              mb: 2, 
              fontWeight: 'bold' 
            }}>
              현장별 계약금/기성/잔액
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={getLineChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke={isChartLightMode ? '#e0e0e0' : '#333'} />
                <XAxis 
                  dataKey="name" 
                  stroke={isChartLightMode ? '#666' : '#bbb'}
                  tick={{ fontSize: 16, fontWeight: 'bold', dx: 0, dy: 0, fill: isChartLightMode ? '#333' : '#bbb' }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  yAxisId="left"
                  stroke={isChartLightMode ? '#666' : '#bbb'} 
                  fontSize={12}
                  tick={{ fill: isChartLightMode ? '#333' : '#bbb' }}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  label={{ value: '금액 (백만원)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: isChartLightMode ? '#333' : '#bbb' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#ff9800" 
                  fontSize={12}
                  tick={{ fill: '#ff9800' }}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  label={{ value: '기성률 (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#ff9800' } }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isChartLightMode ? '#ffffff' : '#2a2a2a', 
                    border: isChartLightMode ? '1px solid #e0e0e0' : '1px solid #333',
                    color: isChartLightMode ? '#333' : '#fff',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <Box sx={{ 
                          p: 2, 
                          bgcolor: isChartLightMode ? '#ffffff' : '#2a2a2a',
                          border: isChartLightMode ? '1px solid #e0e0e0' : '1px solid #333',
                          borderRadius: '8px',
                          minWidth: '200px'
                        }}>
                          <Typography variant="subtitle2" sx={{ 
                            fontWeight: 'bold', 
                            mb: 1,
                            color: isChartLightMode ? '#333' : '#fff'
                          }}>
                            {label}
                          </Typography>
                          
                          {/* 기성금 섹션 */}
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#43e97b', 
                              fontWeight: 'bold',
                              display: 'block',
                              mb: 0.5
                            }}>
                              [기성금]
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              기성금액: {formatMillionToEok(data.기성금액)}
                            </Typography>
                          </Box>

                          {/* 수입 섹션 */}
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#2196f3', 
                              fontWeight: 'bold',
                              display: 'block',
                              mb: 0.5
                            }}>
                              -수입-
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: '#2196f3',
                              ml: 1,
                              fontWeight: 'bold'
                            }}>
                              입금완료: {formatMillionToEok(data.기성금액)}
                            </Typography>
                          </Box>

                          {/* 지출 섹션 */}
                          <Box sx={{ mb: 1 }}>
                            <Typography variant="caption" sx={{ 
                              color: '#ef5350', 
                              fontWeight: 'bold',
                              display: 'block',
                              mb: 0.5
                            }}>
                              -지출-
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              부자재비: {formatMillionToEok(data.subMaterialCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              노무비: {formatMillionToEok(data.laborCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              장비비: {formatMillionToEok(data.equipmentCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              경비: {formatMillionToEok(data.expenseCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              안전관리비: {formatMillionToEok(data.safetyCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: isChartLightMode ? '#333' : '#fff',
                              ml: 1
                            }}>
                              기타: {formatMillionToEok(data.materialCost || 0)}
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              color: '#f44336',
                              ml: 1,
                              fontWeight: 'bold',
                              mt: 1,
                              pt: 1,
                              borderTop: `1px solid ${isChartLightMode ? '#e0e0e0' : '#333'}`
                            }}>
                              총지출금액: {formatMillionToEok((data.laborCost || 0) + (data.subMaterialCost || 0) + (data.equipmentCost || 0) + (data.expenseCost || 0) + (data.safetyCost || 0) + (data.materialCost || 0))}
                            </Typography>
                          </Box>

                          {/* 기성률 정보 */}
                          <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${isChartLightMode ? '#e0e0e0' : '#333'}` }}>
                            <Typography variant="body2" sx={{ 
                              color: '#ff9800',
                              fontWeight: 'bold'
                            }}>
                              기성률: {data.기성률}%
                            </Typography>
                          </Box>
                        </Box>
                      );
                    }
                    return null;
                  }}
                />
                <RechartsLegend />
                <Bar key="contract" yAxisId="left" dataKey="계약금액" fill="#1976d2" name="계약금액" />
                <Bar key="gisung" yAxisId="left" dataKey="기성금액" fill="#43e97b" name="기성금액" />
                <Bar key="balance" yAxisId="left" dataKey="잔액" fill="#f44336" name="잔액" />
                <Line key="rate" yAxisId="right" type="monotone" dataKey="기성률" stroke="#ff9800" strokeWidth={3} name="기성률" dot={{ fill: '#ff9800', strokeWidth: 2, r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
      </Box>

      {/* 개별 현장 정산 상세 페이지 */}
      {siteId ? (
        <Box>
          {(() => {
            const currentSite = sites.find(site => site.id === siteId);
            const siteSettlement = settlements.find(settlement => settlement.siteId === siteId);
            
            if (!currentSite) {
              return (
                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#2a2a2a' }}>
                  <Typography sx={{ color: '#bbb' }}>현장을 찾을 수 없습니다.</Typography>
                </Paper>
              );
            }

            return (
              <Box>
                {/* 현장 기본 정보 */}
                <Paper sx={{ p: 3, mb: 3, bgcolor: '#181f2e', border: '1px solid #232b3b' }}>
                  <Typography variant="h5" sx={{ color: '#fff', mb: 2, fontWeight: 'bold' }}>
                    {currentSite.name} 정산 상세
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>현장명</Typography>
                      <Typography sx={{ color: '#fff', fontWeight: 'bold' }}>{currentSite.name}</Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography sx={{ color: '#bbb', fontSize: '0.9rem' }}>계약금액</Typography>
                      <Typography sx={{ color: '#43e97b', fontWeight: 'bold', fontSize: '1.2rem' }}>
                        {formatNumber(currentSite.contractAmount || 0)}원
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* 정산 상세 카드들 */}
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ 
                      p: 2, 
                      height: '100%', 
                      bgcolor: '#181f2e', 
                      color: '#fff',
                      border: '1px solid #232b3b',
                      minHeight: '120px'
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ color: '#43e97b', mb: 1 }}>
                          기성금액
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                          {formatNumber(siteSettlement?.gisungAmount || 0)}원
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ 
                      p: 2, 
                      height: '100%', 
                      bgcolor: '#181f2e', 
                      color: '#fff',
                      border: '1px solid #232b3b',
                      minHeight: '120px'
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ color: '#ef5350', mb: 1 }}>
                          총 비용
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                          {formatNumber((siteSettlement?.materialCost || 0) + 
                            (siteSettlement?.laborCost || 0) + 
                            (siteSettlement?.subMaterialCost || 0) + 
                            (siteSettlement?.equipmentCost || 0) + 
                            (siteSettlement?.expenseCost || 0) + 
                            (siteSettlement?.safetyCost || 0))}원
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card sx={{ 
                      p: 2, 
                      height: '100%', 
                      bgcolor: '#181f2e', 
                      color: '#fff',
                      border: '1px solid #232b3b',
                      minHeight: '120px'
                    }}>
                      <CardContent>
                        <Typography variant="h6" sx={{ color: '#ff9800', mb: 1 }}>
                          순이익
                        </Typography>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 'bold',
                          color: ((siteSettlement?.gisungAmount || 0) - 
                            ((siteSettlement?.materialCost || 0) + 
                             (siteSettlement?.laborCost || 0) + 
                             (siteSettlement?.subMaterialCost || 0) + 
                             (siteSettlement?.equipmentCost || 0) + 
                             (siteSettlement?.expenseCost || 0) + 
                             (siteSettlement?.safetyCost || 0))) >= 0 ? '#43e97b' : '#f44336'
                        }}>
                          {formatNumber((siteSettlement?.gisungAmount || 0) - 
                            ((siteSettlement?.materialCost || 0) + 
                             (siteSettlement?.laborCost || 0) + 
                             (siteSettlement?.subMaterialCost || 0) + 
                             (siteSettlement?.equipmentCost || 0) + 
                             (siteSettlement?.expenseCost || 0) + 
                             (siteSettlement?.safetyCost || 0)))}원
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* 비용 상세 테이블 */}
                <Paper sx={{ p: 3, bgcolor: '#181f2e', border: '1px solid #232b3b' }}>
                  <Typography variant="h6" sx={{ color: '#fff', mb: 2, fontWeight: 'bold' }}>
                    비용 상세 내역
                  </Typography>
                  <TableContainer sx={{
                    // 테블릿에서 스크롤바 숨기기
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      '&::-webkit-scrollbar': {
                        display: 'none'
                      },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: '#333' }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 600 }}>항목</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}>금액</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow key="material-cost">
                          <TableCell sx={{ color: '#fff' }}>자재비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.materialCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow key="labor-cost">
                          <TableCell sx={{ color: '#fff' }}>노무비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.laborCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow key="sub-material-cost">
                          <TableCell sx={{ color: '#fff' }}>부자재비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.subMaterialCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow key="equipment-cost">
                          <TableCell sx={{ color: '#fff' }}>장비비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.equipmentCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow key="expense-safety-cost">
                          <TableCell sx={{ color: '#fff' }}>경비 / 안전관리비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.expenseCost || 0)}원 / {formatNumber(siteSettlement?.safetyCost || 0)}원
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            );
          })()}
        </Box>
      ) : (
        <Box>
        {/* 전체 정산 목록 (기존 테이블) */}
          <TableContainer component={Paper} sx={{ 
            backgroundColor: '#2a2a2a',
            // 테블릿에서 스크롤바 숨기기
            '@media (min-width: 768px) and (max-width: 1024px)': {
              '&::-webkit-scrollbar': {
                display: 'none'
              },
              scrollbarWidth: 'none',
              msOverflowStyle: 'none'
            }
          }}>
            <Table sx={{ width: '100%', tableLayout: 'fixed' }}>
              <TableHead>
            <TableRow sx={{ backgroundColor: '#333' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '4%', textAlign: 'center', fontSize: '1.1rem' }}>
                <Checkbox
                  checked={isAllSelected}
                  onChange={handleSelectAll}
                  sx={{ color: '#fff' }}
                />
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '18%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 더 넓게
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '20%'
                  }
                }}
                onClick={() => handleSort('siteName')}
              >
                현장명 {sortField === 'siteName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '6%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '8%'
                  }
                }}
                onClick={() => handleSort('gisungRate')}
              >
                기성률 {sortField === 'gisungRate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '15%'
                  }
                }}
                onClick={() => handleSort('contractAmount')}
              >
                계약금액 {sortField === 'contractAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
                onClick={() => handleSort('gisungAmount')}
              >
                기성금액 {sortField === 'gisungAmount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 표시
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '15%'
                  }
                }}
                onClick={() => handleSort('totalExpense')}
              >
                총지출액 {sortField === 'totalExpense' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
                onClick={() => handleSort('materialCost')}
              >
                자재비 {sortField === 'materialCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
                onClick={() => handleSort('laborCost')}
              >
                노무비 {sortField === 'laborCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
                onClick={() => handleSort('subMaterialCost')}
              >
                부자재비 {sortField === 'subMaterialCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
                onClick={() => handleSort('equipmentCost')}
              >
                장비비 {sortField === 'equipmentCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
            <TableCell 
              sx={{ 
                color: '#fff', 
                fontWeight: 600, 
                width: '10%', 
                textAlign: 'center', 
                fontSize: '1.1rem', 
                cursor: 'pointer', 
                '&:hover': { backgroundColor: '#444' },
                // 1500px 미만에서 숨김
                '@media (max-width: 1499px)': {
                  display: 'none !important'
                }
              }}
              onClick={() => handleSort('expenseCost')}
            >
              경비 {sortField === 'expenseCost' && (sortDirection === 'asc' ? '↑' : '↓')}
            </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '0.9rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  whiteSpace: 'nowrap',
                  // 1500px 미만에서 숨김
                  '@media (max-width: 1499px)': {
                    display: 'none !important'
                  }
                }}
                onClick={() => handleSort('safetyCost')}
              >
                안전관리비 {sortField === 'safetyCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ 
                  color: '#fff', 
                  fontWeight: 600, 
                  width: '20%', 
                  textAlign: '0', 
                  fontSize: '1.1rem',
                  minWidth: '150px',
                  display: 'none'
                }}
              >
                비고
              </TableCell>
              <TableCell sx={{ 
                color: '#fff', 
                fontWeight: 600, 
                width: '6%', 
                textAlign: 'center', 
                fontSize: '1.1rem',
                // 아이패드에서 표시
                '@media (min-width: 768px) and (max-width: 1024px)': {
                  width: '10%'
                }
              }}>관리</TableCell>
            </TableRow>
              </TableHead>
              <TableBody>
            {sortedSettlements.length === 0 ? (
                <TableRow key="no-data">
                <TableCell 
                  colSpan={13} 
                  sx={{ 
                    textAlign: 'center', 
                    py: 4, 
                    color: '#bbb',
                    // 아이패드에서는 6개 컬럼만 표시
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      colSpan: 6
                    }
                  }}
                >
                  정산 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
              sortedSettlements.slice(settlementPage * itemsPerPage, (settlementPage + 1) * itemsPerPage).map((settlement) => (
                <TableRow key={settlement.id} sx={{ '&:hover': { backgroundColor: '#333' } }}>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Checkbox
                      checked={isAllSelected || selectedSites.has(settlement.siteId)}
                      onChange={() => handleSiteSelect(settlement.siteId)}
                      sx={{ color: '#fff' }}
                    />
                  </TableCell>
                  <TableCell sx={{ 
                    color: '#fff', 
                    fontWeight: 500, 
                    fontSize: '1.1rem',
                    width: '22%',
                    // 아이패드에서만 6글자로 제한
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      width: '24%',
                      '&::after': {
                        content: '""',
                        display: 'block',
                        width: '100%',
                        height: '0',
                        overflow: 'hidden'
                      }
                    }
                  }}>
                    <span sx={{
                      // 아이패드에서만 6글자로 제한
                      '@media (min-width: 768px) and (max-width: 1024px)': {
                        display: 'inline-block',
                        maxWidth: '6ch',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }
                    }}>
                      {isIpad 
                        ? (settlement.siteName && settlement.siteName.length > 6 
                          ? settlement.siteName.substring(0, 6) + '...' 
                          : settlement.siteName || '미정')
                        : settlement.siteName || '미정'
                      }
                    </span>
                  </TableCell>
                  <TableCell sx={{ 
                    color: '#fff', 
                    fontSize: '1.1rem', 
                    width: '8%', 
                    padding: '8px 4px',
                    // 아이패드에서 더 넓게
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      width: '12%'
                    }
                  }}>
                    {(() => {
                      const contractAmount = settlement.contractAmount || 0;
                      const gisungAmount = settlement.gisungAmount || 0;
                      const gisungRate = contractAmount > 0 ? Math.round((gisungAmount / contractAmount) * 100) : 0;
                      
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center' }}>
                          <Box sx={{ 
                            width: '80px', 
                            height: '12px', 
                            bgcolor: '#333', 
                            borderRadius: '6px',
                            overflow: 'hidden'
                          }}>
                            <Box sx={{ 
                              width: `${Math.min(gisungRate, 100)}%`, 
                              height: '100%', 
                              bgcolor: getGisungRateColor(gisungRate),
                              transition: 'width 0.3s ease'
                            }} />
                          </Box>
                          <Typography sx={{ 
                            fontSize: '1.2rem',
                            color: getGisungRateColor(gisungRate),
                            fontWeight: 'bold',
                            minWidth: '50px',
                            textAlign: 'center'
                          }}>
                            {gisungRate}%
                          </Typography>
                        </Box>
                      );
                    })()}
                      </TableCell>
                  <TableCell sx={{ color: '#43e97b', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>
                    {formatNumber(settlement.contractAmount || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#43e97b', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '1.1rem',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}>
                    {formatNumber(settlement.gisungAmount || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ff6b6b', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '1.1rem',
                    // 아이패드에서 표시
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      display: 'table-cell'
                    }
                  }}>
                    {formatNumber((settlement.materialCost || 0) + (settlement.laborCost || 0) + (settlement.subMaterialCost || 0) + (settlement.equipmentCost || 0) + (settlement.expenseCost || 0))}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '1.1rem',
                    width: '10%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}>
                    {formatNumber(settlement.materialCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '1.1rem',
                    width: '10%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}>
                    {formatNumber(settlement.laborCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '1.1rem',
                    width: '10%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}>
                    {formatNumber(settlement.subMaterialCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '1.1rem',
                    width: '10%',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}>
                    {formatNumber(settlement.equipmentCost || 0)}원
                      </TableCell>
            <TableCell sx={{ 
              color: '#ef5350', 
              fontWeight: 'bold', 
              textAlign: 'right', 
              fontSize: '1.1rem',
              width: '10%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              // 1500px 미만에서 숨김
              '@media (max-width: 1499px)': {
                display: 'none !important'
              }
            }}>
              {formatNumber(settlement.expenseCost || 0)}원
            </TableCell>
                  <TableCell sx={{ 
                    color: '#ff9800', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    // 1500px 미만에서 숨김
                    '@media (max-width: 1499px)': {
                      display: 'none !important'
                    }
                  }}>
                    {formatNumber(settlement.safetyCost || 0)}원
                      </TableCell>
                  <TableCell 
                    sx={{ 
                      color: '#bbb', 
                      fontSize: '1.1rem',
                      width: '20%',
                      minWidth: '150px',
                      wordBreak: 'break-word',
                      display: 'none'
                    }}
                  >
                    {settlement.notes || '-'}
                  </TableCell>
                      <TableCell sx={{
                        // 아이패드에서 표시
                        '@media (min-width: 768px) and (max-width: 1024px)': {
                          display: 'table-cell'
                        }
                      }}>
                <Button
                  variant="outlined"
                  size="small"
                        onClick={() => navigate(`/settlement/${settlement.siteId}`)}
                  sx={{
                        color: '#fff', 
                        borderColor: '#666',
                        '&:hover': { borderColor: '#ff9800' }
                      }}
                    >
                      상세
                </Button>
                        </TableCell>
                      </TableRow>
              ))
            )}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* 페이지네이션 */}
              {sortedSettlements.length > itemsPerPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 2 }}>
                  <Button
                    variant="outlined"
                    disabled={settlementPage === 0}
                    onClick={() => setSettlementPage(settlementPage - 1)}
                    sx={{ color: '#fff', borderColor: '#666', '&:hover': { borderColor: '#ff9800' } }}
                  >
                    이전
                  </Button>
                  
                  <Typography sx={{ color: '#fff', mx: 2 }}>
                    {settlementPage + 1} / {Math.ceil(sortedSettlements.length / itemsPerPage)} 페이지
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    disabled={settlementPage >= Math.ceil(sortedSettlements.length / itemsPerPage) - 1}
                    onClick={() => setSettlementPage(settlementPage + 1)}
                    sx={{ color: '#fff', borderColor: '#666', '&:hover': { borderColor: '#ff9800' } }}
                  >
                    다음
                  </Button>
                </Box>
              )}
        </Box>
      )}

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
        </Box>
      </Container>
    </Box>
  );
};

export default SettlementManagement;
