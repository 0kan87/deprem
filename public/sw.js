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

// Cache strategies
const isStaticAsset = (url) => {
  return url.includes('/icon/') || 
         url.includes('/manifest') || 
         url.includes('.css') || 
         url.includes('.js') ||
         url.includes('.png') ||
         url.includes('.ico');
};

const isAPIRequest = (url) => {
  return url.includes('api.orhanaydogdu.com.tr');
};

const isCDNRequest = (url) => {
  return url.includes('unpkg.com') || url.includes('leaflet');
};

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

  const url = event.request.url;

  // API istekleri - Network First (fresh data öncelikli)
  if (isAPIRequest(url)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // API yanıtını kısa süre cache'le (5 dakika)
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              const headers = new Headers(responseToCache.headers);
              headers.set('sw-cachetime', Date.now().toString());
              const cachedResponse = new Response(responseToCache.body, {
                status: responseToCache.status,
                statusText: responseToCache.statusText,
                headers: headers
              });
              cache.put(event.request, cachedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          // Offline iken cache'den dön
          return caches.match(event.request);
        })
    );
    return;
  }

  // Static assets - Cache First (hızlı yükleme)
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Map tiles - Cache First (optimize tile loading)
  if (url.includes('basemaps.cartocdn.com') || url.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open('map-tiles-v1').then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        }).catch(() => {
          // Fallback for offline mode
          return new Response('', { status: 204 });
        });
      })
    );
    return;
  }

  // CDN assets - Cache First (uzun süreli cache)
  if (isCDNRequest(url)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request).then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Diğer istekler - Stale While Revalidate
  event.respondWith(
    caches.match(event.request).then((response) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response.status === 200) {
          const responseToCache = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });

      return response || fetchPromise;
    }).catch(() => {
      return caches.match('/');
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
