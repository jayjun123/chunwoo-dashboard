import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const StatusBarManager = () => {
  const location = useLocation();
  const { currentUser } = useAuth();

  useEffect(() => {
    const updateStatusBar = () => {
      // Capacitor StatusBar 플러그인이 있는지 확인
      if (window.StatusBar) {
        try {
          // 현재 페이지에 따라 상태바 스타일 조정
          if (location.pathname === '/login') {
            // 로그인 페이지: 밝은 배경에 어두운 텍스트
            window.StatusBar.setStyle({ style: 'dark' });
            window.StatusBar.setBackgroundColor({ color: '#ffffff' });
          } else if (location.pathname === '/') {
            // 메인 대시보드: 어두운 배경에 밝은 텍스트
            window.StatusBar.setStyle({ style: 'light' });
            window.StatusBar.setBackgroundColor({ color: '#181A20' });
          } else {
            // 다른 페이지들: 기본 어두운 테마
            window.StatusBar.setStyle({ style: 'light' });
            window.StatusBar.setBackgroundColor({ color: '#232634' });
          }

          // 상태바 표시
          window.StatusBar.show();
        } catch (error) {
          console.log('StatusBar 플러그인 사용 불가:', error);
        }
      }
    };

    // 페이지 변경 시 상태바 업데이트
    updateStatusBar();

    // 화면 방향 변경 시에도 상태바 업데이트
    const handleOrientationChange = () => {
      setTimeout(updateStatusBar, 100);
    };

    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [location.pathname, currentUser]);

  // 웹 환경에서도 상태바 스타일 적용
  useEffect(() => {
    const updateWebStatusBar = () => {
      // PWA 환경에서 상태바 영역 스타일링
      const statusBarHeight = 'env(safe-area-inset-top)';
      
      // 메타 태그로 상태바 색상 설정 (iOS Safari)
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.name = 'theme-color';
        document.head.appendChild(metaThemeColor);
      }

      // 페이지에 따라 테마 색상 설정
      if (location.pathname === '/login') {
        metaThemeColor.content = '#ffffff';
        document.documentElement.style.setProperty('--status-bar-color', '#ffffff');
      } else {
        metaThemeColor.content = '#181A20';
        document.documentElement.style.setProperty('--status-bar-color', '#181A20');
      }

      // 상태바 높이 설정
      document.documentElement.style.setProperty('--status-bar-height', statusBarHeight);
    };

    updateWebStatusBar();
  }, [location.pathname]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

export default StatusBarManager; 