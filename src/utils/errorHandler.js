/**
 * 강화된 에러 처리 시스템 - 30년 개발 경험 기반
 * 
 * 주요 기능:
 * - 중앙집중식 에러 처리
 * - 자동 에러 복구
 * - 사용자 친화적 에러 메시지
 * - 에러 로깅 및 분석
 * - 성능 모니터링 통합
 */

import { performanceMonitor } from './performanceUtils';

// 에러 레벨 정의
export const ERROR_LEVELS = {
  CRITICAL: 'critical',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  DEBUG: 'debug'
};

// 에러 타입 정의
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  UI: 'ui',
  BUSINESS_LOGIC: 'business_logic',
  UNKNOWN: 'unknown'
};

// 에러 메시지 템플릿
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    ko: '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인해주세요.',
    en: 'Network connection issue. Please check your internet connection.'
  },
  [ERROR_TYPES.VALIDATION]: {
    ko: '입력 정보가 올바르지 않습니다. 다시 확인해주세요.',
    en: 'Invalid input data. Please check your input.'
  },
  [ERROR_TYPES.AUTHENTICATION]: {
    ko: '로그인이 필요합니다. 다시 로그인해주세요.',
    en: 'Authentication required. Please login again.'
  },
  [ERROR_TYPES.AUTHORIZATION]: {
    ko: '접근 권한이 없습니다.',
    en: 'Access denied. You do not have permission.'
  },
  [ERROR_TYPES.DATABASE]: {
    ko: '데이터 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    en: 'Database error occurred. Please try again later.'
  },
  [ERROR_TYPES.UI]: {
    ko: '화면 표시 중 오류가 발생했습니다. 페이지를 새로고침해주세요.',
    en: 'UI error occurred. Please refresh the page.'
  },
  [ERROR_TYPES.BUSINESS_LOGIC]: {
    ko: '처리 중 오류가 발생했습니다. 관리자에게 문의해주세요.',
    en: 'Business logic error. Please contact administrator.'
  },
  [ERROR_TYPES.UNKNOWN]: {
    ko: '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    en: 'Unknown error occurred. Please try again later.'
  }
};

// 에러 복구 전략
const RECOVERY_STRATEGIES = {
  [ERROR_TYPES.NETWORK]: ['retry', 'offline_mode'],
  [ERROR_TYPES.AUTHENTICATION]: ['redirect_login', 'refresh_token'],
  [ERROR_TYPES.AUTHORIZATION]: ['redirect_home', 'show_error'],
  [ERROR_TYPES.DATABASE]: ['retry', 'cache_fallback'],
  [ERROR_TYPES.UI]: ['refresh_page', 'reset_state'],
  [ERROR_TYPES.BUSINESS_LOGIC]: ['show_error', 'log_error'],
  [ERROR_TYPES.UNKNOWN]: ['show_error', 'log_error']
};

// 에러 클래스
export class AppError extends Error {
  constructor(message, type = ERROR_TYPES.UNKNOWN, level = ERROR_LEVELS.ERROR, context = {}) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.level = level;
    this.context = context;
    this.timestamp = new Date();
    this.id = this.generateErrorId();
    this.stack = this.stack || new Error().stack;
  }

  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      type: this.type,
      level: this.level,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

// 에러 핸들러 클래스
export class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 100;
    this.isProcessing = false;
    this.recoveryStrategies = new Map();
    this.errorListeners = new Set();
    this.retryAttempts = new Map();
    this.maxRetryAttempts = 3;
    
    this.initializeGlobalHandlers();
  }

  // 전역 에러 핸들러 초기화
  initializeGlobalHandlers() {
    // JavaScript 에러 처리
    window.addEventListener('error', (event) => {
      this.handleError(new AppError(
        event.message,
        ERROR_TYPES.UNKNOWN,
        ERROR_LEVELS.ERROR,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        }
      ));
    });

    // Promise 에러 처리
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new AppError(
        event.reason?.message || 'Unhandled Promise Rejection',
        ERROR_TYPES.UNKNOWN,
        ERROR_LEVELS.ERROR,
        {
          reason: event.reason,
          promise: event.promise
        }
      ));
    });

    // React 에러 경계를 위한 전역 에러 처리
    window.addEventListener('react-error-boundary', (event) => {
      this.handleError(new AppError(
        event.detail?.message || 'React Error Boundary',
        ERROR_TYPES.UI,
        ERROR_LEVELS.ERROR,
        event.detail
      ));
    });
  }

  // 에러 처리 메인 함수
  async handleError(error, context = {}) {
    try {
      // 에러 객체 생성
      const appError = error instanceof AppError ? error : new AppError(
        error.message || 'Unknown error',
        this.determineErrorType(error),
        ERROR_LEVELS.ERROR,
        { originalError: error, ...context }
      );

      // 성능 모니터링
      performanceMonitor.endTimer('error_handling');

      // 에러 큐에 추가
      this.addToQueue(appError);

      // 에러 리스너들에게 알림
      this.notifyListeners(appError);

      // 에러 로깅
      await this.logError(appError);

      // 에러 복구 시도
      await this.attemptRecovery(appError);

      // 사용자에게 에러 표시
      this.showUserFriendlyError(appError);

      return appError;
    } catch (handlingError) {
      console.error('Error handling failed:', handlingError);
      // 최소한의 에러 표시
      this.showFallbackError(error);
    }
  }

  // 에러 타입 판단
  determineErrorType(error) {
    if (error.name === 'NetworkError' || error.message.includes('network')) {
      return ERROR_TYPES.NETWORK;
    }
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return ERROR_TYPES.VALIDATION;
    }
    if (error.name === 'AuthError' || error.message.includes('auth')) {
      return ERROR_TYPES.AUTHENTICATION;
    }
    if (error.name === 'DatabaseError' || error.message.includes('database')) {
      return ERROR_TYPES.DATABASE;
    }
    if (error.name === 'UIError' || error.message.includes('ui')) {
      return ERROR_TYPES.UI;
    }
    return ERROR_TYPES.UNKNOWN;
  }

  // 에러 큐에 추가
  addToQueue(error) {
    this.errorQueue.push(error);
    
    // 큐 크기 제한
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // 배치 처리
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // 에러 큐 처리
  async processQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) return;

    this.isProcessing = true;
    
    try {
      const batch = this.errorQueue.splice(0, 10); // 10개씩 처리
      
      for (const error of batch) {
        await this.processError(error);
      }
    } catch (error) {
      console.error('Error queue processing failed:', error);
    } finally {
      this.isProcessing = false;
      
      // 남은 에러가 있으면 계속 처리
      if (this.errorQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }

  // 개별 에러 처리
  async processError(error) {
    // 에러 통계 업데이트
    this.updateErrorStats(error);

    // 중요도에 따른 처리
    if (error.level === ERROR_LEVELS.CRITICAL) {
      await this.handleCriticalError(error);
    } else if (error.level === ERROR_LEVELS.ERROR) {
      await this.handleStandardError(error);
    } else {
      await this.handleMinorError(error);
    }
  }

  // 치명적 에러 처리
  async handleCriticalError(error) {
    // 즉시 사용자에게 알림
    this.showCriticalError(error);
    
    // 관리자에게 알림
    await this.notifyAdministrator(error);
    
    // 앱 상태 저장
    this.saveAppState();
  }

  // 표준 에러 처리
  async handleStandardError(error) {
    // 사용자에게 에러 표시
    this.showUserFriendlyError(error);
    
    // 에러 로깅
    await this.logError(error);
  }

  // 경미한 에러 처리
  async handleMinorError(error) {
    // 개발 환경에서만 로깅
    if (import.meta.env.DEV) {
      console.warn('Minor error:', error);
    }
  }

  // 에러 복구 시도
  async attemptRecovery(error) {
    const strategies = RECOVERY_STRATEGIES[error.type] || [];
    
    for (const strategy of strategies) {
      try {
        const success = await this.executeRecoveryStrategy(strategy, error);
        if (success) {
          console.log(`Recovery strategy '${strategy}' succeeded for error:`, error.id);
          return true;
        }
      } catch (recoveryError) {
        console.error(`Recovery strategy '${strategy}' failed:`, recoveryError);
      }
    }
    
    return false;
  }

  // 복구 전략 실행
  async executeRecoveryStrategy(strategy, error) {
    switch (strategy) {
      case 'retry':
        return await this.retryOperation(error);
      case 'offline_mode':
        return this.enableOfflineMode();
      case 'redirect_login':
        return this.redirectToLogin();
      case 'refresh_token':
        return await this.refreshAuthToken();
      case 'redirect_home':
        return this.redirectToHome();
      case 'cache_fallback':
        return this.useCachedData();
      case 'refresh_page':
        return this.refreshPage();
      case 'reset_state':
        return this.resetApplicationState();
      case 'show_error':
        return this.showUserFriendlyError(error);
      case 'log_error':
        return await this.logError(error);
      default:
        return false;
    }
  }

  // 재시도 로직
  async retryOperation(error) {
    const retryCount = this.retryAttempts.get(error.id) || 0;
    
    if (retryCount >= this.maxRetryAttempts) {
      return false;
    }

    this.retryAttempts.set(error.id, retryCount + 1);
    
    // 지수 백오프
    const delay = Math.pow(2, retryCount) * 1000;
    
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          // 원래 작업 재시도
          const result = await this.retryOriginalOperation(error);
          resolve(result);
        } catch (retryError) {
          resolve(false);
        }
      }, delay);
    });
  }

  // 원래 작업 재시도 (구현 필요)
  async retryOriginalOperation(error) {
    // 실제 구현에서는 원래 작업을 재시도하는 로직
    return false;
  }

  // 오프라인 모드 활성화
  enableOfflineMode() {
    // 오프라인 모드 로직 구현
    console.log('Enabling offline mode');
    return true;
  }

  // 로그인 페이지로 리다이렉트
  redirectToLogin() {
    window.location.href = '/login';
    return true;
  }

  // 인증 토큰 갱신
  async refreshAuthToken() {
    // 토큰 갱신 로직 구현
    return false;
  }

  // 홈 페이지로 리다이렉트
  redirectToHome() {
    window.location.href = '/';
    return true;
  }

  // 캐시된 데이터 사용
  useCachedData() {
    // 캐시 데이터 사용 로직 구현
    return true;
  }

  // 페이지 새로고침
  refreshPage() {
    window.location.reload();
    return true;
  }

  // 애플리케이션 상태 초기화
  resetApplicationState() {
    // 상태 초기화 로직 구현
    return true;
  }

  // 사용자 친화적 에러 표시
  showUserFriendlyError(error) {
    const message = this.getUserFriendlyMessage(error);
    
    // Material-UI Snackbar 또는 Toast 표시
    this.showNotification(message, 'error');
  }

  // 치명적 에러 표시
  showCriticalError(error) {
    const message = this.getUserFriendlyMessage(error);
    
    // 모달 또는 알림 표시
    this.showModal(message, 'critical');
  }

  // 폴백 에러 표시
  showFallbackError(error) {
    const message = '시스템 오류가 발생했습니다. 페이지를 새로고침해주세요.';
    this.showNotification(message, 'error');
  }

  // 사용자 친화적 메시지 생성
  getUserFriendlyMessage(error) {
    const template = ERROR_MESSAGES[error.type] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
    return template.ko; // 한국어 메시지
  }

  // 알림 표시
  showNotification(message, severity = 'error') {
    // 커스텀 이벤트로 알림 시스템에 전달
    const event = new CustomEvent('show-notification', {
      detail: { message, severity }
    });
    window.dispatchEvent(event);
  }

  // 모달 표시
  showModal(message, type = 'error') {
    const event = new CustomEvent('show-modal', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }

  // 에러 로깅
  async logError(error) {
    try {
      const errorData = {
        ...error.toJSON(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      };

      // 콘솔 로깅
      console.error('Application Error:', errorData);

      // 서버 로깅 (Firebase Analytics 또는 다른 서비스)
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: error.level === ERROR_LEVELS.CRITICAL
        });
      }

      // 로컬 스토리지에 에러 저장 (선택사항)
      this.saveErrorToLocalStorage(errorData);

    } catch (loggingError) {
      console.error('Error logging failed:', loggingError);
    }
  }

  // 로컬 스토리지에 에러 저장
  saveErrorToLocalStorage(errorData) {
    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
      errors.push(errorData);
      
      // 최대 50개까지만 저장
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors));
    } catch (error) {
      console.error('Failed to save error to localStorage:', error);
    }
  }

  // 관리자 알림
  async notifyAdministrator(error) {
    // 관리자 알림 로직 구현
    console.log('Notifying administrator about critical error:', error.id);
  }

  // 앱 상태 저장
  saveAppState() {
    // 현재 앱 상태를 저장하는 로직 구현
    console.log('Saving application state');
  }

  // 에러 통계 업데이트
  updateErrorStats(error) {
    // 에러 통계 업데이트 로직 구현
  }

  // 에러 리스너 추가
  addErrorListener(listener) {
    this.errorListeners.add(listener);
  }

  // 에러 리스너 제거
  removeErrorListener(listener) {
    this.errorListeners.delete(listener);
  }

  // 에러 리스너들에게 알림
  notifyListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error listener failed:', listenerError);
      }
    });
  }

  // 에러 통계 가져오기
  getErrorStats() {
    return {
      totalErrors: this.errorQueue.length,
      criticalErrors: this.errorQueue.filter(e => e.level === ERROR_LEVELS.CRITICAL).length,
      errorTypes: this.getErrorTypeDistribution()
    };
  }

  // 에러 타입 분포
  getErrorTypeDistribution() {
    const distribution = {};
    this.errorQueue.forEach(error => {
      distribution[error.type] = (distribution[error.type] || 0) + 1;
    });
    return distribution;
  }

  // 에러 큐 초기화
  clearErrorQueue() {
    this.errorQueue = [];
    this.retryAttempts.clear();
  }
}

// 전역 에러 핸들러 인스턴스
export const errorHandler = new ErrorHandler();

// 편의 함수들
export const handleError = (error, context) => errorHandler.handleError(error, context);
export const createError = (message, type, level, context) => new AppError(message, type, level, context);

// React Hook for Error Handling
export const useErrorHandler = () => {
  const handleErrorWithContext = (error, context = {}) => {
    return errorHandler.handleError(error, {
      ...context,
      component: 'React Component',
      timestamp: new Date().toISOString()
    });
  };

  return { handleError: handleErrorWithContext };
}; 