import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './tailwind.css'

console.log('🚀 main.jsx 파일이 로드되었습니다!');
console.log('📍 현재 환경:', import.meta.env.MODE);
console.log('📍 현재 URL:', window.location.href);

// 전역 오류 핸들러 설정
window.addEventListener('error', (event) => {
  console.error('🔥 전역 오류 발생:', event.error);
  console.error('🔥 오류 위치:', event.filename, ':', event.lineno);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 처리되지 않은 Promise 오류:', event.reason);
});

// 즉시 렌더링 시도
try {
  const rootElement = document.getElementById('root');
  console.log('📍 Root element:', rootElement);
  
  if (!rootElement) {
    console.error('❌ Root element를 찾을 수 없습니다!');
    document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">ERROR: Root element not found!</h1>';
    throw new Error('Root element not found');
  }
  
  console.log('✅ Root element 찾음, React 앱 렌더링 시작');
  
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ ReactDOM.createRoot 완료');
  
  root.render(<App />);
  console.log('🎉 React 앱 렌더링 완료');
  
} catch (error) {
  console.error('❌ React 앱 렌더링 중 오류 발생:', error);
  document.body.innerHTML = `
    <h1 style="color: red; text-align: center; margin-top: 50px;">
      ERROR: React App Failed to Load
    </h1>
    <p style="text-align: center; color: #666;">
      ${error.message}
    </p>
    <p style="text-align: center; color: #999; font-size: 12px;">
      Stack: ${error.stack}
    </p>
  `;
} 