import React, { useState, useEffect } from 'react';
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
  LinearProgress
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

const MobileRender = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 상태 관리
  const [currentTab, setCurrentTab] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState(3);
  
  // 샘플 데이터
  const sampleData = {
    stats: {
      totalProjects: 24,
      completedProjects: 18,
      pendingProjects: 6,
      totalAmount: 1250000000
    },
    recentActivities: [
      { id: 1, type: '견적', site: '대구 테크노폴리스', status: '완료', time: '2시간 전' },
      { id: 2, type: '기성', site: '부산 LH 7권역', status: '진행중', time: '4시간 전' },
      { id: 3, type: '청구', site: '옥송상록공원', status: '대기', time: '6시간 전' },
      { id: 4, type: '계약', site: '경북대 노후교체', status: '완료', time: '1일 전' }
    ],
    urgentItems: [
      { id: 1, type: '견적 제출', site: '안동 컬쳐팜팩토리', deadline: '오늘' },
      { id: 2, type: '기성 등록', site: '원호 골프클럽', deadline: '내일' },
      { id: 3, type: '청구 처리', site: '멕시카나 지하', deadline: '3일 후' }
    ]
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

  const renderHomeTab = () => (
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
                {sampleData.stats.completedProjects}
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                완료 프로젝트
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 'bold' }}>
                {sampleData.stats.pendingProjects}
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                진행중 프로젝트
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12}>
          <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444' }}>
            <CardContent sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h5" sx={{ color: '#2196f3', fontWeight: 'bold' }}>
                {formatAmount(sampleData.stats.totalAmount)}
              </Typography>
              <Typography variant="body2" sx={{ color: '#bbb' }}>
                총 계약금액
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 긴급 항목 */}
      <Paper sx={{ backgroundColor: '#2a2a2a', p: 2, mb: 3, border: '1px solid #444' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <WarningIcon sx={{ color: '#f44336' }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
            긴급 처리 항목
          </Typography>
        </Box>
        {sampleData.urgentItems.map((item) => (
          <Box key={item.id} sx={{ 
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
                {item.type}
              </Typography>
              <Typography variant="body2" sx={{ color: '#fff' }}>
                {item.site}
              </Typography>
            </Box>
            <Chip 
              label={item.deadline} 
              size="small" 
              sx={{ backgroundColor: '#f44336', color: '#fff' }}
            />
          </Box>
        ))}
      </Paper>

      {/* 최근 활동 */}
      <Paper sx={{ backgroundColor: '#2a2a2a', p: 2, border: '1px solid #444' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TrendingUpIcon sx={{ color: '#4caf50' }} />
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
            최근 활동
          </Typography>
        </Box>
        {sampleData.recentActivities.map((activity) => (
          <Box key={activity.id} sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            p: 1.5,
            mb: 1,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 1
          }}>
            {getStatusIcon(activity.status)}
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                {activity.type} - {activity.site}
              </Typography>
              <Typography variant="caption" sx={{ color: '#bbb' }}>
                {activity.time}
              </Typography>
            </Box>
            <Chip 
              label={activity.status} 
              size="small" 
              sx={{ 
                backgroundColor: getStatusColor(activity.status), 
                color: '#fff',
                fontSize: '0.7rem'
              }}
            />
          </Box>
        ))}
      </Paper>
    </Box>
  );

  const renderProjectsTab = () => (
    <Box sx={{ p: 2, pb: 10 }}>
      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold', mb: 3 }}>
        프로젝트 현황
      </Typography>
      
      {/* 프로젝트 목록 */}
      {sampleData.recentActivities.map((project) => (
        <Card key={project.id} sx={{ 
          backgroundColor: '#2a2a2a', 
          mb: 2, 
          border: '1px solid #444',
          '&:hover': { backgroundColor: '#333' }
        }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 'bold' }}>
                {project.site}
              </Typography>
              {getStatusIcon(project.status)}
            </Box>
            <Typography variant="body2" sx={{ color: '#bbb', mb: 2 }}>
              {project.type} • {project.time}
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={project.status === '완료' ? 100 : project.status === '진행중' ? 65 : 30}
              sx={{ 
                height: 6, 
                borderRadius: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getStatusColor(project.status)
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
        보고서 및 분석
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444', height: 120 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AssessmentIcon sx={{ color: '#4caf50', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                월간 보고서
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444', height: 120 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <TrendingUpIcon sx={{ color: '#2196f3', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                성과 분석
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444', height: 120 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <AttachMoneyIcon sx={{ color: '#ff9800', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                수익 분석
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ backgroundColor: '#2a2a2a', border: '1px solid #444', height: 120 }}>
            <CardContent sx={{ p: 2, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <BusinessIcon sx={{ color: '#9c27b0', fontSize: 40, mb: 1 }} />
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'bold' }}>
                현장 현황
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
            <ListItem>
              <ListItemIcon>
                <SearchIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="검색" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <NotificationsIcon sx={{ color: '#fff' }} />
              </ListItemIcon>
              <ListItemText primary="알림" primaryTypographyProps={{ color: '#fff' }} />
            </ListItem>
            <Divider sx={{ backgroundColor: '#444', my: 1 }} />
            <ListItem>
              <ListItemText primary="로그아웃" primaryTypographyProps={{ color: '#f44336' }} />
            </ListItem>
          </List>
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

export default MobileRender;
