// 오프라인 실행용 서비스 워커. 온라인이면 항상 새 파일을 받고, 실패하거나 느리면 캐시로 응답한다.
const CACHE_PREFIX = 'crying-analysis-';
const CACHE = `${CACHE_PREFIX}v1`;
const NETWORK_TIMEOUT_MS = 3000;
const ASSETS = [
  './',
  'style.css',
  'js/analysis.js',
  'js/storage.js',
  'js/chart.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  // github.io 출처는 다른 저장소와 공유되므로 이 앱의 캐시만 지운다.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

async function respond(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request, { signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS) });
    if (response.ok) await cache.put(request.mode === 'navigate' ? './' : request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request.mode === 'navigate' ? './' : request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(respond(request));
});
