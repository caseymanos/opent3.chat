'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // No automatic permission check - only check when user clicks microphone

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
    // Check permissions first
    if (hasPermission === false || hasPermission === null) {
      try {
        // Request microphone permission
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach(track => track.stop()) // Stop the stream immediately
        setHasPermission(true)
      } catch (err) {
        console.error('Microphone permission denied:', err)
        setHasPermission(false)
        return
      }
    }

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

  // Helper function to render modal content
  const renderPermissionModal = () => (
    <AnimatePresence>
      {hasPermission === false && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-force-visible bg-black/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 sm:p-6"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.3
            }}
            className={`
              bg-white dark:bg-slate-800 rounded-2xl shadow-2xl
              w-full max-w-sm sm:max-w-md lg:max-w-lg
              p-6 sm:p-8 lg:p-10
              border border-slate-200/20 dark:border-slate-700/30
              backdrop-blur-xl
              relative overflow-hidden
            `}
          >
            {/* Decorative background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/30 dark:from-blue-900/10 dark:to-purple-900/10 rounded-2xl" />
            
            <div className="relative text-center">
              {/* Icon with responsive sizing */}
              <motion.div 
                className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 mx-auto mb-4 sm:mb-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", damping: 20 }}
              >
                <MicrophoneIcon className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-white" />
              </motion.div>

              {/* Responsive typography */}
              <motion.h3 
                className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Microphone Access Required
              </motion.h3>

              {/* Adaptive content based on screen size */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mb-6 sm:mb-8"
              >
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 leading-relaxed">
                  <span className="hidden sm:inline">
                    To use voice input, please allow microphone access in your browser. 
                    Click the microphone icon in your address bar and select "Allow".
                  </span>
                  <span className="sm:hidden">
                    Enable microphone access to use voice input. Check your browser's address bar for permission.
                  </span>
                </p>
                
                {/* Desktop-only helpful tip */}
                <div className="hidden lg:block mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 Look for the microphone icon (🎤) in your browser's address bar
                  </p>
                </div>
              </motion.div>

              {/* Responsive button layout */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  size="default"
                  onClick={() => window.location.reload()}
                  className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 px-6 py-3"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh & Allow
                  </span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="default"
                  onClick={() => setHasPermission(null)}
                  className="w-full sm:w-auto text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-all duration-200 px-6 py-3"
                >
                  Maybe Later
                </Button>
              </motion.div>

              {/* Mobile-specific help text */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="sm:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Tap "Refresh & Allow" then look for permission prompt
                </p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  if (!isSupported) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <MicrophoneIcon className="w-5 h-5" />
        <span className="text-sm">Voice input not supported</span>
      </div>
    )
  }

  return (
    <>
      {/* Portal for permission modal - renders outside component tree */}
      {mounted && hasPermission === false && typeof window !== 'undefined' && 
        createPortal(renderPermissionModal(), document.body)
      }
      
      <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleToggleListening}
          disabled={isDisabled}
          variant={isListening ? "destructive" : "secondary"}
          size="default"
          className={`relative overflow-hidden transition-all duration-200 ${
            isListening 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg scale-105' 
              : 'hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          title={
            isListening 
              ? 'Stop voice input' 
              : hasPermission === false 
                ? 'Click to grant microphone permission'
                : 'Start voice input'
          }
        >
          {/* Listening animation background */}
          {isListening && (
            <motion.div
              className="absolute inset-0 bg-white"
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.2, 0.4, 0.2] 
              }}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          )}
          
          <div className="relative flex items-center gap-2 px-2">
            {isListening ? (
              <>
                <StopIcon className="w-5 h-5" />
                <motion.div
                  className="flex gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.span
                    className="w-1 h-4 bg-white rounded-full"
                    animate={{ scaleY: [1, 1.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
                  />
                  <motion.span
                    className="w-1 h-4 bg-white rounded-full"
                    animate={{ scaleY: [1, 1.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0.1 }}
                  />
                  <motion.span
                    className="w-1 h-4 bg-white rounded-full"
                    animate={{ scaleY: [1, 1.5, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0.2 }}
                  />
                </motion.div>
              </>
            ) : (
              <MicrophoneIcon className="w-5 h-5" />
            )}
          </div>
        </Button>

        {/* Status indicators - moved to tooltip/modal instead of cluttering UI */}
        {transcript && !error && (
          <Button
            onClick={handleClear}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2"
            title="Clear transcript"
          >
            <CheckCircleIcon className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Smart responsive live transcript display */}
      <AnimatePresence>
        {showTranscript && (transcript || interimTranscript) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ 
              type: "spring",
              damping: 20,
              stiffness: 300,
              duration: 0.2 
            }}
            className="absolute z-20 mt-2 lg:top-full lg:left-0 md:top-full md:left-1/2 md:-translate-x-1/2 sm:fixed sm:bottom-24 sm:left-4 sm:right-4 sm:top-auto max-w-sm sm:max-w-md lg:max-w-lg bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-600/50 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-3 sm:p-4 lg:p-5"
          >
            {/* Mobile drag indicator */}
            <div className="sm:hidden w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-3" />
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {isListening ? (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="relative"
                  >
                    <SpeakerWaveIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
                    {/* Pulse ring for active listening */}
                    <div className="absolute inset-0 w-5 h-5 sm:w-6 sm:h-6 border-2 border-blue-400 rounded-full animate-ping opacity-20" />
                  </motion.div>
                ) : (
                  <div className="relative">
                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
                    <div className="absolute -inset-1 bg-green-100 dark:bg-green-900/30 rounded-full -z-10" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Status with responsive sizing */}
                <motion.div 
                  className="flex items-center gap-2 mb-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400">
                    {isListening ? 'Listening...' : 'Voice input complete'}
                  </div>
                  {isListening && (
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1 h-3 bg-blue-500 rounded-full"
                          animate={{ scaleY: [1, 1.5, 1] }}
                          transition={{ 
                            duration: 0.6, 
                            repeat: Infinity, 
                            delay: i * 0.1 
                          }}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Transcript content with responsive typography */}
                <motion.div 
                  className="text-sm sm:text-base text-gray-900 dark:text-gray-100 leading-relaxed"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {transcript && (
                    <span className="text-gray-700 dark:text-gray-300 font-medium">
                      {transcript}
                    </span>
                  )}
                  {interimTranscript && (
                    <span className="text-gray-400 dark:text-gray-500 italic ml-1">
                      {interimTranscript}
                    </span>
                  )}
                </motion.div>

                {/* Character count for longer transcripts */}
                {(transcript + interimTranscript).length > 50 && (
                  <motion.div 
                    className="mt-2 text-xs text-gray-400 dark:text-gray-500"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {(transcript + interimTranscript).length} characters
                  </motion.div>
                )}
              </div>

              {/* Close button for mobile */}
              <div className="sm:hidden">
                <button
                  onClick={() => setShowTranscript(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Progress bar for listening duration */}
            {isListening && (
              <motion.div
                className="mt-3 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 30, ease: "linear" }}
                />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>


      {/* Smart responsive error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300
            }}
            className="z-30 mt-2 lg:absolute lg:top-full lg:left-0 md:absolute md:top-full md:left-1/2 md:-translate-x-1/2 sm:fixed sm:top-4 sm:left-4 sm:right-4 max-w-sm sm:max-w-md bg-red-50 dark:bg-red-900/40 backdrop-blur-xl border border-red-200/60 dark:border-red-800/60 rounded-xl shadow-lg sm:shadow-xl p-3 sm:p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="relative">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <div className="absolute -inset-1 bg-red-100 dark:bg-red-900/50 rounded-full -z-10" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <p className="text-sm sm:text-base font-medium text-red-800 dark:text-red-200 mb-1">
                    Voice Input Error
                  </p>
                  <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 leading-relaxed">
                    {error}
                  </p>
                </motion.div>
              </div>

              {/* Auto-dismiss button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => {
                  // This would typically clear the error in the parent component
                  // For now, we'll just hide the toast
                }}
                className="flex-shrink-0 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200 transition-colors rounded-md hover:bg-red-100 dark:hover:bg-red-900/50"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </div>

            {/* Auto-dismiss progress bar */}
            <motion.div
              className="mt-3 h-1 bg-red-200 dark:bg-red-800/50 rounded-full overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                className="h-full bg-red-500 dark:bg-red-400"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 5, ease: "linear" }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  )
}