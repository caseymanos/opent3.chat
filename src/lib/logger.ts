const isDevelopment = typeof window !== 'undefined' && window.location.hostname === 'localhost'

export const logger = {
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', new Date().toISOString(), ...args)
    }
  },
  
  info: (...args: any[]) => {
    console.log('[INFO]', new Date().toISOString(), ...args)
  },
  
  warn: (...args: any[]) => {
    console.warn('[WARN]', new Date().toISOString(), ...args)
  },
  
  error: (...args: any[]) => {
    console.error('[ERROR]', new Date().toISOString(), ...args)
  },
  
  group: (label: string) => {
    if (isDevelopment) {
      console.group(`[${label}]`)
    }
  },
  
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd()
    }
  }
}

// Log unhandled errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', event.reason)
  })
  
  window.addEventListener('error', (event) => {
    logger.error('Global error:', event.error)
  })
}