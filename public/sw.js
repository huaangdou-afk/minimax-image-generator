/**
 * Service Worker — MiniMax AI Generator
 * Caches static assets for faster subsequent loads.
 *
 * Strategy:
 *   • Static assets (HTML, JS, CSS, fonts, prompts.json) → Cache-First
 *   • Navigation requests (same-origin HTML)               → Network-First (to avoid stale page)
 *   • Generated image/audio URLs (external CDN)            → Network-Only (never cache)
 *   • Gallery prompts.json                                → Stale-While-Revalidate (serve fast, update in background)
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = 'mm-static-' + CACHE_VERSION;
const PROMPTS_CACHE = 'mm-prompts-' + CACHE_VERSION;

// Assets that should be cached on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/prompts.json',
];

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_ASSETS).catch(err => {
        console.warn('[SW] Pre-cache failed (non-fatal):', err);
      });
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────
self.addEventListener('activate', evt => {
  evt.waitUntil(
    Promise.all([
      // Clean up old cache versions
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith('mm-'))
            .filter(k => k !== STATIC_CACHE && k !== PROMPTS_CACHE)
            .map(k => caches.delete(k))
        )
      ),
      // Take control of all pages immediately
      self.clients.claim(),
    ])
  );
});

// ─── Fetch ──────────────────────────────────────────────────
self.addEventListener('fetch', evt => {
  const url = new URL(evt.request.url);

  // Only handle same-origin GET requests
  if (evt.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // ── prompts.json: Stale-While-Revalidate ──
  if (url.pathname === '/prompts.json') {
    evt.respondWith(staleWhileRevalidate(PROMPTS_CACHE, evt.request));
    return;
  }

  // ── Static assets (HTML, JS, CSS, fonts, images): Cache-First ──
  evt.respondWith(cacheFirst(STATIC_CACHE, evt.request));
});

// ─── Strategies ─────────────────────────────────────────────

/**
 * Cache-First — good for assets that rarely change.
 * Falls back to network if not in cache.
 */
async function cacheFirst(cacheName, request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return a minimal offline fallback for HTML navigations
    if (request.headers.get('accept')?.includes('text/html')) {
      const fallback = await caches.match('/index.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale-While-Revalidate — serve cached version immediately,
 * then update the cache in the background.
 */
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await networkFetch || new Response('{"error":"offline"}', {
    status: 503,
    headers: { 'Content-Type': 'application/json' },
  });
}
