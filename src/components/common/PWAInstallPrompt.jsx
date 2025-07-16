import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '@mui/material';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [hasShownPrompt, setHasShownPrompt] = useState(false);
  
  const isMobile = useMediaQuery('(max-width:768px)');

  useEffect(() => {
    // 이미 프롬프트를 보여줬는지 확인
    const hasShown = localStorage.getItem('pwa-prompt-shown');
    if (hasShown) {
      setHasShownPrompt(true);
      return;
    }

    // PWA가 이미 설치되어 있는지 확인
    const checkIfPWAInstalled = () => {
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
        setIsPWAInstalled(true);
        return true;
      }
      return false;
    };

    // 이미 PWA로 실행 중이면 프롬프트 숨김
    if (checkIfPWAInstalled()) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // 모바일에서만 즉시 표시, 데스크톱에서는 3초 후 표시
      if (isMobile) {
        setShowInstallPrompt(true);
      } else {
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // PWA 설치 가능 여부 확인
    const checkInstallability = async () => {
      try {
        // Service Worker 등록 확인
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            console.log('Service Worker가 등록되어 있습니다');
          }
        }

        // Manifest 확인
        const manifestLink = document.querySelector('link[rel="manifest"]');
        if (manifestLink) {
          console.log('Manifest 파일이 있습니다');
        }
      } catch (error) {
        console.error('PWA 설치 가능성 확인 중 오류:', error);
      }
    };

    checkInstallability();

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // 수동 설치 안내 (모바일 최적화)
      if (isMobile) {
        const message = 'iOS Safari: 공유 버튼 → "홈 화면에 추가"\nAndroid Chrome: 메뉴 → "앱 설치"';
        alert(message);
      } else {
        alert('브라우저 주소창 옆의 설치 아이콘을 클릭하거나, 브라우저 메뉴에서 "앱 설치"를 선택해주세요.');
      }
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('사용자가 PWA 설치를 수락했습니다');
        // 설치 성공 시 프롬프트 숨김
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
      } else {
        console.log('사용자가 PWA 설치를 거부했습니다');
      }
    } catch (error) {
      console.error('PWA 설치 중 오류:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
    // 프롬프트를 보여줬다고 표시 (24시간 동안 다시 보이지 않음)
    localStorage.setItem('pwa-prompt-shown', Date.now().toString());
    setHasShownPrompt(true);
  };

  // PWA로 이미 실행 중이거나 이미 프롬프트를 보여줬으면 숨김
  if (isPWAInstalled || hasShownPrompt || !showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          📱
        </div>
        <div className="pwa-install-text">
          <h3>천우현장관리 앱 설치</h3>
          <p>
            {isMobile 
              ? '홈 화면에 앱을 추가하여 더 빠르게 접근하세요!'
              : '데스크톱에 앱을 설치하여 더 편리하게 사용하세요!'
            }
          </p>
        </div>
        <div className="pwa-install-buttons">
          <button 
            className="pwa-install-btn install"
            onClick={handleInstallClick}
          >
            설치하기
          </button>
          <button 
            className="pwa-install-btn dismiss"
            onClick={handleDismiss}
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt; 