import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const BackButtonHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    const handleBackButton = (event) => {
      // 로그인 페이지에서 뒤로가기 시 앱 종료 확인
      if (location.pathname === '/login') {
        event.preventDefault();
        if (window.confirm('앱을 종료하시겠습니까?')) {
          // PWA 환경에서는 window.close()가 작동하지 않을 수 있음
          if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
            // iOS에서는 history.back()을 사용
            if (window.history.length > 1) {
              window.history.back();
            } else {
              // 앱 종료 시도
              window.close();
            }
          } else {
            window.close();
          }
        }
        return;
      }

      // 메인 대시보드에서 뒤로가기 시 앱 종료 확인
      if (location.pathname === '/') {
        event.preventDefault();
        if (window.confirm('앱을 종료하시겠습니까?')) {
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
        return;
      }

      // 다른 페이지에서는 정상적인 뒤로가기 허용
      // (React Router가 처리)
    };

    // beforeunload 이벤트 처리 (페이지 새로고침/종료 시)
    const handleBeforeUnload = (event) => {
      // 로그인 페이지나 메인 페이지에서만 확인
      if (location.pathname === '/login' || location.pathname === '/') {
        event.preventDefault();
        event.returnValue = '변경사항이 저장되지 않을 수 있습니다. 정말 나가시겠습니까?';
        return event.returnValue;
      }
    };

    // popstate 이벤트 처리 (브라우저 뒤로가기/앞으로가기)
    const handlePopState = (event) => {
      // PWA 환경에서만 특별 처리
      if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
        if (location.pathname === '/login' || location.pathname === '/') {
          event.preventDefault();
          if (window.confirm('앱을 종료하시겠습니까?')) {
            window.close();
          } else {
            // 현재 페이지에 머무름
            window.history.pushState(null, '', location.pathname);
          }
        }
      }
    };

    // 이벤트 리스너 등록
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // 초기 상태 설정 (뒤로가기 방지)
    if (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches) {
      window.history.pushState(null, '', location.pathname);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [location.pathname, navigate]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

export default BackButtonHandler; 