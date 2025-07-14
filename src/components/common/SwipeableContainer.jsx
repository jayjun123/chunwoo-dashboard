import React, { useState, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box } from '@mui/material';

const SwipeableContainer = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef(null);

  // 페이지 네비게이션 순서 정의 (모바일 네비게이션과 일치)
  const pageOrder = [
    '/',                    // 홈 (일정관리)
    '/importantsite',       // 주요현장
    '/sites',              // 현장
    '/schedule',           // 일정
    '/gantt',              // 현장일정
    '/safety',             // 안전
    '/discussions',        // 토론
    '/progress',           // 기성
    '/vendors',            // 거래처
    '/documents',          // 문서
    '/reports'             // 보고서
  ];

  // 현재 페이지 인덱스 찾기
  const getCurrentPageIndex = () => {
    return pageOrder.findIndex(path => location.pathname === path);
  };

  // 이전 페이지로 이동
  const goToPreviousPage = () => {
    const currentIndex = getCurrentPageIndex();
    if (currentIndex > 0) {
      navigate(pageOrder[currentIndex - 1]);
    }
  };

  // 다음 페이지로 이동
  const goToNextPage = () => {
    const currentIndex = getCurrentPageIndex();
    if (currentIndex < pageOrder.length - 1) {
      navigate(pageOrder[currentIndex + 1]);
    }
  };

  // 스와이프 핸들러 설정
  const handlers = useSwipeable({
    onSwipedLeft: (eventData) => {
      // 오른쪽에서 왼쪽으로 스와이프 (다음 페이지)
      if (eventData.deltaX < -50) {
        goToNextPage();
      }
    },
    onSwipedRight: (eventData) => {
      // 왼쪽에서 오른쪽으로 스와이프 (이전 페이지)
      if (eventData.deltaX > 50) {
        goToPreviousPage();
      }
    },
    preventDefaultTouchmoveEvent: false,
    trackMouse: false,
    delta: 10,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
  });

  return (
    <Box
      ref={containerRef}
      {...handlers}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y'
      }}
    >
      {children}
      
      {/* 스와이프 힌트 (첫 방문 시) */}
      <SwipeHint />
    </Box>
  );
};

// 스와이프 힌트 컴포넌트
const SwipeHint = () => {
  const [showHint, setShowHint] = useState(() => {
    return !localStorage.getItem('swipeHintShown');
  });

  const handleHintClose = () => {
    setShowHint(false);
    localStorage.setItem('swipeHintShown', 'true');
  };

  if (!showHint) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        bgcolor: 'rgba(0,0,0,0.8)',
        color: 'white',
        px: 2,
        py: 1,
        borderRadius: 1,
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        animation: 'fadeInOut 3s ease-in-out',
        '@keyframes fadeInOut': {
          '0%': { opacity: 0, transform: 'translateX(-50%) translateY(20px)' },
          '20%': { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
          '80%': { opacity: 1, transform: 'translateX(-50%) translateY(0)' },
          '100%': { opacity: 0, transform: 'translateX(-50%) translateY(-20px)' }
        }
      }}
      onClick={handleHintClose}
    >
      <span>👆 좌우 스와이프로 페이지 전환</span>
    </Box>
  );
};

export default SwipeableContainer; 