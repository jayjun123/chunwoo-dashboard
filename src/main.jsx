console.log('🚀 main.jsx 파일이 로드되었습니다!');

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('🚀 main.jsx 로딩 시작');

try {
  console.log('📍 DOM이 준비되었는지 확인...');
  console.log('📍 document.readyState:', document.readyState);
  
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
  `;
} 