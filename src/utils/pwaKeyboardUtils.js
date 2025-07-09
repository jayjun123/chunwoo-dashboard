import { useEffect } from 'react';

/**
 * PWA 키보드 최적화 유틸리티 - 30년 개발 경험 기반
 * 
 * 주요 기능:
 * - 키보드 높이 감지
 * - 뷰포트 동적 조정
 * - 입력 필드 자동 스크롤
 * - 키보드 열림/닫힘 이벤트 처리
 */

// 키보드 상태 관리
class KeyboardManager {
  constructor() {
    this.isKeyboardOpen = false;
    this.keyboardHeight = 0;
    this.originalViewportHeight = window.innerHeight;
    this.scrollPosition = 0;
    this.activeElement = null;
    this.resizeObserver = null;
    this.visualViewport = window.visualViewport;
    
    this.init();
  }

  init() {
    // Visual Viewport API 지원 확인
    if (this.visualViewport) {
      this.setupVisualViewportListener();
    } else {
      this.setupResizeListener();
    }
    
    // 포커스 이벤트 리스너
    document.addEventListener('focusin', this.handleFocusIn.bind(this));
    document.addEventListener('focusout', this.handleFocusOut.bind(this));
    
    // 터치 이벤트 리스너 (모바일)
    if ('ontouchstart' in window) {
      document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
    }
  }

  // Visual Viewport API 사용 (최신 브라우저)
  setupVisualViewportListener() {
    this.visualViewport.addEventListener('resize', this.handleViewportResize.bind(this));
    this.visualViewport.addEventListener('scroll', this.handleViewportScroll.bind(this));
  }

  // 기존 resize 이벤트 사용 (구형 브라우저)
  setupResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.handleViewportResize();
      }, 100);
    });
  }

  // 뷰포트 리사이즈 처리
  handleViewportResize() {
    const currentHeight = this.visualViewport ? this.visualViewport.height : window.innerHeight;
    const heightDifference = this.originalViewportHeight - currentHeight;
    
    // 키보드 열림 감지 (150px 이상 차이)
    if (heightDifference > 150) {
      this.isKeyboardOpen = true;
      this.keyboardHeight = heightDifference;
      this.handleKeyboardOpen();
    } else {
      this.isKeyboardOpen = false;
      this.keyboardHeight = 0;
      this.handleKeyboardClose();
    }
    
    console.log('Keyboard state:', {
      isOpen: this.isKeyboardOpen,
      height: this.keyboardHeight,
      currentHeight,
      originalHeight: this.originalViewportHeight
    });
  }

  // 뷰포트 스크롤 처리
  handleViewportScroll() {
    if (this.visualViewport && this.activeElement) {
      const elementRect = this.activeElement.getBoundingClientRect();
      const viewportHeight = this.visualViewport.height;
      
      // 요소가 키보드에 가려지는지 확인
      if (elementRect.bottom > viewportHeight - 50) {
        const scrollOffset = elementRect.bottom - viewportHeight + 50;
        this.scrollToElement(this.activeElement, scrollOffset);
      }
    }
  }

  // 포커스 인 이벤트
  handleFocusIn(event) {
    this.activeElement = event.target;
    
    // 입력 필드인 경우에만 처리
    if (this.isInputElement(event.target)) {
      this.scrollPosition = window.pageYOffset;
      
      // 키보드가 열릴 때까지 약간의 지연
      setTimeout(() => {
        this.scrollToElement(event.target);
      }, 300);
    }
  }

  // 포커스 아웃 이벤트
  handleFocusOut(event) {
    this.activeElement = null;
    
    // 키보드가 닫힐 때까지 지연 후 스크롤 복원
    setTimeout(() => {
      if (!this.isKeyboardOpen) {
        this.restoreScrollPosition();
      }
    }, 100);
  }

  // 터치 시작 이벤트
  handleTouchStart(event) {
    // 터치한 요소가 입력 필드인지 확인
    const target = event.target;
    if (this.isInputElement(target)) {
      this.activeElement = target;
    }
  }

  // 입력 요소인지 확인
  isInputElement(element) {
    const inputTypes = ['input', 'textarea', 'select'];
    return inputTypes.includes(element.tagName.toLowerCase()) ||
           element.contentEditable === 'true' ||
           element.getAttribute('role') === 'textbox';
  }

  // 요소로 스크롤
  scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const rect = element.getBoundingClientRect();
    const viewportHeight = this.visualViewport ? this.visualViewport.height : window.innerHeight;
    const elementTop = rect.top;
    const elementHeight = rect.height;
    
    // 요소가 화면 중앙에 오도록 계산
    const targetScrollTop = window.pageYOffset + elementTop - (viewportHeight / 2) + (elementHeight / 2) + offset;
    
    // 부드러운 스크롤
    window.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }

  // 키보드 열림 처리
  handleKeyboardOpen() {
    document.body.classList.add('keyboard-open');
    
    // 뷰포트 메타 태그 조정
    this.adjustViewportMeta();
    
    // 입력 필드 최적화
    this.optimizeInputFields();
  }

  // 키보드 닫힘 처리
  handleKeyboardClose() {
    document.body.classList.remove('keyboard-open');
    
    // 뷰포트 메타 태그 복원
    this.restoreViewportMeta();
    
    // 스크롤 위치 복원
    this.restoreScrollPosition();
  }

  // 뷰포트 메타 태그 조정
  adjustViewportMeta() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover'
      );
    }
  }

  // 뷰포트 메타 태그 복원
  restoreViewportMeta() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, user-scalable=yes, viewport-fit=cover'
      );
    }
  }

  // 입력 필드 최적화
  optimizeInputFields() {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      // 폰트 크기 조정 (iOS 줌 방지)
      input.style.fontSize = '16px';
      
      // 하드웨어 가속
      input.style.transform = 'translateZ(0)';
      
      // 자동 완성 방지
      input.setAttribute('autocomplete', 'off');
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('autocapitalize', 'off');
      input.setAttribute('spellcheck', 'false');
    });
  }

  // 스크롤 위치 복원
  restoreScrollPosition() {
    if (this.scrollPosition !== window.pageYOffset) {
      window.scrollTo({
        top: this.scrollPosition,
        behavior: 'smooth'
      });
    }
  }

  // 정리
  destroy() {
    if (this.visualViewport) {
      this.visualViewport.removeEventListener('resize', this.handleViewportResize.bind(this));
      this.visualViewport.removeEventListener('scroll', this.handleViewportScroll.bind(this));
    }
    
    document.removeEventListener('focusin', this.handleFocusIn.bind(this));
    document.removeEventListener('focusout', this.handleFocusOut.bind(this));
    document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }
}

// 전역 키보드 매니저 인스턴스
let keyboardManager = null;

// 키보드 매니저 초기화
export const initKeyboardManager = () => {
  if (!keyboardManager) {
    keyboardManager = new KeyboardManager();
  }
  return keyboardManager;
};

// 키보드 매니저 정리
export const destroyKeyboardManager = () => {
  if (keyboardManager) {
    keyboardManager.destroy();
    keyboardManager = null;
  }
};

// React Hook for keyboard management
export const useKeyboardManager = () => {
  useEffect(() => {
    const manager = initKeyboardManager();
    
    return () => {
      // 컴포넌트 언마운트 시 정리하지 않음 (전역 사용)
    };
  }, []);
  
  return keyboardManager;
};

// 유틸리티 함수들
export const KeyboardUtils = {
  // 현재 키보드 상태 확인
  getKeyboardState: () => {
    return keyboardManager ? {
      isOpen: keyboardManager.isKeyboardOpen,
      height: keyboardManager.keyboardHeight,
      activeElement: keyboardManager.activeElement
    } : null;
  },
  
  // 수동으로 키보드 열림 처리
  simulateKeyboardOpen: () => {
    if (keyboardManager) {
      keyboardManager.handleKeyboardOpen();
    }
  },
  
  // 수동으로 키보드 닫힘 처리
  simulateKeyboardClose: () => {
    if (keyboardManager) {
      keyboardManager.handleKeyboardClose();
    }
  },
  
  // 특정 요소로 스크롤
  scrollToElement: (element, offset = 0) => {
    if (keyboardManager) {
      keyboardManager.scrollToElement(element, offset);
    }
  },
  
  // 스크롤 위치 복원
  restoreScrollPosition: () => {
    if (keyboardManager) {
      keyboardManager.restoreScrollPosition();
    }
  },
  
  // 입력 필드 최적화
  optimizeInputFields: () => {
    if (keyboardManager) {
      keyboardManager.optimizeInputFields();
    }
  }
};

// PWA 환경 감지
export const isPWA = () => {
  return window.navigator.standalone || 
         window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: window-controls-overlay)').matches;
};

// 모바일 환경 감지
export const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
};

// iOS 환경 감지
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Android 환경 감지
export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

// 키보드 타입 감지
export const getKeyboardType = () => {
  if (isIOS()) return 'ios';
  if (isAndroid()) return 'android';
  return 'desktop';
};

// 환경별 최적화 설정
export const getOptimizationConfig = () => {
  const config = {
    enableViewportAdjustment: true,
    enableCursorFix: true,
    enableScrollOptimization: true,
    keyboardDetectionThreshold: 150,
    scrollDelay: 300,
    restoreDelay: 100
  };
  
  if (isIOS()) {
    config.fontSize = '16px';
    config.enableZoomPrevention = true;
    config.scrollDelay = 500; // iOS는 더 긴 지연 필요
  }
  
  if (isAndroid()) {
    config.fontSize = '16px';
    config.enableHardwareAcceleration = true;
  }
  
  if (isPWA()) {
    config.enableStandaloneOptimization = true;
    config.enableSafeAreaSupport = true;
  }
  
  return config;
};

// 자동 초기화 (PWA 환경에서만)
if (typeof window !== 'undefined' && isPWA()) {
  // DOM 로드 완료 후 초기화
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initKeyboardManager();
    });
  } else {
    initKeyboardManager();
  }
} 