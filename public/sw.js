// T3 Crusher Service Worker
// Provides offline support, background sync, and caching

const CACHE_NAME = 't3-crusher-v1'
const STATIC_CACHE_NAME = 't3-crusher-static-v1'
const DYNAMIC_CACHE_NAME = 't3-crusher-dynamic-v1'

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/chat/default',
  '/manifest.json',
  // Add critical CSS and JS files
  '/_next/static/chunks/polyfills.js',
  '/_next/static/chunks/webpack.js',
  '/_next/static/chunks/main.js',
  '/_next/static/chunks/pages/_app.js',
  '/_next/static/chunks/pages/index.js',
  // Add critical fonts if any
  // Add icons
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
]

// API endpoints that can work offline with cached responses
const CACHEABLE_APIS = [
  '/api/chat',
  '/api/analyze-file',
  '/api/extract-tasks'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(async (cache) => {
        console.log('[SW] Pre-caching static assets')
        // Cache assets one by one to handle failures gracefully
        const assetsToCache = STATIC_ASSETS.filter(url => url.startsWith('/') && !url.includes('_next'))
        
        for (const asset of assetsToCache) {
          try {
            await cache.add(asset)
          } catch (error) {
            console.warn(`[SW] Failed to cache ${asset}:`, error.message)
          }
        }
        
        console.log('[SW] Finished caching available static assets')
      })
      .catch((error) => {
        console.error('[SW] Failed to open cache:', error)
      })
  )
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  
  // Take control of all clients immediately
  self.clients.claim()
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return
  }
  
  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network First with cache fallback
    event.respondWith(handleApiRequest(request))
  } else if (url.pathname.startsWith('/_next/') || 
             url.pathname.startsWith('/static/') ||
             STATIC_ASSETS.includes(url.pathname)) {
    // Static assets - Cache First
    event.respondWith(handleStaticAssets(request))
  } else if (url.pathname.startsWith('/chat/') || url.pathname === '/') {
    // Navigation requests - Network First with cache fallback
    event.respondWith(handleNavigation(request))
  } else {
    // Other requests - Network First
    event.respondWith(handleOtherRequests(request))
  }
})

// API Request Handler - Network First with cache fallback
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    // Cache successful responses
    if (networkResponse.ok && CACHEABLE_APIS.some(api => url.pathname.startsWith(api))) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', url.pathname)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return offline response for specific endpoints
    if (url.pathname.startsWith('/api/chat')) {
      return new Response(JSON.stringify({
        error: 'Offline mode - chat functionality limited',
        offline: true,
        message: 'Your message will be sent when connection is restored'
      }), {
        headers: { 'Content-Type': 'application/json' },
        status: 503
      })
    }
    
    throw error
  }
}

// Static Assets Handler - Cache First
async function handleStaticAssets(request) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // If not in cache, fetch and cache
    const networkResponse = await fetch(request)
    const cache = await caches.open(STATIC_CACHE_NAME)
    cache.put(request, networkResponse.clone())
    
    return networkResponse
  } catch (error) {
    console.error('[SW] Failed to fetch static asset:', request.url)
    throw error
  }
}

// Navigation Handler - Network First with cache fallback
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request)
    
    // Cache navigation responses
    const cache = await caches.open(DYNAMIC_CACHE_NAME)
    cache.put(request, networkResponse.clone())
    
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache:', request.url)
    
    // Fallback to cached version
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Ultimate fallback - return cached homepage or offline page
    const homepageResponse = await caches.match('/')
    if (homepageResponse) {
      return homepageResponse
    }
    
    // Return basic offline page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>T3 Crusher - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              background: #f8fafc;
              color: #334155;
            }
            .container { max-width: 400px; margin: 0 auto; }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: #1e293b; margin-bottom: 1rem; }
            p { line-height: 1.6; margin-bottom: 2rem; }
            .retry-btn { 
              background: #3b82f6; 
              color: white; 
              padding: 0.75rem 1.5rem; 
              border: none; 
              border-radius: 0.5rem; 
              cursor: pointer;
              font-size: 1rem;
            }
            .retry-btn:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🚀</div>
            <h1>T3 Crusher</h1>
            <p>You're currently offline. Please check your internet connection and try again.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Retry Connection
            </button>
          </div>
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Other Requests Handler - Network First
async function handleOtherRequests(request) {
  try {
    return await fetch(request)
  } catch (error) {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    throw error
  }
}

// Background sync for queuing offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)
  
  if (event.tag === 'chat-sync') {
    event.waitUntil(syncChatMessages())
  } else if (event.tag === 'file-upload-sync') {
    event.waitUntil(syncFileUploads())
  }
})

// Sync queued chat messages when back online
async function syncChatMessages() {
  try {
    // Get queued messages from IndexedDB
    const queuedMessages = await getQueuedMessages()
    
    for (const message of queuedMessages) {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        })
        
        if (response.ok) {
          await removeFromQueue(message.id)
          console.log('[SW] Successfully synced message:', message.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync message:', message.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Chat sync failed:', error)
  }
}

// Sync queued file uploads when back online
async function syncFileUploads() {
  try {
    const queuedUploads = await getQueuedUploads()
    
    for (const upload of queuedUploads) {
      try {
        const formData = new FormData()
        formData.append('file', upload.file)
        formData.append('conversationId', upload.conversationId)
        
        const response = await fetch('/api/analyze-file', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          await removeUploadFromQueue(upload.id)
          console.log('[SW] Successfully synced upload:', upload.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync upload:', upload.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Upload sync failed:', error)
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  if (event.data) {
    const data = event.data.json()
    
    const options = {
      body: data.body || 'New message in T3 Crusher',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'View Message',
          icon: '/icons/action-view.png'
        },
        {
          action: 'reply',
          title: 'Quick Reply',
          icon: '/icons/action-reply.png'
        }
      ],
      data: {
        url: data.url || '/chat/default',
        conversationId: data.conversationId
      }
    }
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'T3 Crusher', options)
    )
  }
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const { action, data } = event
  const url = data?.url || '/chat/default'
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Utility functions for IndexedDB operations
async function getQueuedMessages() {
  // Implement IndexedDB operations for message queue
  // This is a placeholder - would need actual IndexedDB implementation
  return []
}

async function removeFromQueue(messageId) {
  // Remove message from IndexedDB queue
  console.log('[SW] Removing message from queue:', messageId)
}

async function getQueuedUploads() {
  // Get queued uploads from IndexedDB
  return []
}

async function removeUploadFromQueue(uploadId) {
  // Remove upload from IndexedDB queue
  console.log('[SW] Removing upload from queue:', uploadId)
}

console.log('[SW] Service Worker script loaded successfully')