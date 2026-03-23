// KDS Service Worker - Offline Support
const CACHE_NAME = 'kds-cache-v1';
const OFFLINE_URL = '/kds-offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/kds-offline.html',
  '/icons/kds-icon-192.png',
  '/icons/kds-icon-512.png',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[KDS SW] Precaching core assets');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[KDS SW] Some precache assets failed:', err);
      });
    })
  );
  // Activate immediately without waiting
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[KDS SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) return;

  // Skip API requests - always go to network for real-time data
  if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
    return;
  }

  // For KDS pages - network first, offline fallback
  // IMPORTANT: Don't cache KDS HTML pages because:
  // 1. They contain authentication tokens in URLs
  // 2. Each device may have different branch assignments
  // 3. Order data should always be fresh
  if (url.pathname.includes('/kds')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Don't cache HTML responses (they have auth data)
          // Only cache if it's a static asset within the KDS route
          return response;
        })
        .catch(() => {
          // Network failed - show offline page
          // The offline page will auto-retry when connection is restored
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // For static assets (JS, CSS, images) - cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/) ||
    url.pathname.startsWith('/_next/static/')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cache but also update in background
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        // Not in cache - fetch and cache
        return fetch(request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
