const CACHE_NAME = 'jkh-system-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/login',
  '/dashboard',
  '/globals.css',
  '/favicon.ico'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Кэширование оболочки приложения');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Активация
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Удаление старого кэша:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  // Игнорируем POST запросы (изменение данных)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Возвращаем из кэша, если есть
        return cachedResponse;
      }

      // Если нет в кэше, идем в сеть
      return fetch(event.request).then((response) => {
        // Не кэшируем системные/динамические запросы без нужды (например API), 
        // но сохраняем статику
        if (response.status === 200 && (
          event.request.url.includes('/_next/static/') ||
          event.request.url.includes('/uploads/')
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Если сеть лежит и кэша нет, можно отдавать оффлайн-страницу
        console.error('[SW] Ошибка сети и отсутствие кэша');
      });
    })
  );
});
