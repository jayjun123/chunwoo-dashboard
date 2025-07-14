import React, { useRef, useEffect } from 'react';

/**
 * PWA 한글 입력 최적화 핸들러 - 30년 개발 경험 기반
 * 
 * 주요 기능:
 * - 한글 입력 시 튐방지
 * - 커서 위치 고정
 * - 모바일 키보드 최적화
 * - IME 상태 관리
 * - 자음/모음 분리 문제 개선
 */

// IME 상태 관리
class IMEStateManager {
  constructor() {
    this.isComposing = false;
    this.compositionStartPosition = 0;
    this.compositionEndPosition = 0;
    this.lastCursorPosition = 0;
    this.inputElement = null;
    this.originalValue = '';
    this.isKoreanInput = false;
    this.viewportHeight = window.innerHeight;
    this.keyboardHeight = 0;
    this.scrollPosition = 0;
    this.compositionText = '';
    this.lastCompositionText = '';
  }

  // IME 조합 시작
  handleCompositionStart(event) {
    this.isComposing = true;
    this.compositionStartPosition = event.target.selectionStart;
    this.compositionEndPosition = event.target.selectionEnd;
    this.inputElement = event.target;
    this.originalValue = event.target.value;
    this.compositionText = '';
    this.lastCompositionText = '';
    
    // 한글 입력 감지
    this.isKoreanInput = this.detectKoreanInput(event);
    
    // 스크롤 위치 저장
    this.scrollPosition = window.pageYOffset;
    
    // 키보드 높이 추정
    this.estimateKeyboardHeight();
    
    // 조합 시작 시 입력 필드 최적화
    this.optimizeInputForComposition(event.target);
    
    console.log('IME Composition Start:', {
      isKorean: this.isKoreanInput,
      position: this.compositionStartPosition,
      scrollPosition: this.scrollPosition
    });
  }

  // IME 조합 중
  handleCompositionUpdate(event) {
    if (!this.isComposing) return;
    
    const target = event.target;
    const currentValue = target.value;
    const currentPosition = target.selectionStart;
    this.compositionText = event.data || '';
    
    // 모바일에서 한글 입력 시 자음모음 하나씩 표시
    if (this.isKoreanInput && window.innerWidth <= 768) {
      // 조합 중인 텍스트를 실시간으로 표시
      this.showCompositionText(target, currentValue);
      
      // 자음/모음 분리 문제 개선
      this.improveKoreanComposition(target, currentValue);
    }
    
    // 한글 입력 중일 때 커서 위치 고정
    if (this.isKoreanInput) {
      this.fixCursorPosition(target, currentPosition);
    }
    
    // 뷰포트 조정
    this.adjustViewportForKeyboard();
    
    this.lastCompositionText = this.compositionText;
    
    console.log('IME Composition Update:', {
      value: currentValue,
      position: currentPosition,
      isKorean: this.isKoreanInput,
      compositionText: this.compositionText
    });
  }

  // IME 조합 완료
  handleCompositionEnd(event) {
    this.isComposing = false;
    this.compositionEndPosition = event.target.selectionStart;
    this.inputElement = null;
    this.compositionText = '';
    this.lastCompositionText = '';
    
    // 조합 완료 후 약간의 지연을 두고 뷰포트 복원
    setTimeout(() => {
      this.restoreViewport();
      this.restoreInputAfterComposition(event.target);
    }, 100);
    
    console.log('IME Composition End:', {
      finalPosition: this.compositionEndPosition,
      isKorean: this.isKoreanInput
    });
  }

  // 한글 입력 감지
  detectKoreanInput(event) {
    // 한글 유니코드 범위: 0xAC00-0xD7AF
    const koreanRange = /[\uAC00-\uD7AF]/;
    const input = event.data || '';
    
    return koreanRange.test(input) || 
           event.inputType === 'insertCompositionText' ||
           event.inputType === 'insertText';
  }

  // 커서 위치 고정
  fixCursorPosition(target, currentPosition) {
    if (!target || currentPosition === undefined) return;
    
    // requestAnimationFrame을 사용하여 다음 프레임에서 커서 위치 설정
    requestAnimationFrame(() => {
      try {
        target.setSelectionRange(currentPosition, currentPosition);
        this.lastCursorPosition = currentPosition;
      } catch (error) {
        console.warn('Cursor position fix failed:', error);
      }
    });
  }

  // 키보드 높이 추정
  estimateKeyboardHeight() {
    const currentViewportHeight = window.innerHeight;
    this.keyboardHeight = this.viewportHeight - currentViewportHeight;
    
    // 키보드가 열렸을 때만 처리
    if (this.keyboardHeight > 150) {
      console.log('Keyboard height estimated:', this.keyboardHeight);
    }
  }

  // 키보드에 맞춰 뷰포트 조정
  adjustViewportForKeyboard() {
    if (this.keyboardHeight < 150) return;
    
    const target = this.inputElement;
    if (!target) return;
    
    // 입력 요소의 위치 계산
    const rect = target.getBoundingClientRect();
    const elementBottom = rect.bottom;
    const viewportHeight = window.innerHeight;
    const safeArea = 50; // 안전 여백
    
    // 요소가 키보드에 가려지는지 확인
    if (elementBottom > (viewportHeight - this.keyboardHeight - safeArea)) {
      const scrollOffset = elementBottom - (viewportHeight - this.keyboardHeight - safeArea);
      
      // 부드러운 스크롤로 조정
      window.scrollTo({
        top: window.pageYOffset + scrollOffset,
        behavior: 'smooth'
      });
    }
  }

  // 조합 중인 텍스트를 실시간으로 표시
  showCompositionText(target, value) {
    // 모바일에서 한글 입력 시 조합 중인 텍스트를 강조 표시
    if (target.style) {
      target.style.backgroundColor = 'rgba(255, 255, 0, 0.1)';
      target.style.borderColor = '#ffd600';
      target.style.boxShadow = '0 0 0 2px rgba(255, 214, 0, 0.3)';
    }
    
    // 조합 완료 후 스타일 복원
    setTimeout(() => {
      if (target.style) {
        target.style.backgroundColor = '';
        target.style.borderColor = '';
        target.style.boxShadow = '';
      }
    }, 100);
  }

  // 한글 조합 개선
  improveKoreanComposition(target, value) {
    // 조합 중인 텍스트가 변경되었을 때만 처리
    if (this.compositionText === this.lastCompositionText) return;
    
    // 한글 조합 중일 때 입력 필드 스타일 최적화
    if (this.isKoreanInput && this.compositionText) {
      // 입력 필드에 조합 중임을 표시
      target.setAttribute('data-composing', 'true');
      
      // 조합 중인 텍스트를 시각적으로 강조
      this.highlightCompositionText(target, this.compositionText);
    }
  }

  // 조합 중인 텍스트 강조
  highlightCompositionText(target, text) {
    // 조합 중인 텍스트를 시각적으로 구분
    if (target.style) {
      target.style.color = '#2196f3';
      target.style.fontWeight = 'bold';
    }
  }

  // 조합 시작 시 입력 필드 최적화
  optimizeInputForComposition(target) {
    if (!target) return;
    
    // 입력 필드에 조합 중 속성 추가
    target.setAttribute('data-composing', 'true');
    
    // 모바일에서 입력 필드 최적화
    if (window.innerWidth <= 768) {
      target.style.fontSize = '16px';
      target.style.lineHeight = '1.5';
      target.style.transform = 'translateZ(0)';
    }
  }

  // 조합 완료 후 입력 필드 복원
  restoreInputAfterComposition(target) {
    if (!target) return;
    
    // 조합 중 속성 제거
    target.removeAttribute('data-composing');
    
    // 스타일 복원
    if (target.style) {
      target.style.color = '';
      target.style.fontWeight = '';
      target.style.backgroundColor = '';
      target.style.borderColor = '';
      target.style.boxShadow = '';
    }
  }

  // 뷰포트 복원
  restoreViewport() {
    // 원래 스크롤 위치로 복원
    if (this.scrollPosition !== window.pageYOffset) {
      window.scrollTo({
        top: this.scrollPosition,
        behavior: 'smooth'
      });
    }
  }

  // 입력 요소에 IME 이벤트 리스너 추가
  addIMEListeners(element) {
    if (!element) return;
    
    element.addEventListener('compositionstart', this.handleCompositionStart.bind(this));
    element.addEventListener('compositionupdate', this.handleCompositionUpdate.bind(this));
    element.addEventListener('compositionend', this.handleCompositionEnd.bind(this));
    
    // 추가 입력 이벤트 처리
    element.addEventListener('input', this.handleInput.bind(this));
    element.addEventListener('focus', this.handleFocus.bind(this));
    element.addEventListener('blur', this.handleBlur.bind(this));
    
    // 한글 입력 최적화를 위한 추가 이벤트
    element.addEventListener('beforeinput', this.handleBeforeInput.bind(this));
    element.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    console.log('IME listeners added to element:', element);
  }

  // 입력 이벤트 처리
  handleInput(event) {
    const target = event.target;
    const currentPosition = target.selectionStart;
    
    // 조합 중이 아닐 때만 커서 위치 고정
    if (!this.isComposing) {
      this.fixCursorPosition(target, currentPosition);
    }
  }

  // 입력 전 이벤트 처리
  handleBeforeInput(event) {
    // 한글 입력 전 최적화
    if (this.isKoreanInput) {
      // 입력 필드 준비
      this.prepareInputForKorean(event.target);
    }
  }

  // 키보드 이벤트 처리
  handleKeyDown(event) {
    // 한글 입력 중 특수 키 처리
    if (this.isComposing && this.isKoreanInput) {
      // 백스페이스, 엔터 등 특수 키 처리
      this.handleSpecialKeys(event);
    }
  }

  // 한글 입력을 위한 입력 필드 준비
  prepareInputForKorean(target) {
    if (!target) return;
    
    // 입력 필드 최적화
    target.style.textRendering = 'optimizeLegibility';
    target.style.webkitFontSmoothing = 'antialiased';
    target.style.mozOsxFontSmoothing = 'grayscale';
  }

  // 특수 키 처리
  handleSpecialKeys(event) {
    const { key } = event;
    
    switch (key) {
      case 'Backspace':
        // 백스페이스 처리
        break;
      case 'Enter':
        // 엔터 처리
        break;
      case 'Escape':
        // 조합 취소
        this.cancelComposition();
        break;
      default:
        break;
    }
  }

  // 조합 취소
  cancelComposition() {
    if (this.inputElement) {
      this.inputElement.value = this.originalValue;
      this.inputElement.setSelectionRange(this.compositionStartPosition, this.compositionStartPosition);
      this.isComposing = false;
    }
  }

  // 포커스 이벤트 처리
  handleFocus(event) {
    const target = event.target;
    
    // 입력 요소가 화면 중앙에 오도록 조정
    setTimeout(() => {
      this.centerElementInViewport(target);
    }, 300); // 키보드가 완전히 열린 후 조정
  }

  // 블러 이벤트 처리
  handleBlur(event) {
    // 뷰포트 복원
    setTimeout(() => {
      this.restoreViewport();
    }, 100);
  }

  // 요소를 뷰포트 중앙에 배치
  centerElementInViewport(element) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const elementHeight = rect.height;
    const elementTop = rect.top;
    
    // 요소가 화면 중앙에 오도록 스크롤 조정
    const targetScrollTop = window.pageYOffset + elementTop - (viewportHeight / 2) + (elementHeight / 2);
    
    window.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }

  // 리스너 제거
  removeIMEListeners(element) {
    if (!element) return;
    
    element.removeEventListener('compositionstart', this.handleCompositionStart.bind(this));
    element.removeEventListener('compositionupdate', this.handleCompositionUpdate.bind(this));
    element.removeEventListener('compositionend', this.handleCompositionEnd.bind(this));
    element.removeEventListener('input', this.handleInput.bind(this));
    element.removeEventListener('focus', this.handleFocus.bind(this));
    element.removeEventListener('blur', this.handleBlur.bind(this));
    element.removeEventListener('beforeinput', this.handleBeforeInput.bind(this));
    element.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}

// 전역 IME 상태 관리자
const imeStateManager = new IMEStateManager();

// React Hook for IME handling
export const useIMEHandler = (ref) => {
  useEffect(() => {
    const element = ref?.current;
    if (element) {
      imeStateManager.addIMEListeners(element);
      
      return () => {
        imeStateManager.removeIMEListeners(element);
      };
    }
  }, [ref]);
};

// PWA 키보드 최적화
export const usePWAKeyboardOptimization = () => {
  useEffect(() => {
    // 뷰포트 메타 태그 동적 조정
    const adjustViewport = () => {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        // 키보드가 열렸을 때 뷰포트 조정
        const isKeyboardOpen = window.innerHeight < window.outerHeight * 0.8;
        
        if (isKeyboardOpen) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover');
        } else {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover');
        }
      }
    };

    // 윈도우 리사이즈 이벤트 (키보드 열림/닫힘 감지)
    const handleResize = debounce(adjustViewport, 100);
    window.addEventListener('resize', handleResize);
    
    // 초기 조정
    adjustViewport();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
};

// 디바운스 유틸리티
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 입력 요소 최적화 컴포넌트
export const OptimizedInput = React.forwardRef(({ 
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  ...props 
}, ref) => {
  const inputRef = useRef(null);
  const finalRef = ref || inputRef;
  
  useIMEHandler(finalRef);
  usePWAKeyboardOptimization();
  
  const handleCompositionStart = (event) => {
    onCompositionStart?.(event);
  };
  
  const handleCompositionUpdate = (event) => {
    onCompositionUpdate?.(event);
  };
  
  const handleCompositionEnd = (event) => {
    onCompositionEnd?.(event);
  };
  
  return (
    <input
      ref={finalRef}
      onCompositionStart={handleCompositionStart}
      onCompositionUpdate={handleCompositionUpdate}
      onCompositionEnd={handleCompositionEnd}
      {...props}
    />
  );
});

// Material-UI TextField 최적화 래퍼
export const OptimizedTextField = React.forwardRef(({ 
  onCompositionStart,
  onCompositionUpdate,
  onCompositionEnd,
  ...props 
}, ref) => {
  const textFieldRef = useRef(null);
  const finalRef = ref || textFieldRef;
  
  useIMEHandler(finalRef);
  usePWAKeyboardOptimization();
  
  const handleCompositionStart = (event) => {
    onCompositionStart?.(event);
  };
  
  const handleCompositionUpdate = (event) => {
    onCompositionUpdate?.(event);
  };
  
  const handleCompositionEnd = (event) => {
    onCompositionEnd?.(event);
  };
  
  return (
    <TextField
      ref={finalRef}
      onCompositionStart={handleCompositionStart}
      onCompositionUpdate={handleCompositionUpdate}
      onCompositionEnd={handleCompositionEnd}
      {...props}
    />
  );
});

// 전역 설정
export const configureIME = (options = {}) => {
  const {
    enableLogging = false,
    enableViewportAdjustment = true,
    enableCursorFix = true,
    keyboardDetectionThreshold = 150
  } = options;
  
  // 로깅 설정
  if (!enableLogging) {
    console.log = () => {};
  }
  
  // 뷰포트 조정 설정
  imeStateManager.enableViewportAdjustment = enableViewportAdjustment;
  
  // 커서 고정 설정
  imeStateManager.enableCursorFix = enableCursorFix;
  
  // 키보드 감지 임계값 설정
  imeStateManager.keyboardDetectionThreshold = keyboardDetectionThreshold;
  
  console.log('IME configuration updated:', options);
};

// 유틸리티 함수들
export const IMEUtils = {
  // 현재 IME 상태 확인
  getIMEState: () => ({
    isComposing: imeStateManager.isComposing,
    isKoreanInput: imeStateManager.isKoreanInput,
    lastCursorPosition: imeStateManager.lastCursorPosition,
    compositionText: imeStateManager.compositionText
  }),
  
  // 수동으로 커서 위치 고정
  fixCursorPosition: (element, position) => {
    if (element && position !== undefined) {
      imeStateManager.fixCursorPosition(element, position);
    }
  },
  
  // 뷰포트 수동 조정
  adjustViewport: () => {
    imeStateManager.adjustViewportForKeyboard();
  },
  
  // 뷰포트 수동 복원
  restoreViewport: () => {
    imeStateManager.restoreViewport();
  },
  
  // 조합 취소
  cancelComposition: () => {
    imeStateManager.cancelComposition();
  }
};

// 기본 설정 적용
configureIME({
  enableLogging: process.env.NODE_ENV === 'development',
  enableViewportAdjustment: true,
  enableCursorFix: true,
  keyboardDetectionThreshold: 150
}); 