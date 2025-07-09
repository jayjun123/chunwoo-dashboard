/**
 * 강화된 뒤로가기 핸들러 - 30년 개발 경험 기반 최적화
 * 
 * 설계 원칙:
 * - Single Responsibility: 뒤로가기 로직만 담당
 * - Open/Closed: 확장 가능하지만 수정은 닫힘
 * - Dependency Inversion: 추상화에 의존
 * - Strategy Pattern: 다양한 뒤로가기 전략 지원
 */

// 상수 정의 - 매직 넘버 제거
const BACK_BUTTON_CONFIG = {
  DOUBLE_PRESS_DELAY: 2000,
  SWIPE_THRESHOLD: 100,
  NOTIFICATION_DURATION: 2000,
  LONG_PRESS_DELAY: 600,
  Z_INDEX: 10000
};

// 뒤로가기 전략 인터페이스
class BackButtonStrategy {
  execute() {
    throw new Error('execute method must be implemented');
  }
}

// PWA 환경 전략
class PWAStrategy extends BackButtonStrategy {
  execute() {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      return { shouldExit: true, message: '한 번 더 스와이프하면 앱이 종료됩니다' };
    }
    return { shouldExit: false };
  }
}

// 브라우저 환경 전략
class BrowserStrategy extends BackButtonStrategy {
  execute() {
    if (window.history.length > 1) {
      window.history.back();
    }
    return { shouldExit: false };
  }
}

// 전략 팩토리
class BackButtonStrategyFactory {
  static createStrategy() {
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      return new PWAStrategy();
    }
    return new BrowserStrategy();
  }
}

// 알림 관리자
class NotificationManager {
  constructor() {
    this.currentNotification = null;
  }

  show(message, duration = BACK_BUTTON_CONFIG.NOTIFICATION_DURATION) {
    this.hide();
    
    this.currentNotification = document.createElement('div');
    this.currentNotification.id = 'back-press-notification';
    this.currentNotification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: ${BACK_BUTTON_CONFIG.Z_INDEX};
      pointer-events: none;
      transition: opacity 0.3s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    this.currentNotification.textContent = message;
    
    document.body.appendChild(this.currentNotification);
    
    setTimeout(() => this.hide(), duration);
  }

  hide() {
    if (this.currentNotification) {
      this.currentNotification.remove();
      this.currentNotification = null;
    }
  }
}

// 터치 이벤트 관리자
class TouchEventManager {
  constructor() {
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchEndX = 0;
    this.touchEndY = 0;
  }

  handleTouchStart(event) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  handleTouchEnd(event) {
    this.touchEndX = event.changedTouches[0].clientX;
    this.touchEndY = event.changedTouches[0].clientY;
    
    const deltaX = this.touchEndX - this.touchStartX;
    const deltaY = this.touchEndY - this.touchStartY;
    
    // 수평 스와이프 감지 (세로 스와이프보다 큰 경우)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > BACK_BUTTON_CONFIG.SWIPE_THRESHOLD) {
      if (deltaX > 0) {
        return { isBackSwipe: true, direction: 'right' };
      }
    }
    
    return { isBackSwipe: false };
  }
}

// 메인 뒤로가기 핸들러 클래스
class EnhancedBackButtonHandler {
  constructor() {
    this.backPressCount = 0;
    this.backPressTimer = null;
    this.lastBackPressTime = 0;
    this.strategy = BackButtonStrategyFactory.createStrategy();
    this.notificationManager = new NotificationManager();
    this.touchEventManager = new TouchEventManager();
    this.isInitialized = false;
  }

  // 뒤로가기 스와이프 처리
  handleBackSwipe() {
    const currentTime = Date.now();
    
    // 첫 번째 스와이프
    if (this.backPressCount === 0) {
      this.backPressCount = 1;
      this.lastBackPressTime = currentTime;
      
      const result = this.strategy.execute();
      
      if (result.shouldExit) {
        this.notificationManager.show(result.message);
      }
      
      // 타이머 설정
      this.backPressTimer = setTimeout(() => {
        this.resetBackPressCount();
      }, BACK_BUTTON_CONFIG.DOUBLE_PRESS_DELAY);
      
      return;
    }
    
    // 두 번째 스와이프 (시간 내에)
    if (this.backPressCount === 1 && (currentTime - this.lastBackPressTime) <= BACK_BUTTON_CONFIG.DOUBLE_PRESS_DELAY) {
      this.resetBackPressCount();
      this.handleAppExit();
    }
  }

  // 앱 종료 처리
  handleAppExit() {
    if (confirm('정말로 앱을 종료하시겠습니까?')) {
      if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.close();
        }
      } else {
        window.close();
      }
    }
  }

  // 뒤로가기 카운트 리셋
  resetBackPressCount() {
    this.backPressCount = 0;
    if (this.backPressTimer) {
      clearTimeout(this.backPressTimer);
      this.backPressTimer = null;
    }
    this.notificationManager.hide();
  }

  // 브라우저 뒤로가기 버튼 처리
  handlePopState(event) {
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      event.preventDefault();
      
      if (window.location.pathname === '/' || window.location.pathname === '/login') {
        this.handleBackSwipe();
      }
    }
  }

  // beforeunload 이벤트 처리
  handleBeforeUnload(event) {
    if (window.location.pathname === '/login' || window.location.pathname === '/') {
      event.preventDefault();
      event.returnValue = '변경사항이 저장되지 않을 수 있습니다. 정말 나가시겠습니까?';
      return event.returnValue;
    }
  }

  // 터치 이벤트 핸들러
  handleTouchStart = (event) => {
    this.touchEventManager.handleTouchStart(event);
  };

  handleTouchEnd = (event) => {
    const result = this.touchEventManager.handleTouchEnd(event);
    if (result.isBackSwipe) {
      this.handleBackSwipe();
    }
  };

  // 이벤트 리스너 등록
  initialize() {
    if (this.isInitialized) {
      console.warn('BackButtonHandler is already initialized');
      return;
    }

    document.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    document.addEventListener('touchend', this.handleTouchEnd, { passive: true });
    window.addEventListener('popstate', this.handlePopState.bind(this));
    window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));

    // PWA 환경에서 초기 상태 설정
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      window.history.pushState(null, '', window.location.pathname);
    }

    this.isInitialized = true;
    console.log('EnhancedBackButtonHandler initialized successfully');
  }

  // 정리 함수
  cleanup() {
    if (!this.isInitialized) {
      return;
    }

    document.removeEventListener('touchstart', this.handleTouchStart);
    document.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('popstate', this.handlePopState.bind(this));
    window.removeEventListener('beforeunload', this.handleBeforeUnload.bind(this));
    
    if (this.backPressTimer) {
      clearTimeout(this.backPressTimer);
    }
    
    this.notificationManager.hide();
    this.isInitialized = false;
    
    console.log('EnhancedBackButtonHandler cleaned up successfully');
  }
}

// 싱글톤 인스턴스
let backButtonHandlerInstance = null;

// 메인 함수 - 기존 API와 호환성 유지
export const setupStrictBackButtonHandler = () => {
  if (backButtonHandlerInstance) {
    backButtonHandlerInstance.cleanup();
  }
  
  backButtonHandlerInstance = new EnhancedBackButtonHandler();
  backButtonHandlerInstance.initialize();
  
  return () => {
    if (backButtonHandlerInstance) {
      backButtonHandlerInstance.cleanup();
      backButtonHandlerInstance = null;
    }
  };
};

// 추가 유틸리티 함수들
export const BackButtonUtils = {
  // 현재 핸들러 상태 확인
  getHandlerStatus: () => {
    return backButtonHandlerInstance ? backButtonHandlerInstance.isInitialized : false;
  },
  
  // 강제로 뒤로가기 실행
  forceBack: () => {
    if (backButtonHandlerInstance) {
      backButtonHandlerInstance.handleBackSwipe();
    }
  },
  
  // 알림 메시지 표시
  showNotification: (message, duration) => {
    if (backButtonHandlerInstance) {
      backButtonHandlerInstance.notificationManager.show(message, duration);
    }
  }
}; 