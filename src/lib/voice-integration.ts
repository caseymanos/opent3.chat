import { logger } from './logger'
import React from 'react'

export interface VoiceRecognitionOptions {
  continuous?: boolean
  interimResults?: boolean
  language?: string
  maxAlternatives?: number
}

export interface VoiceRecognitionResult {
  transcript: string
  confidence: number
  isFinal: boolean
  alternatives?: string[]
}

export type VoiceRecognitionCallback = (result: VoiceRecognitionResult) => void
export type VoiceErrorCallback = (error: string) => void

export class VoiceIntegration {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private onResult: VoiceRecognitionCallback | null = null
  private onError: VoiceErrorCallback | null = null
  private retryCount = 0
  private maxRetries = 3

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeSpeechRecognition()
    }
  }

  private initializeSpeechRecognition() {
    try {
      // Check for browser support
      const SpeechRecognition = 
        window.SpeechRecognition || 
        (window as any).webkitSpeechRecognition

      if (!SpeechRecognition) {
        throw new Error('Speech recognition not supported in this browser')
      }

      this.recognition = new SpeechRecognition()
      
      // Log environment information for debugging
      logger.info('Speech recognition initialized successfully', {
        browser: navigator.userAgent,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        port: window.location.port,
        online: navigator.onLine,
        language: navigator.language
      })
    } catch (error) {
      logger.error('Failed to initialize speech recognition', error)
      throw error
    }
  }

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' && 
      (!!window.SpeechRecognition || !!(window as any).webkitSpeechRecognition)
    )
  }

  configure(options: VoiceRecognitionOptions = {}) {
    if (!this.recognition) {
      throw new Error('Speech recognition not initialized')
    }

    // Configure recognition settings
    this.recognition.continuous = options.continuous ?? true
    this.recognition.interimResults = options.interimResults ?? true
    this.recognition.lang = options.language ?? 'en-US'
    this.recognition.maxAlternatives = options.maxAlternatives ?? 3
    
    // Add Chrome-specific configuration for network issues
    if (navigator.userAgent.includes('Chrome')) {
      // Force re-initialization to clear any stale state
      try {
        (this.recognition as any).abort()
      } catch (e) {
        // Ignore abort errors
      }
    }

    // Set up event handlers
    this.recognition.onstart = () => {
      logger.info('Speech recognition started')
      this.isListening = true
      this.retryCount = 0
    }

    this.recognition.onend = () => {
      logger.info('Speech recognition ended')
      this.isListening = false
    }

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      try {
        const results = Array.from(event.results)
        const lastResult = results[results.length - 1]
        
        if (lastResult) {
          const transcript = lastResult[0].transcript
          const confidence = lastResult[0].confidence || 0
          const isFinal = lastResult.isFinal
          
          // Extract alternatives
          const alternatives = Array.from(lastResult)
            .slice(1)
            .map(alt => alt.transcript)

          const result: VoiceRecognitionResult = {
            transcript: transcript.trim(),
            confidence,
            isFinal,
            alternatives
          }

          logger.info('Speech recognition result', { 
            transcript: result.transcript,
            confidence: result.confidence,
            isFinal: result.isFinal
          })

          this.onResult?.(result)
        }
      } catch (error) {
        logger.error('Error processing speech recognition result', error)
        this.onError?.('Failed to process speech recognition result')
      }
    }

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Log more detailed error information
      const errorDetails = {
        type: event.error,
        message: event.message || 'No additional message',
        timestamp: new Date().toISOString(),
        environment: {
          isProduction: process.env.NODE_ENV === 'production',
          isVercel: process.env.VERCEL === '1',
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          online: navigator.onLine,
          userAgent: navigator.userAgent.substring(0, 100)
        }
      }
      
      logger.error('Speech recognition error:', event.error, errorDetails)

      let errorMessage = 'Speech recognition error'
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.'
          break
        case 'audio-capture':
          errorMessage = 'Microphone access denied or unavailable.'
          break
        case 'not-allowed':
          errorMessage = 'Microphone permission denied.'
          break
        case 'network':
          // Enhanced debugging for network errors
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
          const isHTTPS = window.location.protocol === 'https:'
          
          logger.info('Network error details:', {
            online: navigator.onLine,
            connection: (navigator as any).connection?.effectiveType,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            protocol: window.location.protocol,
            hostname: window.location.hostname,
            isLocalhost,
            isHTTPS
          })
          
          errorMessage = 'Network error: Speech recognition requires an internet connection.'
          
          // Provide specific guidance based on environment
          if (!navigator.onLine) {
            errorMessage = 'You appear to be offline. Speech recognition requires an internet connection to work.'
          } else if (isLocalhost && isHTTPS) {
            errorMessage = 'Speech recognition may not work properly with https://localhost. Try using http://localhost instead.'
          } else if (window.location.protocol === 'file:') {
            errorMessage = 'Speech recognition cannot work with file:// URLs. Please run this application on a web server.'
          } else {
            // Common network error on macOS with Chrome
            const isArcBrowser = navigator.userAgent.includes('Arc/')
            
            if (isArcBrowser) {
              errorMessage = 'Arc browser does not have access to Google speech servers. Web Speech API only works in Google Chrome or Safari.'
            } else {
              errorMessage = 'Chrome cannot connect to Google speech servers. This is often caused by firewall or network security settings.'
            }
            
            if (navigator.platform.includes('Mac')) {
              if (isArcBrowser) {
                errorMessage += ' Please use Google Chrome or Safari for voice input.'
              } else {
                errorMessage += ' Try: 1) Open Chrome in Incognito mode, 2) Check macOS Firewall settings, 3) Disable VPN/proxy, or 4) Use Safari instead.'
              }
            }
          }
          break
        case 'service-not-allowed':
          errorMessage = 'Speech recognition service not available.'
          break
        case 'bad-grammar':
          errorMessage = 'Speech recognition grammar error.'
          break
        case 'language-not-supported':
          errorMessage = 'Language not supported for speech recognition.'
          break
        default:
          errorMessage = `Speech recognition error: ${event.error}`
      }

      // Auto-retry for certain errors
      if (this.shouldRetry(event.error) && this.retryCount < this.maxRetries) {
        this.retryCount++
        const retryDelay = event.error === 'network' ? 3000 : 1000 // Longer delay for network errors
        logger.info(`Retrying speech recognition (attempt ${this.retryCount}/${this.maxRetries})`, {
          error: event.error,
          retryDelay
        })
        setTimeout(() => {
          if (this.isListening && navigator.onLine) {
            this.restart()
          } else if (!navigator.onLine) {
            this.onError?.('Cannot use speech recognition while offline. Please check your internet connection.')
            this.isListening = false
          }
        }, retryDelay)
        return
      }

      this.isListening = false
      this.onError?.(errorMessage)
    }

    this.recognition.onnomatch = () => {
      logger.warn('No speech match found')
      this.onError?.('No speech match found. Please speak more clearly.')
    }
  }

  private shouldRetry(error: string): boolean {
    return ['no-speech', 'aborted', 'network'].includes(error)
  }

  startListening(
    onResult: VoiceRecognitionCallback,
    onError: VoiceErrorCallback,
    options?: VoiceRecognitionOptions
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        if (!this.isSupported()) {
          throw new Error('Speech recognition not supported')
        }

        // Chrome network error workaround: Create fresh instance
        if (navigator.userAgent.includes('Chrome') && this.retryCount === 0) {
          logger.info('Creating fresh SpeechRecognition instance for Chrome')
          this.initializeSpeechRecognition()
        }

        if (!this.recognition) {
          throw new Error('Speech recognition not initialized')
        }

        // Pre-flight checks
        logger.info('Performing pre-flight checks for speech recognition', {
          online: navigator.onLine,
          protocol: window.location.protocol,
          hostname: window.location.hostname,
          userAgent: navigator.userAgent.substring(0, 100) // Truncate for logging
        })

        // Check network connectivity for browsers that require it
        if (!navigator.onLine) {
          logger.warn('Attempting to use speech recognition while offline')
          // Some browsers might work offline, so we'll try anyway but warn the user
          onError('Warning: Speech recognition may not work properly without an internet connection.')
        }

        // Check for problematic HTTPS on localhost
        if (window.location.hostname === 'localhost' && window.location.protocol === 'https:') {
          logger.warn('Using HTTPS with localhost may cause issues with speech recognition')
        }

        if (this.isListening) {
          this.stopListening()
          // Give it a moment to properly stop
          await new Promise(resolve => setTimeout(resolve, 100))
        }

        this.onResult = onResult
        this.onError = onError

        // Configure with provided options
        if (options) {
          this.configure(options)
        } else {
          // Apply default configuration
          this.configure({
            continuous: true,
            interimResults: true,
            language: 'en-US'
          })
        }

        try {
          this.recognition.start()
          resolve()
        } catch (startError) {
          // Handle case where recognition is already started
          if (startError instanceof Error && startError.message.includes('already started')) {
            logger.warn('Speech recognition already started, restarting...')
            this.recognition.stop()
            await new Promise(resolve => setTimeout(resolve, 200))
            this.recognition.start()
            resolve()
          } else {
            throw startError
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.error('Failed to start speech recognition:', errorMessage, {
          error: error,
          stack: error instanceof Error ? error.stack : undefined
        })
        this.isListening = false
        reject(error)
      }
    })
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      logger.info('Stopping speech recognition')
      this.recognition.stop()
      this.isListening = false
    }
  }

  abort() {
    if (this.recognition && this.isListening) {
      logger.info('Aborting speech recognition')
      this.recognition.abort()
      this.isListening = false
    }
  }

  restart() {
    if (this.recognition) {
      this.stopListening()
      setTimeout(() => {
        if (this.onResult && this.onError) {
          this.startListening(this.onResult, this.onError)
        }
      }, 100)
    }
  }

  getState() {
    return {
      isSupported: this.isSupported(),
      isListening: this.isListening,
      retryCount: this.retryCount
    }
  }

  // Helper method to request microphone permissions
  async requestPermissions(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        logger.info('Requesting microphone permissions...')
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop()) // Stop the stream
        logger.info('Microphone permissions granted')
        return true
      }
      logger.warn('navigator.mediaDevices not available')
      return false
    } catch (error) {
      logger.error('Microphone permission denied', error)
      // Log specific error details
      if (error instanceof DOMException) {
        logger.error('Permission error details:', {
          name: error.name,
          message: error.message,
          code: error.code
        })
      }
      return false
    }
  }

  // Get available audio input devices
  async getAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices()
        return devices.filter(device => device.kind === 'audioinput')
      }
      return []
    } catch (error) {
      logger.error('Failed to enumerate audio devices', error)
      return []
    }
  }
}

// Export singleton instance
export const voiceIntegration = new VoiceIntegration()

// Helper hook for React components
export function useVoiceIntegration() {
  const [isListening, setIsListening] = React.useState(false)
  const [isSupported, setIsSupported] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [transcript, setTranscript] = React.useState('')
  const [interimTranscript, setInterimTranscript] = React.useState('')

  React.useEffect(() => {
    setIsSupported(voiceIntegration.isSupported())
  }, [])

  const startListening = React.useCallback(async (options?: VoiceRecognitionOptions) => {
    try {
      setError(null)
      setTranscript('')
      setInterimTranscript('')

      await voiceIntegration.startListening(
        (result) => {
          if (result.isFinal) {
            setTranscript(prev => prev + result.transcript + ' ')
            setInterimTranscript('')
          } else {
            setInterimTranscript(result.transcript)
          }
        },
        (errorMessage) => {
          setError(errorMessage)
          setIsListening(false)
        },
        options
      )

      setIsListening(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsListening(false)
    }
  }, [])

  const stopListening = React.useCallback(() => {
    voiceIntegration.stopListening()
    setIsListening(false)
  }, [])

  const clearTranscript = React.useCallback(() => {
    setTranscript('')
    setInterimTranscript('')
    setError(null)
  }, [])

  return {
    isSupported,
    isListening,
    error,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript
  }
}

// Type augmentation for Speech Recognition API
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

