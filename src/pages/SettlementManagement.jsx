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
  Grid,
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
  Checkbox
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  Calculate as CalculateIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Business as BusinessIcon,
  Assignment as AssignmentIcon,
  AttachMoney as AttachMoneyIcon,
  Receipt as ReceiptIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';
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

  // 기성률에 따른 색상 결정 함수
  const getGisungRateColor = (rate) => {
    if (rate >= 100) return '#43e97b'; // 초록색
    if (rate >= 66) return '#ffeb3b';  // 노랑색
    if (rate >= 33) return '#ff9800';  // 주황색
    return '#f44336'; // 빨간색
  };

  // 백만원을 억원 단위로 변환하는 함수
  const formatMillionToEok = (value) => {
    const eok = Math.floor(value / 100); // 억 단위
    const remainder = value % 100; // 나머지 (천만원 단위)
    
    if (eok === 0) {
      return `${remainder}천만원`;
    } else if (remainder === 0) {
      return `${eok}억원`;
    } else {
      return `${eok}억${remainder}천만원`;
    }
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
                 (settlement.expenseCost || 0) + (settlement.safetyCost || 0))) / 1000000)
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
                  // 지출관리페이지의 노무비
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
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh',
      color: 'white',
      p: { xs: 1, md: 3 },
      pt: { xs: '49px', md: '74px' }
    }}>
      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
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
            sx={{
              borderColor: '#666',
              color: '#fff',
              '&:hover': { borderColor: '#ff9800' }
            }}
          >
            엑셀 다운로드
          </Button>
          {!siteId && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{
                backgroundColor: '#ff9800',
                '&:hover': { backgroundColor: '#f57c00' }
              }}
            >
              정산 추가
            </Button>
          )}
        </Box>
      </Box>

      {/* 통계 카드들 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
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
              <Typography 
                variant="body2" 
                sx={{ 
                  color: getStats().totalProfit >= 0 ? '#43e97b' : '#f44336',
                  fontSize: '0.8rem',
                  mt: 0.5
                }}
              >
                수익률: {getStats().profitRate}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 차트 섹션 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '400px', 
            width: '850px',
            bgcolor: '#181f2e',
            border: '1px solid #232b3b',
            // 아이패드에서만 500px로 설정
            '@media (min-width: 768px) and (max-width: 1024px)': {
              width: '500px'
            }
          }}>
            <Typography variant="h6" sx={{ 
              color: '#fff', 
              mb: 2, 
              fontWeight: 'bold' 
            }}>
              현장별 수익/비용 비교
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getLineChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#bbb"
                  tick={{ fontSize: 16, fontWeight: 'bold', dx: 0, dy: 0 }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  stroke="#bbb" 
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  label={{ value: '금액 (백만원)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#bbb' } }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#2a2a2a', 
                    border: '1px solid #333',
                    color: '#fff'
                  }}
                  formatter={(value, name) => [formatMillionToEok(value), name]}
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
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 3, 
            height: '400px', 
            width: '850px',
            bgcolor: '#181f2e',
            border: '1px solid #232b3b',
            // 아이패드에서만 500px로 설정
            '@media (min-width: 768px) and (max-width: 1024px)': {
              width: '500px'
            }
          }}>
            <Typography variant="h6" sx={{ 
              color: '#fff', 
              mb: 2, 
              fontWeight: 'bold' 
            }}>
              현장별 계약금/기성/잔액
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={getLineChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#bbb"
                  tick={{ fontSize: 16, fontWeight: 'bold', dx: 0, dy: 0 }}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis 
                  yAxisId="left"
                  stroke="#bbb" 
                  fontSize={12}
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                  label={{ value: '금액 (백만원)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#bbb' } }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  stroke="#ff9800" 
                  fontSize={12}
                  tickFormatter={(value) => `${value}%`}
                  domain={[0, 100]}
                  label={{ value: '기성률 (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#ff9800' } }}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#2a2a2a', 
                    border: '1px solid #333',
                    color: '#fff'
                  }}
                  formatter={(value, name) => {
                    if (name === '기성률') {
                      return [`${value}%`, name];
                    }
                    return [formatMillionToEok(value), name];
                  }}
                />
                <RechartsLegend />
                <Bar yAxisId="left" dataKey="계약금액" fill="#1976d2" name="계약금액" />
                <Bar yAxisId="left" dataKey="기성금액" fill="#43e97b" name="기성금액" />
                <Bar yAxisId="left" dataKey="잔액" fill="#f44336" name="잔액" />
                <Line yAxisId="right" type="monotone" dataKey="기성률" stroke="#ff9800" strokeWidth={3} name="기성률" dot={{ fill: '#ff9800', strokeWidth: 2, r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

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
                  <TableContainer>
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
                        <TableRow key="expense-cost">
                          <TableCell sx={{ color: '#fff' }}>경비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.expenseCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow key="safety-cost">
                          <TableCell sx={{ color: '#fff' }}>안전관리비</TableCell>
                          <TableCell sx={{ color: '#ff9800', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.safetyCost || 0)}원
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
          <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a' }}>
            <Table>
              <TableHead>
            <TableRow sx={{ backgroundColor: '#333' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '5%', textAlign: 'center', fontSize: '1.1rem' }}>
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
                    width: '25%'
                  }
                }}
                onClick={() => handleSort('siteName')}
              >
                현장명 {sortField === 'siteName' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell 
                sx={{ color: '#fff', fontWeight: 600, width: '6%', textAlign: 'center', fontSize: '1.1rem', cursor: 'pointer', '&:hover': { backgroundColor: '#444' } }}
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
                  // 아이패드에서 더 넓게
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
                  width: '10%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 더 넓게
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '15%'
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
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 더 넓게
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '12%'
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
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 더 넓게
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    width: '12%'
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
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
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
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
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
                  width: '8%', 
                  textAlign: 'center', 
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
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
                  fontSize: '1.1rem', 
                  cursor: 'pointer', 
                  '&:hover': { backgroundColor: '#444' },
                  // 아이패드에서 숨김
                  '@media (min-width: 768px) and (max-width: 1024px)': {
                    display: 'none'
                  }
                }}
                onClick={() => handleSort('safetyCost')}
              >
                안전관리비 {sortField === 'safetyCost' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '6%', textAlign: 'center', fontSize: '1.1rem' }}>비고</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '6%', textAlign: 'center', fontSize: '1.1rem' }}>관리</TableCell>
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
                    // 아이패드에서는 숨겨진 컬럼 수만큼 colSpan 조정
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      colSpan: 9
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
                  <TableCell sx={{ color: '#fff', fontWeight: 500, fontSize: '1.1rem' }}>
                    {settlement.siteName || '미정'}
                      </TableCell>
                  <TableCell sx={{ color: '#fff', fontSize: '1.1rem', width: '6%', padding: '8px 4px' }}>
                    {(() => {
                      const contractAmount = settlement.contractAmount || 0;
                      const gisungAmount = settlement.gisungAmount || 0;
                      const gisungRate = contractAmount > 0 ? Math.round((gisungAmount / contractAmount) * 100) : 0;
                      
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                          <Box sx={{ 
                            width: '40px', 
                            height: '6px', 
                            bgcolor: '#333', 
                            borderRadius: '3px',
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
                            fontSize: '0.8rem',
                            color: getGisungRateColor(gisungRate),
                            fontWeight: 'bold',
                            minWidth: '30px',
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
                  <TableCell sx={{ color: '#43e97b', fontWeight: 'bold', textAlign: 'right', fontSize: '1.1rem' }}>
                    {formatNumber(settlement.gisungAmount || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right', fontSize: '0.9rem' }}>
                    {formatNumber(settlement.materialCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right', fontSize: '0.9rem' }}>
                    {formatNumber(settlement.laborCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '0.9rem',
                    // 아이패드에서 숨김
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      display: 'none'
                    }
                  }}>
                    {formatNumber(settlement.subMaterialCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '0.9rem',
                    // 아이패드에서 숨김
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      display: 'none'
                    }
                  }}>
                    {formatNumber(settlement.equipmentCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ef5350', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '0.9rem',
                    // 아이패드에서 숨김
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      display: 'none'
                    }
                  }}>
                    {formatNumber(settlement.expenseCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ 
                    color: '#ff9800', 
                    fontWeight: 'bold', 
                    textAlign: 'right', 
                    fontSize: '0.9rem',
                    // 아이패드에서 숨김
                    '@media (min-width: 768px) and (max-width: 1024px)': {
                      display: 'none'
                    }
                  }}>
                    {formatNumber(settlement.safetyCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#bbb', fontSize: '1.1rem' }}>
                    {settlement.notes || '-'}
                      </TableCell>
                      <TableCell>
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
  );
};

export default SettlementManagement;
