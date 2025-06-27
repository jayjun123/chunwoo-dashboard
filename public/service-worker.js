const CACHE_NAME = 'construction-status-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 백/포워드 캐시 관련 이벤트 핸들러 추가
self.addEventListener('pageshow', event => {
  if (event.persisted) {
    // 페이지가 백/포워드 캐시에서 복원된 경우
    console.log('Page restored from back/forward cache');
  }
});

self.addEventListener('pagehide', event => {
  if (event.persisted) {
    // 페이지가 백/포워드 캐시에 저장되는 경우
    console.log('Page stored in back/forward cache');
  }
}); 