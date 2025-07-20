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
  const isWholeList = location.pathname === '/whole-list';
  
  // 토론의견 페이지에서 하단바 숨김 여부 확인
  const shouldHideBottomBar = location.pathname === '/discussions';
  
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

  // 패딩 값 결정 - 모바일 최적화
  const getPaddingTop = () => {
    // 모든 페이지에 헤더 아래 20px 패딩 적용 (기존 15px + 추가 5px)
    return '20px';
  };

  return (
    <Box sx={{ 
      minHeight: { xs: '100vh', sm: '100dvh' }, // 모바일에서는 안전한 100vh 사용
      width: '100vw', 
      bgcolor: '#181a20', 
      position: 'relative', 
      overflow: 'auto', // 스크롤 허용
      // paddingTop은 iOS에서만 적용, Android는 무시
      paddingTop: { xs: 0, sm: 'env(safe-area-inset-top, 0px)' },
    }}>
      {/* 모바일 헤더 - 항상 표시 */}
      <MobileHeader />
      
      <SwipeableContainer>
        <Box sx={{ 
          minHeight: shouldHideBottomBar 
            ? { xs: 'calc(100vh - 53px)', sm: 'calc(100dvh - 53px)' } // 하단바 숨김 시
            : { xs: 'calc(100vh - 53px - 70px)', sm: 'calc(100dvh - 53px - 70px)' }, // 기존
          width: '100%',
          paddingTop: { xs: '33px', sm: getPaddingTop() }, // 모바일에서 33px로 변경 (28px + 5px)
          paddingBottom: '0px', // 패딩 완전 제거
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'auto', // 더 유연한 터치 액션
          overscrollBehavior: 'contain'
        }}>
          {children}
        </Box>
      </SwipeableContainer>
      
      {/* 모바일 하단바 - 토론의견 페이지에서는 숨김 */}
      {!shouldHideBottomBar && <BottomBar />}
    </Box>
  );
} 