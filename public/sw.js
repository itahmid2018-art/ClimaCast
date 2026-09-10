/**
 * Service Worker for Google Weather PWA
 * - Offline asset caching (Stale-While-Revalidate)
 * - Dedicated Weather API caching (Network-First with Offline Cache Fallback)
 * - Background Sync API: Automatically updates cached weather data when connectivity returns
 * - Periodic Background Sync API: Periodic background refresh if supported
 * - Silent Local Notifications for Pre-Sunrise Dawn Alerts
 */

const STATIC_CACHE_NAME = 'google-weather-static-v2';
const WEATHER_CACHE_NAME = 'google-weather-api-cache-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/weather-icon.svg',
];

const LATEST_WEATHER_KEY = 'https://api.open-meteo.com/v1/forecast/latest';
const WEATHER_META_KEY = 'https://api.open-meteo.com/v1/forecast/_meta';

// Install: precache application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precache warning:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up outdated caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE_NAME && key !== WEATHER_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

/**
 * Helper to broadcast message to all connected client windows
 */
async function broadcastToClients(message) {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clientList) {
    client.postMessage(message);
  }
}

/**
 * Performs background sync of cached weather data:
 * Fetches the latest forecast using the active query URL and refreshes the cache.
 */
async function syncCachedWeatherData(reason = 'background-sync') {
  console.log('[SW] Executing Background Sync for cached weather data. Reason:', reason);
  try {
    const weatherCache = await caches.open(WEATHER_CACHE_NAME);
    const metaResponse = await weatherCache.match(WEATHER_META_KEY);

    let targetUrl = null;
    if (metaResponse) {
      try {
        const meta = await metaResponse.json();
        targetUrl = meta.url;
      } catch (e) {
        console.warn('[SW] Could not parse weather sync meta:', e);
      }
    }

    // Fallback to checking cached requests if meta isn't present
    if (!targetUrl) {
      const requests = await weatherCache.keys();
      const forecastReq = requests.find((req) => req.url.includes('api.open-meteo.com/v1/forecast') && !req.url.endsWith('/latest') && !req.url.endsWith('/_meta'));
      if (forecastReq) {
        targetUrl = forecastReq.url;
      }
    }

    if (!targetUrl) {
      console.log('[SW] Background sync: No prior weather request found to sync.');
      return;
    }

    console.log('[SW] Background sync fetching fresh weather from:', targetUrl);

    // Fetch fresh weather with cache: 'no-cache' to ensure network fetch
    const response = await fetch(targetUrl, { cache: 'no-cache' });
    if (response && response.status === 200) {
      // Update both specific URL and latest canonical cache entry
      await weatherCache.put(targetUrl, response.clone());
      await weatherCache.put(LATEST_WEATHER_KEY, response.clone());

      const updatedMeta = new Response(
        JSON.stringify({
          url: targetUrl,
          lastSync: Date.now(),
          status: 'success',
          reason,
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      await weatherCache.put(WEATHER_META_KEY, updatedMeta);

      console.log('[SW] Background sync completed successfully. Notifying clients.');

      // Broadcast update to open tabs
      await broadcastToClients({
        type: 'WEATHER_SYNC_COMPLETED',
        timestamp: Date.now(),
        reason,
        url: targetUrl,
      });

      // If no clients are active (browser backgrounded / tab closed), show silent notification if permitted
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (clientList.length === 0 && self.Notification && self.Notification.permission === 'granted') {
        self.registration.showNotification('Google Weather Updated', {
          body: 'Forecast refreshed in background via network sync.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          silent: true,
          tag: 'weather-bg-sync',
        });
      }
    }
  } catch (err) {
    console.warn('[SW] Background sync failed (network may still be unstable):', err);
    throw err; // Allow browser to retry sync according to backoff policy
  }
}

// Background Sync API event
self.addEventListener('sync', (event) => {
  if (
    event.tag === 'weather-data-sync' ||
    event.tag === 'sync-weather-data' ||
    event.tag === 'weather-auto-sync'
  ) {
    event.waitUntil(syncCachedWeatherData(`sync-event-${event.tag}`));
  }
});

// Periodic Background Sync API event (if supported by browser/PWA)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'weather-periodic-sync') {
    event.waitUntil(syncCachedWeatherData('periodic-sync'));
  }
});

// Fetch event: handles static assets (Stale-While-Revalidate) and Weather API (Network-First with Cache Fallback)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. Intercept Open-Meteo Weather Forecast API requests
  if (url.hostname === 'api.open-meteo.com' && url.pathname.startsWith('/v1/forecast')) {
    event.respondWith(
      (async () => {
        const weatherCache = await caches.open(WEATHER_CACHE_NAME);

        try {
          // Attempt network fetch
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            // Save fresh copy in cache under requested URL, canonical latest key, and metadata
            await weatherCache.put(event.request, networkResponse.clone());
            await weatherCache.put(LATEST_WEATHER_KEY, networkResponse.clone());

            const meta = new Response(
              JSON.stringify({
                url: event.request.url,
                lastSync: Date.now(),
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
            await weatherCache.put(WEATHER_META_KEY, meta);

            return networkResponse;
          }
          return networkResponse;
        } catch (networkErr) {
          // Network failed (Device is offline or unreachable) -> Serve from cache
          console.log('[SW] Network fetch failed, serving weather from offline cache:', url.pathname);
          const cachedExact = await weatherCache.match(event.request);
          if (cachedExact) {
            return cachedExact;
          }

          // Fallback to canonical latest weather cache entry
          const cachedLatest = await weatherCache.match(LATEST_WEATHER_KEY);
          if (cachedLatest) {
            return cachedLatest;
          }

          // Return JSON error response if neither cache is populated yet
          return new Response(
            JSON.stringify({
              error: true,
              message: 'Offline: No cached forecast data available yet.',
            }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      })()
    );
    return;
  }

  // 2. Intercept Open-Meteo Air Quality API requests (cache for offline availability)
  if (url.hostname === 'air-quality-api.open-meteo.com') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(WEATHER_CACHE_NAME);
        try {
          const res = await fetch(event.request);
          if (res && res.status === 200) {
            cache.put(event.request, res.clone());
          }
          return res;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          return new Response(JSON.stringify({ error: true, message: 'Offline AQI' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      })()
    );
    return;
  }

  // 3. For all same-origin static assets: Offline-first with network fallback & background update
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch in background to update cache for next time
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
              }
            })
            .catch(() => {});
          return cachedResponse;
        }
        return fetch(event.request);
      })
    );
  }
});

// Client Message Listener
self.addEventListener('message', (event) => {
  if (!event.data) return;

  // 1. Silent Local Notification Request
  if (event.data.type === 'SILENT_NOTIFICATION') {
    const { title, body } = event.data;
    self.registration.showNotification(title || 'Sunrise Dawn Alert', {
      body: body || 'Sunrise is approaching soon.',
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png',
      silent: true,
      tag: 'sunrise-dawn-notification',
    });
  }

  // 2. Set Weather Sync Config / Target
  if (event.data.type === 'SET_WEATHER_SYNC_TARGET') {
    const { url } = event.data;
    if (url) {
      caches.open(WEATHER_CACHE_NAME).then((cache) => {
        const meta = new Response(
          JSON.stringify({
            url,
            lastSync: Date.now(),
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
        cache.put(WEATHER_META_KEY, meta);
      });
    }
  }

  // 3. Trigger immediate manual background sync test
  if (event.data.type === 'TRIGGER_WEATHER_SYNC') {
    syncCachedWeatherData('client-manual-trigger');
  }
});

// Handle notification click: focus app window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
