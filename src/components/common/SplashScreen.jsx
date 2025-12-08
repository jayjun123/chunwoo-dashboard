import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { devLog } from '../../utils/performanceUtils';

const SplashScreen = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('앱을 준비하고 있습니다...');
  const { currentUser, loading } = useAuth();

  devLog('SplashScreen 렌더링:', { progress, showContent, loading, currentUser });

  // PWA 환경 감지
  const isPWA = useCallback(() => {
    try {
      return window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || 
             window.navigator.standalone === true;
    } catch (error) {
      console.warn('PWA 환경 감지 실패:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    try {
      // 스플래시 화면 표시 시작
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 100);

      // 진행률 애니메이션 (PWA에서는 더 빠르게)
      const progressInterval = isPWA() ? 80 : 100;
      const progressStep = isPWA() ? 20 : 15;
      
      const progressTimer = setInterval(() => {
        setProgress((prevProgress) => {
          if (prevProgress >= 100) {
            clearInterval(progressTimer);
            return 100;
          }
          return prevProgress + progressStep;
        });
      }, progressInterval);

      // 로딩 메시지 변경
      const messageTimer = setTimeout(() => {
        setLoadingMessage('사용자 정보를 확인하고 있습니다...');
      }, 1000);

      // 최소 표시 시간 보장 (PWA에서는 더 짧게)
      const minDisplayTime = isPWA() ? 800 : 1000;
      const minDisplayTimer = setTimeout(() => {
        devLog('스플래시 최소 표시 시간 완료');
      }, minDisplayTime);

      return () => {
        clearTimeout(timer);
        clearInterval(progressTimer);
        clearTimeout(messageTimer);
        clearTimeout(minDisplayTimer);
      };
    } catch (error) {
      console.warn('SplashScreen 초기화 실패:', error);
      // 오류가 발생해도 기본 동작은 유지
      const timer = setTimeout(() => {
        setShowContent(true);
        setProgress(100);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isPWA]);

  useEffect(() => {
    // 인증 로딩이 완료되고 진행률이 100%에 도달하면 스플래시 종료
    devLog('스플래시 종료 조건 체크:', { loading, progress });
    if (!loading && progress >= 100) {
      devLog('스플래시 종료 실행');
      setLoadingMessage('준비 완료!');
      
      // PWA에서는 더 빠르게 전환
      const transitionDelay = isPWA() ? 200 : 300;
      const timer = setTimeout(() => {
        onComplete();
      }, transitionDelay);
      return () => clearTimeout(timer);
    }
  }, [loading, progress, onComplete, isPWA]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#181A20',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #181A20 0%, #232634 100%)',
        // PWA에서 상태바 영역 고려
        paddingTop: isPWA() ? 'env(safe-area-inset-top)' : 0,
        paddingBottom: isPWA() ? 'env(safe-area-inset-bottom)' : 0,
      }}
    >
      <Fade in={showContent} timeout={1000}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
          }}
        >
          {/* 로고 영역 */}
          <Box
            sx={{
              width: { xs: 100, sm: 120 },
              height: { xs: 100, sm: 120 },
              borderRadius: '50%',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: { xs: 3, sm: 4 },
              border: '2px solid rgba(25, 118, 210, 0.3)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  boxShadow: '0 0 0 0 rgba(25, 118, 210, 0.4)',
                },
                '70%': {
                  boxShadow: '0 0 0 10px rgba(25, 118, 210, 0)',
                },
                '100%': {
                  boxShadow: '0 0 0 0 rgba(25, 118, 210, 0)',
                },
              },
            }}
          >
            <img 
              src="/loding.png" 
              alt="로딩 이미지"
              width="100"
              height="100"
              style={{
                width: '80%',
                height: '80%',
                objectFit: 'contain'
              }}
            />
          </Box>

          {/* 앱 이름 */}
          <Typography
            variant="h4"
            sx={{
              color: '#fff',
              fontWeight: 600,
              mb: 1,
              fontSize: { xs: '1.3rem', sm: '1.5rem', md: '2rem' },
            }}
          >
            건설현장관리시스템
          </Typography>

          {/* 부제목 */}
          <Typography
            variant="body1"
            sx={{
              color: 'rgba(255, 255, 255, 0.7)',
              mb: { xs: 3, sm: 4 },
              fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' },
            }}
          >
            Construction Site Management System
          </Typography>

          {/* 로딩 스피너 */}
          <Box sx={{ position: 'relative', mb: 3 }}>
            <CircularProgress
              size={60}
              thickness={4}
              sx={{
                color: '#1976d2',
                width: { xs: 50, sm: 60 },
                height: { xs: 50, sm: 60 },
                '& .MuiCircularProgress-circle': {
                  strokeLinecap: 'round',
                },
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#1976d2',
                  fontWeight: 600,
                  fontSize: { xs: '0.7rem', sm: '0.75rem' },
                }}
              >
                {Math.round(progress)}%
              </Typography>
            </Box>
          </Box>

          {/* 로딩 메시지 */}
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              textAlign: 'center',
              maxWidth: 300,
              lineHeight: 1.5,
              minHeight: '1.5em',
              fontSize: { xs: '0.8rem', sm: '0.9rem' },
            }}
          >
            {loadingMessage}
          </Typography>

          {/* 진행률 바 */}
          <Box
            sx={{
              width: { xs: 180, sm: 200 },
              height: 4,
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: 2,
              mt: 3,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#1976d2',
                borderRadius: 2,
                transition: 'width 0.3s ease',
                background: 'linear-gradient(90deg, #1976d2 0%, #42a5f5 100%)',
              }}
            />
          </Box>

          {/* PWA 설치 안내 (PWA 환경에서만) */}
          {isPWA() && (
            <Typography
              variant="caption"
              sx={{
                color: 'rgba(255, 255, 255, 0.4)',
                mt: 2,
                fontSize: '0.7rem',
              }}
            >
              PWA 모드로 실행 중
            </Typography>
          )}
        </Box>
      </Fade>
    </Box>
  );
};

export default SplashScreen; 