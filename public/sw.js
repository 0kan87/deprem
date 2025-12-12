const CACHE_NAME = 'deprem-takip-v5';
const STATIC_CACHE = 'deprem-static-v5';
const DYNAMIC_CACHE = 'deprem-dynamic-v5';

const urlsToCache = [
  '/',
  '/manifest.webmanifest',
  '/icon/favicon.ico',
  '/icon/favicon-16x16.png',
  '/icon/favicon-32x32.png',
  '/icon/apple-icon-180x180.png'
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Static cache açıldı');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.log('Cache kurulum hatası:', err);
      })
  );
  self.skipWaiting();
});

// Aktivasyon
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE].includes(cacheName)) {
            console.log('Eski cache siliniyor:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch istekleri
self.addEventListener('fetch', (event) => {
  // Sadece http ve https isteklerini işle
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // WebSocket ve socket.io isteklerini atla
  if (event.request.url.includes('socket.io') || 
      event.request.url.includes('ws://') || 
      event.request.url.includes('wss://')) {
    return;
  }

  // API isteklerini cache'leme - network first
  if (event.request.url.includes('api.orhanaydogdu.com.tr')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Diğer istekler - cache first, network fallback
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            // Sadece başarılı yanıtları cache'le
            if (!response || response.status !== 200) {
              return response;
            }
            
            // Sadece same-origin isteklerini cache'le
            if (response.type === 'basic') {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                })
                .catch(() => {});
            }
            
            return response;
          })
          .catch(() => {
            return caches.match('/');
          });
      })
  );
});

// Push bildirimleri
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Yeni deprem algılandı!',
    icon: '/icon/android-icon-192x192.png',
    badge: '/icon/android-icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Detayları Gör'
      },
      {
        action: 'close',
        title: 'Kapat'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Deprem Takip', options)
  );
});

// Bildirim tıklama
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
