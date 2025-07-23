import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, Divider, Chip, Tabs, Tab
} from '@mui/material';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import WeatherWidget from '../components/weather/WeatherWidget';
import useMediaQuery from '@mui/material/useMediaQuery';
import {
  ProgressTrendChart,
  SiteProgressChart,
  MonthlyPerformanceChart,
  SiteStatusPieChart,
  BudgetVsActualChart,
  RealTimeStatusCard
} from '../components/dashboard/AdvancedCharts';

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

  // Firestore 실시간 데이터 구독
  useEffect(() => {
    const sitesQuery = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(sitesQuery, (snapshot) => {
      const sites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeSites = sites.filter(site => site.status === '진행중').length;
      const completedSites = sites.filter(site => site.status === '완료').length;
      const pendingSites = sites.filter(site => site.status === '진행상황').length;
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
      { name: '진행상황', value: stats.pendingSites },
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
    labels: ['진행중', '완료', '진행상황', '미정'],
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
      p: 3, 
      height: '100vh', 
      overflow: 'auto',
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '-30px' : 'auto',
      width: isMobile ? '100vw' : '100%',
      mt: isMobile ? '0px' : '90px'
    }}>
      <Grid container spacing={3}>
        {/* 상단 통계 카드 */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>전체 현장</Typography>
              <Typography variant="h4">{stats.totalSites}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>진행중 현장</Typography>
              <Typography variant="h4">{stats.activeSites}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>완료 현장</Typography>
              <Typography variant="h4">{stats.completedSites}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>평균 진행률</Typography>
              <Typography variant="h4">{stats.totalProgress.toFixed(1)}%</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* 고급 차트 섹션 */}
        <Grid item xs={12}>
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
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <SiteStatusPieChart data={chartData.siteStatus} />
            </CardContent>
          </Card>
        </Grid>

        {/* 실시간 현장 현황 */}
        <Grid item xs={12} md={6}>
          <RealTimeStatusCard stats={stats} />
        </Grid>

        {/* 기존 도넛 차트 */}
        <Grid item xs={12} md={8}>
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
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <WeatherWidget />
            </CardContent>
          </Card>
        </Grid>

        {/* 최근 활동 */}
        <Grid item xs={12}>
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
                      <Chip label={activity.type} size="small" />
                    </ListItem>
                    {index < stats.recentActivities.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 