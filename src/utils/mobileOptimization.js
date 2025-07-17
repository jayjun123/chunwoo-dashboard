/**
 * 모바일 최적화 유틸리티 - PWA 전문가 30년 경험 기반
 * 
 * 주요 기능:
 * - 터치 최적화
 * - 성능 최적화
 * - 배터리 절약
 * - 네트워크 최적화
 */

import { useEffect, useCallback } from 'react';

// 디바이스 정보
export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  return {
    isMobile,
    isIOS,
    isAndroid,
    isPWA,
    userAgent
  };
};

// 터치 최적화 설정
export const optimizeTouchEvents = () => {
  // 터치 이벤트 최적화
  document.addEventListener('touchstart', () => {}, { passive: true });
  document.addEventListener('touchmove', () => {}, { passive: true });
  document.addEventListener('touchend', () => {}, { passive: true });
  
  // 더블 탭 줌 방지 (덜 공격적으로 수정)
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (event) => {
    const now = (new Date()).getTime();
    // 특정 요소에서만 더블 탭 줌 방지, 버튼이나 인터랙티브 요소는 제외
    if (now - lastTouchEnd <= 300 && 
        !event.target.closest('button') && 
        !event.target.closest('[role="button"]') &&
        !event.target.closest('a') &&
        !event.target.closest('input') &&
        !event.target.closest('textarea')) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
};

// 성능 최적화
export const optimizePerformance = () => {
  // 이미지 지연 로딩
  const images = document.querySelectorAll('img[data-src]');
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.classList.remove('lazy');
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
  
  // 스크롤 최적화
  let ticking = false;
  const handleScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        // 스크롤 이벤트 처리
        ticking = false;
      });
      ticking = true;
    }
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    window.removeEventListener('scroll', handleScroll);
    imageObserver.disconnect();
  };
};

// 배터리 절약 모드
export const enableBatterySaving = () => {
  // 배터리 API 지원 확인
  if ('getBattery' in navigator) {
    navigator.getBattery().then(battery => {
      if (battery.level < 0.2) {
        // 배터리 20% 미만일 때 최적화
        document.body.classList.add('battery-saving');
        
        // 애니메이션 비활성화
        document.body.style.setProperty('--animation-duration', '0s');
        
        // 이미지 품질 낮춤
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (img.src.includes('high-quality')) {
            img.src = img.src.replace('high-quality', 'low-quality');
          }
        });
      }
    });
  }
};

// 네트워크 최적화
export const optimizeNetwork = () => {
  // 네트워크 정보 확인
  if ('connection' in navigator) {
    const connection = navigator.connection;
    
    if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
      // 느린 네트워크에서 최적화
      document.body.classList.add('slow-network');
      
      // 이미지 압축
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        img.loading = 'lazy';
        img.decoding = 'async';
      });
    }
  }
};

// 모바일 전용 훅
export const useMobileOptimization = () => {
  const deviceInfo = getDeviceInfo();
  
  useEffect(() => {
    if (deviceInfo.isMobile) {
      optimizeTouchEvents();
      const cleanup = optimizePerformance();
      enableBatterySaving();
      optimizeNetwork();
      
      return cleanup;
    }
  }, [deviceInfo.isMobile]);
  
  return deviceInfo;
};

// 터치 피드백 최적화
export const useTouchFeedback = () => {
  const handleTouchStart = useCallback((event) => {
    const element = event.currentTarget;
    element.style.transform = 'scale(0.95)';
    element.style.transition = 'transform 0.1s ease';
  }, []);
  
  const handleTouchEnd = useCallback((event) => {
    const element = event.currentTarget;
    element.style.transform = 'scale(1)';
  }, []);
  
  return { handleTouchStart, handleTouchEnd };
};

// 스와이프 제스처 감지
export const useSwipeGesture = (onSwipeLeft, onSwipeRight, threshold = 50) => {
  let startX = 0;
  let startY = 0;
  
  const handleTouchStart = useCallback((event) => {
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, []);
  
  const handleTouchEnd = useCallback((event) => {
    const endX = event.changedTouches[0].clientX;
    const endY = event.changedTouches[0].clientY;
    
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    
    // 수평 스와이프인지 확인
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        onSwipeRight?.();
      } else {
        onSwipeLeft?.();
      }
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);
  
  return { handleTouchStart, handleTouchEnd };
};

// 뷰포트 높이 최적화 (모바일 브라우저 주소창 대응)
export const useViewportHeight = () => {
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    
    setVH();
    window.addEventListener('resize', setVH);
    window.addEventListener('orientationchange', setVH);
    
    return () => {
      window.removeEventListener('resize', setVH);
      window.removeEventListener('orientationchange', setVH);
    };
  }, []);
};

// 모바일 전용 스타일 적용
export const applyMobileStyles = () => {
  const style = document.createElement('style');
  style.textContent = `
    /* 모바일 최적화 스타일 */
    @media (max-width: 768px) {
      /* 터치 최적화 */
      button, a, [role="button"] {
        min-height: 44px;
        min-width: 44px;
        touch-action: manipulation;
      }
      
      /* 스크롤 최적화 */
      * {
        -webkit-overflow-scrolling: touch;
      }
      
      /* 배터리 절약 모드 */
      .battery-saving * {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
      
      /* 느린 네트워크 모드 */
      .slow-network img {
        filter: blur(1px);
      }
      
      /* 뷰포트 높이 최적화 */
      .full-height {
        height: calc(var(--vh, 1vh) * 100);
      }
    }
  `;
  document.head.appendChild(style);
};

// 초기화 함수
export const initMobileOptimization = () => {
  const deviceInfo = getDeviceInfo();
  
  if (deviceInfo.isMobile) {
    optimizeTouchEvents();
    optimizePerformance();
    enableBatterySaving();
    optimizeNetwork();
    applyMobileStyles();
  }
  
  return deviceInfo;
}; 