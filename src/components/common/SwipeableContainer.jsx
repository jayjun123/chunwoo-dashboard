import React, { useRef, useEffect, useState } from 'react';
import { Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const SwipeableContainer = ({ children, enableSwipeBack = true }) => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  
  // 터치 시작 위치와 시간
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const touchEnd = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    if (!enableSwipeBack) return;

    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      touchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      setIsSwiping(false);
      setSwipeProgress(0);
    };

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      touchEnd.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
      
      // 스와이프 진행률 계산 (오른쪽에서 왼쪽으로)
      const deltaX = touch.clientX - touchStart.current.x;
      if (deltaX < 0 && touchStart.current.x > window.innerWidth * 0.5) {
        setIsSwiping(true);
        const progress = Math.min(Math.abs(deltaX) / 80, 1); // 80px을 100%로
        setSwipeProgress(progress);
      }
    };

    const handleTouchEnd = (e) => {
      const deltaX = touchEnd.current.x - touchStart.current.x;
      const deltaY = touchEnd.current.y - touchStart.current.y;
      const deltaTime = touchEnd.current.time - touchStart.current.time;

      // 스와이프 조건 확인
      const minSwipeDistance = 80; // 최소 스와이프 거리 (더 관대하게)
      const maxSwipeTime = 800; // 최대 스와이프 시간 (ms) (더 관대하게)
      const maxVerticalDistance = 80; // 최대 수직 이동 거리 (더 관대하게)

      // 오른쪽에서 왼쪽으로 스와이프 (뒤로가기)
      if (
        deltaX < -minSwipeDistance && // 왼쪽으로 충분히 스와이프
        Math.abs(deltaY) < maxVerticalDistance && // 수직 이동이 적음
        deltaTime < maxSwipeTime && // 빠른 스와이프
        touchStart.current.x > window.innerWidth * 0.5 // 화면 오른쪽 50% 영역에서 시작 (더 관대하게)
      ) {
        e.preventDefault();
        e.stopPropagation();
        
        // 뒤로가기 실행
        navigate(-1);
      }
      
      // 스와이프 상태 초기화
      setIsSwiping(false);
      setSwipeProgress(0);
    };

    // 이벤트 리스너 추가
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });

    // 클린업
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [navigate, enableSwipeBack]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        touchAction: 'pan-y',
        // 스와이프 제스처를 위한 추가 스타일
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}
    >
      {children}
      
      {/* 스와이프 뒤로가기 인디케이터 */}
      {isSwiping && (
        <Box
          sx={{
            position: 'fixed',
            top: '50%',
            right: 20,
            zIndex: 9999,
            width: 40,
            height: 40,
            borderRadius: '50%',
            backgroundColor: `rgba(0, 0, 0, ${0.3 + swipeProgress * 0.4})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '20px',
            transition: 'all 0.1s ease',
            opacity: swipeProgress,
            transform: `translateY(-50%) scale(${0.8 + swipeProgress * 0.2})`
          }}
        >
          ←
        </Box>
      )}
    </Box>
  );
};

export default SwipeableContainer; 