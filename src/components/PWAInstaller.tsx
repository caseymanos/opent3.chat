'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowDownTrayIcon, 
  XMarkIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PWAInstallerProps {
  className?: string
}

export default function PWAInstaller({ className = '' }: PWAInstallerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [platform, setPlatform] = useState<'desktop' | 'mobile' | 'unknown'>('unknown')

  useEffect(() => {
    // Check if app is already running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone ||
        document.referrer.includes('android-app://')
      
      setIsStandalone(isStandaloneMode)
    }

    // Detect platform
    const detectPlatform = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
        setPlatform('mobile')
      } else {
        setPlatform('desktop')
      }
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const installEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(installEvent)
      
      // Show install prompt after a delay if not in standalone mode
      if (!isStandalone) {
        setTimeout(() => {
          setShowInstallPrompt(true)
        }, 5000) // Show after 5 seconds
      }
    }

    // Listen for app installation
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      console.log('[PWA] App was installed successfully')
    }

    checkStandalone()
    detectPlatform()

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [isStandalone])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted the install prompt')
        setIsInstalled(true)
      } else {
        console.log('[PWA] User dismissed the install prompt')
      }
      
      setDeferredPrompt(null)
      setShowInstallPrompt(false)
    } catch (error) {
      console.error('[PWA] Error during installation:', error)
    }
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true')
  }

  // Don't show if already installed, in standalone mode, or dismissed
  if (isInstalled || isStandalone || sessionStorage.getItem('pwa-install-dismissed')) {
    return null
  }

  const getInstallInstructions = () => {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('chrome') && platform === 'desktop') {
      return {
        title: 'Install T3 Crusher App',
        steps: [
          'Click the install button below',
          'Or use the install icon in your address bar',
          'Click "Install" in the browser prompt'
        ]
      }
    } else if (userAgent.includes('safari') && platform === 'mobile') {
      return {
        title: 'Add to Home Screen',
        steps: [
          'Tap the Share button in Safari',
          'Scroll down and tap "Add to Home Screen"',
          'Tap "Add" to install the app'
        ]
      }
    } else if (platform === 'mobile') {
      return {
        title: 'Install T3 Crusher',
        steps: [
          'Tap your browser menu',
          'Look for "Add to Home Screen" or "Install"',
          'Follow the prompts to install'
        ]
      }
    } else {
      return {
        title: 'Install T3 Crusher App',
        steps: [
          'Look for an install icon in your address bar',
          'Or check your browser menu for "Install" option',
          'Follow the prompts to install the app'
        ]
      }
    }
  }

  const instructions = getInstallInstructions()

  return (
    <div className={className}>
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:max-w-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {platform === 'mobile' ? (
                    <DevicePhoneMobileIcon className="w-6 h-6" />
                  ) : (
                    <ComputerDesktopIcon className="w-6 h-6" />
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">{instructions.title}</h3>
                    <p className="text-blue-100 text-sm">
                      Get the full app experience
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDismiss}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="mb-4">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  Benefits:
                </h4>
                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Offline access to conversations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Faster performance
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Desktop/mobile app experience
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    Push notifications (coming soon)
                  </li>
                </ul>
              </div>

              {/* Install Instructions */}
              <div className="mb-4">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                  How to install:
                </h4>
                <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {instructions.steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <span className="flex-shrink-0 w-5 h-5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {deferredPrompt && (
                  <Button
                    onClick={handleInstallClick}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Install Now
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="px-4"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact install button for header */}
      {deferredPrompt && !showInstallPrompt && (
        <Button
          onClick={() => setShowInstallPrompt(true)}
          variant="ghost"
          size="sm"
          className="hidden sm:flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          title="Install T3 Crusher as an app"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Install App</span>
        </Button>
      )}
    </div>
  )
}