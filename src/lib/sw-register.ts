// Service Worker Registration
// Handles registration, updates, and lifecycle events

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onError?: (error: Error) => void
}

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' ||
   window.location.hostname === '[::1]' ||
   window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/))
)

export function registerSW(config?: ServiceWorkerConfig) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[SW] Service Worker not supported')
    return
  }

  const publicUrl = new URL(window.location.href)
  if (publicUrl.origin !== window.location.origin) {
    console.log('[SW] Service Worker registration skipped - origin mismatch')
    return
  }

  window.addEventListener('load', () => {
    const swUrl = '/sw.js'

    if (isLocalhost) {
      // This is running on localhost
      checkValidServiceWorker(swUrl, config)
      navigator.serviceWorker.ready.then(() => {
        console.log('[SW] App is being served cache-first by a service worker')
      })
    } else {
      // Is not localhost - register service worker
      registerValidSW(swUrl, config)
    }
  })
}

function registerValidSW(swUrl: string, config?: ServiceWorkerConfig) {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      console.log('[SW] Service Worker registered successfully:', registration.scope)
      
      registration.onupdatefound = () => {
        const installingWorker = registration.installing
        if (installingWorker == null) {
          return
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // At this point, the updated precached content has been fetched,
              // but the previous service worker will still serve the older content
              console.log('[SW] New content is available and will be used when all tabs are closed')
              
              if (config && config.onUpdate) {
                config.onUpdate(registration)
              }
            } else {
              // At this point, everything has been precached
              console.log('[SW] Content is cached for offline use')
              
              if (config && config.onSuccess) {
                config.onSuccess(registration)
              }
            }
          }
        }
      }
    })
    .catch((error) => {
      console.error('[SW] Service Worker registration failed:', error)
      if (config && config.onError) {
        config.onError(error)
      }
    })
}

function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  // Check if the service worker can be found
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      // Ensure service worker exists, and that we really are getting a JS file
      const contentType = response.headers.get('content-type')
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        // No service worker found, reload the page
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload()
          })
        })
      } else {
        // Service worker found, proceed as normal
        registerValidSW(swUrl, config)
      }
    })
    .catch(() => {
      console.log('[SW] No internet connection found. App is running in offline mode.')
    })
}

export function unregisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister()
        console.log('[SW] Service Worker unregistered')
      })
      .catch((error) => {
        console.error('[SW] Service Worker unregistration failed:', error.message)
      })
  }
}

// Utility to check if app is running in standalone mode
export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone ||
    document.referrer.includes('android-app://')
  )
}

// Utility to show update available notification
export function showUpdateAvailable() {
  if (typeof window === 'undefined') return
  
  // Create a simple notification or toast
  const notification = document.createElement('div')
  notification.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      right: 20px;
      background: #3b82f6;
      color: white;
      padding: 1rem;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      max-width: 300px;
    ">
      <div style="font-weight: 600; margin-bottom: 0.5rem;">Update Available</div>
      <div style="font-size: 0.875rem; margin-bottom: 1rem;">
        A new version of T3 Crusher is available. Refresh to update.
      </div>
      <button 
        onclick="window.location.reload()" 
        style="
          background: white;
          color: #3b82f6;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          font-weight: 600;
          cursor: pointer;
          margin-right: 0.5rem;
        "
      >
        Refresh
      </button>
      <button 
        onclick="this.parentElement.parentElement.remove()" 
        style="
          background: transparent;
          color: white;
          border: 1px solid white;
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          cursor: pointer;
        "
      >
        Later
      </button>
    </div>
  `
  
  document.body.appendChild(notification)
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 10000)
}

// Background sync helper
export function queueBackgroundSync(tag: string, data?: any) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then((registration) => {
      return (registration as any).sync.register(tag)
    }).catch((error) => {
      console.error('[SW] Background sync registration failed:', error)
    })
  } else {
    console.log('[SW] Background sync not supported')
  }
}