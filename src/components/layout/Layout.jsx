import React, { useState, useEffect } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, useTheme, useMediaQuery } from '@mui/material';
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const isMobile = useMediaQuery('(max-width:600px)');

  // 현재 경로가 메인 페이지인지 확인
  const isMainPage = location.pathname === '/';

  // 키보드 감지 (모바일에서만)
  useEffect(() => {
    if (!isMobile) return;

    let initialViewportHeight = window.innerHeight;
    let currentViewportHeight = window.innerHeight;

    const handleResize = () => {
      currentViewportHeight = window.innerHeight;
      const heightDifference = initialViewportHeight - currentViewportHeight;
      
      // 키보드가 올라왔는지 판단 (높이 차이가 150px 이상일 때)
      if (heightDifference > 150) {
        setKeyboardVisible(true);
      } else {
        setKeyboardVisible(false);
      }
    };

    const handleFocus = () => {
      // 입력 요소에 포커스될 때 키보드가 올라올 것으로 예상
      setTimeout(() => {
        handleResize();
      }, 300);
    };

    const handleBlur = () => {
      // 입력 요소에서 포커스가 벗어날 때 키보드가 내려갈 것으로 예상
      setTimeout(() => {
        handleResize();
      }, 300);
    };

    // 입력 요소들에 이벤트 리스너 추가
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
    });

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      inputs.forEach(input => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      });
    };
  }, [isMobile]);

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
          height: { 
            xs: keyboardVisible ? 'calc(100vh - 64px)' : 'calc(100vh - 64px - 44px)', 
            sm: 'calc(100vh - 64px - 180px)' 
          },
          overflow: 'auto',
          boxSizing: 'border-box',
          transition: 'height 0.3s ease'
        }}
      >
        {children}
      </Box>
      <BottomBar keyboardVisible={keyboardVisible} />
    </Box>
  );
};

export default Layout; 