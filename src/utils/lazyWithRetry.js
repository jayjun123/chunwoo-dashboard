import { lazy } from 'react';

const CHUNK_MARKERS = [
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'error loading dynamically imported module',
];

function isChunkLoadError(error) {
  if (!error) return false;
  const name = String(error.name || '');
  const msg = String(error.message || '');
  if (name === 'ChunkLoadError') return true;
  return CHUNK_MARKERS.some((m) => msg.includes(m));
}

export const CHLOAD_KEY = 'chunk_reload_once';

/**
 * Vite/Netlify 배포 후 만료된 청크 URL 요청 시 1회 자동 새로고침
 */
export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (!isChunkLoadError(error)) throw error;
      try {
        if (!sessionStorage.getItem(CHLOAD_KEY)) {
          sessionStorage.setItem(CHLOAD_KEY, '1');
          window.location.reload();
          return new Promise(() => {});
        }
      } catch {
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });
}
