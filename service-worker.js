const CACHE_NAME = 'food-ninja-v2.2.1';
const STATIC_CACHE_URLS = [
  '/',
  '/app.html',
  '/index.html',
  '/manifest.json',
  '/browserconfig.xml',
  '/assets/css/main.css',
  '/assets/css/app.css',
  '/assets/css/landing.css',
  '/assets/css/themes.css',
  '/assets/js/app.js',
  '/assets/js/api.js',
  '/assets/js/camera.js',
  '/assets/js/chat.js',
  '/assets/js/utils.js',
  '/assets/js/landing.js',
  '/assets/js/pwa-icons.js',
  '/assets/js/pwa-installer.js',
  '/assets/js/icon-generator.js',
  '/assets/icons/favicon.svg',
  '/assets/icons/icon-72x72.svg',
  '/assets/icons/icon-96x96.svg',
  '/assets/icons/icon-128x128.svg',
  '/assets/icons/icon-144x144.svg',
  '/assets/icons/icon-152x152.svg',
  '/assets/icons/icon-192x192.svg',
  '/assets/icons/icon-384x384.svg',
  '/assets/icons/icon-512x512.svg',
  // External CDN resources (will be cached when first accessed)
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js'
];

// API endpoints that should be cached
const API_CACHE_URLS = [
  '/api/health'
];

// Install event - cache static resources
self.addEventListener('install', event => {
  console.log('[SW] Installing Service Worker');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static resources');
        // Filter out external URLs and cache only local resources that exist
        const localUrls = STATIC_CACHE_URLS.filter(url => !url.startsWith('http'));
        return cache.addAll(localUrls).catch(error => {
          console.log('[SW] Some resources failed to cache:', error);
          // Try to cache individual resources
          return Promise.allSettled(
            localUrls.map(url => cache.add(url).catch(e => console.log('[SW] Failed to cache:', url, e)))
          );
        });
      })
      .then(() => {
        console.log('[SW] Skip waiting');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating Service Worker');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Handle different types of requests
  if (isAPIRequest(url)) {
    event.respondWith(handleAPIRequest(request));
  } else if (isStaticResource(url)) {
    event.respondWith(handleStaticResource(request));
  } else if (isHTMLRequest(request)) {
    event.respondWith(handleHTMLRequest(request));
  } else {
    event.respondWith(handleOtherRequest(request));
  }
});

// Check if request is for API
function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || 
         url.pathname.startsWith('/predict') || 
         url.pathname.startsWith('/chat') || 
         url.pathname.startsWith('/ask_ai');
}

// Check if request is for static resource
function isStaticResource(url) {
  return url.pathname.includes('.') && 
         (url.pathname.endsWith('.css') || 
          url.pathname.endsWith('.js') || 
          url.pathname.endsWith('.svg') || 
          url.pathname.endsWith('.jpg') || 
          url.pathname.endsWith('.jpeg') || 
          url.pathname.endsWith('.svg') || 
          url.pathname.endsWith('.ico') || 
          url.pathname.endsWith('.webp'));
}

// Check if request is for HTML
function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

// Handle API requests - Network first, cache fallback
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed for API request, checking cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API requests
    return new Response(
      JSON.stringify({ 
        error: 'Không có kết nối mạng. Vui lòng thử lại sau.',
        offline: true 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static resources - Cache first, network fallback
async function handleStaticResource(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Failed to fetch static resource:', request.url);
    
    // Return placeholder for images if offline
    if (request.url.includes('image') || request.url.match(/\.(svg|jpg|jpeg|svg|webp)$/)) {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f8f9fa"/><text x="100" y="100" text-anchor="middle" dy=".3em" fill="#6c757d">Offline</text></svg>',
        { 
          headers: { 'Content-Type': 'image/svg+xml' }
        }
      );
    }
    
    throw error;
  }
}

// Handle HTML requests - Network first, cache fallback
async function handleHTMLRequest(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.log('[SW] Network failed for HTML request, checking cache');
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to app.html for SPA routing
    const appResponse = await caches.match('/app.html');
    if (appResponse) {
      return appResponse;
    }
    
    // Final fallback - offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Food Ninja - Offline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .offline { color: #6c757d; }
          .retry-btn { 
            background: #2ECC71; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer; 
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="offline">
          <h1>🍃 Food Ninja</h1>
          <h2>Bạn đang offline</h2>
          <p>Vui lòng kiểm tra kết nối internet và thử lại.</p>
          <button class="retry-btn" onclick="location.reload()">Thử lại</button>
        </div>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// Handle other requests - Network only with error handling
async function handleOtherRequest(request) {
  try {
    // Skip API calls to localhost - let them pass through
    const url = new URL(request.url);
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') {
      console.log('[SW] Skipping localhost API call:', request.url);
      return fetch(request);
    }
    
    // Skip external image requests that might fail
    if (request.url.includes('unsplash.com') || request.url.includes('external-image')) {
      return fetch(request, { mode: 'no-cors' });
    }
    
    return fetch(request);
  } catch (error) {
    console.log('[SW] External fetch failed:', request.url, error);
    
    // Return a fallback response for failed external resources
    if (request.destination === 'image') {
      return new Response(
        '<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><rect width="60" height="60" fill="#ddd"/><text x="30" y="35" text-anchor="middle" fill="#999" font-size="10">No Image</text></svg>',
        { 
          headers: { 'Content-Type': 'image/svg+xml' },
          status: 200
        }
      );
    }
    
    throw error;
  }
}

// Background sync for failed API requests
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(processBackgroundSync());
  }
});

async function processBackgroundSync() {
  console.log('[SW] Processing background sync');
  // Handle any pending requests that failed while offline
  // This could include retrying failed image analyses
}

// Push notifications (for future features)
self.addEventListener('push', event => {
  console.log('[SW] Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Thông báo từ Food Ninja',
    icon: '/assets/images/icons/icon-192x192.svg',
    badge: '/assets/images/icons/icon-72x72.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Mở ứng dụng',
        icon: '/assets/images/icons/explore-icon.svg'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: '/assets/images/icons/close-icon.svg'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Food Ninja', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/app.html')
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', event => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Service Worker loaded');
