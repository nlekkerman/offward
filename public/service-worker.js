const CACHE_NAME = 'offward-static-v2'
const OFFWARD_CACHE_PREFIX = 'offward-'
const STATIC_DESTINATIONS = new Set(['script', 'style', 'image', 'font'])

function isSafeStaticRequest(request) {
  const url = new URL(request.url)

  return (
    request.method === 'GET' &&
    url.origin === self.location.origin &&
    !url.pathname.includes('/api/') &&
    !url.pathname.includes('/auth/') &&
    !url.pathname.includes('/manage/') &&
    request.credentials === 'same-origin' &&
    !request.headers.has('Authorization') &&
    STATIC_DESTINATIONS.has(request.destination)
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith(OFFWARD_CACHE_PREFIX) && cacheName !== CACHE_NAME)
        .map((cacheName) => caches.delete(cacheName)),
    )).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (!isSafeStaticRequest(request)) {
    return
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request)
      if (cachedResponse) {
        return cachedResponse
      }

      const response = await fetch(request)
      if (response.ok) {
        await cache.put(request, response.clone())
      }
      return response
    }),
  )
})
