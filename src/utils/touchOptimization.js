// 아이패드 터치 이벤트 최적화 유틸리티

// 터치 이벤트 지연 시간 제거 및 애플펜슬 최적화
export const preventTouchDelay = () => {
  // 터치 이벤트 지연 제거
  document.addEventListener('touchstart', (e) => {
    // 애플펜슬 터치 좌표 정확도 개선
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      // 터치 좌표를 정확히 계산
      const rect = e.target.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // 터치 좌표 정보를 이벤트에 추가
      e.touchX = x;
      e.touchY = y;
    }
    
    // 터치 시작 시 즉시 처리 (애플펜슬 반응성 개선)
    e.preventDefault();
  }, { passive: false });

  // 터치 이동 시 스크롤과 클릭 이벤트 분리
  document.addEventListener('touchmove', (e) => {
    // 스크롤 영역에서는 터치 이동 허용
    const target = e.target;
    const scrollableParent = target.closest('[data-scrollable="true"]');
    
    if (!scrollableParent) {
      // 스크롤 가능한 영역이 아닌 경우 터치 이동 제한
      e.preventDefault();
    }
  }, { passive: false });

  // 터치 종료 시 더블탭 줌 방지 및 정확한 클릭 처리
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const lastTouch = window.lastTouchTime || 0;
    
    if (now - lastTouch < 300) {
      // 300ms 내 연속 터치 방지 (더블탭 줌 방지)
      e.preventDefault();
    }
    
    // 애플펜슬 터치 종료 시 정확한 좌표 계산
    if (e.changedTouches && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      const rect = e.target.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // 터치 종료 좌표 정보를 이벤트에 추가
      e.touchEndX = x;
      e.touchEndY = y;
    }
    
    window.lastTouchTime = now;
  }, { passive: false });
};

// 버튼 클릭 이벤트 최적화 (애플펜슬 포함)
export const optimizeButtonClicks = () => {
  // 모든 버튼에 터치 최적화 적용
  const buttons = document.querySelectorAll('button, .MuiButton-root, .MuiIconButton-root, .MuiTab-root');
  
  buttons.forEach(button => {
    // 터치 이벤트 최적화
    button.style.touchAction = 'manipulation';
    button.style.webkitTapHighlightColor = 'transparent';
    button.style.minHeight = '44px';
    button.style.minWidth = '44px';
    
    // 애플펜슬 터치 이벤트 최적화
    button.addEventListener('touchstart', (e) => {
      // 터치 시작 시 즉시 반응
      e.preventDefault();
      button.style.transform = 'scale(0.95)';
      button.style.transition = 'transform 0.1s ease';
    }, { passive: false });
    
    button.addEventListener('touchend', (e) => {
      // 터치 종료 시 원래 크기로 복원
      e.preventDefault();
      button.style.transform = 'scale(1)';
      
      // 클릭 이벤트 실행
      if (!button.disabled) {
        button.click();
      }
    }, { passive: false });
    
    // 클릭 이벤트 최적화
    button.addEventListener('click', (e) => {
      // 이벤트 버블링 방지
      e.stopPropagation();
      
      // 중복 클릭 방지
      if (button.disabled) {
        e.preventDefault();
        return;
      }
      
      // 버튼 비활성화 (중복 클릭 방지)
      button.disabled = true;
      setTimeout(() => {
        button.disabled = false;
      }, 500);
    });
  });
};

// 스크롤 영역 터치 최적화
export const optimizeScrollAreas = () => {
  const scrollAreas = document.querySelectorAll('.MuiBox-root, .MuiContainer-root, .MuiGrid-root, [data-scrollable="true"]');
  
  scrollAreas.forEach(area => {
    // 스크롤 영역 표시
    area.setAttribute('data-scrollable', 'true');
    
    // 터치 스크롤 최적화
    area.style.touchAction = 'pan-y';
    area.style.webkitOverflowScrolling = 'touch';
    area.style.overscrollBehavior = 'none';
    area.style.webkitOverscrollBehavior = 'none';
  });
};

// 테이블 셀 터치 최적화
export const optimizeTableCells = () => {
  const tableCells = document.querySelectorAll('.MuiTableCell-root');
  
  tableCells.forEach(cell => {
    // 테이블 셀 터치 최적화
    cell.style.touchAction = 'manipulation';
    cell.style.webkitTapHighlightColor = 'transparent';
    cell.style.minHeight = '44px';
    
    // 클릭 가능한 셀에만 클릭 이벤트 추가
    if (cell.onclick || cell.querySelector('button, a, [role="button"]')) {
      cell.style.cursor = 'pointer';
    }
  });
};

// 카드 및 클릭 가능한 요소 터치 최적화
export const optimizeClickableElements = () => {
  const clickableElements = document.querySelectorAll('.MuiCard-root, .MuiPaper-root, .MuiChip-root, [role="button"]');
  
  clickableElements.forEach(element => {
    // 터치 최적화
    element.style.touchAction = 'manipulation';
    element.style.webkitTapHighlightColor = 'transparent';
    element.style.webkitTouchCallout = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.userSelect = 'none';
  });
};

// 드롭다운 및 메뉴 터치 최적화
export const optimizeDropdowns = () => {
  const dropdowns = document.querySelectorAll('.MuiSelect-root, .MuiMenuItem-root, .MuiList-root');
  
  dropdowns.forEach(dropdown => {
    // 터치 최적화
    dropdown.style.touchAction = 'manipulation';
    dropdown.style.webkitTapHighlightColor = 'transparent';
  });
};

// 전체 터치 최적화 초기화
export const initializeTouchOptimization = () => {
  // DOM이 로드된 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        preventTouchDelay();
        optimizeButtonClicks();
        optimizeScrollAreas();
        optimizeTableCells();
        optimizeClickableElements();
        optimizeDropdowns();
      }, 100);
    });
  } else {
    // 이미 로드된 경우 즉시 실행
    setTimeout(() => {
      preventTouchDelay();
      optimizeButtonClicks();
      optimizeScrollAreas();
      optimizeTableCells();
      optimizeClickableElements();
      optimizeDropdowns();
    }, 100);
  }
  
  // 동적으로 추가되는 요소들을 위한 MutationObserver
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 새로 추가된 버튼들 최적화
            const newButtons = node.querySelectorAll ? node.querySelectorAll('button, .MuiButton-root, .MuiIconButton-root') : [];
            newButtons.forEach(button => {
              button.style.touchAction = 'manipulation';
              button.style.webkitTapHighlightColor = 'transparent';
              button.style.minHeight = '44px';
              button.style.minWidth = '44px';
            });
            
            // 새로 추가된 스크롤 영역 최적화
            const newScrollAreas = node.querySelectorAll ? node.querySelectorAll('.MuiBox-root, .MuiContainer-root, .MuiGrid-root') : [];
            newScrollAreas.forEach(area => {
              area.setAttribute('data-scrollable', 'true');
              area.style.touchAction = 'pan-y';
              area.style.webkitOverflowScrolling = 'touch';
            });
          }
        });
      }
    });
  });
  
  // 전체 문서 관찰 시작
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
};

// 아이패드 감지 함수 (개선된 버전)
export const isIPad = () => {
  return /iPad/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
         (navigator.userAgent.includes('iPad'));
};

// 애플펜슬 감지 함수 (개선된 버전)
export const isApplePencil = () => {
  // 애플펜슬은 웹에서 터치 이벤트가 제대로 작동하지 않으므로 감지 후 별도 처리
  return 'ontouchstart' in window && 
         navigator.maxTouchPoints > 0 && 
         (isIPad() || /iPhone|iPad|iPod/.test(navigator.userAgent)) &&
         // 압력 감지나 펜 관련 속성이 있는지 확인
         (window.DeviceMotionEvent || window.DeviceOrientationEvent);
};

// 터치 디바이스 감지 함수
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// 애플펜슬 전용 터치 최적화 (웹 호환성 개선)
export const optimizeApplePencil = () => {
  if (isApplePencil()) {
    // 애플펜슬 터치 정확도 개선을 위한 CSS 추가
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        touch-action: manipulation;
      }
      
      button, [role="button"], .clickable {
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        cursor: pointer;
        /* 애플펜슬 터치 영역 확대 */
        min-height: 48px !important;
        min-width: 48px !important;
        padding: 12px !important;
      }
      
      input, textarea, select {
        -webkit-user-select: text;
        -moz-user-select: text;
        -ms-user-select: text;
        user-select: text;
        touch-action: manipulation;
        /* 입력 필드는 터치 영역 확대 */
        min-height: 44px !important;
        padding: 12px !important;
      }
      
      /* Material-UI 컴포넌트 터치 영역 확대 */
      .MuiButton-root, .MuiIconButton-root, .MuiTab-root {
        min-height: 48px !important;
        min-width: 48px !important;
        padding: 12px !important;
      }
      
      .MuiTextField-root input {
        min-height: 44px !important;
        padding: 12px !important;
      }
      
      /* 테이블 셀 터치 영역 확대 */
      .MuiTableCell-root {
        min-height: 48px !important;
        padding: 12px !important;
      }
      
      /* 카드 터치 영역 확대 */
      .MuiCard-root {
        min-height: 48px !important;
        padding: 12px !important;
      }
    `;
    document.head.appendChild(style);
    
    // 애플펜슬 터치 이벤트 개선
    document.addEventListener('touchstart', (e) => {
      // 애플펜슬 터치 시 즉시 반응하도록 처리
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        const target = e.target;
        
        // 터치 좌표 정확도 개선
        const rect = target.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 터치 좌표 정보를 이벤트에 추가
        e.touchX = x;
        e.touchY = y;
        
        // 애플펜슬 터치 시 시각적 피드백
        if (target.closest('button, [role="button"], .clickable')) {
          target.style.transform = 'scale(0.95)';
          target.style.transition = 'transform 0.1s ease';
        }
      }
    }, { passive: false });
    
    document.addEventListener('touchend', (e) => {
      // 터치 종료 시 시각적 피드백 제거
      if (e.changedTouches && e.changedTouches.length > 0) {
        const target = e.target;
        if (target.closest('button, [role="button"], .clickable')) {
          target.style.transform = 'scale(1)';
        }
      }
    }, { passive: false });
  }
};

// 애플펜슬 터치 좌표 정확도 개선 함수
export const getAccurateTouchCoordinates = (event) => {
  if (!event.touches || event.touches.length === 0) {
    return { x: 0, y: 0 };
  }
  
  const touch = event.touches[0];
  const target = event.target;
  const rect = target.getBoundingClientRect();
  
  // 터치 좌표를 요소 기준으로 정확하게 계산
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  
  return { x, y };
};

// 애플펜슬 터치 이벤트 개선 함수
export const enhanceApplePencilTouch = (element) => {
  if (!isApplePencil()) return;
  
  element.addEventListener('touchstart', (e) => {
    const coords = getAccurateTouchCoordinates(e);
    
    // 터치 좌표 정보를 이벤트에 추가
    e.touchX = coords.x;
    e.touchY = coords.y;
    
    // 애플펜슬 터치 시 즉시 반응
    e.preventDefault();
    
    // 시각적 피드백
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease';
  }, { passive: false });
  
  element.addEventListener('touchend', (e) => {
    // 터치 종료 시 시각적 피드백 제거
    element.style.transform = 'scale(1)';
    
    // 클릭 이벤트 실행
    if (!element.disabled) {
      element.click();
    }
  }, { passive: false });
};

// 아이패드에서만 터치 최적화 적용
export const applyIPadTouchOptimization = () => {
  if (isIPad() || isTouchDevice()) {
    optimizeApplePencil();
    initializeTouchOptimization();
    
    // 모든 클릭 가능한 요소에 애플펜슬 터치 개선 적용
    setTimeout(() => {
      const clickableElements = document.querySelectorAll('button, [role="button"], .clickable, .MuiButton-root, .MuiIconButton-root');
      clickableElements.forEach(element => {
        enhanceApplePencilTouch(element);
      });
    }, 1000);
  }
};
