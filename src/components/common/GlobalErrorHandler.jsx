import { useEffect } from 'react';
import { useLoading } from './LoadingProvider';

const GlobalErrorHandler = () => {
  const { showLoading, hideLoading } = useLoading();

  useEffect(() => {
    // Console 오버라이드로 Chrome Extension 오류 숨기기
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Chrome Extension 관련 오류 필터링
      if (message.includes('runtime.lastError') || 
          message.includes('message channel closed') ||
          message.includes('A listener indicated an asynchronous response') ||
          message.includes('extension port') ||
          message.includes('back/forward cache') ||
          message.includes('Unchecked runtime.lastError') ||
          message.includes('but the message channel closed before a response was received') ||
          // DOM 관련 에러 필터링 추가
          message.includes('removeChild') ||
          message.includes('The node to be removed is not a child of this node') ||
          message.includes('Failed to execute \'removeChild\' on \'Node\'') ||
          message.includes('appendChild') ||
          message.includes('insertBefore')) {
        return; // 이런 오류들은 콘솔에 출력하지 않음
      }
      
      // 나머지 오류들은 정상적으로 출력
      originalConsoleError.apply(console, args);
    };

    // 전역 에러 핸들러
    const handleGlobalError = (event) => {
      // Chrome 확장 프로그램 관련 오류 무시
      if (event.error && event.error.message && 
          (event.error.message.includes('message channel closed') ||
           event.error.message.includes('extension port') ||
           event.error.message.includes('runtime.lastError') ||
           event.error.message.includes('back/forward cache') ||
           event.error.message.includes('The page keeping the extension port') ||
           event.error.message.includes('so the message channel is closed') ||
           event.error.message.includes('A listener indicated an asynchronous response') ||
           // DOM 관련 에러 무시 추가
           event.error.message.includes('removeChild') ||
           event.error.message.includes('The node to be removed is not a child of this node') ||
           event.error.message.includes('Failed to execute \'removeChild\' on \'Node\'') ||
           event.error.message.includes('appendChild') ||
           event.error.message.includes('insertBefore'))) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // 네트워크 오류 처리
      if (event.error && event.error.name === 'NetworkError') {
        console.error('네트워크 오류 발생:', event.error);
        showLoading('네트워크 연결을 확인하고 있습니다...', 'spinner');
        setTimeout(() => {
          hideLoading();
          if (confirm('네트워크 오류가 발생했습니다. 페이지를 새로고침하시겠습니까?')) {
            window.location.reload();
          }
        }, 2000);
        event.preventDefault();
        return;
      }

      // Firebase 관련 오류 처리
      if (event.error && event.error.code && event.error.code.startsWith('auth/')) {
        console.error('인증 오류 발생:', event.error);
        showLoading('인증 상태를 확인하고 있습니다...', 'spinner');
        setTimeout(() => {
          hideLoading();
          if (confirm('인증 오류가 발생했습니다. 다시 로그인하시겠습니까?')) {
            window.location.href = '/login';
          }
        }, 2000);
        event.preventDefault();
        return;
      }

      // 일반적인 JavaScript 오류
      console.error('전역 오류 발생:', event.error);
      
      // 사용자에게 오류 알림
      if (event.error && event.error.message) {
        showLoading('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'spinner');
        setTimeout(() => {
          hideLoading();
        }, 3000);
      }
    };

    // 처리되지 않은 Promise 거부 처리
    const handleUnhandledRejection = (event) => {
      console.error('처리되지 않은 Promise 거부:', event.reason);
      
      // 네트워크 오류인 경우
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('fetch') || 
           event.reason.message.includes('network') ||
           event.reason.message.includes('Failed to fetch'))) {
        showLoading('네트워크 연결을 확인하고 있습니다...', 'spinner');
        setTimeout(() => {
          hideLoading();
          if (confirm('네트워크 오류가 발생했습니다. 페이지를 새로고침하시겠습니까?')) {
            window.location.reload();
          }
        }, 2000);
        event.preventDefault();
        return;
      }

      // Firebase 오류인 경우
      if (event.reason && event.reason.code) {
        showLoading('서비스 연결을 확인하고 있습니다...', 'spinner');
        setTimeout(() => {
          hideLoading();
        }, 2000);
        event.preventDefault();
        return;
      }

      // 일반적인 Promise 오류
      showLoading('오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'spinner');
      setTimeout(() => {
        hideLoading();
      }, 3000);
    };

    // 페이지 표시/숨김 이벤트 처리
    const handlePageShow = (event) => {
      if (event.persisted) {
        console.log('페이지가 back/forward cache에서 복원됨');
        // 캐시에서 복원된 경우 데이터 새로고침
        showLoading('데이터를 새로고침하고 있습니다...', 'spinner');
        setTimeout(() => {
          hideLoading();
          window.location.reload();
        }, 1000);
      }
    };

    const handlePageHide = (event) => {
      if (event.persisted) {
        console.log('페이지가 back/forward cache에 저장됨');
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('pagehide', handlePageHide);

    // 오프라인/온라인 상태 처리
    const handleOffline = () => {
      console.log('오프라인 상태 감지');
      showLoading('오프라인 상태입니다. 네트워크 연결을 확인해주세요.', 'spinner');
      setTimeout(() => {
        hideLoading();
      }, 3000);
    };

    const handleOnline = () => {
      console.log('온라인 상태 복귀');
      showLoading('온라인 상태로 복귀했습니다. 데이터를 동기화하고 있습니다...', 'spinner');
      setTimeout(() => {
        hideLoading();
        // 데이터 새로고침
        window.location.reload();
      }, 2000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      // console.error 원상복구
      console.error = originalConsoleError;
      
      // 이벤트 리스너 제거
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [showLoading, hideLoading]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

export default GlobalErrorHandler; 