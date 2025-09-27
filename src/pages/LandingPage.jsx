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
  Safety,
  Assessment,
  Group,
  TrendingUp,
  Security,
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
  const [currentFeature, setCurrentFeature] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef(null);

  // 자동 슬라이드 기능
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 5000);
    return () => clearInterval(interval);
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
      icon: <Safety sx={{ fontSize: 60, color: '#ef4444' }} />,
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
      icon: <Safety sx={{ fontSize: 40, color: '#ef4444' }} />,
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

  const handleDemo = () => {
    // 데모 모드로 로그인 페이지로 이동 (데모 계정 안내)
    navigate('/auth?demo=true');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
      color: 'white',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 20% 50%, rgba(67, 233, 123, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.03) 0%, transparent 50%), radial-gradient(circle at 40% 80%, rgba(139, 92, 246, 0.02) 0%, transparent 50%)',
        pointerEvents: 'none'
      }
    }}>
      {/* 헤더 */}
      <Box sx={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(10, 10, 10, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(67, 233, 123, 0.1)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
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
                천우건업
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

      {/* 메인 히어로 섹션 */}
      <Box sx={{ pt: 12, pb: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Fade in timeout={1000}>
                <Box>
                  <Typography variant="h2" sx={{ 
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
                  <Typography variant="h5" sx={{ 
                    mb: 3, 
                    color: '#e5e7eb',
                    lineHeight: 1.6,
                    fontWeight: '300'
                  }}>
                    현장 관리부터 안전 관리까지<br />
                    모든 것을 하나의 시스템으로
                  </Typography>
                  <Typography variant="body1" sx={{ 
                    mb: 4, 
                    color: '#9ca3af',
                    lineHeight: 1.8,
                    fontSize: '1.1rem'
                  }}>
                    천우건업의 종합적인 건설현장관리시스템으로 현장 운영을 효율화하고, 
                    안전을 강화하며, 프로젝트 성공을 보장하세요.
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Button 
                      variant="contained" 
                      size="large"
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
                        px: 4,
                        py: 1.5,
                        fontWeight: 'bold'
                      }}
                    >
                      시작하기
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="large"
                      startIcon={<PlayArrow />}
                      onClick={handleDemo}
                      sx={{ 
                        borderColor: '#3b82f6',
                        color: '#3b82f6',
                        '&:hover': { 
                          borderColor: '#2563eb',
                          bgcolor: 'rgba(59, 130, 246, 0.1)',
                          boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
                        },
                        px: 4,
                        py: 1.5,
                        fontWeight: 'bold'
                      }}
                    >
                      데모 보기
                    </Button>
                  </Stack>
                </Box>
              </Fade>
            </Grid>
            <Grid item xs={12} md={6}>
              <Slide direction="left" in timeout={1200}>
                <Box sx={{ 
                  position: 'relative',
                  height: 400,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {/* 회전하는 기능 아이콘들 */}
                  {features.map((feature, index) => (
                    <Fade 
                      key={index}
                      in={currentFeature === index}
                      timeout={500}
                    >
                      <Paper sx={{ 
                        position: 'absolute',
                        p: 4,
                        textAlign: 'center',
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(67, 233, 123, 0.2)',
                        borderRadius: 3,
                        minWidth: 250,
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(67, 233, 123, 0.1)'
                      }}>
                        {feature.icon}
                        <Typography variant="h6" sx={{ mt: 2, mb: 1, fontWeight: 'bold' }}>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          {feature.description}
                        </Typography>
                      </Paper>
                    </Fade>
                  ))}
                </Box>
              </Slide>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* 통계 섹션 */}
      <Box sx={{ py: 6, background: 'rgba(0, 0, 0, 0.3)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat, index) => (
              <Grid item xs={6} md={3} key={index}>
                <Slide direction="up" in timeout={1000 + index * 200}>
                  <Paper sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(67, 233, 123, 0.1)',
                    borderRadius: 2,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7), 0 0 20px rgba(67, 233, 123, 0.2)',
                      border: '1px solid rgba(67, 233, 123, 0.3)'
                    }
                  }}>
                    <Box sx={{ color: '#43e97b', mb: 1 }}>
                      {stat.icon}
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {stat.number}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      {stat.label}
                    </Typography>
                  </Paper>
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 오늘의 일정 & 주요 기능 바로가기 섹션 */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              빠른 접근
            </Typography>
            <Typography variant="h6" sx={{ color: '#9ca3af' }}>
              오늘의 일정과 주요 기능에 바로 접근하세요
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {/* 오늘의 일정 */}
            <Grid item xs={12} md={4}>
              <Slide direction="up" in timeout={1000}>
                <Paper sx={{ 
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(67, 233, 123, 0.1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(67, 233, 123, 0.3)',
                    border: '1px solid rgba(67, 233, 123, 0.4)'
                  }
                }}>
                  <Box sx={{ 
                    p: 3, 
                    borderBottom: '1px solid rgba(67, 233, 123, 0.2)',
                    background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Today sx={{ color: '#3b82f6', fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          오늘의 일정
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          {new Date().toLocaleDateString('ko-KR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            weekday: 'long'
                          })}
                        </Typography>
                      </Box>
                    </Box>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => navigate('/schedule')}
                      endIcon={<ArrowForward />}
                      sx={{ 
                        borderColor: '#3b82f6',
                        color: '#3b82f6',
                        '&:hover': { 
                          borderColor: '#2563eb',
                          bgcolor: 'rgba(59, 130, 246, 0.1)'
                        }
                      }}
                    >
                      전체 일정 보기
                    </Button>
                  </Box>
                  
                  <Box sx={{ p: 3 }}>
                    {todaySchedule.slice(0, 3).map((item, index) => (
                      <Box key={index} sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 2, 
                        mb: 2,
                        p: 2,
                        borderRadius: 2,
                        background: item.status === 'completed' 
                          ? 'rgba(34, 197, 94, 0.1)' 
                          : 'rgba(255, 255, 255, 0.03)',
                        border: item.status === 'completed' 
                          ? '1px solid rgba(34, 197, 94, 0.2)' 
                          : '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <Box sx={{ 
                          minWidth: 50,
                          textAlign: 'center'
                        }}>
                          <Typography variant="caption" sx={{ 
                            color: item.status === 'completed' ? '#22c55e' : '#b3b8c5',
                            fontWeight: 'bold'
                          }}>
                            {item.time}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" sx={{ 
                            fontWeight: 'medium',
                            color: item.status === 'completed' ? '#22c55e' : 'white',
                            textDecoration: item.status === 'completed' ? 'line-through' : 'none'
                          }}>
                            {item.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Chip 
                              label={item.priority === 'high' ? '긴급' : item.priority === 'medium' ? '보통' : '낮음'}
                              size="small"
                              sx={{ 
                                height: 20,
                                fontSize: '0.7rem',
                                bgcolor: item.priority === 'high' ? 'rgba(239, 68, 68, 0.2)' : 
                                         item.priority === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 
                                         'rgba(107, 114, 128, 0.2)',
                                color: item.priority === 'high' ? '#ef4444' : 
                                       item.priority === 'medium' ? '#f59e0b' : '#6b7280'
                              }}
                            />
                            {item.status === 'completed' && (
                              <CheckCircleOutline sx={{ fontSize: 16, color: '#22c55e' }} />
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Paper>
              </Slide>
            </Grid>

            {/* 주요 기능 바로가기 */}
            <Grid item xs={12} md={8}>
              <Slide direction="up" in timeout={1200}>
                <Paper sx={{ 
                  height: '100%',
                  background: 'rgba(0, 0, 0, 0.7)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(67, 233, 123, 0.1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
                }}>
                  <Box sx={{ 
                    p: 3, 
                    borderBottom: '1px solid rgba(67, 233, 123, 0.2)',
                    background: 'linear-gradient(135deg, rgba(67, 233, 123, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Dashboard sx={{ color: '#43e97b', fontSize: 32 }} />
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          주요 기능
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                          자주 사용하는 기능에 빠르게 접근하세요
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Grid container spacing={2} sx={{ p: 3 }}>
                    {quickAccess.map((item, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper sx={{ 
                          p: 2,
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
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Box sx={{ 
                              p: 1,
                              borderRadius: 2,
                              background: 'rgba(0, 0, 0, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '1px solid rgba(67, 233, 123, 0.1)'
                            }}>
                              {item.icon}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ 
                                fontWeight: 'bold', 
                                mb: 0.5,
                                color: 'white'
                              }}>
                                {item.title}
                              </Typography>
                              <Typography variant="caption" sx={{ 
                                color: '#9ca3af',
                                display: 'block',
                                mb: 1
                              }}>
                                {item.description}
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                opacity: 0.7
                              }}>
                                <Visibility sx={{ fontSize: 14, color: '#43e97b' }} />
                                <Typography variant="caption" sx={{ 
                                  color: '#6b7280',
                                  fontSize: '0.7rem'
                                }}>
                                  {item.preview}
                                </Typography>
                              </Box>
                            </Box>
                            <Launch sx={{ 
                              fontSize: 16, 
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

      {/* 서비스 섹션 */}
      <Box sx={{ py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              주요 기능
            </Typography>
            <Typography variant="h6" sx={{ color: '#b3b8c5' }}>
              건설현장관리에 필요한 모든 기능을 제공합니다
            </Typography>
          </Box>
          
          <Grid container spacing={4}>
            {services.map((service, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Slide direction="up" in timeout={1000 + index * 100}>
                  <Card sx={{ 
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 20px 40px rgba(67, 233, 123, 0.2)',
                      border: '1px solid rgba(67, 233, 123, 0.3)'
                    }
                  }}>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ 
                        color: '#43e97b', 
                        mb: 2,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}>
                        {service.icon}
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {service.title}
                        </Typography>
                      </Box>
                      <Typography variant="body2" sx={{ color: '#b3b8c5' }}>
                        {service.description}
                      </Typography>
                    </CardContent>
                    <CardActions sx={{ p: 3, pt: 0 }}>
                      <Button 
                        size="small" 
                        endIcon={<ArrowForward />}
                        onClick={() => navigate(service.path)}
                        sx={{ 
                          color: '#43e97b',
                          '&:hover': { 
                            bgcolor: 'rgba(67, 233, 123, 0.1)'
                          }
                        }}
                      >
                        자세히 보기
                      </Button>
                    </CardActions>
                  </Card>
                </Slide>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA 섹션 */}
      <Box sx={{ py: 8, background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(10, 10, 10, 0.9) 100%)' }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 2 }}>
              지금 시작하세요
            </Typography>
            <Typography variant="h6" sx={{ color: '#9ca3af', mb: 4 }}>
              천우건업의 건설현장관리시스템으로 현장 운영을 혁신하세요
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleGetStarted}
              endIcon={<ArrowForward />}
              sx={{ 
                bgcolor: 'transparent',
                border: '2px solid #43e97b',
                color: '#43e97b',
                '&:hover': { 
                  bgcolor: 'rgba(67, 233, 123, 0.1)',
                  border: '2px solid #38d975',
                  boxShadow: '0 0 40px rgba(67, 233, 123, 0.4)'
                },
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 'bold'
              }}
            >
              {currentUser ? '시스템 시작하기' : '무료로 시작하기'}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* 푸터 */}
      <Box sx={{ 
        py: 4, 
        borderTop: '1px solid rgba(67, 233, 123, 0.1)',
        background: 'rgba(0, 0, 0, 0.8)'
      }}>
        <Container maxWidth="lg">
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ 
                bgcolor: 'transparent', 
                width: 32, 
                height: 32,
                border: '1px solid #43e97b'
              }}>
                <Construction sx={{ color: '#43e97b', fontSize: 20 }} />
              </Avatar>
              <Typography variant="body2" sx={{ color: '#6b7280' }}>
                © 2025 천우건업. All rights reserved.
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Chip 
                label="안전 관리" 
                size="small" 
                sx={{ bgcolor: 'rgba(67, 233, 123, 0.2)', color: '#43e97b' }}
              />
              <Chip 
                label="현장 관리" 
                size="small" 
                sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
              />
              <Chip 
                label="일정 관리" 
                size="small" 
                sx={{ bgcolor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' }}
              />
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
