import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Typography,
  Divider,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard,
  Construction,
  Map,
  Security,
  AttachMoney,
  Description,
  Forum,
  People,
  MonetizationOn,
  BarChart,
  Star,
  Settings,
  Logout,
  Person
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { isMasterUser, isAdminUser } from '../utils/masterUtils';

const MobileSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentUser, logout } = useAuth();

  const menuItems = [
    { path: '/importantsite', label: '주요현장', icon: <Star /> },
    { path: '/sites', label: '현장관리', icon: <Construction /> },
    { path: '/mapping', label: 'MAP', icon: <Map /> },
    { path: '/safety', label: '안전관리', icon: <Security /> },
    { path: '/claims', label: '청구예정', icon: <AttachMoney /> },
    { path: '/estimate', label: '견적요청', icon: <Description /> },
    { path: '/discussions', label: '토론의견', icon: <Forum /> },
    { path: '/vendors', label: '거래처현황', icon: <People /> },
    { path: '/cost', label: '기성관리', icon: <MonetizationOn /> },
    { path: '/daema-team', label: '시공팀', icon: <BarChart /> }
  ];

  const handleDrawerToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  const getGradeLabel = (user) => {
    if (!user) return { label: '게스트', color: '#666', bgColor: '#f0f0f0' };
    
    const role = user.role || '';
    const teamGrade = user.teamGrade || '';
    
    if (isMasterUser(user)) {
      return { label: 'MASTER', color: '#fff', bgColor: '#ff4444' };
    }
    
    if (isAdminUser(user)) {
      return { label: '관리자', color: '#000', bgColor: '#ffeb3b' };
    }
    
    if (role === 'team') {
      if (teamGrade === 'A') {
        return { label: 'TEAM A', color: '#fff', bgColor: '#4caf50' };
      } else if (teamGrade === 'B') {
        return { label: 'TEAM B', color: '#fff', bgColor: '#4caf50' };
      }
      return { label: 'TEAM', color: '#fff', bgColor: '#4caf50' };
    }
    
    return { label: 'USER', color: '#fff', bgColor: '#2196f3' };
  };

  const userGrade = getGradeLabel(currentUser);

  const drawerContent = (
    <Box sx={{ width: 280, height: '100%', bgcolor: 'background.paper' }}>
      {/* 헤더 */}
      <Box sx={{ 
        p: 2, 
        bgcolor: 'primary.main', 
        color: 'primary.contrastText',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Construction />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            천우건업
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} sx={{ color: 'inherit' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* 사용자 정보 */}
      {currentUser && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {currentUser.displayName?.[0] || currentUser.email?.[0] || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.displayName || '사용자'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.email}
              </Typography>
            </Box>
          </Box>
          <Chip 
            label={userGrade.label} 
            size="small" 
            sx={{ 
              bgcolor: userGrade.bgColor, 
              color: userGrade.color,
              fontWeight: 'bold'
            }} 
          />
        </Box>
      )}

      {/* 메뉴 아이템들 */}
      <List sx={{ flex: 1, overflow: 'auto' }}>
        {menuItems.map((item) => (
          <ListItem key={item.path} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              onClick={handleDrawerToggle}
              selected={location.pathname === item.path}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal'
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* 하단 메뉴 */}
      <List>
        <ListItem disablePadding>
          <ListItemButton>
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Settings />
            </ListItemIcon>
            <ListItemText 
              primary="설정"
              primaryTypographyProps={{ fontSize: '0.95rem' }}
            />
          </ListItemButton>
        </ListItem>
        {currentUser && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText 
                primary="로그아웃"
                primaryTypographyProps={{ fontSize: '0.95rem' }}
              />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Box>
  );

  return (
    <>
      {/* 햄버거 메뉴 버튼 */}
      <IconButton
        onClick={handleDrawerToggle}
        sx={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1300,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': {
            bgcolor: 'primary.dark'
          },
          boxShadow: 2
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* 사이드바 드로어 */}
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // 모바일 성능 향상
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
          },
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default MobileSidebar;
