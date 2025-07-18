import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

console.log('🚀 main.jsx 로딩 시작');

const rootElement = document.getElementById('root');
console.log('📍 Root element:', rootElement);

if (rootElement) {
  console.log('✅ Root element 찾음, React 앱 렌더링 시작');
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  console.log('🎉 React 앱 렌더링 완료');
} else {
  console.error('❌ Root element를 찾을 수 없습니다!');
  document.body.innerHTML = '<h1 style="color: red; text-align: center; margin-top: 50px;">ERROR: Root element not found!</h1>';
} 