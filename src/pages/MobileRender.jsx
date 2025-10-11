import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  IconButton,
  Fab,
  BottomNavigation,
  BottomNavigationAction,
  useTheme,
  useMediaQuery,
  SwipeableDrawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Avatar,
  Badge,
  LinearProgress,
  Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home as HomeIcon,
  Assignment as AssignmentIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Search as SearchIcon,
  Add as AddIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  AttachMoney as AttachMoneyIcon
} from '@mui/icons-material';

// API imports
import { subscribeToClaims } from '../api/claims';
import { subscribeToEstimates } from '../api/estimates';
import { subscribeToSites } from '../api/sites';

const MobileRender = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  
  // 상태 관리
  const [currentTab, setCurrentTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  
  // 실제 데이터 상태
  const [claims, setClaims] = useState([]);
  const [estimates, setEstimates] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 데이터 가져오기
  useEffect(() => {
    console.log('📱 모바일 렌더링 페이지 데이터 로딩 시작');
    
    // 청구 데이터 구독
    const unsubscribeClaims = subscribeToClaims((claimsData) => {
      console.log('📱 청구 데이터 수신:', claimsData.length, '개');
      setClaims(claimsData);
    });
    
    // 견적 데이터 구독
    const unsubscribeEstimates = subscribeToEstimates((estimatesData) => {
      console.log('📱 견적 데이터 수신:', estimatesData.length, '개');
      setEstimates(estimatesData);
    });
    
    // 현장 데이터 구독
    const unsubscribeSites = subscribeToSites((sitesData) => {
      console.log('📱 현장 데이터 수신:', sitesData.length, '개');
      setSites(sitesData);
      setLoading(false);
    });
    
    return () => {
      unsubscribeClaims();
      unsubscribeEstimates();
      unsubscribeSites();
    };
  }, []);
  
  // 실제 데이터 기반 통계 계산
  const calculateStats = () => {
    const totalClaims = claims.length;
    const completedClaims = claims.filter(claim => claim.claimStatus === 'O' || claim.claimStatus === '청구완료').length;
    const pendingClaims = claims.filter(claim => claim.claimStatus !== 'O' && claim.claimStatus !== '청구완료' && claim.claimStatus !== '이월').length;
    
    const totalAmount = claims.reduce((sum, claim) => {
      return sum + (claim.claimAmount || 0);
    }, 0);
    
    return {
      totalProjects: sites.length,
      completedProjects: completedClaims,
      pendingProjects: pendingClaims,
      totalAmount: totalAmount
    };
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case '완료': return '#4caf50';
      case '진행중': return '#ff9800';
      case '대기': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case '완료': return <CheckCircleIcon sx={{ color: '#4caf50' }} />;
      case '진행중': return <ScheduleIcon sx={{ color: '#ff9800' }} />;
      case '대기': return <WarningIcon sx={{ color: '#f44336' }} />;
      default: return <ScheduleIcon sx={{ color: '#9e9e9e' }} />;
    }
  };

  const renderHomeTab = () => {
    const stats = calculateStats();
    
    return (
      <Box sx={{ p: 2, pb: 10 }}>
        {/* 헤더 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold' }}>
              천우 건설
            </Typography>
            <Typography variant="body2" sx={{ color: '#bbb' }}>
              현장관리 시스템
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton sx={{ color: '#fff' }}>
              <Badge badgeContent={notifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <IconButton sx={{ color: '#fff' }} onClick={() => setDrawerOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Box>
        </Box>

        {/* 통계 카드 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                  {stats.completedProjects}
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb' }}>
                  완료 청구
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6}>
            <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                  {stats.pendingProjects}
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb' }}>
                  대기 청구
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
              <CardContent sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                  {formatAmount(stats.totalAmount)}
                </Typography>
                <Typography variant="body2" sx={{ color: '#bbb' }}>
                  총 청구금액
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 긴급 항목 - 대기 청구 */}
        <Paper sx={{ backgroundColor: '#2a2a2a', p: 2, mb: 3, border: '1px solid #444' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <WarningIcon sx={{ color: '#f44336' }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
              대기 청구 ({stats.pendingProjects}개)
            </Typography>
          </Box>
          {claims.filter(claim => claim.claimStatus !== 'O' && claim.claimStatus !== '청구완료' && claim.claimStatus !== '이월').slice(0, 3).map((claim) => (
            <Box key={claim.id} sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 1.5,
              mb: 1,
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              borderRadius: 1,
              border: '1px solid rgba(244, 67, 54, 0.3)'
            }}>
              <Box>
                <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                  청구 대기
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff' }}>
                  {claim.siteName}
                </Typography>
              </Box>
              <Chip 
                label={claim.claimStatus} 
                size="small" 
                sx={{ backgroundColor: '#f44336', color: '#fff' }}
              />
            </Box>
          ))}
        </Paper>

        {/* 최근 청구 활동 */}
        <Paper sx={{ backgroundColor: '#2a2a2a', p: 2, border: '1px solid #444' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <TrendingUpIcon sx={{ color: '#4caf50' }} />
            <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
              최근 청구 활동
            </Typography>
          </Box>
          {claims.slice(0, 4).map((claim) => (
            <Box key={claim.id} sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 2,
              p: 1.5,
              mb: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 1
            }}>
              {getStatusIcon(claim.claimStatus === 'O' || claim.claimStatus === '청구완료' ? '완료' : '대기')}
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {claim.siteName}
                </Typography>
                <Typography variant="caption" sx={{ color: '#bbb' }}>
                  {claim.claimMonth}월 • {formatAmount(claim.claimAmount || 0)}
                </Typography>
              </Box>
              <Chip 
                label={claim.claimStatus} 
                size="small" 
                sx={{ 
                  backgroundColor: getStatusColor(claim.claimStatus === 'O' || claim.claimStatus === '청구완료' ? '완료' : '대기'), 
                  color: '#fff',
                  fontSize: '0.7rem'
                }}
              />
            </Box>
          ))}
        </Paper>
      </Box>
    );
  };

  const renderProjectsTab = () => (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', mb: 3 }}>
        청구 현황
      </Typography>
      
      {/* 청구 목록 */}
      {claims.map((claim) => (
        <Card key={claim.id} sx={{ 
          backgroundColor: '#2a2a2a', 
          mb: 2, 
          border: '1px solid #444',
          '&:hover': { backgroundColor: '#333' }
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                {claim.siteName}
              </Typography>
              {getStatusIcon(claim.claimStatus === 'O' || claim.claimStatus === '청구완료' ? '완료' : '대기')}
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mb: 2 }}>
              {claim.claimMonth}월 • {formatAmount(claim.claimAmount || 0)}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={claim.claimStatus === 'O' || claim.claimStatus === '청구완료' ? 100 : 30}
              sx={{ 
                height: 6, 
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getStatusColor(claim.claimStatus === 'O' || claim.claimStatus === '청구완료' ? '완료' : '대기')
                }
              }}
            />
          </CardContent>
        </Card>
      ))}
    </Box>
  );

  const renderReportsTab = () => (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', mb: 3 }}>
        주요 기능
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card 
            sx={{ 
              backgroundColor: '#2a2a2a', 
              border: '1px solid #444', 
              height: 120,
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#333' }
            }}
            onClick={() => navigate('/claims')}
          >
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AssessmentIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                청구 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card 
            sx={{ 
              backgroundColor: '#2a2a2a', 
              border: '1px solid #444', 
              height: 120,
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#333' }
            }}
            onClick={() => navigate('/estimates')}
          >
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <TrendingUpIcon sx={{ color: '#2196f3', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                견적 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card 
            sx={{ 
              backgroundColor: '#2a2a2a', 
              border: '1px solid #444', 
              height: 120,
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#333' }
            }}
            onClick={() => navigate('/sites')}
          >
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AttachMoneyIcon sx={{ color: '#ff9800', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                현장 관리
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card 
            sx={{ 
              backgroundColor: '#2a2a2a', 
              border: '1px solid #444', 
              height: 120,
              cursor: 'pointer',
              '&:hover': { backgroundColor: '#333' }
            }}
            onClick={() => navigate('/whole-list')}
          >
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <BusinessIcon sx={{ color: '#9c27b0', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                전체 현황
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  const renderSettingsTab = () => (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', mb: 3 }}>
        설정
      </Typography>
      
      <List sx={{ backgroundColor: '#2a2a2a', borderRadius: 2, border: '1px solid #444' }}>
        <ListItem sx={{ borderBottom: '1px solid #444' }}>
          <ListItemIcon>
            <PersonIcon sx={{ color: '#fff' }} />
          </ListItemIcon>
          <ListItemText 
            primary="프로필 설정" 
            primaryTypographyProps={{ color: '#fff' }}
          />
        </ListItem>
        <ListItem sx={{ borderBottom: '1px solid #444' }}>
          <ListItemIcon>
            <NotificationsIcon sx={{ color: '#fff' }} />
          </ListItemIcon>
          <ListItemText 
            primary="알림 설정" 
            primaryTypographyProps={{ color: '#fff' }}
          />
        </ListItem>
        <ListItem sx={{ borderBottom: '1px solid #444' }}>
          <ListItemIcon>
            <SettingsIcon sx={{ color: '#fff' }} />
          </ListItemIcon>
          <ListItemText 
            primary="일반 설정" 
            primaryTypographyProps={{ color: '#fff' }}
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <BusinessIcon sx={{ color: '#fff' }} />
          </ListItemIcon>
          <ListItemText 
            primary="회사 정보" 
            primaryTypographyProps={{ color: '#fff' }}
          />
        </ListItem>
      </List>
    </Box>
  );

  const renderContent = () => {
    switch (currentTab) {
      case 0: return renderHomeTab();
      case 1: return renderProjectsTab();
      case 2: return renderReportsTab();
      case 3: return renderSettingsTab();
      default: return renderHomeTab();
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        backgroundColor: '#1a1a1a', 
        minHeight: '100vh',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography variant="h6" sx={{ color: '#fff' }}>
          데이터 로딩 중...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      backgroundColor: '#1a1a1a', 
      minHeight: '100vh',
      color: '#fff',
      position: 'relative'
    }}>
      {/* 메인 컨텐츠 */}
      {renderContent()}

      {/* 플로팅 액션 버튼 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 80,
          right: 16,
          backgroundColor: '#2196f3',
          '&:hover': { backgroundColor: '#1976d2' }
        }}
      >
        <AddIcon />
      </Fab>

      {/* 하단 네비게이션 */}
      <BottomNavigation
        value={currentTab}
        onChange={(event, newValue) => setCurrentTab(newValue)}
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#2a2a2a',
          borderTop: '1px solid #444',
          '& .MuiBottomNavigationAction-root': {
            color: '#bbb',
            '&.Mui-selected': {
              color: '#2196f3'
            }
          }
        }}
      >
        <BottomNavigationAction label="홈" icon={<HomeIcon />} />
        <BottomNavigationAction label="프로젝트" icon={<AssignmentIcon />} />
        <BottomNavigationAction label="보고서" icon={<AssessmentIcon />} />
        <BottomNavigationAction label="설정" icon={<SettingsIcon />} />
      </BottomNavigation>

      {/* 사이드 드로어 */}
      <SwipeableDrawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpen={() => setDrawerOpen(true)}
        sx={{
          '& .MuiDrawer-paper': {
            backgroundColor: '#2a2a2a',
            color: '#fff',
            width: 280
          }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold', mb: 2 }}>
            메뉴
          </Typography>
          <List>
            <ListItem button onClick={() => navigate('/claims')}>
              <ListItemIcon>
                <AssessmentIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="청구 관리" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
            <ListItem button onClick={() => navigate('/estimates')}>
              <ListItemIcon>
                <TrendingUpIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="견적 관리" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
            <ListItem button onClick={() => navigate('/sites')}>
              <ListItemIcon>
                <BusinessIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="현장 관리" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
            <ListItem button onClick={() => navigate('/whole-list')}>
              <ListItemIcon>
                <AssignmentIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="전체 현황" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
            <Divider sx={{ backgroundColor: '#444', my: 1 }} />
            <ListItem button onClick={() => navigate('/profile')}>
              <ListItemIcon>
                <PersonIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="프로필" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
          </List>
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default MobileRender;