import React, { useState, useEffect } from 'react';
import './PWAInstallGuide.css';

const PWAInstallGuide = () => {
  const [showGuide, setShowGuide] = useState(false);
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

    // 이미 PWA로 실행 중이면 가이드 숨김
    if (checkIfPWAInstalled()) {
      return;
    }

    // 5초 후에 설치 가이드 표시
    const timer = setTimeout(() => {
      setShowGuide(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setShowGuide(false);
  };

  const handleInstallClick = () => {
    // 브라우저별 설치 방법 안내
    const userAgent = navigator.userAgent;
    let message = '';

    if (userAgent.includes('Chrome')) {
      message = '주소창 오른쪽의 설치 아이콘(📱)을 클릭하세요!';
    } else if (userAgent.includes('Safari')) {
      message = '하단의 공유 버튼을 클릭하고 "홈 화면에 추가"를 선택하세요!';
    } else if (userAgent.includes('Edge')) {
      message = '주소창 오른쪽의 설치 아이콘을 클릭하세요!';
    } else {
      message = '브라우저 메뉴에서 "앱 설치" 또는 "홈 화면에 추가"를 찾아보세요!';
    }

    alert(message);
  };

  if (isPWAInstalled || !showGuide) return null;

  return (
    <div className="pwa-install-guide">
      <div className="pwa-install-guide-content">
        <div className="pwa-install-guide-header">
          <h3>📱 천우현장관리 앱 설치</h3>
          <button className="pwa-install-guide-close" onClick={handleClose}>
            ✕
          </button>
        </div>
        <div className="pwa-install-guide-body">
          <p>이 웹사이트를 <strong>앱처럼</strong> 사용할 수 있습니다!</p>
          <ul>
            <li>✅ 홈 화면에 아이콘 생성</li>
            <li>✅ 브라우저 없이 전체 화면 실행</li>
            <li>✅ 오프라인에서도 사용 가능</li>
            <li>✅ 자동 업데이트</li>
          </ul>
          <button 
            className="pwa-install-guide-btn"
            onClick={handleInstallClick}
          >
            설치 방법 보기
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallGuide; 