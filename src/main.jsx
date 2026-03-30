import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './tailwind.css'
import { CHLOAD_KEY } from './utils/lazyWithRetry'

console.log('🚀 main.jsx 파일이 로드되었습니다!');
console.log('📍 현재 환경:', import.meta.env.MODE);
console.log('📍 현재 URL:', window.location.href);

// 전역 오류 핸들러 설정
window.addEventListener('error', (event) => {
  console.error('🔥 전역 오류 발생:', event.error);
  console.error('🔥 오류 위치:', event.filename, ':', event.lineno);

  try {
    const msg = String(event?.message || '');
    const err = event?.error;
    const errMsg = String(err?.message || '');
    const isChunkLoadFail =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.toLowerCase().includes('dynamically imported module') ||
      errMsg.includes('Failed to fetch dynamically imported module') ||
      errMsg.toLowerCase().includes('dynamically imported module') ||
      String(err?.name || '') === 'ChunkLoadError';

    if (isChunkLoadFail && !sessionStorage.getItem(CHLOAD_KEY)) {
      sessionStorage.setItem(CHLOAD_KEY, '1');
      window.location.reload();
    }
  } catch {
    // ignore
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 처리되지 않은 Promise 오류:', event.reason);

  try {
    const reason = event?.reason;
    const msg = String(reason?.message || '');
    const isChunkLoadFail =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.toLowerCase().includes('dynamically imported module') ||
      String(reason?.name || '') === 'ChunkLoadError';

    if (isChunkLoadFail && !sessionStorage.getItem(CHLOAD_KEY)) {
      sessionStorage.setItem(CHLOAD_KEY, '1');
      window.location.reload();
    }
  } catch {
    // ignore
  }
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