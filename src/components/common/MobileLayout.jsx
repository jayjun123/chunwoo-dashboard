import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import BottomBar from '../dashboard/BottomBar';
import SwipeableContainer from './SwipeableContainer';

export default function MobileLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const location = useLocation();
  
  // 페이지별 패딩 설정
  const isCustomScheduleMobile = location.pathname === '/';
  const isImportantSite = location.pathname === '/importantsite';
  const isSafety = location.pathname === '/safety';
  const shouldUse20pxPadding = isCustomScheduleMobile || isImportantSite;
  const shouldUse20pxPaddingSafety = isSafety;
  
  // 모바일에서 전체 화면을 64px 위로 올리도록 CSS 스타일 추가
  React.useEffect(() => {
    if (isMobile) {
      // body와 root에 상단 여백을 -64px로 설정하여 위로 올림
      document.body.style.paddingTop = '-64px';
      document.body.style.marginTop = '-64px';
      const root = document.getElementById('root');
      if (root) {
        root.style.paddingTop = '-64px';
        root.style.marginTop = '-64px';
      }
    } else {
      // PC에서는 원래대로 복원
      document.body.style.paddingTop = '';
      document.body.style.marginTop = '';
      const root = document.getElementById('root');
      if (root) {
        root.style.paddingTop = '';
        root.style.marginTop = '';
      }
    }

    // 컴포넌트 언마운트 시 원래대로 복원
    return () => {
      document.body.style.paddingTop = '';
      document.body.style.marginTop = '';
      const root = document.getElementById('root');
      if (root) {
        root.style.paddingTop = '';
        root.style.marginTop = '';
      }
    };
  }, [isMobile]);

  // 패딩 값 결정
  const getPaddingTop = () => {
    if (!isMobile) return 0;
    if (shouldUse20pxPadding || shouldUse20pxPaddingSafety) return '20px';
    return '32px';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100vw', 
      bgcolor: '#181a20', 
      paddingTop: isMobile ? '-64px' : 0,
      marginTop: isMobile ? '-64px' : 0,
      position: 'relative', 
      overflow: 'auto' 
    }}>
      {isMobile && <MobileHeader />}
      <SwipeableContainer>
        <Box sx={{ 
          pt: isMobile ? '-64px' : 0,
          mt: isMobile ? '-64px' : 0,
          minHeight: '100vh',
          width: '100%'
        }}>
          {children}
        </Box>
      </SwipeableContainer>
      {isMobile && <BottomBar />}
    </Box>
  );
} 