// 윈도우 위치 및 크기 관리 유틸리티

// 윈도우 위치 저장 키
const WINDOW_POSITION_KEY = 'app_window_position';
const WINDOW_SIZE_KEY = 'app_window_size';

// 기본 윈도우 설정
const DEFAULT_WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  x: 100,
  y: 100,
  minWidth: 800,
  minHeight: 600
};

// 윈도우 위치 저장
export const saveWindowPosition = (x, y) => {
  try {
    localStorage.setItem(WINDOW_POSITION_KEY, JSON.stringify({ x, y }));
  } catch (error) {
    console.warn('윈도우 위치 저장 실패:', error);
  }
};

// 윈도우 크기 저장
export const saveWindowSize = (width, height) => {
  try {
    localStorage.setItem(WINDOW_SIZE_KEY, JSON.stringify({ width, height }));
  } catch (error) {
    console.warn('윈도우 크기 저장 실패:', error);
  }
};

// 저장된 윈도우 위치 불러오기
export const loadWindowPosition = () => {
  try {
    const saved = localStorage.getItem(WINDOW_POSITION_KEY);
    return saved ? JSON.parse(saved) : { x: DEFAULT_WINDOW_CONFIG.x, y: DEFAULT_WINDOW_CONFIG.y };
  } catch (error) {
    console.warn('윈도우 위치 불러오기 실패:', error);
    return { x: DEFAULT_WINDOW_CONFIG.x, y: DEFAULT_WINDOW_CONFIG.y };
  }
};

// 저장된 윈도우 크기 불러오기
export const loadWindowSize = () => {
  try {
    const saved = localStorage.getItem(WINDOW_SIZE_KEY);
    return saved ? JSON.parse(saved) : { width: DEFAULT_WINDOW_CONFIG.width, height: DEFAULT_WINDOW_CONFIG.height };
  } catch (error) {
    console.warn('윈도우 크기 불러오기 실패:', error);
    return { width: DEFAULT_WINDOW_CONFIG.width, height: DEFAULT_WINDOW_CONFIG.height };
  }
};

// 윈도우 위치 설정
export const setWindowPosition = (x, y) => {
  if (window.moveTo) {
    window.moveTo(x, y);
    saveWindowPosition(x, y);
  }
};

// 윈도우 크기 설정
export const setWindowSize = (width, height) => {
  if (window.resizeTo) {
    window.resizeTo(width, height);
    saveWindowSize(width, height);
  }
};

// 윈도우를 화면 중앙에 배치
export const centerWindow = () => {
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;
  const windowSize = loadWindowSize();
  
  const x = Math.max(0, (screenWidth - windowSize.width) / 2);
  const y = Math.max(0, (screenHeight - windowSize.height) / 2);
  
  setWindowPosition(x, y);
};

// 윈도우를 특정 모니터에 배치 (다중 모니터 환경)
export const setWindowToMonitor = (monitorIndex = 0) => {
  // 기본적으로는 첫 번째 모니터에 배치
  const x = monitorIndex * 100;
  const y = 100;
  setWindowPosition(x, y);
};

// 윈도우 최소화 방지 (항상 위에 표시)
export const setAlwaysOnTop = (enabled = false) => {
  // 브라우저에서는 제한적이지만, PWA에서는 일부 지원
  if (window.navigator.standalone) {
    // PWA 모드에서만 가능한 기능들
    console.log('PWA 모드에서 항상 위 설정:', enabled);
  }
};

// 윈도우 크기 변경 감지 및 저장
export const setupWindowResizeListener = () => {
  let resizeTimeout;
  
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      saveWindowSize(window.innerWidth, window.innerHeight);
    }, 500); // 500ms 딜레이로 성능 최적화
  };
  
  window.addEventListener('resize', handleResize);
  
  // 클린업 함수 반환
  return () => {
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);
  };
};

// 윈도우 위치 변경 감지 및 저장
export const setupWindowMoveListener = () => {
  let moveTimeout;
  
  const handleMove = () => {
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      saveWindowPosition(window.screenX, window.screenY);
    }, 500);
  };
  
  // 윈도우 이동 이벤트는 브라우저에서 제한적
  // 대신 주기적으로 위치 확인
  const interval = setInterval(() => {
    const currentX = window.screenX;
    const currentY = window.screenY;
    const saved = loadWindowPosition();
    
    if (currentX !== saved.x || currentY !== saved.y) {
      saveWindowPosition(currentX, currentY);
    }
  }, 1000);
  
  // 클린업 함수 반환
  return () => {
    clearInterval(interval);
    clearTimeout(moveTimeout);
  };
};

// 윈도우 초기화
export const initializeWindow = () => {
  // 저장된 위치와 크기 불러오기
  const position = loadWindowPosition();
  const size = loadWindowSize();
  
  // 윈도우 설정
  setWindowPosition(position.x, position.y);
  setWindowSize(size.width, size.height);
  
  // 리스너 설정
  const cleanupResize = setupWindowResizeListener();
  const cleanupMove = setupWindowMoveListener();
  
  // 클린업 함수 반환
  return () => {
    cleanupResize();
    cleanupMove();
  };
};

// 윈도우 설정 초기화
export const resetWindowSettings = () => {
  try {
    localStorage.removeItem(WINDOW_POSITION_KEY);
    localStorage.removeItem(WINDOW_SIZE_KEY);
    centerWindow();
  } catch (error) {
    console.warn('윈도우 설정 초기화 실패:', error);
  }
}; 