import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  IconButton,
  Toolbar,
  Typography,
  useTheme as useMuiTheme,
  useMediaQuery,
  Avatar,
  Menu,
  MenuItem,
  Button,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Modal,
  Chip,
  ListItemText,
  Badge,
  Drawer,
} from '@mui/material';
import SwipeableContainer from './common/SwipeableContainer.jsx';

import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Construction as ConstructionIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  Assessment as AssessmentIcon,
  Cloud as CloudIcon,
  Business as BusinessIcon,
  Event as EventIcon,
  AttachMoney as AttachMoneyIcon,
  Security as SecurityIcon,
  Forum as ForumIcon,

  People as PeopleIcon,
  TrendingUp as ProgressIcon,
  AdminPanelSettings as AdminIcon,
  MonetizationOn as MonetizationOnIcon,
  Assignment as AssignmentIcon,
  Payments as PaymentsIcon,
  Newspaper as NewspaperIcon,
  Timeline as TimelineIcon,
  Star as StarIcon,
  Gavel as GavelIcon,
} from '@mui/icons-material';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import BottomBar from './dashboard/BottomBar';

const menuItems = [
  { text: '건설뉴스', icon: <NewspaperIcon />, path: '/news' },
  { text: '일정관리', icon: <EventIcon />, path: '/schedule' },
  { text: '현장일정', icon: <TimelineIcon />, path: '/gantt' },
  { text: '주요현장', icon: <StarIcon />, path: '/importantSite' },
  { text: '현장관리', icon: <BusinessIcon />, path: '/sites' },
  { text: '안전관리', icon: <SecurityIcon />, path: '/safety' },
  { text: '토론의견', icon: <ForumIcon />, path: '/discussions' },
  { text: '입찰현황', icon: <GavelIcon />, path: '/vendors' },
  { text: '거래처관리', icon: <PeopleIcon />, path: '/vendor-management' },
  { text: '기성관리', icon: <MonetizationOnIcon />, path: '/progress' },
  { text: '시공팀', icon: <AssessmentIcon />, path: '/daema-team' },
  { text: '문서관리', icon: <DescriptionIcon />, path: '/documents' }
];

const adminMenuItems = [
  { text: '멤버 관리', icon: <PeopleIcon />, path: '/members' },
  { text: '권한 관리', icon: <SecurityIcon />, path: '/permissions' },
];

const bottomMenuItems = [
  { text: '대시보드', icon: <DashboardIcon />, path: '/' },
  { text: '관리', icon: <AdminIcon />, path: '/admin' },
];

const Layout = React.memo(({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme: themeMode, toggleTheme } = useThemeContext();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery('(max-width:600px)');
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const [adminMenuAnchorEl, setAdminMenuAnchorEl] = useState(null);
  const { currentUser, logout } = useAuth();
  const isAdmin = currentUser?.grade === '마스터' || currentUser?.grade === '관리자';
  const isMaster = currentUser?.grade === '마스터';
  const [modal, setModal] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getModalStyle = () => {
    if (modal === 'weather') {
      return { position: 'fixed', left: 10, bottom: 74, bgcolor: 'background.paper', boxShadow: 24, borderRadius: 2, p: 0, minWidth: 320, maxWidth: 400, width: '95%', zIndex: 2001 };
    }
    if (modal === 'todo') {
      return { position: 'fixed', right: 10, bottom: 74, bgcolor: 'background.paper', boxShadow: 24, borderRadius: 2, p: 0, minWidth: 320, maxWidth: 400, width: '95%', zIndex: 2001 };
    }
    // 현장/관리 팝업은 중앙
    return { position: 'fixed', left: '50%', bottom: 74, transform: 'translateX(-50%)', bgcolor: 'background.paper', boxShadow: 24, borderRadius: 2, p: 0, minWidth: 320, maxWidth: 800, width: '95%', zIndex: 2001 };
  };

  const getGradeColor = (grade) => {
    switch (grade) {
      case '마스터': return 'error';
      case '관리자': return 'warning';
      case '대마팀': return 'info';
      case '일반회원': return 'default';
      case '진행상황': return 'secondary';
      default: return 'default';
    }
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleAdminMenuOpen = (event) => {
    setAdminMenuAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotificationsAnchorEl(null);
    setAdminMenuAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '90vh', // 100vh에서 90vh로 줄임
      width: '100%',
      margin: 0,
      padding: 0
    }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: '#0f0f0f',
          color: 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
          height: isMobile ? '45px' : '58px',
          borderBottom: '1px solid #333',
          display: isMobile ? 'none' : 'block',
        }}
      >
        <Toolbar sx={{ 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          minHeight: isMobile ? '45px' : '58px',
          height: isMobile ? '45px' : '58px'
        }}>
          {/* 왼쪽: 로고 */}
          <Box sx={{ minWidth: 70, px: 1, display: 'flex', alignItems: 'center' }}>
            <img 
              src="/chunwoo.png" 
              alt="Chunwoo" 
              style={{ height: 40, width: 'auto', cursor: 'pointer' }}
              onClick={() => {
                if (isMobile) {
                  setDrawerOpen(true);
                } else {
                  navigate('/');
                }
              }}
            />
          </Box>

          {/* 중앙: 메뉴 */}
          {!isMobile && (
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 1, md: 1.5 },
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
              }}
            >
              {menuItems.filter(item => item.text !== '건설뉴스').map((item) => (
                <Box
                  key={item.text}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    gap: 0.2,
                    px: 0.5,
                    py: 0.2,
                    borderRadius: 1,
                    minWidth: 48,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      color: muiTheme.palette.primary.main,
                    },
                  }}
                  onClick={() => navigate(item.path)}
                >
                  <Box
                    sx={{
                      color: location.pathname === item.path ? muiTheme.palette.primary.main : 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      mb: 0.2,
                    }}
                  >
                    {item.icon}
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{
                      color: location.pathname === item.path ? muiTheme.palette.primary.main : 'inherit',
                      fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                      fontSize: 12,
                      textAlign: 'center',
                      px: 0.2,
                    }}
                  >
                    {item.text}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* 오른쪽: 회원 정보 + 로그아웃 */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2,
            minWidth: 200,
            justifyContent: 'flex-end'
          }}>
            {/* 회원 등급 표시 */}
            <div 
              style={{ 
                fontWeight: 600, 
                fontSize: 13,
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: currentUser?.role === 'team' ? '#4caf50' : 
                               currentUser?.role === 'admin' ? '#ffeb3b' :
                               currentUser?.role === 'master' ? '#ff4444' : '#2196f3',
                color: currentUser?.role === 'admin' ? '#000' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'fit-content',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {currentUser?.role === 'team' ? 
                (currentUser?.teamGrade === 'B' ? 'TEAM B' : 
                 currentUser?.teamGrade === 'A' ? 'TEAM A' : 'TEAM') :
               currentUser?.role === 'admin' ? 'ADMIN' :
               currentUser?.role === 'master' ? 'MASTER' : 'USER'}
            </div>

            {/* 프로필 메뉴 */}
            <IconButton
              size="large"
              color="inherit"
              onClick={handleProfileMenuOpen}
            >
              <AccountCircleIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* 모바일용 Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        sx={{
          '& .MuiDrawer-paper': {
            width: 200,
            boxSizing: 'border-box',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            메뉴
          </Typography>
        </Box>
        <Box sx={{ p: 1 }}>
          {menuItems.map((item) => (
            <Box
              key={item.text}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
                bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
              }}
              onClick={() => {
                navigate(item.path);
                setDrawerOpen(false);
              }}
            >
              <Box sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </Box>
              <Typography
                sx={{
                  color: location.pathname === item.path ? 'primary.main' : 'inherit',
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                }}
              >
                {item.text}
              </Typography>
            </Box>
          ))}
        </Box>
      </Drawer>
      
      <SwipeableContainer>
        <Box component="main" sx={{ 
          flexGrow: 1, 
          mt: 0, 
          p: 0, 
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          margin: 0, 
          padding: 0, 
          boxSizing: 'border-box', 
          overflowX: 'hidden',
          bgcolor: '#23242a',
          minHeight: '90vh', // 100vh에서 90vh로 줄임
          ...(isMobile && { height: '90vh', maxHeight: '90vh' }), // 100vh에서 90vh로 줄임
          ...(isMobile && { marginTop: '5px' }),
          // 일정관리 페이지일 때만 특별한 스타일 적용
          ...(location.pathname === '/schedule' && !isMobile && {
            marginTop: '60px',
            height: 'calc(90vh - 160px)',
            maxHeight: 'calc(90vh - 160px)'
          })
        }}>
          {children}
        </Box>
      </SwipeableContainer>



      {/* 대시보드 하단 바 - 항상 고정 */}
      <BottomBar
        onWeather={() => setModal('weather')}
        onSites={() => setModal('sites')}
        onTodo={() => setModal('todo')}
        onManage={() => setModal('manage')}
        stats={{ activeProjects: 0, completedTasks: 0, pendingIssues: 0, totalUsers: 0 }}
        todos={[
          { id: 1, text: '안전점검 실시', completed: false },
          { id: 2, text: '기성청구서 작성', completed: false },
          { id: 3, text: '협력업체 미팅', completed: true },
        ]}
      />

      {/* 대시보드에서만 팝업(Modal) 렌더링 */}
      {children && children.type && children.type.name === 'Dashboard' && (
        <Modal
          open={!!modal}
          onClose={() => setModal(null)}
          aria-labelledby="dashboard-modal"
          aria-describedby="dashboard-modal-desc"
          closeAfterTransition
          keepMounted
          disableRestoreFocus={false}
          disableEnforceFocus={false}
          hideBackdrop={false}
        >
          <Box
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Escape') setModal(null); }}
            sx={getModalStyle()}
          >
            {modal === 'weather' && <children.type.WeatherDetail onClose={() => setModal(null)} />}
            {modal === 'sites' && <children.type.SitesDetail />}
            {modal === 'todo' && <children.type.TodoDetail />}
            {modal === 'manage' && <children.type.ManageDetail onGoMembers={() => { setModal(null); navigate('/members'); }} onGoPermissions={() => { setModal(null); navigate('/permissions'); }} />}
          </Box>
        </Modal>
      )}

      {/* 프로필 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
          },
        }}
      >
        <MenuItem onClick={() => {
          navigate('/profile');
          handleMenuClose();
        }}>
          프로필
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          로그아웃
        </MenuItem>
      </Menu>

      {/* 알림 메뉴 */}
      <Menu
        anchorEl={notificationsAnchorEl}
        open={Boolean(notificationsAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 300,
          },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemText 
            primary="새로운 현장 등록" 
            secondary="10분 전"
          />
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemText 
            primary="안전 점검 알림" 
            secondary="30분 전"
          />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          모든 알림 보기
        </MenuItem>
      </Menu>

      {/* 관리자 메뉴 */}
      <Menu
        anchorEl={adminMenuAnchorEl}
        open={Boolean(adminMenuAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            mt: 1.5,
            minWidth: 180,
          },
        }}
      >
        {adminMenuItems.map((item) => (
          <MenuItem
            key={item.text}
            onClick={() => {
              navigate(item.path);
              handleMenuClose();
            }}
          >
            {item.text}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
});

export default Layout; 