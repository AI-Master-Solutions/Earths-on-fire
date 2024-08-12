const CACHE_NAME = 'tempo-cache-v1';

self.addEventListener('install', event => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
    })
  );
});

self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  console.log('Fetch event for', event.request.url);
  console.log('Request origin:', requestUrl.origin);
  console.log('Location origin:', location.origin);
  console.log('Request pathname:', requestUrl.pathname);

  if (requestUrl.origin === location.origin || requestUrl.origin === 'https://gis.earthdata.nasa.gov') {
    if (requestUrl.pathname.startsWith('/image/rest/services/C2930763263-LARC_CLOUD/TEMPO_NO2_L3_V03_tile_cache_test/ImageServer/tile/')) {
      console.log('Handling TEMPO tile request:', event.request.url);
      event.respondWith(
        caches.match(event.request).then(response => {
          if (response) {
            console.log('Found in cache:', event.request.url);
            return response;
          }
          console.log('Network request for:', event.request.url);
          return fetch(event.request, { mode: 'cors' }).then(networkResponse => {
            console.log('Response type:', networkResponse.type);
            console.log('Response status:', networkResponse.status);

            const cacheControl = networkResponse.headers.get('Cache-Control');
            console.log('Cache-Control:', cacheControl);

            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'cors') {
              console.error('Fetch error or non-cacheable response', networkResponse);
              return networkResponse;
            }

            if (cacheControl) {
              console.log('Cache-Control header exists:', cacheControl);
              if (cacheControl.includes('private')) {
                console.log('Private response, ignoring Cache-Control and caching:', event.request.url);
              }
            } else {
              console.log('No Cache-Control header found.');
            }

            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              console.log('Caching new resource:', event.request.url);
              cache.put(event.request, responseToCache);
            }).catch(error => console.error('Error caching new resource:', error));
            
            return networkResponse;
          }).catch(error => {
            console.error('Network fetch error:', error);
            return new Response('Service Worker fetch error: ' + error.message, {
              status: 500,
              statusText: 'Service Worker fetch error'
            });
          });
        })
      );
    } else {
      console.log('Handling non-TEMPO request:', event.request.url);
      event.respondWith(fetch(event.request));
    }
  } else {
    console.log('Request origin does not match or CORS not allowed:', requestUrl.origin);
    event.respondWith(fetch(event.request));
  }
});