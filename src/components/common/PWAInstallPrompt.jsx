import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);

  useEffect(() => {
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
      setShowInstallPrompt(true);
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
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // 수동 설치 안내
      alert('브라우저 주소창 옆의 설치 아이콘을 클릭하거나, 브라우저 메뉴에서 "앱 설치"를 선택해주세요.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('사용자가 PWA 설치를 수락했습니다');
    } else {
      console.log('사용자가 PWA 설치를 거부했습니다');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    setDeferredPrompt(null);
  };

  // PWA로 이미 실행 중이면 프롬프트 숨김
  if (isPWAInstalled || !showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          📱
        </div>
        <div className="pwa-install-text">
          <h3>천우현장관리 앱 설치</h3>
          <p>홈 화면에 앱을 추가하여 더 빠르게 접근하세요!</p>
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