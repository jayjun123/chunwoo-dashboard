import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Card, CardContent,
  List, ListItem, ListItemText, Divider, Chip
} from '@mui/material';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import WeatherWidget from '../components/weather/WeatherWidget';
import useMediaQuery from '@mui/material/useMediaQuery';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSites: 0,
    activeSites: 0,
    completedSites: 0,
    totalProgress: 0,
    recentActivities: []
  });

  // Firestore 실시간 데이터 구독
  useEffect(() => {
    const sitesQuery = query(collection(db, 'sites'));
    const unsubscribe = onSnapshot(sitesQuery, (snapshot) => {
      const sites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const activeSites = sites.filter(site => site.status === '진행중').length;
      const completedSites = sites.filter(site => site.status === '완료').length;
      const totalProgress = sites.reduce((acc, site) => acc + (parseFloat(site.totalProgress) || 0), 0) / sites.length;

      setStats(prev => ({
        ...prev,
        totalSites: sites.length,
        activeSites,
        completedSites,
        totalProgress: isNaN(totalProgress) ? 0 : totalProgress
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 차트 데이터
  const chartData = {
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
      p: 3, 
      height: '100vh', 
      overflow: 'auto',
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '-30px' : 'auto',
      width: isMobile ? '100vw' : '100%'
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

        {/* 현장 상태 차트 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>현장 상태</Typography>
              <Box sx={{ height: 300 }}>
                <Doughnut data={chartData} options={chartOptions} />
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