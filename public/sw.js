// Beles education — service worker.
// Беттер мен API әрқашан интернеттен алынады (нәтиже, кілт, сұрақтар ескірмеуі үшін).
// Тек өзгермейтін файлдар (/_next/static, белгішелер, шрифттер) кэштеледі; интернет жоқ болса — /offline.html.
const STATIC = 'beles-static-v1'
const OFFLINE = '/offline.html'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll([OFFLINE, '/icon-192.png', '/beles-logo.png'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== STATIC).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)))
    return
  }
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|woff2?|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(STATIC).then((c) => c.put(req, copy))
            }
            return res
          }),
      ),
    )
  }
})
