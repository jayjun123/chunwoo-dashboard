// 터치 이벤트 유틸리티 함수들

// 터치 이벤트 핸들러 생성 - IPA 빌드 호환
export const createTouchHandlers = (onClick) => {
  let touchStartTime = 0;
  let touchMoved = false;

  return {
    onTouchStart: (e) => {
      touchStartTime = Date.now();
      touchMoved = false;
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
      // e.preventDefault();
      // e.stopPropagation();
    },
    onTouchMove: (e) => {
      touchMoved = true;
    },
    onTouchEnd: (e) => {
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
      // e.preventDefault();
      // e.stopPropagation();
      
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

// 간단한 터치 클릭 핸들러 - IPA 빌드 호환
export const handleTouchClick = (callback) => {
  return {
    onTouchStart: (e) => {
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
      // e.preventDefault();
      // e.stopPropagation();
    },
    onTouchEnd: (e) => {
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
      // e.preventDefault();
      // e.stopPropagation();
      if (callback) {
        callback(e);
      }
    }
  };
};

// 터치 액션 최적화 - IPA 빌드 호환
export const optimizeTouchAction = () => {
  // CSS 터치 액션 최적화 - IPA 빌드에서는 touch-action: auto로 설정
  const style = document.createElement('style');
  style.textContent = `
    * {
      touch-action: auto !important;
      pointer-events: auto !important;
    }
    
    button, [role="button"], .clickable {
      touch-action: manipulation !important;
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
      pointer-events: auto !important;
    }
    
    input, textarea, select {
      touch-action: manipulation !important;
      pointer-events: auto !important;
    }
    
    /* 스크롤 영역 */
    .main-content, [class*="scroll"], [class*="overflow"] {
      touch-action: pan-y pan-x !important;
      pointer-events: auto !important;
    }
  `;
  document.head.appendChild(style);
};

// 더블 탭 줌 방지 - IPA 빌드 호환
export const preventDoubleTapZoom = () => {
  // IPA 빌드에서는 더블탭 줌 방지를 CSS로 처리하므로 이 함수는 비활성화
  // CSS의 touch-action: manipulation이 더블탭 줌을 방지합니다
  return;
  
  // 아래 코드는 일반 웹 브라우저용 (현재 비활성화)
  /*
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
        // IPA 빌드에서는 preventDefault 제거하여 터치 허용
        // event.preventDefault();
      }
    }
    
    lastTouchEnd = now;
  }, { passive: true });
  */
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
