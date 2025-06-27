import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { collection, getDocs, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import { useNavigate } from 'react-router-dom';

const Overview = () => {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // 실시간 주요현장(onSnapshot)
    const sitesQuery = query(collection(db, 'sites'), where('isStarred', '==', true));
    const unsubscribe = onSnapshot(sitesQuery, (snapshot) => {
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
    return () => unsubscribe();
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

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (sites.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>주요현장</Typography>
        <Alert severity="info">
          주요현장으로 지정된 현장이 없습니다. 현장관리에서 별표를 체크하여 주요현장을 추가해주세요.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>주요현장</Typography>
      <Grid container spacing={3}>
        {sites.map(site => (
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
                  height="200"
                  image={getLatestPhoto(site)}
                  alt="현장사진"
                  sx={{ objectFit: 'cover' }}
                />
              )}
              <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6">{site.name}</Typography>
                  <Tooltip title={site.isStarred ? "주요현장에서 제외" : "주요현장에 추가"}>
                    <IconButton 
                      onClick={() => toggleStar(site.id, site.isStarred)}
                      color={site.isStarred ? "primary" : "default"}
                    >
                      {site.isStarred ? <StarIcon /> : <StarBorderIcon />}
                    </IconButton>
                  </Tooltip>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <LocationOnIcon color="action" fontSize="small" />
                  <Typography color="text.secondary">{site.location}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">공사금액: {site.budget ? site.budget.toLocaleString() + '원' : '-'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <CalendarTodayIcon color="action" fontSize="small" />
                  <Typography>
                    {site.startDate ? site.startDate.toLocaleDateString() : '-'} ~ {site.endDate ? site.endDate.toLocaleDateString() : '-'}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <Typography color="text.secondary">시공팀: {site.team || '-'}</Typography>
                </Stack>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    일정 진행률
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={getScheduleProgress(site)} 
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {getScheduleProgress(site)}%
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EventIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    다음 일정: {getNextSchedule(site)}
                  </Typography>
                </Stack>
              </CardContent>
              {/* 카드 하단 버튼 */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2, pt: 0 }}>
                <Button variant="outlined" size="small" onClick={() => navigate(`/progress/${site.id}`)}>기성</Button>
                <Button variant="outlined" size="small" color="success" onClick={() => navigate(`/safety/${site.id}`)}>안전</Button>
                <Button variant="outlined" size="small" color="info" onClick={() => navigate(`/discussions?siteId=${site.id}`)}>협의</Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Overview; 