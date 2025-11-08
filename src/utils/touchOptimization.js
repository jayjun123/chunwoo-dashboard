// 아이패드 터치 이벤트 최적화 유틸리티

// 애플펜슬과 손가락 터치 간격 관리
let lastPencilTouchTime = 0;
let lastFingerTouchTime = 0;
const PENCIL_FINGER_GAP = 50; // 애플펜슬과 손가락 터치 간격 (ms)
const PENCIL_PRIORITY = true; // 애플펜슬 우선 처리

// 터치 이벤트 지연 시간 제거 및 애플펜슬 최적화 - IPA 빌드 호환
export const preventTouchDelay = () => {
  // 터치 이벤트 지연 제거 - IPA 빌드에서는 preventDefault 제거
  document.addEventListener('touchstart', (e) => {
    // 입력 필드인 경우 기본 동작 허용 (커서 생성을 위해)
    const target = e.target;
    if (target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.tagName === 'SELECT' ||
      target.closest('input, textarea, select') ||
      target.closest('.MuiTextField-root') ||
      target.closest('.MuiInputBase-root')
    )) {
      // 입력 필드는 기본 동작 허용
      return;
    }
    
    // 애플펜슬과 손가락 터치 구분
    const isPencil = isApplePencilTouch(e);
    const now = Date.now();
    
    // 애플펜슬 터치 좌표 정확도 개선
    if (e.touches && e.touches.length > 0) {
      const coords = getAccurateTouchCoordinates(e);
      
      // 터치 좌표 정보를 이벤트에 추가
      e.touchX = coords.x;
      e.touchY = coords.y;
      e.isPencilTouch = isPencil;
      
      // 애플펜슬과 손가락 터치 간격 조정
      if (isPencil) {
        lastPencilTouchTime = now;
        // 애플펜슬 터치 시 손가락 터치 무시 (50ms 이내)
        if (now - lastFingerTouchTime < PENCIL_FINGER_GAP) {
          e.pencilPriority = true;
        }
      } else {
        lastFingerTouchTime = now;
        // 손가락 터치 시 애플펜슬 터치와 충돌 방지
        if (now - lastPencilTouchTime < PENCIL_FINGER_GAP && PENCIL_PRIORITY) {
          // 애플펜슬이 최근에 터치했다면 손가락 터치 무시
          e.shouldIgnore = true;
        }
      }
    }
    
    // IPA 빌드에서는 preventDefault 제거하여 터치 허용
    // 터치 시작 시 즉시 처리하지 않고 기본 동작 허용
  }, { passive: true });

  // 터치 이동 시 스크롤과 클릭 이벤트 분리 - IPA 빌드 호환
  document.addEventListener('touchmove', (e) => {
    // 애플펜슬과 손가락 터치 구분
    const isPencil = isApplePencilTouch(e);
    e.isPencilTouch = isPencil;
    
    // 모든 터치 이동 허용 (IPA 빌드 호환)
    // 스크롤 영역과 비스크롤 영역 모두 터치 허용
  }, { passive: true });

  // 터치 종료 시 더블탭 줌 방지 및 정확한 클릭 처리 - IPA 빌드 호환
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    const lastTouch = window.lastTouchTime || 0;
    
    // IPA 빌드에서는 preventDefault 제거
    // 더블탭 줌 방지는 CSS로 처리
    
    // 애플펜슬 터치 종료 시 정확한 좌표 계산
    if (e.changedTouches && e.changedTouches.length > 0) {
      const coords = getAccurateTouchCoordinates(e);
      
      // 터치 종료 좌표 정보를 이벤트에 추가
      e.touchEndX = coords.x;
      e.touchEndY = coords.y;
      e.isPencilTouch = coords.isPencil;
    }
    
    window.lastTouchTime = now;
  }, { passive: true });
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
    
    // 애플펜슬 터치 이벤트 최적화 - IPA 빌드 호환
    button.addEventListener('touchstart', (e) => {
      // 터치 시작 시 시각적 피드백만 제공 (preventDefault 제거)
      button.style.transform = 'scale(0.95)';
      button.style.transition = 'transform 0.1s ease';
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
    }, { passive: true });
    
    button.addEventListener('touchend', (e) => {
      // 터치 종료 시 원래 크기로 복원
      button.style.transform = 'scale(1)';
      
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
      // 클릭 이벤트는 브라우저가 자동으로 처리
    }, { passive: true });
    
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
    // 입력 필드가 포함된 경우 건너뛰기
    if (element.querySelector('input, textarea, select')) {
      return;
    }
    
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
      
      /* 입력 필드는 선택 가능하도록 예외 처리 */
      input, textarea, select,
      input *, textarea *, select *,
      .MuiTextField-root input,
      .MuiTextField-root textarea,
      .MuiInputBase-input,
      .MuiInputBase-root input,
      .MuiInputBase-root textarea {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        pointer-events: auto !important;
        cursor: text !important;
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
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        touch-action: manipulation;
        /* 입력 필드는 터치 영역 확대 */
        min-height: 44px !important;
        padding: 12px !important;
        /* 포커스 가능하도록 설정 */
        pointer-events: auto !important;
        cursor: text !important;
      }
      
      input:focus, textarea:focus, select:focus {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
        outline: none !important;
        cursor: text !important;
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
    
    // 애플펜슬 터치 이벤트 개선 - IPA 빌드 호환
    document.addEventListener('touchstart', (e) => {
      // 입력 필드인 경우 기본 동작 허용 (커서 생성을 위해)
      const target = e.target;
      if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' ||
        target.closest('input, textarea, select') ||
        target.closest('.MuiTextField-root') ||
        target.closest('.MuiInputBase-root')
      )) {
        // 입력 필드는 기본 동작 허용
        return;
      }
      
      // 애플펜슬 터치 시 즉시 반응하도록 처리
      if (e.touches && e.touches.length > 0) {
        const touch = e.touches[0];
        
        // 터치 좌표 정확도 개선
        const rect = target.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 터치 좌표 정보를 이벤트에 추가
        e.touchX = x;
        e.touchY = y;
        
        // 애플펜슬 터치 시 시각적 피드백 (preventDefault 제거)
        if (target.closest('button, [role="button"], .clickable')) {
          target.style.transform = 'scale(0.95)';
          target.style.transition = 'transform 0.1s ease';
        }
      }
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
    }, { passive: true });
    
    document.addEventListener('touchend', (e) => {
      // 터치 종료 시 시각적 피드백 제거
      if (e.changedTouches && e.changedTouches.length > 0) {
        const target = e.target;
        if (target.closest('button, [role="button"], .clickable')) {
          target.style.transform = 'scale(1)';
        }
      }
      // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
    }, { passive: true });
  }
};

// 애플펜슬과 손가락 터치 구분 함수
export const isApplePencilTouch = (event) => {
  // 포인터 이벤트에서 애플펜슬 감지
  if (event.pointerType === 'pen') {
    return true;
  }
  
  // 터치 이벤트에서 애플펜슬 감지 (force 값으로 판단)
  if (event.touches && event.touches.length > 0) {
    const touch = event.touches[0];
    // 애플펜슬은 일반적으로 force 값이 더 정확하고 일정함
    if (touch.force !== undefined && touch.force > 0) {
      // 애플펜슬의 경우 force 값이 더 정밀함
      return true;
    }
    // radiusX/Y가 작을수록 애플펜슬일 가능성 높음
    if (touch.radiusX !== undefined && touch.radiusY !== undefined) {
      const radius = Math.min(touch.radiusX, touch.radiusY);
      // 반경이 5px 미만이면 애플펜슬로 간주
      if (radius < 5) {
        return true;
      }
    }
  }
  
  // changedTouches에서도 확인
  if (event.changedTouches && event.changedTouches.length > 0) {
    const touch = event.changedTouches[0];
    if (touch.force !== undefined && touch.force > 0) {
      return true;
    }
  }
  
  return false;
};

// 애플펜슬 터치 좌표 정확도 개선 함수 (오프셋 보정 포함)
export const getAccurateTouchCoordinates = (event) => {
  // 애플펜슬 감지
  const isPencil = isApplePencilTouch(event);
  
  let clientX, clientY, touch;
  
  // 포인터 이벤트 (애플펜슬 우선)
  if (event.pointerType === 'pen') {
    clientX = event.clientX;
    clientY = event.clientY;
  }
  // 터치 이벤트
  else if (event.touches && event.touches.length > 0) {
    touch = event.touches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  }
  // 변경된 터치 이벤트
  else if (event.changedTouches && event.changedTouches.length > 0) {
    touch = event.changedTouches[0];
    clientX = touch.clientX;
    clientY = touch.clientY;
  }
  // 마우스 이벤트
  else {
    clientX = event.clientX;
    clientY = event.clientY;
  }
  
  if (typeof clientX !== 'number' || typeof clientY !== 'number') {
    return { x: 0, y: 0, isPencil: false };
  }
  
  const target = event.target;
  const rect = target.getBoundingClientRect();
  
  // 애플펜슬 좌표 보정 (오프셋 조정)
  let x, y;
  
  if (isPencil) {
    // 애플펜슬 전용 오프셋 보정값 (더 정확한 위치 계산)
    const pencilOffsetX = 0; // 필요시 조정 가능
    const pencilOffsetY = 0; // 필요시 조정 가능
    
    // 스크롤 오프셋 고려
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft || 0;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    
    // 애플펜슬 좌표 계산 (더 정밀한 보정)
    x = (clientX - rect.left + scrollX + pencilOffsetX);
    y = (clientY - rect.top + scrollY + pencilOffsetY);
  } else {
    // 일반 터치 좌표 (기존 방식)
    x = clientX - rect.left;
    y = clientY - rect.top;
  }
  
  return { x, y, isPencil };
};

// 애플펜슬 터치 이벤트 개선 함수 - IPA 빌드 호환
export const enhanceApplePencilTouch = (element) => {
  if (!isApplePencil()) return;
  
  element.addEventListener('touchstart', (e) => {
    const coords = getAccurateTouchCoordinates(e);
    
    // 터치 좌표 정보를 이벤트에 추가
    e.touchX = coords.x;
    e.touchY = coords.y;
    
    // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
    
    // 시각적 피드백
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease';
  }, { passive: true });
  
  element.addEventListener('touchend', (e) => {
    // 터치 종료 시 시각적 피드백 제거
    element.style.transform = 'scale(1)';
    
    // IPA 빌드에서는 preventDefault 제거하여 기본 동작 허용
    // 클릭 이벤트는 브라우저가 자동으로 처리
  }, { passive: true });
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
