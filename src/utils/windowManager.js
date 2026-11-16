// 윈도우 위치 및 크기 관리 유틸리티
// 주의: resizeTo()는 outer(창틀 포함) 기준. 저장도 outer로 맞춰야
// 새로고침마다 창이 커지는 피드백 루프가 생기지 않는다.

const WINDOW_POSITION_KEY = 'app_window_position';
const WINDOW_SIZE_KEY = 'app_window_size';

const DEFAULT_WINDOW_CONFIG = {
  width: 1200,
  height: 800,
  x: 100,
  y: 100,
  minWidth: 800,
  minHeight: 600
};

const canControlWindow = () =>
  typeof window !== 'undefined' &&
  typeof window.resizeTo === 'function' &&
  (window.navigator.standalone ||
    window.matchMedia('(display-mode: standalone)').matches);

export const saveWindowPosition = (x, y) => {
  try {
    localStorage.setItem(WINDOW_POSITION_KEY, JSON.stringify({ x, y }));
  } catch (error) {
    console.warn('윈도우 위치 저장 실패:', error);
  }
};

export const saveWindowSize = (width, height) => {
  try {
    const w = Math.round(Number(width));
    const h = Math.round(Number(height));
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 200 || h < 200) return;
    localStorage.setItem(WINDOW_SIZE_KEY, JSON.stringify({ width: w, height: h }));
  } catch (error) {
    console.warn('윈도우 크기 저장 실패:', error);
  }
};

export const loadWindowPosition = () => {
  try {
    const saved = localStorage.getItem(WINDOW_POSITION_KEY);
    return saved ? JSON.parse(saved) : { x: DEFAULT_WINDOW_CONFIG.x, y: DEFAULT_WINDOW_CONFIG.y };
  } catch (error) {
    console.warn('윈도우 위치 불러오기 실패:', error);
    return { x: DEFAULT_WINDOW_CONFIG.x, y: DEFAULT_WINDOW_CONFIG.y };
  }
};

export const loadWindowSize = () => {
  try {
    const saved = localStorage.getItem(WINDOW_SIZE_KEY);
    return saved
      ? JSON.parse(saved)
      : { width: DEFAULT_WINDOW_CONFIG.width, height: DEFAULT_WINDOW_CONFIG.height };
  } catch (error) {
    console.warn('윈도우 크기 불러오기 실패:', error);
    return { width: DEFAULT_WINDOW_CONFIG.width, height: DEFAULT_WINDOW_CONFIG.height };
  }
};

function clampSize(width, height) {
  const maxW = window.screen?.availWidth || width;
  const maxH = window.screen?.availHeight || height;
  return {
    width: Math.min(Math.max(width, DEFAULT_WINDOW_CONFIG.minWidth), maxW),
    height: Math.min(Math.max(height, DEFAULT_WINDOW_CONFIG.minHeight), maxH),
  };
}

export const setWindowPosition = (x, y) => {
  if (!canControlWindow() || typeof window.moveTo !== 'function') return;
  try {
    window.moveTo(x, y);
    saveWindowPosition(x, y);
  } catch (error) {
    console.warn('윈도우 위치 설정 실패:', error);
  }
};

export const setWindowSize = (width, height) => {
  if (!canControlWindow()) return;
  try {
    const next = clampSize(width, height);
    const curW = window.outerWidth || window.innerWidth;
    const curH = window.outerHeight || window.innerHeight;
    // 1~2px 차이는 OS 창틀 오차 — 불필요한 resize로 루프 방지
    if (Math.abs(curW - next.width) <= 2 && Math.abs(curH - next.height) <= 2) {
      return;
    }
    window.resizeTo(next.width, next.height);
    saveWindowSize(next.width, next.height);
  } catch (error) {
    console.warn('윈도우 크기 설정 실패:', error);
  }
};

export const centerWindow = () => {
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;
  const windowSize = loadWindowSize();
  const x = Math.max(0, (screenWidth - windowSize.width) / 2);
  const y = Math.max(0, (screenHeight - windowSize.height) / 2);
  setWindowPosition(x, y);
};

export const setWindowToMonitor = (monitorIndex = 0) => {
  const x = monitorIndex * 100;
  const y = 100;
  setWindowPosition(x, y);
};

export const setAlwaysOnTop = (enabled = false) => {
  if (window.navigator.standalone) {
    console.log('PWA 모드에서 항상 위 설정:', enabled);
  }
};

export const setupWindowResizeListener = () => {
  if (!canControlWindow()) return () => {};

  let resizeTimeout;
  const handleResize = () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // resizeTo 복원과 동일한 outer 기준으로 저장해야 새로고침 시 창이 커지지 않음
      const w = window.outerWidth || window.innerWidth;
      const h = window.outerHeight || window.innerHeight;
      saveWindowSize(w, h);
    }, 500);
  };

  window.addEventListener('resize', handleResize);
  return () => {
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);
  };
};

export const setupWindowMoveListener = () => {
  if (!canControlWindow()) return () => {};

  let moveTimeout;
  const interval = setInterval(() => {
    clearTimeout(moveTimeout);
    moveTimeout = setTimeout(() => {
      const currentX = window.screenX;
      const currentY = window.screenY;
      const saved = loadWindowPosition();
      if (currentX !== saved.x || currentY !== saved.y) {
        saveWindowPosition(currentX, currentY);
      }
    }, 200);
  }, 1000);

  return () => {
    clearInterval(interval);
    clearTimeout(moveTimeout);
  };
};

export const initializeWindow = () => {
  if (!canControlWindow()) {
    return () => {};
  }

  const position = loadWindowPosition();
  const size = loadWindowSize();

  setWindowPosition(position.x, position.y);
  setWindowSize(size.width, size.height);

  const cleanupResize = setupWindowResizeListener();
  const cleanupMove = setupWindowMoveListener();

  return () => {
    cleanupResize();
    cleanupMove();
  };
};

export const resetWindowSettings = () => {
  try {
    localStorage.removeItem(WINDOW_POSITION_KEY);
    localStorage.removeItem(WINDOW_SIZE_KEY);
    if (canControlWindow()) centerWindow();
  } catch (error) {
    console.warn('윈도우 설정 초기화 실패:', error);
  }
};
