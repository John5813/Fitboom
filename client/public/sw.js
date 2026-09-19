/*
 * FitBoom service worker.
 *
 * Muhim qoida: API javoblari HECH QACHON keshlanmaydi.
 *
 * Ilgari bu yerda har qanday muvaffaqiyatli GET keshga tushardi — jumladan
 * `/api/user` (kredit balansi) va `/api/bookings`. Natijada:
 *   - tarmoq uzilganda eskirgan balans ko'rsatilardi;
 *   - foydalanuvchi chiqib ketgandan keyin ham uning ma'lumoti brauzer
 *     keshida qolardi va umumiy qurilmada boshqa odamga ko'rinishi mumkin edi.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `fitboom-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

/** Bu yo'llar keshga umuman tushmaydi */
function isNeverCached(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads/') ||
    url.pathname === '/sw.js'
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Faqat o'z domenimiz keshlanadi (xarita plitalari, shriftlar — yo'q)
  if (url.origin !== self.location.origin) return;

  // API va yuklangan fayllar: to'g'ridan-to'g'ri tarmoqqa, keshsiz
  if (isNeverCached(url)) return;

  // Qolgani: avval tarmoq, uzilganda kesh
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // SPA navigatsiyasi uchun bosh sahifani qaytaramiz
        if (request.mode === 'navigate') {
          const shell = await caches.match('/');
          if (shell) return shell;
        }
        return Response.error();
      }),
  );
});

/* Yangi versiya tayyor bo'lganda sahifa so'rasa darhol o'tish */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
