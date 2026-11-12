const CACHE_NAME = 'japan-trip-v2';
 
// Core assets to cache on install
const CORE_ASSETS = [
  './',
  './index.html',
];
 
// Firebase SDK URLs to cache
const FIREBASE_V = '10.12.2';
const FIREBASE_ASSETS = [
  `https://www.gstatic.com/firebasejs/${FIREBASE_V}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_V}/firebase-auth-compat.js`,
  `https://www.gstatic.com/firebasejs/${FIREBASE_V}/firebase-firestore-compat.js`,
];
 
// External libraries
const LIB_ASSETS = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
];
 
// Google Fonts — cache on first fetch
const FONT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];
 
// Install: cache core + Firebase + libs
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll([...CORE_ASSETS, ...FIREBASE_ASSETS, ...LIB_ASSETS])
    ).then(() => self.skipWaiting())
  );
});
 
// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
 
// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
 
  // Skip non-GET
  if (event.request.method !== 'GET') return;
 
  // API calls (open-meteo, firestore) — network only, don't cache
  if (url.hostname.includes('open-meteo') ||
      url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com')) {
    return;
  }
 
  // Unsplash images — cache first, then network (cache on first load)
  if (url.hostname.includes('unsplash.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
 
  // Google Fonts — cache first, then network
  if (FONT_ORIGINS.some(o => event.request.url.startsWith(o))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
 
  // Leaflet tile images — cache first, then network
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }
 
  // Core assets (HTML, Firebase SDK, Leaflet JS) — cache first, background refresh
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
 
      return cached || fetchPromise;
    })
  );
});
