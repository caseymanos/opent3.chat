'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ClockIcon,
  ChartBarIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { CpuChipIcon, EyeIcon, AcademicCapIcon } from '@heroicons/react/24/solid'

interface ThoughtStep {
  type: 'analysis' | 'reasoning' | 'conclusion' | 'verification' | 'reflection' | 'hypothesis' | 'evaluation'
  thought: string
  confidence?: number
  evidence?: string[]
  duration?: number
  emotion?: 'curious' | 'confident' | 'uncertain' | 'excited' | 'concerned' | 'satisfied'
  keywords?: string[]
  relatedConcepts?: string[]
  complexity?: number // 1-5 scale
  timestamp?: number
}

interface EnhancedChainOfThoughtProps {
  reasoning: ThoughtStep[]
  isVisible?: boolean
  onToggle?: () => void
  autoPlay?: boolean
  showMetrics?: boolean
  enableVoice?: boolean
  theme?: 'default' | 'neural' | 'scientific' | 'creative'
}

export default function EnhancedChainOfThought({ 
  reasoning, 
  isVisible = true, 
  onToggle,
  autoPlay = false,
  showMetrics = true,
  enableVoice = false,
  theme = 'neural'
}: EnhancedChainOfThoughtProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())
  const [currentStep, setCurrentStep] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackSpeed] = useState(1)
  const [voiceEnabled, setVoiceEnabled] = useState(enableVoice)
  const [showComplexity, setShowComplexity] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout>()

  // Auto-play functionality
  useEffect(() => {
    if (autoPlay && reasoning.length > 0) {
      setIsPlaying(true)
      setCurrentStep(0)
    }
  }, [autoPlay, reasoning])

  useEffect(() => {
    if (isPlaying && currentStep < reasoning.length - 1) {
      const baseDelay = reasoning[currentStep + 1]?.duration || 1000
      const delay = baseDelay / playbackSpeed
      
      intervalRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1)
      }, delay)
    } else if (currentStep >= reasoning.length - 1) {
      setIsPlaying(false)
    }

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current)
    }
  }, [isPlaying, currentStep, reasoning, playbackSpeed])

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  const playPause = () => {
    setIsPlaying(!isPlaying)
  }

  const stepForward = () => {
    if (currentStep < reasoning.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const stepBackward = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const speakStep = (step: ThoughtStep) => {
    if (voiceEnabled && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(step.thought)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const getStepIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'analysis':
        return <EyeIcon className="w-4 h-4" />
      case 'reasoning':
        return <AcademicCapIcon className="w-4 h-4" />
      case 'conclusion':
        return <LightBulbIcon className="w-4 h-4" />
      case 'verification':
        return <CheckCircleIcon className="w-4 h-4" />
      case 'reflection':
        return <CpuChipIcon className="w-4 h-4" />
      case 'hypothesis':
        return <ExclamationTriangleIcon className="w-4 h-4" />
      case 'evaluation':
        return <ChartBarIcon className="w-4 h-4" />
      default:
        return <AcademicCapIcon className="w-4 h-4" />
    }
  }

  const getThemeColors = () => {
    switch (theme) {
      case 'neural':
        return {
          primary: 'from-cyan-500 to-blue-600',
          secondary: 'from-purple-500 to-pink-600',
          accent: 'from-emerald-500 to-teal-600',
          background: 'from-slate-900/20 to-blue-900/20'
        }
      case 'scientific':
        return {
          primary: 'from-emerald-500 to-green-600',
          secondary: 'from-blue-500 to-indigo-600',
          accent: 'from-amber-500 to-orange-600',
          background: 'from-emerald-50/50 to-blue-50/50'
        }
      case 'creative':
        return {
          primary: 'from-pink-500 to-rose-600',
          secondary: 'from-purple-500 to-violet-600',
          accent: 'from-amber-500 to-yellow-600',
          background: 'from-pink-50/50 to-purple-50/50'
        }
      default:
        return {
          primary: 'from-purple-500 to-blue-600',
          secondary: 'from-indigo-500 to-purple-600',
          accent: 'from-emerald-500 to-cyan-600',
          background: 'from-slate-50/50 to-slate-100/50'
        }
    }
  }

  const getStepColor = (type: ThoughtStep['type'], isActive: boolean = false) => {
    const colors = getThemeColors()
    
    if (isActive) return colors.accent
    
    switch (type) {
      case 'analysis':
        return colors.primary
      case 'reasoning':
        return colors.secondary
      case 'conclusion':
        return colors.accent
      case 'verification':
        return 'from-green-500 to-emerald-600'
      case 'reflection':
        return 'from-indigo-500 to-blue-600'
      case 'hypothesis':
        return 'from-amber-500 to-orange-600'
      case 'evaluation':
        return 'from-rose-500 to-pink-600'
      default:
        return colors.primary
    }
  }

  const getEmotionEmoji = (emotion?: ThoughtStep['emotion']) => {
    switch (emotion) {
      case 'curious': return '🤔'
      case 'confident': return '😎'
      case 'uncertain': return '🤷'
      case 'excited': return '🤗'
      case 'concerned': return '😟'
      case 'satisfied': return '😌'
      default: return '🧠'
    }
  }

  const getComplexityColor = (complexity?: number) => {
    if (!complexity) return 'bg-gray-400'
    if (complexity <= 2) return 'bg-green-500'
    if (complexity <= 3) return 'bg-yellow-500'
    if (complexity <= 4) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const calculateMetrics = () => {
    const totalDuration = reasoning.reduce((sum, step) => sum + (step.duration || 0), 0)
    const avgConfidence = reasoning.reduce((sum, step) => sum + (step.confidence || 0), 0) / reasoning.length
    const complexityScore = reasoning.reduce((sum, step) => sum + (step.complexity || 1), 0) / reasoning.length
    
    return { totalDuration, avgConfidence, complexityScore }
  }

  if (!reasoning || reasoning.length === 0) return null

  const { totalDuration, avgConfidence, complexityScore } = calculateMetrics()
  const colors = getThemeColors()

  return (
    <div className={`space-y-4 p-6 bg-gradient-to-br ${colors.background} dark:from-slate-800/50 dark:to-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-lg shadow-xl`}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.primary} flex items-center justify-center shadow-lg`}>
            <AcademicCapIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Enhanced Chain of Thought
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {reasoning.length} reasoning steps • {Math.round(totalDuration)}ms total
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Playback Controls */}
          <div className="flex items-center gap-1 bg-white/50 dark:bg-slate-800/50 rounded-lg p-1">
            <button
              onClick={stepBackward}
              disabled={currentStep <= 0}
              className="p-2 rounded-md hover:bg-white/70 dark:hover:bg-slate-700/70 disabled:opacity-50 transition-colors"
            >
              <BackwardIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={playPause}
              className="p-2 rounded-md hover:bg-white/70 dark:hover:bg-slate-700/70 transition-colors"
            >
              {isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
            </button>
            
            <button
              onClick={stepForward}
              disabled={currentStep >= reasoning.length - 1}
              className="p-2 rounded-md hover:bg-white/70 dark:hover:bg-slate-700/70 disabled:opacity-50 transition-colors"
            >
              <ForwardIcon className="w-4 h-4" />
            </button>
          </div>

          {/* Voice Toggle */}
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {voiceEnabled ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerXMarkIcon className="w-4 h-4" />}
          </button>

          {/* Metrics Toggle */}
          <button
            onClick={() => setShowComplexity(!showComplexity)}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChartBarIcon className="w-4 h-4" />
          </button>

          {/* Main Toggle */}
          {onToggle && (
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isVisible ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Metrics Panel */}
      {showMetrics && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-white/30 dark:bg-slate-800/30 rounded-xl">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {(avgConfidence * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Avg Confidence</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {complexityScore.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Complexity Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {Math.round(totalDuration)}ms
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Processing Time</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {currentStep >= 0 && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div 
            className={`h-2 bg-gradient-to-r ${colors.accent} rounded-full transition-all duration-500`}
            style={{ width: `${((currentStep + 1) / reasoning.length) * 100}%` }}
          />
        </div>
      )}

      {/* Enhanced Reasoning Steps */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="space-y-4 overflow-hidden"
          >
            {reasoning.map((step, index) => {
              const isActive = index === currentStep
              const isFuture = index > currentStep
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -30, scale: 0.95 }}
                  animate={{ 
                    opacity: isFuture && currentStep >= 0 ? 0.3 : 1, 
                    x: 0, 
                    scale: isActive ? 1.02 : 1,
                    filter: isActive ? 'brightness(1.1)' : 'brightness(1)'
                  }}
                  transition={{ 
                    delay: index * 0.1, 
                    duration: 0.4,
                    type: "spring",
                    stiffness: 100,
                    damping: 20
                  }}
                  className="relative"
                  onAnimationComplete={() => {
                    if (isActive && voiceEnabled) {
                      speakStep(step)
                    }
                  }}
                >
                  {/* Neural Connection Lines */}
                  {index < reasoning.length - 1 && (
                    <div className="absolute left-8 top-16 w-0.5 h-8 bg-gradient-to-b from-cyan-400 via-blue-500 to-transparent dark:from-cyan-600 opacity-60" />
                  )}

                  <div className="flex items-start gap-6">
                    {/* Enhanced Step Number & Icon */}
                    <div className="flex-shrink-0 relative">
                      <motion.div 
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${getStepColor(step.type, isActive)} flex items-center justify-center shadow-lg relative overflow-hidden`}
                        animate={{
                          boxShadow: isActive ? '0 0 30px rgba(59, 130, 246, 0.5)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        {isActive && (
                          <motion.div
                            className="absolute inset-0 bg-white/20"
                            animate={{
                              scale: [1, 1.5, 1],
                              opacity: [0.5, 0, 0.5]
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                          />
                        )}
                        
                        <div className="relative z-10 text-white">
                          <div className="text-lg font-bold">{index + 1}</div>
                        </div>
                      </motion.div>
                      
                      {/* Type Icon */}
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 border-2 border-white dark:border-slate-800 shadow-sm">
                        {getStepIcon(step.type)}
                      </div>

                      {/* Emotion Indicator */}
                      {step.emotion && (
                        <div className="absolute -top-2 -left-2 w-8 h-8 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-lg border-2 border-white dark:border-slate-800 shadow-sm">
                          {getEmotionEmoji(step.emotion)}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Step Content */}
                    <div className="flex-1 min-w-0">
                      <motion.div 
                        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg"
                        animate={{
                          borderColor: isActive ? 'rgba(59, 130, 246, 0.5)' : 'rgba(148, 163, 184, 0.2)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-300 capitalize">
                              {step.type}
                            </span>
                            
                            {step.confidence && (
                              <span className={`text-sm px-3 py-1.5 rounded-full ${
                                step.confidence > 0.8 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                                step.confidence > 0.6 ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                                'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
                              }`}>
                                {(step.confidence * 100).toFixed(0)}% confidence
                              </span>
                            )}

                            {showComplexity && step.complexity && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-slate-500">Complexity:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map(level => (
                                    <div
                                      key={level}
                                      className={`w-2 h-2 rounded-full ${
                                        level <= step.complexity! ? getComplexityColor(step.complexity) : 'bg-slate-300 dark:bg-slate-600'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {step.duration && (
                              <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <ClockIcon className="w-3 h-3" />
                                {step.duration}ms
                              </div>
                            )}
                            
                            <button
                              onClick={() => navigator.clipboard.writeText(step.thought)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                            </button>

                            {step.evidence && step.evidence.length > 0 && (
                              <button
                                onClick={() => toggleStep(index)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {expandedSteps.has(index) ? 'Hide' : 'Show'} evidence
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-3">
                          {step.thought}
                        </p>

                        {/* Keywords */}
                        {step.keywords && step.keywords.length > 0 && (
                          <div className="mb-3">
                            <div className="flex flex-wrap gap-2">
                              {step.keywords.map((keyword, kidx) => (
                                <span
                                  key={kidx}
                                  className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-md"
                                >
                                  #{keyword}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Evidence Section */}
                        <AnimatePresence>
                          {expandedSteps.has(index) && step.evidence && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 overflow-hidden"
                            >
                              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">
                                Supporting Evidence:
                              </p>
                              <ul className="space-y-2">
                                {step.evidence.map((evidence, evidenceIndex) => (
                                  <motion.li 
                                    key={evidenceIndex}
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: evidenceIndex * 0.1 }}
                                    className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-3 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                                  >
                                    <span className="text-blue-500 mt-1">●</span>
                                    <span>{evidence}</span>
                                  </motion.li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Related Concepts */}
                        {step.relatedConcepts && step.relatedConcepts.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Related Concepts:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {step.relatedConcepts.map((concept, cidx) => (
                                <span
                                  key={cidx}
                                  className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-md"
                                >
                                  {concept}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}