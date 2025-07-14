import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Avatar,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Construction as ConstructionIcon,
  CalendarMonth as CalendarIcon,
  SafetyCheck as SafetyIcon,
  Description as DocumentIcon,
  People as PeopleIcon,
  Forum as ForumIcon,
  Assessment as ProgressIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  MonetizationOn as MonetizationOnIcon,
  Star as StarIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';

const menuItems = [
  { text: '일정관리', icon: <CalendarIcon />, path: '/schedule' },
  { text: '현장일정', icon: <TimelineIcon />, path: '/gantt' },
  { text: '주요현장', icon: <StarIcon />, path: '/overview' },
  { text: '현장관리', icon: <ConstructionIcon />, path: '/sites' },
  { text: '안전관리', icon: <SafetyIcon />, path: '/safety' },
  { text: '토론의견', icon: <ForumIcon />, path: '/discussions' },
  { text: '기성관리', icon: <MonetizationOnIcon />, path: '/progress' },
  { text: '거래처현황', icon: <PeopleIcon />, path: '/vendors' },
  { text: '문서관리', icon: <DocumentIcon />, path: '/documents' },
  { text: '보고서', icon: <ProgressIcon />, path: '/reports' },
];

const Header = ({ onMenuClick }) => {
  const [user] = useAuthState(auth);
  const { currentUser, refreshUserInfo } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const getGradeLabel = (user) => {
    if (!user) return { label: '게스트', color: '#666', bgColor: '#f0f0f0' };
    
    const email = user.email?.toLowerCase() || '';
    const displayName = user.displayName || '';
    const role = user.role || '';
    const grade = user.grade || '';
    const teamGrade = user.teamGrade || '';
    
    console.log('Layout Header - 현재 사용자 정보:', { 
      email, 
      displayName, 
      role, 
      grade, 
      teamGrade,
      전체사용자정보: user 
    });
    
    // 마스터 권한 확인
    if (role === 'master' || grade === '마스터' || email.includes('master') || displayName.includes('마스터')) {
      return { label: 'MASTER', color: '#fff', bgColor: '#ff4444' };
    }
    
    // 관리자 권한 확인
    if (role === 'admin' || grade === '관리자' || email.includes('admin') || displayName.includes('관리자')) {
      return { label: '관리자', color: '#000', bgColor: '#ffeb3b' };
    }
    
    // 팀 권한 확인 (role이 team인 경우)
    if (role === 'team') {
      if (teamGrade === 'A') {
        return { label: 'TEAM A', color: '#fff', bgColor: '#4caf50' };
      } else if (teamGrade === 'B') {
        return { label: 'TEAM B', color: '#fff', bgColor: '#4caf50' };
      }
      return { label: 'TEAM', color: '#fff', bgColor: '#4caf50' };
    }
    
    // 일반회원
    return { label: 'USER', color: '#fff', bgColor: '#2196f3' };
  };

  const userGrade = getGradeLabel(currentUser);

  const drawer = (
    <Box sx={{ width: 250 }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Avatar src={user?.photoURL} alt={user?.displayName} />
        <Typography variant="subtitle1">{user?.displayName}</Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            component={Link}
            to={item.path}
            onClick={handleDrawerToggle}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="로그아웃" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="static" sx={{ 
        backgroundColor: '#f5f6fa !important', 
        color: '#222 !important', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        height: isMobile ? '45px' : 'auto'
      }}>
        <Toolbar sx={{ 
          minHeight: isMobile ? '45px' : '64px',
          height: isMobile ? '45px' : 'auto'
        }}>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <img 
              src="/chunwoo.png" 
              alt="Chunwoo" 
              style={{ 
                height: '40px', 
                width: 'auto',
                cursor: 'pointer'
              }}
              onClick={isMobile ? handleDrawerToggle : () => navigate('/')}
            />
          </Box>

          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {menuItems.map((item) => (
                <Button
                  key={item.text}
                  color="inherit"
                  component={Link}
                  to={item.path}
                  startIcon={item.icon}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}

          <Box sx={{ ml: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* 사용자 역할 표시 */}
            <Box
              sx={{
                fontWeight: 600,
                fontSize: 13,
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: userGrade.bgColor,
                color: userGrade.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 'fit-content',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                border: '2px solid red' // 테스트용 테두리
              }}
              onClick={async () => {
                console.log('사용자 정보 강제 새로고침 시작');
                await refreshUserInfo();
                console.log('사용자 정보 새로고침 완료');
              }}
            >
              {userGrade.label} - TEST
            </Box>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar src={user?.photoURL} alt={user?.displayName} />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={handleLogout}>로그아웃</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        anchor="left"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>
    </>
  );
};

export default Header; 