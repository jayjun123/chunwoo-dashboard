// 윈도우 위치/크기 유틸
// 주의: 예전에는 새로고침마다 resizeTo + inner/outer 혼용으로 창이 계속 커졌다.
// 지금은 로드 시 자동 리사이즈를 하지 않는다. (설정 화면에서만 수동 조작)

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

/** 과거에 잘못 저장된 크기 값을 제거 (커짐 루프 잔재) */
export const clearCorruptWindowSize = () => {
  try {
    localStorage.removeItem(WINDOW_SIZE_KEY);
    localStorage.removeItem(WINDOW_POSITION_KEY);
  } catch (error) {
    console.warn('윈도우 설정 삭제 실패:', error);
  }
};

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

/** 설정 화면 등에서만 수동 호출. 자동 로드 경로에서는 사용하지 않음. */
export const setWindowSize = (width, height) => {
  if (!canControlWindow()) return;
  try {
    const next = clampSize(width, height);
    window.resizeTo(next.width, next.height);
    saveWindowSize(next.width, next.height);
  } catch (error) {
    console.warn('윈도우 크기 설정 실패:', error);
  }
};

export const centerWindow = () => {
  if (!canControlWindow()) return;
  const screenWidth = window.screen.availWidth;
  const screenHeight = window.screen.availHeight;
  const w = window.outerWidth || DEFAULT_WINDOW_CONFIG.width;
  const h = window.outerHeight || DEFAULT_WINDOW_CONFIG.height;
  const x = Math.max(0, (screenWidth - w) / 2);
  const y = Math.max(0, (screenHeight - h) / 2);
  setWindowPosition(x, y);
};

export const setWindowToMonitor = (monitorIndex = 0) => {
  setWindowPosition(monitorIndex * 100, 100);
};

export const setAlwaysOnTop = (enabled = false) => {
  if (window.navigator.standalone) {
    console.log('PWA 모드에서 항상 위 설정:', enabled);
  }
};

/**
 * 앱 시작 시 호출.
 * 자동 resizeTo 는 하지 않는다 — 새로고침마다 창이 커지는 원인이었음.
 * 잘못된 저장값만 정리한다.
 */
export const initializeWindow = () => {
  try {
    // 커짐 루프를 만든 저장값 제거
    clearCorruptWindowSize();
  } catch (error) {
    console.warn('윈도우 초기화 실패:', error);
  }
  return () => {};
};

export const resetWindowSettings = () => {
  try {
    clearCorruptWindowSize();
    if (canControlWindow()) centerWindow();
  } catch (error) {
    console.warn('윈도우 설정 초기화 실패:', error);
  }
};
