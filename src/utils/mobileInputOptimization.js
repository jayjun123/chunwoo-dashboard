/**
 * 모바일 입력 최적화 유틸리티
 * 
 * 주요 기능:
 * - 키보드 높이 감지
 * - 입력 필드 포커스 최적화
 * - 스크롤 위치 조정
 * - 한글 입력 안정화
 */

// 키보드 높이 감지
export const detectKeyboardHeight = () => {
  const initialHeight = window.innerHeight;
  let keyboardHeight = 0;
  
  const handleResize = () => {
    const currentHeight = window.innerHeight;
    keyboardHeight = initialHeight - currentHeight;
    
    if (keyboardHeight > 150) {
      document.body.classList.add('keyboard-open');
      document.body.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    } else {
      document.body.classList.remove('keyboard-open');
      document.body.style.removeProperty('--keyboard-height');
    }
  };
  
  window.addEventListener('resize', handleResize);
  
  return () => {
    window.removeEventListener('resize', handleResize);
  };
};

// 입력 필드 포커스 최적화
export const optimizeInputFocus = (inputRef) => {
  if (!inputRef?.current) return;
  
  const input = inputRef.current;
  
  const handleFocus = () => {
    // 입력 필드가 화면 하단에 있을 때 스크롤 조정
    setTimeout(() => {
      const rect = input.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      if (rect.bottom > viewportHeight - 200) {
        input.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 300);
  };
  
  input.addEventListener('focus', handleFocus);
  
  return () => {
    input.removeEventListener('focus', handleFocus);
  };
};

// 한글 입력 안정화
export const stabilizeKoreanInput = (inputRef) => {
  if (!inputRef?.current) return;
  
  const input = inputRef.current;
  let isComposing = false;
  
  const handleCompositionStart = () => {
    isComposing = true;
    input.setAttribute('data-composing', 'true');
  };
  
  const handleCompositionEnd = () => {
    isComposing = false;
    input.removeAttribute('data-composing');
  };
  
  input.addEventListener('compositionstart', handleCompositionStart);
  input.addEventListener('compositionend', handleCompositionEnd);
  
  return () => {
    input.removeEventListener('compositionstart', handleCompositionStart);
    input.removeEventListener('compositionend', handleCompositionEnd);
  };
};

// 모바일 다이얼로그 최적화
export const optimizeMobileDialog = (dialogRef) => {
  if (!dialogRef?.current) return;
  
  const dialog = dialogRef.current;
  
  const handleTouchStart = (e) => {
    // 다이얼로그 외부 터치 시 닫기 방지
    if (e.target === dialog) {
      e.stopPropagation();
    }
  };
  
  dialog.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  return () => {
    dialog.removeEventListener('touchstart', handleTouchStart);
  };
};

// 입력 필드 자동 완성 방지
export const preventAutoComplete = (inputRef) => {
  if (!inputRef?.current) return;
  
  const input = inputRef.current;
  
  // 자동 완성 속성 추가
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('autocorrect', 'off');
  input.setAttribute('autocapitalize', 'off');
  input.setAttribute('spellcheck', 'false');
  
  // 데이터 속성 추가
  input.setAttribute('data-lpignore', 'true');
  input.setAttribute('data-form-type', 'other');
};

// 모바일 입력 필드 스타일 최적화
export const applyMobileInputStyles = (inputRef) => {
  if (!inputRef?.current) return;
  
  const input = inputRef.current;
  
  // 모바일 최적화 스타일 적용
  Object.assign(input.style, {
    fontSize: '16px',
    lineHeight: '1.5',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none'
  });
  
  // 포커스 스타일
  input.addEventListener('focus', () => {
    input.style.borderColor = '#2196f3';
    input.style.boxShadow = '0 0 0 2px rgba(33, 150, 243, 0.2)';
  });
  
  input.addEventListener('blur', () => {
    input.style.borderColor = '#ccc';
    input.style.boxShadow = 'none';
  });
};

// 모바일 환경 감지
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

// 터치 디바이스 감지
export const isTouchDevice = () => {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

// 모바일 키보드 상태 감지
export const isKeyboardOpen = () => {
  return document.body.classList.contains('keyboard-open');
};

// 뷰포트 높이 조정
export const adjustViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// 모바일 입력 최적화 초기화
export const initializeMobileInputOptimization = () => {
  // 키보드 높이 감지 시작
  const cleanupKeyboard = detectKeyboardHeight();
  
  // 뷰포트 높이 조정
  adjustViewportHeight();
  window.addEventListener('resize', adjustViewportHeight);
  
  // 정리 함수 반환
  return () => {
    cleanupKeyboard();
    window.removeEventListener('resize', adjustViewportHeight);
  };
}; 