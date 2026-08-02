const CACHE_NAME = 'chroma-shift-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/pwa/icon-192.png',
  './assets/pwa/icon-512.png',
  './assets/pwa/screenshot-portrait.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      // Use Promise.allSettled to guarantee Service Worker installs successfully
      // even if individual optional assets fail to fetch or are missing in dev.
      return Promise.allSettled(
        ASSETS.map((asset) => {
          return cache.add(asset)
            .then(() => {
              console.log(`[Service Worker] Cached asset successfully: ${asset}`);
            })
            .catch((err) => {
              console.warn(`[Service Worker] Optional asset pre-cache failed: ${asset}`, err);
            });
        })
      );
    }).then(() => {
      console.log('[Service Worker] Installation complete, skipping waiting...');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.includes('/version') || url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-progress') {
    console.log('[Service Worker] Syncing user progress...');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_PROGRESS_TRIGGERED' });
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
