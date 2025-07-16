import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Capacitor 로딩 대기 및 에러 핸들링
const initializeApp = async () => {
  try {
    // Capacitor 환경인지 확인
    if (window.Capacitor) {
      const { Capacitor } = await import('@capacitor/core');
      
      // 플랫폼이 준비될 때까지 대기
      if (Capacitor.isNativePlatform()) {
        await new Promise(resolve => {
          document.addEventListener('deviceready', resolve, false);
          // 타임아웃으로 무한 대기 방지
          setTimeout(resolve, 3000);
        });
      }
    }

    // React 앱 렌더링
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );

  } catch (error) {
    console.error('앱 초기화 에러:', error);
    
    // 에러 발생 시 기본 렌더링 시도
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2>천우 건설현장관리시스템</h2>
          <p>앱을 로딩 중입니다...</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            잠시 후 다시 시도하거나 앱을 재시작해주세요.
          </p>
        </div>
      </React.StrictMode>
    );
    
    // 3초 후 다시 시도
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
};

// 앱 초기화 시작
initializeApp(); 