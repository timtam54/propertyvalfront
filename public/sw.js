// Service Worker for EstatePro PWA
const SW_VERSION = '1.0.0';
const CACHE_NAME = `estatepro-v${SW_VERSION}`;
const urlsToCache = [
  '/',
];

console.log(`Service Worker v${SW_VERSION} installing...`);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`Caching files for ${CACHE_NAME}`);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log(`Service Worker v${SW_VERSION} installed successfully`);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`Service Worker v${SW_VERSION} activating...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete all old caches
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`Service Worker v${SW_VERSION} activated successfully`);
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Never cache API routes
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              return cache.match('/');
            });
        })
    );
  } else {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});
