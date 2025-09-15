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
  Tab
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
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, LabelList, LineChart, Line, CartesianGrid } from 'recharts';
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
  const [loading, setLoading] = useState(true);
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
  const itemsPerPage = 10;
  
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

  // 꺾은선 차트 데이터 생성
  const getLineChartData = () => {
    return settlements.map(settlement => ({
      name: settlement.siteName,
      계약금액: settlement.contractAmount || 0,
      기성금액: settlement.gisungAmount || 0,
      총비용: (settlement.materialCost || 0) + (settlement.laborCost || 0) + 
              (settlement.subMaterialCost || 0) + (settlement.equipmentCost || 0) + 
              (settlement.expenseCost || 0) + (settlement.safetyCost || 0),
      순이익: (settlement.gisungAmount || 0) - 
              ((settlement.materialCost || 0) + (settlement.laborCost || 0) + 
               (settlement.subMaterialCost || 0) + (settlement.equipmentCost || 0) + 
               (settlement.expenseCost || 0) + (settlement.safetyCost || 0))
    }));
  };

  // 통계 데이터 계산
  const getStats = () => {
    const totalContract = settlements.reduce((sum, s) => sum + (s.contractAmount || 0), 0);
    const totalGisung = settlements.reduce((sum, s) => sum + (s.gisungAmount || 0), 0);
    const totalCost = settlements.reduce((sum, s) => 
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

  // 현장 데이터 로드
  useEffect(() => {
    const loadSites = async () => {
      try {
        const sitesSnapshot = await getDocs(collection(db, 'sites'));
        const sitesData = sitesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSites(sitesData);
      } catch (error) {
        console.error('현장 데이터 로드 실패:', error);
      }
    };
    loadSites();
  }, []);

  // 정산 데이터 로드 (기성관리페이지에서 데이터 가져오기)
  useEffect(() => {
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
        
        // 정산페이지가 생성된 현장만 필터링
        const sitesWithSettlement = sites.filter(site => site.settlementPageCreated === true);
        
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
        gisungData.forEach(gisung => {
          if (siteSummary[gisung.siteId]) {
            if (gisung.claimStatus === '청구완료') {
              // 기성금관리페이지의 기성금액 (청구완료만)
              siteSummary[gisung.siteId].gisungAmount += Number(gisung.gisungAmount) || 0;
            }
          }
        });
        
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
        
        const settlementsData = Object.values(siteSummary);
        console.log('정산 데이터 로드 완료:', settlementsData);
        setSettlements(settlementsData);
        setLoading(false);
      } catch (error) {
        console.error('정산 데이터 로드 실패:', error);
        setSettlements([]);
        setLoading(false);
      }
    };
    loadSettlements();
  }, [sites]);

  // 지출 데이터 로드
  useEffect(() => {
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
  }, []);

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
            {siteId ? '현장명 정산내역' : '현장명 정산내역'}
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
            bgcolor: '#181f2e',
            border: '1px solid #232b3b'
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
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#bbb" fontSize={12} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#2a2a2a', 
                    border: '1px solid #333',
                    color: '#fff'
                  }} 
                />
                <RechartsLegend />
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
            bgcolor: '#181f2e',
            border: '1px solid #232b3b'
          }}>
            <Typography variant="h6" sx={{ 
              color: '#fff', 
              mb: 2, 
              fontWeight: 'bold' 
            }}>
              현장별 계약금/기성/잔액
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getLineChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis 
                  dataKey="name" 
                  stroke="#bbb"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#bbb" fontSize={12} />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: '#2a2a2a', 
                    border: '1px solid #333',
                    color: '#fff'
                  }} 
                />
                <RechartsLegend />
                <Bar dataKey="계약금액" fill="#1976d2" name="계약금액" />
                <Bar dataKey="기성금액" fill="#43e97b" name="기성금액" />
              </BarChart>
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
                        <TableRow>
                          <TableCell sx={{ color: '#fff' }}>자재비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.materialCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ color: '#fff' }}>노무비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.laborCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ color: '#fff' }}>부자재비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.subMaterialCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ color: '#fff' }}>장비비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.equipmentCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell sx={{ color: '#fff' }}>경비</TableCell>
                          <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                            {formatNumber(siteSettlement?.expenseCost || 0)}원
                          </TableCell>
                        </TableRow>
                        <TableRow>
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
        /* 전체 정산 목록 (기존 테이블) */
          <TableContainer component={Paper} sx={{ backgroundColor: '#2a2a2a' }}>
            <Table>
              <TableHead>
            <TableRow sx={{ backgroundColor: '#333' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '12%', textAlign: 'center' }}>현장명</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>계약금액</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>기성금액</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>자재비</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>노무비</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>부자재비</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '12%', textAlign: 'center' }}>장비비</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '12%', textAlign: 'center' }}>경비</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>안전관리비</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '10%', textAlign: 'center' }}>비고</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600, width: '8%', textAlign: 'center' }}>관리</TableCell>
            </TableRow>
              </TableHead>
              <TableBody>
            {settlements.length === 0 ? (
                <TableRow>
                <TableCell colSpan={11} sx={{ textAlign: 'center', py: 4, color: '#bbb' }}>
                  정산 데이터가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
              settlements.map((settlement) => (
                <TableRow key={settlement.id} sx={{ '&:hover': { backgroundColor: '#333' } }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 500 }}>
                    {settlement.siteName || '미정'}
                      </TableCell>
                  <TableCell sx={{ color: '#43e97b', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.contractAmount || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#43e97b', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.gisungAmount || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.materialCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.laborCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.subMaterialCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.equipmentCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ef5350', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.expenseCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#ff9800', fontWeight: 'bold', textAlign: 'right' }}>
                    {formatNumber(settlement.safetyCost || 0)}원
                      </TableCell>
                  <TableCell sx={{ color: '#bbb', fontSize: '0.9rem' }}>
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
