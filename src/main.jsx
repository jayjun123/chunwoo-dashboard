import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 환경별 초기화
const renderApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('루트 엘리먼트를 찾을 수 없습니다.');
    setTimeout(renderApp, 100); // 100ms 후 재시도
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    
    // 프로덕션 환경에서는 Suspense 추가
    if (import.meta.env.PROD) {
      root.render(
        <React.StrictMode>
          <React.Suspense fallback={
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100vh',
              flexDirection: 'column',
              fontFamily: 'Arial, sans-serif'
            }}>
              <h2>천우 건설현장관리시스템</h2>
              <p>로딩 중...</p>
            </div>
          }>
            <App />
          </React.Suspense>
        </React.StrictMode>
      );
    } else {
      // 개발환경에서는 단순하게
      root.render(
        <React.StrictMode>
          <App />
        </React.StrictMode>
      );
    }
  } catch (error) {
    console.error('앱 렌더링 에러:', error);
    // 에러 시 기본 UI
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
        <h2>천우 건설현장관리시스템</h2>
        <p>앱을 로딩 중입니다...</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 20px; font-size: 14px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">새로고침</button>
      </div>
    `;
  }
};

// 초기화 함수
const initialize = () => {
  console.log('환경:', import.meta.env.MODE);
  
  // Capacitor 환경 감지
  if (window.Capacitor) {
    // Capacitor 환경에서는 deviceready 이벤트 대기
    console.log('Capacitor 환경 감지됨');
    document.addEventListener('deviceready', renderApp, false);
    // 5초 후에도 deviceready가 안 오면 강제 실행
    setTimeout(renderApp, 5000);
  } else {
    // 웹 환경
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderApp);
    } else {
      renderApp();
    }
  }
};

// 즉시 초기화 시작
initialize(); 