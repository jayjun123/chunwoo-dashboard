import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 차트 라이브러리들의 안전한 초기화
const initializeChartLibraries = async () => {
  try {
    // Chart.js 초기화 (ImportantSite.jsx에서 사용)
    if (typeof window !== 'undefined') {
      const { Chart } = await import('chart.js');
      if (Chart && Chart.register) {
        console.log('Chart.js 초기화 완료');
      }
    }
  } catch (error) {
    console.warn('차트 라이브러리 초기화 중 경고:', error);
  }
};

// 앱 초기화
const initializeApp = async () => {
  // 차트 라이브러리 초기화
  await initializeChartLibraries();
  
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
};

// DOM 준비 후 앱 시작
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
} 