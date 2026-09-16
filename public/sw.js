const CACHE_NAME = 'technician-app-cache-v3';
const urlsToCache = [
  '/',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Força a ativação imediata
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim()); // Assume o controlo das páginas imediatamente
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Filtro de segurança para não interceptar pedidos críticos
  if (
    event.request.method !== 'GET' || 
    url.includes('/_next/') || 
    url.includes('hot-update') ||
    url.includes('localhost:3001') || // Twenty MCP
    url.includes('n8n')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// WEB PUSH NOTIFICATIONS
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      },
      actions: [
        { action: 'open', title: 'Abrir App' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Technical Services', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(event.notification.data.url || '/');
    })
  );
});
