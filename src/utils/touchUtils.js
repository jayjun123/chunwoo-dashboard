// 터치 이벤트 유틸리티 함수들

// 터치 이벤트 핸들러 생성
export const createTouchHandlers = (onClick) => {
  let touchStartTime = 0;
  let touchMoved = false;

  return {
    onTouchStart: (e) => {
      touchStartTime = Date.now();
      touchMoved = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onTouchMove: (e) => {
      touchMoved = true;
    },
    onTouchEnd: (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const touchDuration = Date.now() - touchStartTime;
      
      // 터치가 너무 길거나 움직였으면 클릭으로 처리하지 않음
      if (touchDuration > 500 || touchMoved) {
        return;
      }
      
      // 클릭 이벤트 실행
      if (onClick) {
        onClick(e);
      }
    }
  };
};

// 간단한 터치 클릭 핸들러
export const handleTouchClick = (callback) => {
  return {
    onTouchStart: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    onTouchEnd: (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (callback) {
        callback(e);
      }
    }
  };
};

// 터치 액션 최적화
export const optimizeTouchAction = () => {
  // CSS 터치 액션 최적화
  const style = document.createElement('style');
  style.textContent = `
    * {
      touch-action: manipulation;
    }
    
    button, [role="button"], .clickable {
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    
    input, textarea, select {
      touch-action: manipulation;
    }
  `;
  document.head.appendChild(style);
};

// 더블 탭 줌 방지
export const preventDoubleTapZoom = () => {
  let lastTouchEnd = 0;
  
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    
    // 300ms 내의 연속 터치를 더블 탭으로 간주
    if (now - lastTouchEnd <= 300) {
      // 버튼이나 인터랙티브 요소가 아닌 경우에만 줌 방지
      if (!event.target.closest('button') && 
          !event.target.closest('[role="button"]') &&
          !event.target.closest('a') &&
          !event.target.closest('input') &&
          !event.target.closest('textarea')) {
        event.preventDefault();
      }
    }
    
    lastTouchEnd = now;
  }, { passive: false });
};

// 터치 이벤트 초기화
export const initTouchOptimization = () => {
  optimizeTouchAction();
  preventDoubleTapZoom();
  
  // 터치 이벤트 리스너 추가 (passive: true로 성능 최적화)
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('touchmove', () => {}, { passive: true });
  document.addEventListener('touchend', () => {}, { passive: true });
};
