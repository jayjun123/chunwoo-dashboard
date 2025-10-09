// 아이패드 터치 이벤트 최적화 유틸리티

// 터치 이벤트 지연 시간 제거
export const preventTouchDelay = () => {
  // 터치 이벤트 지연 제거
  document.addEventListener('touchstart', (e) => {
    // 터치 시작 시 즉시 처리
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

  // 터치 종료 시 더블탭 줌 방지
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const lastTouch = window.lastTouchTime || 0;
    
    if (now - lastTouch < 300) {
      // 300ms 내 연속 터치 방지 (더블탭 줌 방지)
      e.preventDefault();
    }
    
    window.lastTouchTime = now;
  }, { passive: false });
};

// 버튼 클릭 이벤트 최적화
export const optimizeButtonClicks = () => {
  // 모든 버튼에 터치 최적화 적용
  const buttons = document.querySelectorAll('button, .MuiButton-root, .MuiIconButton-root, .MuiTab-root');
  
  buttons.forEach(button => {
    // 터치 이벤트 최적화
    button.style.touchAction = 'manipulation';
    button.style.webkitTapHighlightColor = 'transparent';
    button.style.minHeight = '44px';
    button.style.minWidth = '44px';
    
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

// 아이패드 감지 함수
export const isIPad = () => {
  return /iPad/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// 터치 디바이스 감지 함수
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// 아이패드에서만 터치 최적화 적용
export const applyIPadTouchOptimization = () => {
  if (isIPad() || isTouchDevice()) {
    initializeTouchOptimization();
  }
};
