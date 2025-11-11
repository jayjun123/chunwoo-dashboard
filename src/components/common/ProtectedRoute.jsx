import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SplashScreen from './SplashScreen';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  
  console.log('🛡️ ProtectedRoute 렌더링:', { currentUser, loading, showSplash });
  
  if (loading || showSplash) {
    console.log('⏳ ProtectedRoute - 로딩 중 또는 스플래시 표시 중');
    return (
      <SplashScreen 
        onComplete={() => {
          console.log('✅ 스플래시 화면 완료');
          setShowSplash(false);
        }} 
      />
    );
  }
  
  // 로그인하지 않은 경우 로그인 화면 표시
  if (!currentUser) {
    console.log('🚫 ProtectedRoute - 로그인 필요, 로그인 페이지로 이동');
    return <Navigate to="/auth" replace />;
  }
  
  console.log('✅ ProtectedRoute - 로그인 완료, 메인 페이지로 이동');
  return children;
};

export default ProtectedRoute;



