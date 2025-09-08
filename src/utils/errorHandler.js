/**
 * 성능 최적화: 전역 에러 핸들러
 * 애플리케이션 전체의 에러를 중앙에서 관리
 */

class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandlers();
  }

  setupGlobalErrorHandlers() {
    // 전역 JavaScript 에러 처리
    window.addEventListener('error', (event) => {
      this.handleError('JavaScript Error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      });
    });

    // Promise rejection 에러 처리
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError('Unhandled Promise Rejection', event.reason, {
        promise: event.promise
      });
    });

    // React 에러 경계에서 처리되지 않은 에러
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason && event.reason.name === 'ChunkLoadError') {
        this.handleChunkLoadError(event.reason);
      }
    });
  }

  handleError(type, error, context = {}) {
    const errorInfo = {
      type,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      context
    };

    // 콘솔에 에러 로깅
    console.error(`[${type}]`, errorInfo);

    // 개발 모드에서만 상세 에러 표시
    if (process.env.NODE_ENV === 'development') {
      this.showErrorNotification(errorInfo);
    }

    // 프로덕션에서는 에러 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.logToService(errorInfo);
    }
  }

  handleChunkLoadError(error) {
    console.warn('Chunk load error detected, reloading page...', error);
    
    // 사용자에게 알림
    if (confirm('새로운 버전이 업데이트되었습니다. 페이지를 새로고침하시겠습니까?')) {
      window.location.reload();
    }
  }

  showErrorNotification(errorInfo) {
    // 개발 모드에서 에러 알림 표시
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      max-width: 400px;
      font-family: monospace;
      font-size: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">${errorInfo.type}</div>
      <div>${errorInfo.message}</div>
      <div style="margin-top: 8px; font-size: 10px; opacity: 0.8;">
        ${new Date().toLocaleTimeString()}
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 5초 후 자동 제거
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  logToService(errorInfo) {
    // 실제 프로덕션에서는 에러 로깅 서비스로 전송
    // 예: Sentry, LogRocket, Bugsnag 등
    try {
      // Firebase Analytics나 다른 로깅 서비스로 전송
      console.log('Error logged to service:', errorInfo);
    } catch (loggingError) {
      console.error('Failed to log error to service:', loggingError);
    }
  }

  // 사용자 정의 에러 처리 함수
  handleAsyncError(asyncFn, errorMessage = '작업 중 오류가 발생했습니다') {
    return async (...args) => {
      try {
        return await asyncFn(...args);
      } catch (error) {
        this.handleError('Async Error', error, {
          function: asyncFn.name,
          message: errorMessage,
          args: args.length
        });
        throw error;
      }
    };
  }

  // Firebase 에러 처리
  handleFirebaseError(error, context = {}) {
    let userMessage = '데이터 처리 중 오류가 발생했습니다.';
    
    switch (error.code) {
      case 'permission-denied':
        userMessage = '접근 권한이 없습니다.';
        break;
      case 'unavailable':
        userMessage = '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.';
        break;
      case 'not-found':
        userMessage = '요청한 데이터를 찾을 수 없습니다.';
        break;
      case 'already-exists':
        userMessage = '이미 존재하는 데이터입니다.';
        break;
      default:
        userMessage = error.message || userMessage;
    }

    this.handleError('Firebase Error', error, {
      code: error.code,
      context,
      userMessage
    });

    return userMessage;
  }
}

// 싱글톤 인스턴스 생성
const errorHandler = new ErrorHandler();

export default errorHandler;

// 편의 함수들
export const handleAsyncError = (asyncFn, errorMessage) => 
  errorHandler.handleAsyncError(asyncFn, errorMessage);

export const handleFirebaseError = (error, context) => 
  errorHandler.handleFirebaseError(error, context);