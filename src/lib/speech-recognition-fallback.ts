/**
 * Fallback implementation for speech recognition when the native API fails
 * This could use alternative services or provide guidance
 */

import { logger } from './logger'

export interface FallbackOptions {
  onError: (message: string) => void
  environment: {
    hostname: string
    protocol: string
    isProduction: boolean
  }
}

export class SpeechRecognitionFallback {
  static async checkEnvironmentIssues(): Promise<string[]> {
    const issues: string[] = []
    
    // Check if running on Vercel
    if (process.env.VERCEL === '1' || window.location.hostname.includes('vercel')) {
      issues.push('Running on Vercel - ensure HTTPS is properly configured')
    }
    
    // Check for localhost HTTPS issue
    if (window.location.hostname === 'localhost' && window.location.protocol === 'https:') {
      issues.push('Using HTTPS with localhost - try http://localhost instead')
    }
    
    // Check for production HTTPS
    if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
      issues.push('Not using HTTPS in production - speech recognition requires secure context')
    }
    
    // Check browser compatibility
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor)
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)
    const isFirefox = /Firefox/.test(navigator.userAgent)
    
    if (!isChrome && !isSafari) {
      issues.push('Best support in Chrome or Safari browsers')
    }
    
    // Check for mobile browsers
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile) {
      issues.push('Mobile browser detected - speech recognition may have limited support')
    }
    
    return issues
  }
  
  static getRecommendedAction(error: string): string {
    if (error === 'network') {
      return `
Speech recognition requires an internet connection as Chrome sends audio to Google servers for processing.

Troubleshooting steps:
1. Check your internet connection
2. If using localhost, ensure you're using http:// not https://
3. On macOS: System Preferences > Security & Privacy > Privacy > Microphone > Allow Chrome
4. Try refreshing the page
5. Consider using Chrome browser for best compatibility
      `.trim()
    }
    
    if (error === 'not-allowed') {
      return 'Microphone access was denied. Please allow microphone permissions and refresh the page.'
    }
    
    if (error === 'service-not-allowed') {
      return 'Speech recognition service is not available. This might be due to browser restrictions or region limitations.'
    }
    
    return 'An error occurred with speech recognition. Please try again or use text input instead.'
  }
  
  static async testConnectivity(): Promise<boolean> {
    try {
      // Test connection to Google's speech service endpoint
      const response = await fetch('https://www.google.com/speech-api/v2/recognize', {
        method: 'HEAD',
        mode: 'no-cors' // We just want to check if we can reach it
      })
      return true
    } catch (error) {
      logger.error('Failed to reach speech recognition service', error)
      return false
    }
  }
}

// Export helper function for quick diagnostics
export async function runSpeechDiagnostics() {
  const diagnostics = {
    browser: {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      platform: navigator.platform,
      language: navigator.language
    },
    environment: {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      port: window.location.port,
      pathname: window.location.pathname
    },
    capabilities: {
      hasSpeechRecognition: 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
      hasGetUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      isSecureContext: window.isSecureContext
    },
    network: {
      online: navigator.onLine,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null
    },
    issues: await SpeechRecognitionFallback.checkEnvironmentIssues()
  }
  
  logger.info('Speech recognition diagnostics:', diagnostics)
  return diagnostics
}