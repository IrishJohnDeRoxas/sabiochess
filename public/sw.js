/**
 * SabioChess Service Worker
 * Strategy: Cache-first for static assets, network-first for API calls.
 * Falls back to cache when offline.
 */

const CACHE_NAME = 'sabiochess-v1';

// Core shell assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/favicon.svg',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
];

// Patterns that should always go network-first (never serve stale)
const NETWORK_FIRST_PATTERNS = [
  /\/api\//,
  /lichess\.org/,
  /chess\.com/,
  /fonts\.googleapis\.com/,
];

// Large binary assets to skip caching (Stockfish WASM can be >10MB)
const SKIP_CACHE_PATTERNS = [
  /stockfish/i,
  /\.wasm$/,
  /\.wasm\.js$/,
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(PRECACHE_URLS).catch(() => {
        // Non-fatal: pre-cache best-effort
      })
    )
  );
  self.skipWaiting();
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch ───────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip opaque cross-origin requests and chrome-extension etc.
  if (!url.protocol.startsWith('http')) return;

  // Skip Stockfish/WASM — too large, let browser handle
  if (SKIP_CACHE_PATTERNS.some((p) => p.test(url.href))) return;

  // Network-first for API / external services
  if (NETWORK_FIRST_PATTERNS.some((p) => p.test(url.href))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first for everything else (app shell, pieces, sounds)
  event.respondWith(cacheFirst(request));
});

// ─── Strategies ──────────────────────────────────────────────────────────────
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type !== 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline fallback — return cached index.html for navigation requests
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
  }
}
