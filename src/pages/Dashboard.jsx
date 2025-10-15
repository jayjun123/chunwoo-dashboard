import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, Divider, Chip, Tabs, Tab, Button,
  Alert, IconButton, Tooltip, Container
} from '@mui/material';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { formatNumber } from '../utils/formatUtils';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import WeatherWidget from '../components/weather/WeatherWidget';
import useMediaQuery from '@mui/material/useMediaQuery';
import MobileSidebar from '../components/MobileSidebar';
import {
  ProgressTrendChart,
  SiteProgressChart,
  MonthlyPerformanceChart,
  SiteStatusPieChart,
  BudgetVsActualChart,
  RealTimeStatusCard
} from '../components/dashboard/AdvancedCharts';
import {
  getSiteIntegratedStatus,
  getMonthlyIntegratedStatus,
  checkDataConsistency,
  autoSyncData
} from '../utils/integrationUtils';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  Assignment as AssignmentIcon,
  Receipt as ReceiptIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalSites: 0,
    activeSites: 0,
    completedSites: 0,
    totalProgress: 0,
    pendingSites: 0,
    avgProgress: 0,
    recentActivities: []
  });
  const [chartData, setChartData] = useState({
    progressTrend: [],
    siteProgress: [],
    monthlyPerformance: [],
    siteStatus: [],
    budgetVsActual: []
  });
  const [integratedStats, setIntegratedStats] = useState({
    totalEstimates: 0,
    totalClaims: 0,
    totalProgress: 0,
    totalCosts: 0,
    totalEstimateAmount: 0,
    totalClaimAmount: 0,
    totalCostAmount: 0
  });
  const [dataIssues, setDataIssues] = useState([]);
  const [syncing, setSyncing] = useState(false);

  // 통합 데이터 로드
  const loadIntegratedData = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM 형식
      const monthlyData = await getMonthlyIntegratedStatus(currentMonth);
      
      if (monthlyData) {
        setIntegratedStats(monthlyData.summary);
      }

      // 데이터 일관성 검사
      const issues = await checkDataConsistency();
      setDataIssues(issues);
    } catch (error) {
      console.error('통합 데이터 로드 오류:', error);
    }
  };

  // 자동 동기화 실행
  const handleAutoSync = async () => {
    setSyncing(true);
    try {
      const success = await autoSyncData();
      if (success) {
        await loadIntegratedData();
      }
    } catch (error) {
      console.error('자동 동기화 오류:', error);
    } finally {
      setSyncing(false);
    }
  };

  // Firestore 실시간 데이터 구독
  useEffect(() => {
    const sitesQuery = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(sitesQuery, (snapshot) => {
      const sites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeSites = sites.filter(site => site.status === '진행중').length;
      const completedSites = sites.filter(site => site.status === '완료').length;
      const pendingSites = sites.filter(site => site.status === '예정').length;
      const totalProgress = sites.reduce((acc, site) => acc + (parseFloat(site.totalProgress) || 0), 0) / sites.length;
      const avgProgress = isNaN(totalProgress) ? 0 : totalProgress;

      setStats(prev => ({
        ...prev,
        totalSites: sites.length,
        activeSites,
        completedSites,
        pendingSites,
        totalProgress: avgProgress,
        avgProgress: avgProgress
      }));

      // 차트 데이터 생성
      generateChartData(sites);
      setLoading(false);
    });

    // 통합 데이터 로드
    loadIntegratedData();

    return () => unsubscribe();
  }, []);

  // 차트 데이터 생성 함수
  const generateChartData = (sites) => {
    // 진행률 트렌드 데이터 (최근 6개월)
    const progressTrend = [
      { month: '1월', progress: 65 },
      { month: '2월', progress: 72 },
      { month: '3월', progress: 68 },
      { month: '4월', progress: 75 },
      { month: '5월', progress: 80 },
      { month: '6월', progress: stats.avgProgress }
    ];

    // 현장별 진행률 데이터 (상위 10개)
    const siteProgress = sites
      .filter(site => site.totalProgress > 0)
      .sort((a, b) => (b.totalProgress || 0) - (a.totalProgress || 0))
      .slice(0, 10)
      .map(site => ({
        name: site.name?.slice(0, 8) || '현장',
        progress: parseFloat(site.totalProgress) || 0
      }));

    // 월별 성과 데이터
    const monthlyPerformance = [
      { month: '1월', sites: 12, progress: 65 },
      { month: '2월', sites: 15, progress: 72 },
      { month: '3월', sites: 18, progress: 68 },
      { month: '4월', sites: 20, progress: 75 },
      { month: '5월', sites: 22, progress: 80 },
      { month: '6월', sites: stats.totalSites, progress: stats.avgProgress }
    ];

    // 현장 상태 분포 데이터
    const siteStatus = [
      { name: '진행중', value: stats.activeSites },
      { name: '완료', value: stats.completedSites },
      { name: '예정', value: stats.pendingSites },
      { name: '미정', value: stats.totalSites - stats.activeSites - stats.completedSites - stats.pendingSites }
    ].filter(item => item.value > 0);

    // 예산 대비 실적 데이터 (샘플)
    const budgetVsActual = sites.slice(0, 8).map(site => ({
      site: site.name?.slice(0, 6) || '현장',
      budget: Math.floor(Math.random() * 1000) + 500,
      actual: Math.floor(Math.random() * 1000) + 400
    }));

    setChartData({
      progressTrend,
      siteProgress,
      monthlyPerformance,
      siteStatus,
      budgetVsActual
    });
  };

  // 도넛 차트 데이터
  const doughnutChartData = {
    labels: ['진행중', '완료', '예정', '미정'],
    datasets: [{
      data: [
        stats.activeSites,
        stats.completedSites,
        stats.totalSites - stats.activeSites - stats.completedSites,
        0
      ],
      backgroundColor: ['#4CAF50', '#2196F3', '#FFC107', '#9E9E9E'],
      borderWidth: 0
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
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
          pt: isMobile ? 2 : 3,
          pb: 3,
          px: isMobile ? 1 : 3,
          ml: isMobile ? 0 : 'auto',
          mr: isMobile ? 0 : 'auto',
          maxWidth: isMobile ? '100%' : 'none'
        }}
      >
        <Grid container spacing={isMobile ? 1 : 3}>
        {/* 데이터 동기화 및 일관성 검사 */}
        <Grid size={{ xs: 12 }}>
          <Box sx={{ 
            display: 'flex', 
            gap: isMobile ? 1 : 2, 
            mb: isMobile ? 1 : 2, 
            alignItems: 'center',
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={handleAutoSync}
              disabled={syncing}
              sx={{ 
                minWidth: isMobile ? 100 : 120,
                fontSize: isMobile ? '0.8rem' : '0.875rem'
              }}
            >
              {syncing ? '동기화 중...' : '데이터 동기화'}
            </Button>
            {dataIssues.length > 0 && (
              <Alert 
                severity="warning" 
                sx={{ 
                  flex: 1,
                  fontSize: isMobile ? '0.8rem' : '0.875rem'
                }}
              >
                {dataIssues.length}개의 데이터 일관성 문제가 발견되었습니다.
              </Alert>
            )}
          </Box>
        </Grid>

        {/* 상단 통계 카드 */}
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: isMobile ? 'auto' : '100%' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
              <Typography 
                variant={isMobile ? "body2" : "h6"} 
                gutterBottom
                sx={{ fontSize: isMobile ? '0.8rem' : '1.25rem' }}
              >
                전체 현장
              </Typography>
              <Typography 
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontSize: isMobile ? '1.5rem' : '2.125rem' }}
              >
                {stats.totalSites}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: isMobile ? 'auto' : '100%' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
              <Typography 
                variant={isMobile ? "body2" : "h6"} 
                gutterBottom
                sx={{ fontSize: isMobile ? '0.8rem' : '1.25rem' }}
              >
                진행중 현장
              </Typography>
              <Typography 
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontSize: isMobile ? '1.5rem' : '2.125rem' }}
              >
                {stats.activeSites}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: isMobile ? 'auto' : '100%' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
              <Typography 
                variant={isMobile ? "body2" : "h6"} 
                gutterBottom
                sx={{ fontSize: isMobile ? '0.8rem' : '1.25rem' }}
              >
                완료 현장
              </Typography>
              <Typography 
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontSize: isMobile ? '1.5rem' : '2.125rem' }}
              >
                {stats.completedSites}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <Card sx={{ height: isMobile ? 'auto' : '100%' }}>
            <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
              <Typography 
                variant={isMobile ? "body2" : "h6"} 
                gutterBottom
                sx={{ fontSize: isMobile ? '0.8rem' : '1.25rem' }}
              >
                평균 진행률
              </Typography>
              <Typography 
                variant={isMobile ? "h5" : "h4"}
                sx={{ fontSize: isMobile ? '1.5rem' : '2.125rem' }}
              >
                {stats.totalProgress.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 통합 현황 카드 */}
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AssignmentIcon sx={{ color: '#1976d2', mr: 1 }} />
                <Typography variant="h6">견적 현황</Typography>
              </Box>
              <Typography variant="h4" sx={{ color: '#1976d2' }}>
                {integratedStats.totalEstimates}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                총 {formatNumber(integratedStats.totalEstimateAmount, true)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <ReceiptIcon sx={{ color: '#7b1fa2', mr: 1 }} />
                <Typography variant="h6">청구 현황</Typography>
              </Box>
              <Typography variant="h4" sx={{ color: '#7b1fa2' }}>
                {integratedStats.totalClaims}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                총 {formatNumber(integratedStats.totalClaimAmount, true)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{ bgcolor: '#e8f5e8' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimelineIcon sx={{ color: '#388e3c', mr: 1 }} />
                <Typography variant="h6">기성 현황</Typography>
              </Box>
              <Typography variant="h4" sx={{ color: '#388e3c' }}>
                {integratedStats.totalProgress}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                기성 등록 완료
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid xs={12} md={3}>
          <Card sx={{ bgcolor: '#fff3e0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <AccountBalanceIcon sx={{ color: '#f57c00', mr: 1 }} />
                <Typography variant="h6">지출 현황</Typography>
              </Box>
              <Typography variant="h4" sx={{ color: '#f57c00' }}>
                {integratedStats.totalCosts}
              </Typography>
              <Typography variant="body2" sx={{ color: '#666' }}>
                총 {formatNumber(integratedStats.totalCostAmount, true)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 고급 차트 섹션 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Tabs 
                value={activeTab} 
                onChange={(e, newValue) => setActiveTab(newValue)}
                sx={{ borderBottom: 1, borderColor: 'divider' }}
              >
                <Tab label="진행률 트렌드" />
                <Tab label="현장별 진행률" />
                <Tab label="월별 성과" />
                <Tab label="예산 대비 실적" />
              </Tabs>
              <Box sx={{ p: 2, height: 400 }}>
                {activeTab === 0 && <ProgressTrendChart data={chartData.progressTrend} />}
                {activeTab === 1 && <SiteProgressChart data={chartData.siteProgress} />}
                {activeTab === 2 && <MonthlyPerformanceChart data={chartData.monthlyPerformance} />}
                {activeTab === 3 && <BudgetVsActualChart data={chartData.budgetVsActual} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 현장 상태 분포 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <SiteStatusPieChart data={chartData.siteStatus} />
            </CardContent>
          </Card>
        </Grid>

        {/* 실시간 현장 현황 */}
        <Grid size={{ xs: 12, md: 6 }}>
          <RealTimeStatusCard stats={stats} />
        </Grid>

        {/* 기존 도넛 차트 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>현장 상태</Typography>
              <Box sx={{ height: 300 }}>
                <Doughnut data={doughnutChartData} options={chartOptions} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 날씨 정보 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <WeatherWidget />
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 */}
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>최근 활동</Typography>
              <List>
                {stats.recentActivities.map((activity, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={activity.title}
                        secondary={activity.timestamp}
                      />
                                              <Chip label={activity.type} size="small" onClick={() => {}} />
                    </ListItem>
                    {index < stats.recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard; 