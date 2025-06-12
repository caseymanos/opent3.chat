'use client'

import { useEffect } from 'react'
import { registerSW, showUpdateAvailable } from '@/lib/sw-register'

export default function PWAInit() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Register service worker
      registerSW({
        onSuccess: (registration) => {
          console.log('[PWA] Service Worker registered successfully')
        },
        onUpdate: (registration) => {
          console.log('[PWA] New content available, prompting user to update')
          showUpdateAvailable()
        },
        onError: (error) => {
          console.error('[PWA] Service Worker registration failed:', error)
        }
      })

      // Prevent zoom on double tap for better mobile experience
      let lastTouchEnd = 0
      document.addEventListener('touchend', (event) => {
        const now = new Date().getTime()
        if (now - lastTouchEnd <= 300) {
          event.preventDefault()
        }
        lastTouchEnd = now
      }, false)

      // Handle PWA install prompt
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault()
        console.log('[PWA] Install prompt available')
      }

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      
      // Log PWA status
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                   (window.navigator as any).standalone ||
                   document.referrer.includes('android-app://')
      
      if (isPWA) {
        console.log('[PWA] App is running in standalone mode')
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }
  }, [])

  return null // This component doesn't render anything
}