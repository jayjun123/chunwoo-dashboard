import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import BottomBar from '../dashboard/BottomBar';

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // 현재 경로가 메인 페이지인지 확인
  const isMainPage = location.pathname === '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 상단 앱바 */}
      <AppBar 
        position="fixed" 
        sx={{ 
          bgcolor: theme.palette.background.paper,
          boxShadow: 1,
          zIndex: theme.zIndex.drawer + 1
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          {/* 로고 영역 */}
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              cursor: 'pointer',
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              '&:hover': {
                color: theme.palette.primary.light
              }
            }}
            onClick={() => navigate('/')}
          >
            chunwoo
          </Typography>
        </Toolbar>
      </AppBar>

      {/* 메인 컨텐츠 영역 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: { xs: 8, sm: 9 }, // 상단 앱바 높이만큼 패딩
          pb: { xs: 8, sm: 9 }, // 하단바 높이만큼 패딩
          bgcolor: theme.palette.background.default,
          minHeight: '100vh'
        }}
      >
        {children}
      </Box>

      {/* 하단바 */}
      <BottomBar />
    </Box>
  );
};

export default Layout; 