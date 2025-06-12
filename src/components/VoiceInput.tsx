'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MicrophoneIcon,
  StopIcon,
  SpeakerWaveIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { useVoiceIntegration } from '@/lib/voice-integration'

interface VoiceInputProps {
  onTranscriptChange: (transcript: string) => void
  isDisabled?: boolean
  language?: string
  placeholder?: string
  className?: string
}

export default function VoiceInput({
  onTranscriptChange,
  isDisabled = false,
  language = 'en-US',
  placeholder = 'Click microphone to start speaking...',
  className = ''
}: VoiceInputProps) {
  const {
    isSupported,
    isListening,
    error,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    clearTranscript
  } = useVoiceIntegration()

  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [showTranscript, setShowTranscript] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Check microphone permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        if (typeof navigator !== 'undefined' && navigator.permissions) {
          const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
          setHasPermission(result.state === 'granted')
          
          result.onchange = () => {
            setHasPermission(result.state === 'granted')
          }
        }
      } catch (err) {
        console.warn('Could not check microphone permissions:', err)
      }
    }

    if (isSupported) {
      checkPermissions()
    }
  }, [isSupported])

  // Update parent component when transcript changes
  useEffect(() => {
    const fullTranscript = transcript + interimTranscript
    if (fullTranscript) {
      onTranscriptChange(fullTranscript)
      setShowTranscript(true)
      
      // Auto-hide transcript after 3 seconds of no activity
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        if (!isListening) {
          setShowTranscript(false)
        }
      }, 3000)
    }
  }, [transcript, interimTranscript, onTranscriptChange, isListening])

  const handleToggleListening = async () => {
    if (isListening) {
      stopListening()
    } else {
      try {
        await startListening({
          continuous: true,
          interimResults: true,
          language
        })
      } catch (err) {
        console.error('Failed to start voice recognition:', err)
      }
    }
  }

  const handleClear = () => {
    clearTranscript()
    onTranscriptChange('')
    setShowTranscript(false)
  }

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <MicrophoneIcon className="w-5 h-5" />
        <span className="text-sm">Voice input not supported</span>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleToggleListening}
          disabled={isDisabled || hasPermission === false}
          variant={isListening ? "outline" : "ghost"}
          size="sm"
          className={`relative overflow-hidden ${
            isListening 
              ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
              : 'hover:bg-blue-50 text-blue-600'
          }`}
          title={
            isListening 
              ? 'Stop voice input' 
              : hasPermission === false 
                ? 'Microphone permission required'
                : 'Start voice input'
          }
        >
          {/* Listening animation background */}
          {isListening && (
            <motion.div
              className="absolute inset-0 bg-red-200"
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.6, 0.3] 
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          <div className="relative flex items-center gap-1">
            {isListening ? (
              <StopIcon className="w-4 h-4" />
            ) : (
              <MicrophoneIcon className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-xs">
              {isListening ? 'Stop' : 'Voice'}
            </span>
          </div>
        </Button>

        {/* Status indicators */}
        {hasPermission === false && (
          <div className="flex items-center gap-1 text-orange-600">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-xs">Permission needed</span>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-1 text-red-600">
            <ExclamationTriangleIcon className="w-4 h-4" />
            <span className="text-xs max-w-32 truncate" title={error}>
              {error}
            </span>
          </div>
        )}

        {transcript && !error && (
          <button
            onClick={handleClear}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            title="Clear transcript"
          >
            <CheckCircleIcon className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Live transcript display */}
      <AnimatePresence>
        {showTranscript && (transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 mt-2 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 z-10"
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0">
                {isListening ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <SpeakerWaveIcon className="w-4 h-4 text-blue-500" />
                  </motion.div>
                ) : (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {isListening ? 'Listening...' : 'Voice input complete'}
                </div>
                <div className="text-sm text-gray-900 dark:text-gray-100">
                  <span className="text-gray-700 dark:text-gray-300">{transcript}</span>
                  {interimTranscript && (
                    <span className="text-gray-400 dark:text-gray-500 italic">
                      {interimTranscript}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permission request overlay */}
      <AnimatePresence>
        {hasPermission === false && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center"
          >
            <div className="text-center p-4">
              <MicrophoneIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Microphone access required
              </p>
              <Button
                size="sm"
                onClick={() => window.location.reload()}
                className="text-xs"
              >
                Grant Permission
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}