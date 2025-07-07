import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Chip,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  Button,
  Paper,
} from '@mui/material';
import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import useMediaQuery from '@mui/material/useMediaQuery';

const Overview = () => {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [sites, setSites] = useState([]);
  const [allGisungData, setAllGisungData] = useState([]);
  const [allCostData, setAllCostData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    // 실시간 주요현장(onSnapshot)
    const sitesQuery = query(collection(db, 'sites'), where('isStarred', '==', true));
    const sitesUnsubscribe = onSnapshot(sitesQuery, (snapshot) => {
      const sitesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate ? new Date(doc.data().startDate) : null,
        endDate: doc.data().endDate ? new Date(doc.data().endDate) : null,
      }));
      setSites(sitesData);
      setLoading(false);
    }, (error) => {
      setError('현장 데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    });

    const gisungQuery = query(collection(db, 'gisung'));
    const gisungUnsubscribe = onSnapshot(gisungQuery, (snapshot) => {
        const gisungData = snapshot.docs.map(doc => ({...doc.data()}));
        setAllGisungData(gisungData);
    }, (error) => {
      console.error("기성 데이터 로드 오류:", error);
    });

    const costQuery = query(collection(db, 'costs'));
    const costUnsubscribe = onSnapshot(costQuery, (snapshot) => {
        const costData = snapshot.docs.map(doc => ({...doc.data()}));
        setAllCostData(costData);
    }, (error) => {
      console.error("지출 데이터 로드 오류:", error);
    });

    return () => {
      sitesUnsubscribe();
      gisungUnsubscribe();
      costUnsubscribe();
    }
  }, []);

  const toggleStar = async (siteId, currentStarred) => {
    try {
      const siteRef = doc(db, 'sites', siteId);
      await updateDoc(siteRef, { isStarred: !currentStarred });
      setSites(sites.map(site => 
        site.id === siteId ? { ...site, isStarred: !currentStarred } : site
      ));
    } catch (error) {
      console.error('Error toggling star:', error);
      setError('별표 상태를 변경하는 중 오류가 발생했습니다.');
    }
  };

  // 현장별 최근 사진
  const getLatestPhoto = (site) => {
    if (site.photos && site.photos.length > 0) return site.photos[site.photos.length - 1];
    return null;
  };

  // 현장별 진행률(일정 기반)
  const getScheduleProgress = (site) => {
    if (!site.schedule || !Array.isArray(site.schedule) || site.schedule.length === 0) return 0;
    const done = site.schedule.filter(s => s.status === '완료').length;
    return Math.round((done / site.schedule.length) * 100);
  };

  // 현장별 주요 일정(가장 가까운 예정 일정)
  const getNextSchedule = (site) => {
    if (!site.schedule || !Array.isArray(site.schedule)) return '-';
    const upcoming = site.schedule
      .filter(s => s.status !== '완료')
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return upcoming[0]?.title + ' (' + new Date(upcoming[0]?.date).toLocaleDateString() + ')' || '-';
  };

  // 현장별 안전 점수
  const getSafetyScore = (site) => {
    if (!site.safetyInspections || !Array.isArray(site.safetyInspections)) return 100;
    const inspections = site.safetyInspections;
    const totalScore = inspections.reduce((sum, inspection) => sum + (inspection.score || 100), 0);
    return Math.round(totalScore / inspections.length);
  };

  // 가공된 최종 데이터
  const processedSites = useMemo(() => {
    console.log('sites:', sites);
    console.log('allGisungData:', allGisungData);
    console.log('allCostData:', allCostData);
    
    return sites.map(site => {
      // siteId 기준으로 누계기성값 합산
      const totalGisung = allGisungData
        .filter(g => g.siteId === site.id)
        .reduce((sum, g) => sum + (Number(g.gisungAmount) || 0), 0);
      
      // 지출 데이터 계산 (현장별로 필터링)
      const siteCosts = allCostData.filter(cost => cost.site === site.name);
      const totalLabor = siteCosts
        .filter(cost => cost.itemType === '노무비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      const totalExpense = siteCosts
        .filter(cost => cost.itemType === '경비')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      const totalEtc = siteCosts
        .filter(cost => cost.itemType === 'RnD' || cost.itemType === '기타')
        .reduce((sum, cost) => sum + (Number(cost.totalValue) || 0), 0);
      
      const budget = Number(site.budget) || 0;
      const gisungProgress = budget > 0 ? Math.round((totalGisung / budget) * 100) : 0;

      console.log(`Site: ${site.name}, Total Gisung: ${totalGisung}, Budget: ${budget}, Progress: ${gisungProgress}%`);
      console.log(`Site: ${site.name}, Labor: ${totalLabor}, Expense: ${totalExpense}, Etc: ${totalEtc}`);

      return { 
        ...site, 
        totalGisung,
        gisungProgress,
        totalLabor,
        totalExpense,
        totalEtc,
      };
    });
  }, [sites, allGisungData, allCostData]);

  const totalChartData = useMemo(() => {
    return processedSites.map(site => ({
      name: site.name,
      '계약금': Number(site.budget) || 0,
      '기성': site.totalGisung,
      '노무': site.totalLabor,
      '경비': site.totalExpense,
      '기타': site.totalEtc,
    }));
  }, [processedSites]);

  if (loading) {
    return (
      <Box sx={{ 
        p: 3,
        position: isMobile ? 'relative' : 'static',
        left: isMobile ? '-30px' : 'auto',
        width: isMobile ? '100vw' : '100%'
      }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ 
        p: 3,
        position: isMobile ? 'relative' : 'static',
        left: isMobile ? '-30px' : 'auto',
        width: isMobile ? '100vw' : '100%'
      }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (sites.length === 0) {
    return (
      <Box sx={{ 
        p: 3,
        position: isMobile ? 'relative' : 'static',
        left: isMobile ? '-30px' : 'auto',
        width: isMobile ? '100vw' : '100%'
      }}>
        <Typography variant="h4" sx={{ mb: 3 }}>주요현장</Typography>
        <Alert severity="info">
          주요현장으로 지정된 현장이 없습니다. 현장관리에서 별표를 체크하여 주요현장을 추가해주세요.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      p: 3,
      position: isMobile ? 'relative' : 'static',
      left: isMobile ? '-30px' : 'auto',
      width: isMobile ? '100vw' : '100%'
    }}>
      <Typography variant="h4" sx={{ mb: 3 }}>주요현장</Typography>
      <Grid container spacing={2.5}>
        {/* Chart */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              주요현장 계약금 대비 지출 현황
            </Typography>
            {totalChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={totalChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip formatter={(value) => `${value.toLocaleString()}원`} />
                  <Legend />
                  <Bar dataKey="계약금" fill="#8884d8" />
                  <Bar dataKey="기성" fill="#4caf50" />
                  <Bar dataKey="노무" fill="#82ca9d" />
                  <Bar dataKey="경비" fill="#ffc658" />
                  <Bar dataKey="기타" fill="#ff6b6b" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Typography>기성 데이터가 없습니다.</Typography>
            )}
          </Paper>
        </Grid>

        {/* Site Cards */}
        {processedSites.map(site => (
          <Grid key={site.id} item xs={12} sm={6} md={4} lg={3}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 6
                }
              }}
            >
              {getLatestPhoto(site) && (
                <CardMedia
                  component="img"
                  height={isMobile ? "120" : "200"}
                  image={getLatestPhoto(site)}
                  alt="현장사진"
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent sx={{ flex: 1, p: isMobile ? 1.5 : 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: isMobile ? 0.5 : 1 }}>
                  <Typography variant={isMobile ? "subtitle1" : "h6"} sx={{ fontSize: isMobile ? '14px' : 'inherit' }}>{site.name}</Typography>
                  <Tooltip title={site.isStarred ? "주요현장에서 제외" : "주요현장에 추가"}>
                    <IconButton 
                      onClick={() => toggleStar(site.id, site.isStarred)}
                      color={site.isStarred ? "primary" : "default"}
                      size={isMobile ? "small" : "medium"}
                    >
                      {site.isStarred ? <StarIcon fontSize={isMobile ? "small" : "medium"} /> : <StarBorderIcon fontSize={isMobile ? "small" : "medium"} />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <LocationOnIcon color="action" fontSize={isMobile ? "small" : "small"} />
                  <Typography color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>{site.location}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <MonetizationOnIcon color="action" fontSize={isMobile ? "small" : "small"} />
                  <Typography color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>
                    공사금액: {site.budget ? site.budget.toLocaleString() + '원' : '-'}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography color="text.secondary" sx={{ minWidth: isMobile ? '60px' : '80px', fontSize: isMobile ? '12px' : 'inherit' }}>
                      기성: {site.totalGisung.toLocaleString()}원
                    </Typography>
                    <Box sx={{ flex: 1, height: isMobile ? '16px' : '20px', bgcolor: 'grey.200', borderRadius: 1, overflow: 'hidden' }}>
                      <Box 
                        sx={{ 
                          height: '100%', 
                          bgcolor: 'primary.main',
                          width: `${Math.min(site.gisungProgress, 100)}%`,
                          transition: 'width 0.3s ease'
                        }} 
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: isMobile ? '30px' : '40px', fontSize: isMobile ? '10px' : 'inherit' }}>
                      {site.gisungProgress}%
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <Typography color="text.secondary" variant="body2" sx={{ fontSize: isMobile ? '11px' : 'inherit' }}>
                    노무: {site.totalLabor.toLocaleString()}원 | 경비: {site.totalExpense.toLocaleString()}원 | 기타: {site.totalEtc.toLocaleString()}원
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <CalendarTodayIcon color="action" fontSize={isMobile ? "small" : "small"} />
                  <Typography sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>
                    {site.startDate ? site.startDate.toLocaleDateString() : '-'} ~ {site.endDate ? site.endDate.toLocaleDateString() : '-'}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <Typography color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>시공팀: {site.team || '-'}</Typography>
                </Stack>
                <Box sx={{ mb: isMobile ? 1 : 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>
                    기성 진행률
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={site.gisungProgress} 
                    sx={{ height: isMobile ? 6 : 8, borderRadius: 4, mb: isMobile ? 0.3 : 0.5 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '11px' : 'inherit' }}>
                    {site.totalGisung.toLocaleString()}원 / {Number(site.budget || 0).toLocaleString()}원 ({site.gisungProgress}%)
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon color="action" fontSize={isMobile ? "small" : "small"} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: isMobile ? '12px' : 'inherit' }}>
                    다음 일정: {getNextSchedule(site)}
                  </Typography>
                </Stack>
              </CardContent>
              {/* 카드 하단 버튼 */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: isMobile ? 0.5 : 1, p: isMobile ? 1 : 2, pt: 0 }}>
                <Button 
                  variant="outlined" 
                  size={isMobile ? "small" : "small"} 
                  onClick={() => navigate(`/progress/${site.id}`)}
                  sx={{ 
                    fontSize: isMobile ? '10px' : 'inherit',
                    padding: isMobile ? '4px 8px' : 'inherit',
                    minWidth: isMobile ? 'auto' : 'inherit'
                  }}
                >
                  기성
                </Button>
                <Button 
                  variant="outlined" 
                  size={isMobile ? "small" : "small"} 
                  color="success" 
                  onClick={() => navigate(`/safety/${site.id}`)}
                  sx={{ 
                    fontSize: isMobile ? '10px' : 'inherit',
                    padding: isMobile ? '4px 8px' : 'inherit',
                    minWidth: isMobile ? 'auto' : 'inherit'
                  }}
                >
                  안전
                </Button>
                <Button 
                  variant="outlined" 
                  size={isMobile ? "small" : "small"} 
                  color="info" 
                  onClick={() => navigate(`/discussions?siteId=${site.id}`)}
                  sx={{ 
                    fontSize: isMobile ? '10px' : 'inherit',
                    padding: isMobile ? '4px 8px' : 'inherit',
                    minWidth: isMobile ? 'auto' : 'inherit'
                  }}
                >
                  협의
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Overview; 