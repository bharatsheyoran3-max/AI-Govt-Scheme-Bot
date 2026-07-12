const CACHE_NAME = "schemesathi-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/src/styles.css",
];

// Install Service Worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching app shell");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept fetch requests
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. Skip non-GET requests (e.g. POST for eligibility/consent)
  if (event.request.method !== "GET") {
    return;
  }

  // 2. Handle API calls - Network-First, fallback to Cache
  if (requestUrl.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response and save it to cache
          const responseCopy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseCopy);
          });
          return response;
        })
        .catch(() => {
          // Offline: serve cached API response if available
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return a mock offline response for API
            return new Response(
              JSON.stringify({
                success: true,
                offlineFallback: true,
                results: [],
                error: "You are currently offline. Displaying cached results."
              }),
              {
                status: 200,
                headers: { "Content-Type": "application/json" }
              }
            );
          });
        })
    );
    return;
  }

  // 3. Static assets & SPA routing - Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and request is HTML/navigation, serve index shell
          if (event.request.mode === "navigate") {
            return caches.match("/");
          }
        });
      
      return cachedResponse || fetchPromise;
    })
  );
});
