// 아이패드 터치 이벤트 최적화 유틸리티

// 애플펜슬과 손가락 터치 간격 관리
let lastPencilTouchTime = 0;
let lastFingerTouchTime = 0;
const PENCIL_FINGER_GAP = 50; // 애플펜슬과 손가락 터치 간격 (ms)
const PENCIL_PRIORITY = true; // 애플펜슬 우선 처리

// 입력 필드가 입력 가능한지 확인하는 헬퍼 함수
const isInputElement = (element) => {
  if (!element) return false;
  return (
    element.tagName === 'INPUT' || 
    element.tagName === 'TEXTAREA' || 
    element.tagName === 'SELECT' ||
    element.closest('input, textarea, select') ||
    element.closest('.MuiTextField-root') ||
    element.closest('.MuiInputBase-root') ||
    element.closest('[contenteditable="true"]')
  );
};

// IconButton이나 ClearIcon 버튼인지 확인하는 헬퍼 함수
const isIconButton = (element) => {
  if (!element) return false;
  
  // IconButton 자체이거나 IconButton 내부 요소
  if (element.classList.contains('MuiIconButton-root') || 
      element.closest('.MuiIconButton-root')) {
    return true;
  }
  
  // ClearIcon을 포함하는 버튼
  if (element.closest('button[aria-label*="clear"], button[aria-label*="Clear"]')) {
    return true;
  }
  
  // InputAdornment 내부의 IconButton (X버튼) - 더 강력한 체크
  const inputAdornment = element.closest('.MuiInputAdornment-root');
  if (inputAdornment) {
    const iconButton = inputAdornment.querySelector('.MuiIconButton-root');
    if (iconButton && (element === iconButton || iconButton.contains(element))) {
      return true;
    }
  }
  
  // SVG 아이콘 자체를 클릭한 경우도 IconButton으로 간주
  if (element.tagName === 'svg' || element.tagName === 'path') {
    const iconButton = element.closest('.MuiIconButton-root');
    if (iconButton) {
      return true;
    }
  }
  
  return false;
};

// Select나 MenuItem인지 확인하는 헬퍼 함수
const isSelectElement = (element) => {
  if (!element) return false;
  return (
    element.classList.contains('MuiSelect-root') ||
    element.classList.contains('MuiSelect-select') ||
    element.classList.contains('MuiSelect-icon') ||
    element.classList.contains('MuiMenuItem-root') ||
    element.getAttribute?.('role') === 'combobox' ||
    element.closest('[role="combobox"]') ||
    element.closest('.MuiSelect-root') ||
    element.closest('.MuiFormControl-root')?.querySelector?.('[role="combobox"]') === element.closest('[role="combobox"]') ||
    element.closest('.MuiSelect-select') ||
    element.closest('.MuiSelect-icon') ||
    element.closest('.MuiMenu-root') ||
    element.closest('.MuiPopover-root') ||
    element.closest('.MuiList-root') ||
    element.closest('[role="listbox"]')
  );
};

// 터치 이벤트 지연 시간 제거 및 애플펜슬 최적화 - IPA 빌드 호환
export const preventTouchDelay = () => {
  // 터치 이벤트 지연 제거 - IPA 빌드에서는 preventDefault 제거
  document.addEventListener('touchstart', (e) => {
    // 입력 필드인 경우 기본 동작 허용 (커서 생성을 위해)
    if (isInputElement(e.target)) {
      // 입력 필드는 기본 동작 허용, 이벤트 전파 허용
      return;
    }
    
    // IconButton (X버튼)인 경우 기본 동작 허용
    if (isIconButton(e.target)) {
      return;
    }
    
    // Select/MenuItem인 경우 기본 동작 허용
    if (isSelectElement(e.target)) {
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
    
    // 클릭 이벤트 최적화 - 버튼의 실제 onClick이 실행되도록 허용
    button.addEventListener('click', (e) => {
      // 입력 필드인 경우 기본 동작 허용
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
      
      // IconButton (X버튼 등)인 경우 기본 동작 허용 - 가장 먼저 체크
      if (isIconButton(target) || isIconButton(button)) {
        // IconButton은 기본 동작 허용 (stopPropagation 하지 않음)
        e.stopPropagation = () => {}; // stopPropagation 무효화
        e.stopImmediatePropagation = () => {}; // stopImmediatePropagation 무효화
        return;
      }
      
      // Select/MenuItem인 경우 기본 동작 허용
      if (isSelectElement(target) || isSelectElement(button)) {
        // Select는 기본 동작 허용
        return;
      }
      
      // Material-UI 버튼이나 하단바 버튼은 기본 동작 허용
      if (button.classList.contains('MuiButton-root') || 
          button.closest('[data-bottom-bar]') ||
          button.closest('.MuiBottomNavigation-root')) {
        // Material-UI 버튼은 기본 동작 허용
        return;
      }
      
      // 이벤트 버블링 방지 (일반 버튼에만 적용)
      e.stopPropagation();
      
      // 중복 클릭 방지
      if (button.disabled) {
        e.preventDefault();
        return;
      }
      
      // 버튼 비활성화 (중복 클릭 방지) - 일반 버튼에만 적용
      button.disabled = true;
      setTimeout(() => {
        button.disabled = false;
      }, 500);
    }, { capture: false }); // capture phase가 아닌 bubble phase에서 실행
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
  const dropdowns = document.querySelectorAll('.MuiSelect-root, .MuiList-root, .MuiMenu-root, .MuiPopover-root, .MuiSelect-select');
  
  dropdowns.forEach(dropdown => {
    // 터치 최적화
    dropdown.style.touchAction = 'manipulation';
    dropdown.style.webkitTapHighlightColor = 'transparent';
    // 마우스 커서를 포인터로 변경
    dropdown.style.cursor = 'pointer';
    // 클릭 가능하도록 설정
    dropdown.style.pointerEvents = 'auto';
  });
  
  // MenuItem에 직접 스타일 적용 (별도 처리)
  const menuItems = document.querySelectorAll('.MuiMenuItem-root');
  menuItems.forEach(item => {
    // 이미 처리된 항목은 건너뛰기
    if (item.dataset.dropdownOptimized) return;
    item.dataset.dropdownOptimized = 'true';
    
    item.style.cursor = 'pointer';
    item.style.pointerEvents = 'auto';
    item.style.transition = 'background-color 0.2s ease';
    
    // 인라인 스타일로 불투명 배경 강제 설정 (transparent 덮어쓰기)
    if (item.classList.contains('Mui-selected')) {
      item.style.backgroundColor = 'rgba(25, 118, 210, 0.8)';
    } else {
      item.style.backgroundColor = '#23242a';
    }
    
    // 호버 효과를 위한 이벤트 리스너
    const handleMouseEnter = () => {
      if (!item.classList.contains('Mui-selected')) {
        item.style.backgroundColor = '#3a3b42'; // 불투명 배경
      } else {
        item.style.backgroundColor = 'rgba(25, 118, 210, 0.9)'; // 불투명 배경
      }
    };
    
    const handleMouseLeave = () => {
      if (!item.classList.contains('Mui-selected')) {
        item.style.backgroundColor = '#23242a';
      } else {
        item.style.backgroundColor = 'rgba(25, 118, 210, 0.8)'; // 불투명 배경
      }
    };
    
    item.addEventListener('mouseenter', handleMouseEnter);
    item.addEventListener('mouseleave', handleMouseLeave);
    
    // 클릭 이벤트는 Material-UI가 처리하도록 허용 (아무것도 하지 않음)
    // capture phase에서 이벤트를 막지 않도록 주의
  });
  
  // 드롭다운 메뉴 컨테이너 z-index 설정
  const menuContainers = document.querySelectorAll('.MuiMenu-root, .MuiPopover-root, .MuiMenu-paper, .MuiPopover-paper');
  menuContainers.forEach(container => {
    container.style.zIndex = '40000000';
  });
  
  // 리스트 컨테이너도 불투명하게
  const listContainers = document.querySelectorAll('.MuiList-root');
  listContainers.forEach(list => {
    list.style.backgroundColor = '#23242a';
    list.style.zIndex = '40000000';
  });
};

export const ensureInputFocus = () => {
  // 전역 포커스 보정 비활성화: MUI TextField/Select/포털과 충돌 시 입력 불가
  return;
};

// 전체 터치 최적화 초기화
export const initializeTouchOptimization = () => {
  // DOM이 로드된 후 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        ensureInputFocus();
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
      ensureInputFocus();
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
            
            // 새로 추가된 MenuItem 최적화
            const newMenuItems = node.querySelectorAll ? node.querySelectorAll('.MuiMenuItem-root') : [];
            if (node.classList && node.classList.contains('MuiMenuItem-root')) {
              newMenuItems.push(node);
            }
            newMenuItems.forEach(item => {
              // 이미 처리된 항목은 건너뛰기
              if (item.dataset.dropdownOptimized) return;
              item.dataset.dropdownOptimized = 'true';
              
              item.style.cursor = 'pointer';
              item.style.pointerEvents = 'auto';
              item.style.transition = 'background-color 0.2s ease';
              
              // 인라인 스타일로 불투명 배경 강제 설정 (transparent 덮어쓰기)
              if (item.classList.contains('Mui-selected')) {
                item.style.backgroundColor = 'rgba(25, 118, 210, 0.8)';
              } else {
                item.style.backgroundColor = '#23242a';
              }
              
              // 호버 효과를 위한 이벤트 리스너
              const handleMouseEnter = () => {
                if (!item.classList.contains('Mui-selected')) {
                  item.style.backgroundColor = '#3a3b42';
                } else {
                  item.style.backgroundColor = 'rgba(25, 118, 210, 0.9)';
                }
              };
              
              const handleMouseLeave = () => {
                if (!item.classList.contains('Mui-selected')) {
                  item.style.backgroundColor = '#23242a';
                } else {
                  item.style.backgroundColor = 'rgba(25, 118, 210, 0.8)';
                }
              };
              
              item.addEventListener('mouseenter', handleMouseEnter);
              item.addEventListener('mouseleave', handleMouseLeave);
            });
            
            // 새로 추가된 드롭다운 메뉴 컨테이너 z-index 설정
            const newMenuContainers = node.querySelectorAll ? Array.from(node.querySelectorAll('.MuiMenu-root, .MuiPopover-root, .MuiMenu-paper, .MuiPopover-paper')) : [];
            if (node.classList && (node.classList.contains('MuiMenu-root') || node.classList.contains('MuiPopover-root') || node.classList.contains('MuiMenu-paper') || node.classList.contains('MuiPopover-paper'))) {
              newMenuContainers.push(node);
            }
            newMenuContainers.forEach(container => {
              container.style.zIndex = '40000000';
            });
            
            // 새로 추가된 리스트 컨테이너도 불투명하게
            const newListContainers = node.querySelectorAll ? Array.from(node.querySelectorAll('.MuiList-root')) : [];
            if (node.classList && node.classList.contains('MuiList-root')) {
              newListContainers.push(node);
            }
            newListContainers.forEach(list => {
              list.style.backgroundColor = '#23242a';
              list.style.zIndex = '40000000';
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
      if (isInputElement(e.target)) {
        // 입력 필드는 기본 동작 허용
        return;
      }
      
      // IconButton (X버튼)인 경우 기본 동작 허용
      if (isIconButton(e.target)) {
        return;
      }
      
      // Select/MenuItem인 경우 기본 동작 허용
      if (isSelectElement(e.target)) {
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
    // 입력 필드 포커스 강제 활성화 먼저 실행
    ensureInputFocus();
    
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
