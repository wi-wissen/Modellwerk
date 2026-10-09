// Service worker of the Modellwerk website (generated at build time from
// scripts/sw-template.js). Precaches every built file; pages are fetched from the
// network first so updates show up at once, assets come from the cache.
const VERSION = '%VERSION%'
const FILES = %FILES%
const CACHE = `modellwerk-${VERSION}`
const scope = new URL(self.registration.scope)

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new URL(f, scope)))).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('modellwerk-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== scope.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const url = new URL(request.url)
      url.hash = ''
      url.search = ''
      const page = url.pathname.endsWith('/') ? new URL('index.html', url) : url
      return (await caches.match(page)) ?? (await caches.match(url)) ?? Response.error()
    }))
    return
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((hit) => hit ?? fetch(request)))
})
