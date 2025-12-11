const CACHE_NAME = 'deprem-takip-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon/favicon.ico',
  '/icon/android-icon-192x192.png'
];

// Service Worker kurulumu
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache açıldı');
        return cache.addAll(urlsToCache);
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
          if (cacheName !== CACHE_NAME) {
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
  // Sadece http ve https isteklerini işle (chrome-extension vb. hariç)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // API isteklerini cache'leme
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

  // WebSocket ve socket.io isteklerini atla
  if (event.request.url.includes('socket.io') || event.request.url.includes('ws://') || event.request.url.includes('wss://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            // Sadece başarılı ve basic tipindeki yanıtları cache'le
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone response before caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                // Sadece http/https isteklerini cache'le
                if (event.request.url.startsWith('http')) {
                  cache.put(event.request, responseToCache);
                }
              })
              .catch((err) => {
                console.log('Cache hatası:', err);
              });
            
            return response;
          })
          .catch(() => {
            // Offline durumunda cache'den dön
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
