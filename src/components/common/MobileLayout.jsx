import React from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import MobileHeader from './MobileHeader';
import BottomBar from '../dashboard/BottomBar';
import SwipeableContainer from './SwipeableContainer';

export default function MobileLayout({ children }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  
  // 페이지별 패딩 설정
  const isCustomScheduleMobile = location.pathname === '/';
  const isImportantSite = location.pathname === '/importantsite';
  const isSafety = location.pathname === '/safety';
  const shouldUse20pxPadding = isCustomScheduleMobile || isImportantSite;
  const shouldUse20pxPaddingSafety = isSafety;
  
  // 모바일에서 상태바와 헤더 높이를 고려한 올바른 레이아웃
  React.useEffect(() => {
    // 상태바 높이 고려
    const statusBarHeight = 'env(safe-area-inset-top, 0px)';
    document.body.style.paddingTop = statusBarHeight;
    const root = document.getElementById('root');
    if (root) {
      root.style.paddingTop = statusBarHeight;
    }

    // 컴포넌트 언마운트 시 원래대로 복원
    return () => {
      document.body.style.paddingTop = '';
      const root = document.getElementById('root');
      if (root) {
        root.style.paddingTop = '';
      }
    };
  }, []);

  // 패딩 값 결정
  const getPaddingTop = () => {
    if (shouldUse20pxPadding || shouldUse20pxPaddingSafety) return '20px';
    return '32px';
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      width: '100vw', 
      bgcolor: '#181a20', 
      position: 'relative', 
      overflow: 'auto',
      paddingTop: 0
    }}>
      {/* 모바일 헤더 - 항상 표시 */}
      <MobileHeader />
      
      <SwipeableContainer>
        <Box sx={{ 
          minHeight: 'calc(100vh - 64px - 44px)', // 헤더(64px) + 하단바(44px) 제외
          width: '100%',
          paddingTop: 0
        }}>
          {children}
        </Box>
      </SwipeableContainer>
      
      {/* 모바일 하단바 - 항상 표시 */}
      <BottomBar />
    </Box>
  );
} 