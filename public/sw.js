const CACHE_PREFIX = 'technician-app';
const META_CACHE = `${CACHE_PREFIX}-meta-v1`;
const SHELL_BUILD_KEY = 'technician-app-shell-build-id';

const urlsToCache = [
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
];

function isStaticPrecacheUrl(url) {
  return urlsToCache.some((p) => url.endsWith(p));
}

function isCacheableResponse(response) {
  return (
    response &&
    response.status === 200 &&
    !response.redirected &&
    response.type === 'basic'
  );
}

function staticCacheName(buildId) {
  return `${CACHE_PREFIX}-static-${buildId}`;
}

function shellCacheName(buildId) {
  return `${CACHE_PREFIX}-shell-${buildId}`;
}

async function resolveBuildId() {
  try {
    const res = await fetch('/api/app-version', { cache: 'no-store' });
    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data.buildId || 'unknown';
  } catch (_e) {
    return 'unknown';
  }
}

async function cacheDashboardShell(buildId) {
  const shellCache = await caches.open(shellCacheName(buildId));
  try {
    const response = await fetch('/dashboard', { credentials: 'include' });
    if (isCacheableResponse(response)) {
      await shellCache.put('/dashboard', response);
      const meta = await caches.open(META_CACHE);
      await meta.put(
        SHELL_BUILD_KEY,
        new Response(buildId, { headers: { 'Content-Type': 'text/plain' } })
      );
    }
  } catch (_e) {
    /* offline install */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const buildId = await resolveBuildId();
      const cache = await caches.open(staticCacheName(buildId));
      await cache.addAll(urlsToCache);
      await cacheDashboardShell(buildId);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const meta = await caches.open(META_CACHE);
      const buildResponse = await meta.match(SHELL_BUILD_KEY);
      const buildId = buildResponse ? await buildResponse.text() : 'unknown';
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => {
            if (key === META_CACHE) return false;
            if (key === staticCacheName(buildId) || key === shellCacheName(buildId)) return false;
            return key.startsWith(`${CACHE_PREFIX}-`);
          })
          .map((key) => caches.delete(key))
      );
      await clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (event.data && event.data.type === 'CACHE_SHELL') {
    event.waitUntil(resolveBuildId().then((buildId) => cacheDashboardShell(buildId)));
  }
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  if (event.request.method !== 'GET' || url.includes('hot-update') || url.includes('n8n')) {
    return;
  }

  if (url.includes('/api/')) {
    return;
  }

  if (url.includes('/_next/static/')) {
    event.respondWith(
      (async () => {
        const buildId = await resolveBuildId();
        const cache = await caches.open(staticCacheName(buildId));
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (isCacheableResponse(response)) {
          void cache.put(event.request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (url.includes('/_next/')) {
    return;
  }

  if (isStaticPrecacheUrl(url)) {
    event.respondWith(
      (async () => {
        const buildId = await resolveBuildId();
        const cache = await caches.open(staticCacheName(buildId));
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (isCacheableResponse(response)) {
          void cache.put(event.request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(event.request);
          if (response.redirected) {
            throw new Error('redirected');
          }
          return response;
        } catch (_networkError) {
          const pathname = new URL(event.request.url).pathname;
          const isDashboard =
            pathname === '/dashboard' || pathname.startsWith('/dashboard/');
          if (!isDashboard) {
            throw _networkError;
          }
          const meta = await caches.open(META_CACHE);
          const buildResponse = await meta.match(SHELL_BUILD_KEY);
          const buildId = buildResponse ? await buildResponse.text() : 'unknown';
          const shellCache = await caches.open(shellCacheName(buildId));
          const shell = await shellCache.match('/dashboard');
          if (shell) return shell;
          throw _networkError;
        }
      })()
    );
    return;
  }
});
