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
      logger.info('Speech recognition initialized successfully')
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
      logger.error('Speech recognition error', { 
        error: event.error,
        message: event.message 
      })

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
          errorMessage = 'Network error during speech recognition.'
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
        logger.info(`Retrying speech recognition (attempt ${this.retryCount}/${this.maxRetries})`)
        setTimeout(() => {
          if (this.isListening) {
            this.restart()
          }
        }, 1000)
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
    return new Promise((resolve, reject) => {
      try {
        if (!this.isSupported()) {
          throw new Error('Speech recognition not supported')
        }

        if (!this.recognition) {
          throw new Error('Speech recognition not initialized')
        }

        if (this.isListening) {
          this.stopListening()
        }

        this.onResult = onResult
        this.onError = onError

        // Configure with provided options
        if (options) {
          this.configure(options)
        }

        this.recognition.start()
        resolve()
      } catch (error) {
        logger.error('Failed to start speech recognition', error)
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
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop()) // Stop the stream
        logger.info('Microphone permissions granted')
        return true
      }
      return false
    } catch (error) {
      logger.error('Microphone permission denied', error)
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

