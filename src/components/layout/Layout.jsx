import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import BottomBar from '../dashboard/BottomBar';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // 현재 경로가 메인 페이지인지 확인
  const isMainPage = location.pathname === '/';

  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default' }}>
      <Header onMenuClick={() => setSidebarOpen(!isSidebarOpen)} />
      <Sidebar open={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { sm: `calc(100% - ${240}px)` },
          mt: '64px',
          height: 'calc(100vh - 64px)',
          overflow: 'auto'
        }}
      >
        {children}
      </Box>
      <BottomBar />
    </Box>
  );
};

export default Layout; 