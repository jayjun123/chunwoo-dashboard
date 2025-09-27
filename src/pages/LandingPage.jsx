import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Paper,
  Fade,
  Slide,
  useTheme,
  useMediaQuery,
  IconButton,
  Divider,
  Chip,
  Avatar,
  Stack
} from '@mui/material';
import {
  Construction,
  Schedule,
  Map,
  Security,
  Assessment,
  Group,
  TrendingUp,
  Speed,
  CheckCircle,
  ArrowForward,
  PlayArrow,
  Star,
  Business,
  Engineering,
  Timeline,
  LocationOn,
  Shield,
  Analytics,
  People,
  Description,
  Today,
  Dashboard,
  Visibility,
  Launch,
  AccessTime,
  Event,
  Assignment,
  Warning,
  CheckCircleOutline
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todaySchedules, setTodaySchedules] = useState([]);
  const heroRef = useRef(null);

  // 자동 슬라이드 기능
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 실시간 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 사용자 권한 확인
  useEffect(() => {
    const checkUserRole = async () => {
      if (currentUser) {
        try {
          const { getIdTokenResult } = await import('firebase/auth');
          const { auth } = await import('../firebase');
          const tokenResult = await getIdTokenResult(auth.currentUser);
          setUserRole(tokenResult.claims.role || 'user');
        } catch (error) {
          console.error('사용자 권한 확인 실패:', error);
          setUserRole('user');
        }
      }
    };
    
    checkUserRole();
  }, [currentUser]);

  // 오늘의 일정 데이터 가져오기
  useEffect(() => {
    const fetchTodaySchedules = async () => {
      try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
        
        // Firebase에서 실제 일정 데이터 가져오기
        const { db } = await import('../firebase');
        const { collection, query, where, getDocs } = await import('firebase/firestore');
        
        // 실제 일정 컬렉션에서 오늘 날짜의 일정 가져오기
        const schedulesRef = collection(db, 'schedules');
        const q = query(schedulesRef);
        const querySnapshot = await getDocs(q);
        
        const schedules = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // 날짜 처리 (다양한 형식 지원)
          let scheduleDate = null;
          if (data.date) {
            if (data.date.toDate) {
              // Firestore Timestamp인 경우
              scheduleDate = data.date.toDate().toISOString().split('T')[0];
            } else if (data.date instanceof Date) {
              // JavaScript Date인 경우
              scheduleDate = data.date.toISOString().split('T')[0];
            } else if (typeof data.date === 'string') {
              // 문자열인 경우
              scheduleDate = data.date;
            }
          }
          
          // 오늘 날짜와 일치하는 일정만 추가
          if (scheduleDate === todayStr) {
            // 실제 현장명 찾기
            let actualTitle = data.title || data.name || data.description || data.task || data.content || data.scheduleName || data.projectName || data.siteName || '일정';
            
            // 만약 제목이 "일정"이면 다른 필드들도 확인
            if (actualTitle === '일정') {
              actualTitle = data.text || data.label || data.value || data.subject || data.work || data.job || '일정';
            }
            
            // 분류 태그 결정
            let category = '[현장]'; // 기본값을 현장으로 변경
            if (actualTitle.includes('현장') || actualTitle.includes('공사') || actualTitle.includes('건설') || actualTitle.includes('시설')) {
              category = '[현장]';
            } else if (actualTitle.includes('실측') || actualTitle.includes('측량') || actualTitle.includes('측정')) {
              category = '[실측]';
            } else if (actualTitle.includes('안전') || actualTitle.includes('점검') || actualTitle.includes('교육')) {
              category = '[안전]';
            } else if (actualTitle.includes('회의') || actualTitle.includes('미팅') || actualTitle.includes('검토')) {
              category = '[회의]';
            } else if (actualTitle.includes('기성') || actualTitle.includes('진행') || actualTitle.includes('완료')) {
              category = '[기성]';
            } else if (actualTitle.includes('견적') || actualTitle.includes('계약') || actualTitle.includes('거래처')) {
              category = '[관리]';
            }
            
            schedules.push({
              id: doc.id,
              title: actualTitle,
              type: data.type || 'general',
              category: category
            });
          }
        });
        
        // 모든 데이터 로그 출력 (디버깅용)
        console.log('전체 일정 데이터:', querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        console.log('오늘 날짜:', todayStr);
        console.log('오늘 일정 필터링 결과:', schedules);
        
        // 디버깅을 위한 로그
        console.log('오늘 날짜:', todayStr);
        console.log('가져온 일정 수:', schedules.length);
        console.log('일정 데이터:', schedules);
        
        setTodaySchedules(schedules);
      } catch (error) {
        console.error('일정 데이터 로드 실패:', error);
        // Firebase 연결 실패 시 빈 배열로 설정
        setTodaySchedules([]);
      }
    };

    fetchTodaySchedules();
  }, []);

  // 스크롤 애니메이션
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  const features = [
    {
      icon: <Construction sx={{ fontSize: 60, color: '#43e97b' }} />,
      title: '현장 관리',
      description: '실시간 현장 현황 모니터링 및 효율적인 현장 관리 시스템',
      color: '#43e97b'
    },
    {
      icon: <Schedule sx={{ fontSize: 60, color: '#3b82f6' }} />,
      title: '일정 관리',
      description: '간트 차트를 통한 직관적인 프로젝트 일정 관리',
      color: '#3b82f6'
    },
    {
      icon: <Map sx={{ fontSize: 60, color: '#f59e0b' }} />,
      title: '지도 기반 현황',
      description: '지도에서 현장 위치 확인 및 거리 측정 기능',
      color: '#f59e0b'
    },
    {
      icon: <Security sx={{ fontSize: 60, color: '#ef4444' }} />,
      title: '안전 관리',
      description: '안전 점검, 사고 관리, 안전 교육 통합 관리',
      color: '#ef4444'
    }
  ];

  const services = [
    {
      icon: <Assessment />,
      title: '기성 관리',
      description: '기성 단계별 진행 상황 추적 및 관리',
      path: '/gisung'
    },
    {
      icon: <Group />,
      title: '거래처 관리',
      description: '협력업체 정보 및 계약 관리',
      path: '/vendors'
    },
    {
      icon: <TrendingUp />,
      title: '진행률 관리',
      description: '프로젝트 진행률 실시간 모니터링',
      path: '/progress'
    },
    {
      icon: <Security />,
      title: '견적 관리',
      description: '견적서 작성 및 분석 시스템',
      path: '/estimates'
    },
    {
      icon: <Speed />,
      title: '일정 관리',
      description: '프로젝트 일정 계획 및 추적',
      path: '/schedule'
    },
    {
      icon: <LocationOn />,
      title: '현장 지도',
      description: '현장 위치 확인 및 거리 측정',
      path: '/mapping'
    }
  ];

  const stats = [
    { number: '69', label: '관리 현장', icon: <Construction /> },
    { number: '27', label: '완료 현장', icon: <CheckCircle /> },
    { number: '26', label: '진행 현장', icon: <Timeline /> },
    { number: '12', label: '예정 현장', icon: <Schedule /> }
  ];

  // 오늘의 일정 데이터 (샘플)
  const todaySchedule = [
    { time: '09:00', title: '문경 향토음식 특성화센터 현장 점검', status: 'upcoming', priority: 'high' },
    { time: '11:30', title: '안전교육 진행', status: 'completed', priority: 'medium' },
    { time: '14:00', title: '기성 검토 회의', status: 'upcoming', priority: 'high' },
    { time: '16:30', title: '거래처 미팅', status: 'upcoming', priority: 'low' }
  ];

  // 주요 기능 바로가기
  const quickAccess = [
    {
      icon: <Dashboard sx={{ fontSize: 40, color: '#43e97b' }} />,
      title: '대시보드',
      description: '전체 현황 한눈에 보기',
      path: '/dashboard',
      preview: '현장 현황, 일정, 진행률 등 종합 정보'
    },
    {
      icon: <Today sx={{ fontSize: 40, color: '#3b82f6' }} />,
      title: '오늘의 일정',
      description: '오늘 해야 할 일들',
      path: '/schedule',
      preview: '현장 점검, 회의, 안전교육 등'
    },
    {
      icon: <Map sx={{ fontSize: 40, color: '#f59e0b' }} />,
      title: '현장 지도',
      description: '현장 위치 및 거리 측정',
      path: '/mapping',
      preview: '69개 현장 위치, 거리측정 기능'
    },
    {
      icon: <Security sx={{ fontSize: 40, color: '#ef4444' }} />,
      title: '안전 관리',
      description: '안전 점검 및 사고 관리',
      path: '/safety',
      preview: '안전 점검, 사고 관리, 교육'
    },
    {
      icon: <Assessment sx={{ fontSize: 40, color: '#8b5cf6' }} />,
      title: '기성 관리',
      description: '기성 단계별 진행 관리',
      path: '/gisung',
      preview: '기성 진행률, 단계별 관리'
    },
    {
      icon: <Group sx={{ fontSize: 40, color: '#06b6d4' }} />,
      title: '거래처 관리',
      description: '협력업체 정보 관리',
      path: '/vendors',
      preview: '거래처 정보, 계약 관리'
    }
  ];

  const handleGetStarted = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  };

  const handleLogin = () => {
    // 로그인 페이지로 이동
    navigate('/auth');
  };

  return (
    <Box sx={{ 
      height: '100vh',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: 'white',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(67, 233, 123, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.02) 0%, transparent 50%)',
        pointerEvents: 'none'
      },
      '@keyframes shimmer': {
        '0%': { transform: 'translateX(-100%)' },
        '100%': { transform: 'translateX(100%)' }
      },
      '@keyframes pulse': {
        '0%, 100%': { 
          transform: 'scale(1)',
          filter: 'drop-shadow(0 0 10px rgba(67, 233, 123, 0.2))'
        },
        '50%': { 
          transform: 'scale(1.02)',
          filter: 'drop-shadow(0 0 20px rgba(67, 233, 123, 0.4))'
        }
      },
      '@keyframes cyberShimmer': {
        '0%': { 
          transform: 'translateX(-100%) rotate(45deg)',
          opacity: 0
        },
        '50%': { 
          opacity: 1
        },
        '100%': { 
          transform: 'translateX(100%) rotate(45deg)',
          opacity: 0
        }
      },
      '@keyframes cyberRotate': {
        '0%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
        '100%': { transform: 'translate(-50%, -50%) rotate(360deg)' }
      },
      '@keyframes cyberPulse': {
        '0%, 100%': { 
          transform: 'scale(1)',
          filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.3))',
          textShadow: '0 0 40px rgba(0, 212, 255, 0.6)'
        },
        '50%': { 
          transform: 'scale(1.05)',
          filter: 'drop-shadow(0 0 25px rgba(0, 212, 255, 0.5))',
          textShadow: '0 0 60px rgba(0, 212, 255, 0.8)'
        }
      },
      '@keyframes buildingLights': {
        '0%, 100%': { 
          opacity: 0.3,
          transform: 'translateX(-10%)'
        },
        '50%': { 
          opacity: 0.8,
          transform: 'translateX(10%)'
        }
      }
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(67, 233, 123, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        flexShrink: 0
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            py: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'transparent', 
                width: 40, 
                height: 40,
                border: '2px solid #43e97b',
                boxShadow: '0 0 20px rgba(67, 233, 123, 0.3)'
              }}>
                <Construction sx={{ color: '#43e97b' }} />
              </Avatar>
              <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#43e97b' }}>
                천우건업(주)
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              onClick={handleGetStarted}
              sx={{ 
                bgcolor: 'transparent',
                border: '2px solid #43e97b',
                color: '#43e97b',
                '&:hover': { 
                  bgcolor: 'rgba(67, 233, 123, 0.1)',
                  border: '2px solid #38d975',
                  boxShadow: '0 0 20px rgba(67, 233, 123, 0.3)'
                },
                px: 3,
                fontWeight: 'bold'
              }}
            >
              {currentUser ? '시스템 시작' : '로그인'}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* 메인 콘텐츠 */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Container maxWidth="lg" sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 2 }}>
          <Grid container spacing={3} sx={{ flex: 1, alignItems: 'stretch' }}>
            {/* 왼쪽: 제목과 설명 */}
            <Grid item xs={12} md={4}>
              <Fade in timeout={1000}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <Typography variant="h3" sx={{ 
                    fontWeight: 'bold', 
                    mb: 2,
                    background: 'linear-gradient(45deg, #43e97b, #3b82f6, #8b5cf6)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    textShadow: '0 0 30px rgba(67, 233, 123, 0.3)',
                    filter: 'drop-shadow(0 0 10px rgba(67, 233, 123, 0.2))'
                  }}>
                    건설현장관리시스템
                  </Typography>
                  <Typography variant="h6" sx={{ 
                    mb: 2, 
                    color: '#e5e7eb',
                    lineHeight: 1.4,
                    fontWeight: '300'
                  }}>
                    현장 관리부터 안전 관리까지<br />
                    모든 것을 하나의 시스템으로
                  </Typography>
                  <Typography variant="body2" sx={{ 
                    mb: 3, 
                    color: '#9ca3af',
                    lineHeight: 1.6
                  }}>
                    천우건업(주)의 종합적인 건설현장관리시스템으로 현장 운영을 효율화하고, 
                    안전을 강화하며, 프로젝트 성공을 보장하세요.
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mb: 4 }}>
                    <Button 
                      variant="contained" 
                      size="medium"
                      onClick={handleGetStarted}
                      endIcon={<ArrowForward />}
                      sx={{ 
                        bgcolor: 'transparent',
                        border: '2px solid #43e97b',
                        color: '#43e97b',
                        '&:hover': { 
                          bgcolor: 'rgba(67, 233, 123, 0.1)',
                          border: '2px solid #38d975',
                          boxShadow: '0 0 30px rgba(67, 233, 123, 0.4)'
                        },
                        px: 3,
                        py: 1,
                        fontWeight: 'bold'
                      }}
                    >
                      시작하기
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="medium"
                      startIcon={<Security />}
                      onClick={handleLogin}
                      sx={{ 
                        borderColor: currentUser ? '#ef4444' : '#3b82f6',
                        color: currentUser ? '#ef4444' : '#3b82f6',
                        '&:hover': { 
                          borderColor: currentUser ? '#dc2626' : '#2563eb',
                          bgcolor: currentUser ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                          boxShadow: currentUser ? '0 0 30px rgba(239, 68, 68, 0.6)' : '0 0 30px rgba(59, 130, 246, 0.4)'
                        },
                        px: 3,
                        py: 1,
                        fontWeight: 'bold',
                        ...(currentUser && {
                          border: '2px solid #ef4444',
                          boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
                          textShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                        })
                      }}
                    >
                      {currentUser ? '로그인 완료' : '로그인하기'}
                    </Button>
                  </Stack>
                  
                  {/* 2025년도 현장 제목 */}
                  <Box sx={{ mb: 2, textAlign: 'left' }}>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 'bold', 
                      color: '#43e97b',
                      textShadow: '0 0 15px rgba(67, 233, 123, 0.4)',
                      letterSpacing: '2px',
                      fontSize: '2rem'
                    }}>
                      2025년도 현장
                    </Typography>
                  </Box>
                  
                  {/* 통계 카드들 */}
                  <Grid container spacing={2} sx={{ flex: 1 }}>
                    {stats.map((stat, index) => (
                      <Grid item xs={6} key={index}>
                        <Paper sx={{ 
                          p: 1.5, 
                          textAlign: 'center',
                          background: 'rgba(0, 0, 0, 0.6)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(67, 233, 123, 0.1)',
                          borderRadius: 2,
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                          transition: 'all 0.3s ease',
                          minHeight: '120px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          '&:hover': {
                            transform: 'translateY(-5px)',
                            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(67, 233, 123, 0.2)',
                            border: '1px solid rgba(67, 233, 123, 0.3)'
                          }
                        }}>
                          <Box sx={{ color: '#43e97b', mb: 1 }}>
                            {stat.icon}
                          </Box>
                          <Typography variant="h4" sx={{ 
                            fontWeight: 'bold', 
                            mb: 0.5,
                            color: '#43e97b',
                            textShadow: '0 0 10px rgba(67, 233, 123, 0.3)'
                          }}>
                            {stat.number}
                          </Typography>
                          <Typography variant="body1" sx={{ 
                            color: '#e5e7eb',
                            fontWeight: '500'
                          }}>
                            {stat.label}
                          </Typography>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Fade>
            </Grid>

            {/* 중앙: 현재 시간 & 통계 */}
            <Grid item xs={12} md={4}>
              <Slide direction="up" in timeout={1200}>
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  {/* 현재 날짜/시간 - 사이버펑크 스타일 */}
                  <Paper sx={{ 
                    p: 2, 
                    mb: 1,
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 30, 0.98) 100%)',
                    backdropFilter: 'blur(30px)',
                    border: '2px solid transparent',
                    backgroundImage: `
                      linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(10, 10, 30, 0.98)), 
                      linear-gradient(45deg, #00d4ff, #0099cc, #0066ff, #00d4ff)
                    `,
                    backgroundOrigin: 'border-box',
                    backgroundClip: 'padding-box, border-box',
                    borderRadius: 4,
                    boxShadow: `
                      0 20px 40px rgba(0, 0, 0, 0.8), 
                      0 0 30px rgba(0, 212, 255, 0.3),
                      inset 0 0 20px rgba(0, 212, 255, 0.1)
                    `,
                    position: 'relative',
                    overflow: 'hidden',
                    minHeight: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `
                        radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 80% 80%, rgba(0, 153, 204, 0.1) 0%, transparent 50%),
                        linear-gradient(45deg, transparent 30%, rgba(0, 212, 255, 0.05) 50%, transparent 70%)
                      `,
                      animation: 'cyberShimmer 4s ease-in-out infinite',
                      pointerEvents: 'none'
                    },
                    '&::after': {
                      content: '""',
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '200%',
                      height: '200%',
                      background: `
                        conic-gradient(from 0deg, 
                          transparent 0deg, 
                          rgba(0, 212, 255, 0.1) 90deg, 
                          transparent 180deg, 
                          rgba(0, 153, 204, 0.1) 270deg, 
                          transparent 360deg
                        )
                      `,
                      transform: 'translate(-50%, -50%) rotate(0deg)',
                      animation: 'cyberRotate 8s linear infinite',
                      pointerEvents: 'none',
                      zIndex: 0
                    }
                  }}>
                    <Box sx={{ position: 'relative', zIndex: 2 }}>
                      {/* 고층빌딩 실루엣 배경 */}
                      <Box sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '60%',
                        background: `
                          linear-gradient(to top, 
                            rgba(0, 0, 0, 0.8) 0%, 
                            rgba(0, 0, 0, 0.4) 30%, 
                            transparent 100%
                          )
                        `,
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          height: '100%',
                          background: `
                            linear-gradient(90deg, 
                              transparent 0%, 
                              rgba(0, 212, 255, 0.1) 10%, 
                              transparent 20%, 
                              rgba(0, 153, 204, 0.1) 30%, 
                              transparent 40%,
                              rgba(0, 102, 255, 0.1) 50%,
                              transparent 60%,
                              rgba(0, 212, 255, 0.1) 70%,
                              transparent 80%,
                              rgba(0, 153, 204, 0.1) 90%,
                              transparent 100%
                            )
                          `,
                          animation: 'buildingLights 3s ease-in-out infinite'
                        }
                      }} />
                      
                      <Typography variant="h5" sx={{ 
                        fontWeight: 'bold', 
                        background: 'linear-gradient(45deg, #00d4ff, #0099cc, #00d4ff)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        mb: 1,
                        textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
                        letterSpacing: '1px',
                        fontSize: '1.5rem',
                        position: 'relative',
                        zIndex: 3
                      }}>
                        {currentTime.toLocaleDateString('ko-KR', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          weekday: 'long'
                        })}
                      </Typography>
                      
                      <Typography variant="h2" sx={{ 
                        fontWeight: '900', 
                        background: 'linear-gradient(45deg, #00d4ff, #ffffff, #0099cc, #00d4ff)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontFamily: '"Orbitron", "JetBrains Mono", monospace',
                        letterSpacing: '3px',
                        textShadow: '0 0 40px rgba(0, 212, 255, 0.6)',
                        filter: 'drop-shadow(0 0 15px rgba(0, 212, 255, 0.3))',
                        position: 'relative',
                        zIndex: 3,
                        mb: 1,
                        fontSize: '3.5rem',
                        fontStretch: 'condensed',
                        WebkitTextStroke: '1px rgba(0, 212, 255, 0.3)',
                        textStroke: '1px rgba(0, 212, 255, 0.3)'
                      }}>
                        {currentTime.toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          hour12: false
                        })}
                      </Typography>
                      
                      <Typography variant="caption" sx={{ 
                        color: '#00d4ff',
                        mt: 1,
                        display: 'block',
                        fontSize: '0.8rem',
                        letterSpacing: '2px',
                        textShadow: '0 0 10px rgba(0, 212, 255, 0.5)',
                        position: 'relative',
                        zIndex: 3
                      }}>
                        ● IN KOREA ●
                      </Typography>
                    </Box>
                  </Paper>
                  
                  {/* 오늘의 일정 */}
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                      <Today sx={{ color: '#43e97b', mr: 1, fontSize: 20 }} />
                      <Typography variant="h6" sx={{ 
                        fontWeight: 'bold', 
                        color: '#43e97b',
                        textShadow: '0 0 10px rgba(67, 233, 123, 0.3)',
                        fontSize: '1.1rem'
                      }}>
                        오늘의 일정
                      </Typography>
                    </Box>
                    
                    <Box sx={{ textAlign: 'left' }}>
                      {todaySchedules.length > 0 ? (
                        todaySchedules.map((schedule, index) => {
                          // 분류별 색상 정의
                          const getCategoryColor = (category) => {
                            switch (category) {
                              case '[현장]': return '#43e97b'; // 초록색
                              case '[실측]': return '#3b82f6'; // 파란색
                              case '[안전]': return '#ef4444'; // 빨간색
                              case '[회의]': return '#f59e0b'; // 주황색
                              case '[기성]': return '#8b5cf6'; // 보라색
                              case '[관리]': return '#06b6d4'; // 청록색
                              default: return '#43e97b'; // 기본값
                            }
                          };
                          
                          const categoryColor = getCategoryColor(schedule.category);
                          
                          return (
                            <Typography 
                              key={schedule.id || index}
                              variant="body1" 
                              sx={{ 
                                color: '#e5e7eb',
                                mb: 0.5,
                                fontSize: '1.1rem',
                                textShadow: '0 0 5px rgba(67, 233, 123, 0.2)',
                                '&:before': {
                                  content: '"• "',
                                  color: categoryColor,
                                  fontWeight: 'bold'
                                }
                              }}
                            >
                              <Box component="span" sx={{ 
                                color: categoryColor,
                                fontWeight: 'bold',
                                mr: 1,
                                textShadow: `0 0 8px ${categoryColor}40`
                              }}>
                                {schedule.category || '[현장]'}
                              </Box>
                              {schedule.title}
                            </Typography>
                          );
                        })
                      ) : (
                        <Typography variant="body1" sx={{ 
                          color: '#9ca3af',
                          fontStyle: 'italic',
                          fontSize: '1.1rem'
                        }}>
                          오늘 등록된 일정이 없습니다.
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </Slide>
            </Grid>

            {/* 오른쪽: 주요 기능 */}
            <Grid item xs={12} md={4}>
              <Slide direction="right" in timeout={1400}>
                <Paper sx={{ 
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(67, 233, 123, 0.1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: '1px solid rgba(67, 233, 123, 0.2)',
                    background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Dashboard sx={{ color: '#43e97b', fontSize: 24 }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        주요 기능
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={1} sx={{ p: 2 }}>
                    {quickAccess.slice(0, 6).map((item, index) => (
                      <Grid item xs={6} key={index}>
                        <Paper sx={{ 
                          p: 1.5,
                          background: 'rgba(0, 0, 0, 0.4)',
                          border: '1px solid rgba(67, 233, 123, 0.1)',
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 15px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(67, 233, 123, 0.2)',
                            border: '1px solid rgba(67, 233, 123, 0.3)',
                            background: 'rgba(67, 233, 123, 0.1)'
                          }
                        }} onClick={() => navigate(item.path)}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ 
                              p: 0.5,
                              borderRadius: 1,
                              background: 'rgba(0, 0, 0, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(67, 233, 123, 0.1)'
                            }}>
                              {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="caption" sx={{ 
                                fontWeight: 'bold', 
                                color: 'white',
                                display: 'block'
                              }}>
                                {item.title}
                              </Typography>
                            </Box>
                            <Launch sx={{ 
                              fontSize: 12, 
                              color: '#43e97b',
                              opacity: 0.6
                            }} />
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Slide>
            </Grid>
          </Grid>
        </Container>
      </Box>


      {/* 푸터 */}
      <Box sx={{ 
        py: 2, 
        borderTop: '1px solid rgba(67, 233, 123, 0.1)',
        background: 'rgba(0, 0, 0, 0.8)',
        flexShrink: 0
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: 2
          }}>
            <Avatar sx={{ 
              bgcolor: 'transparent', 
              width: 24, 
              height: 24,
              border: '1px solid #43e97b'
            }}>
              <Construction sx={{ color: '#43e97b', fontSize: 16 }} />
            </Avatar>
            <Typography variant="caption" sx={{ color: '#6b7280' }}>
              © 2025 천우건업(주). All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
