'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface ThoughtStep {
  type: 'analysis' | 'reasoning' | 'conclusion' | 'verification'
  thought: string
  confidence?: number
  evidence?: string[]
  duration?: number
}

interface ChainOfThoughtProps {
  reasoning: ThoughtStep[]
  isVisible?: boolean
  onToggle?: () => void
}

export default function ChainOfThought({ 
  reasoning, 
  isVisible = true, 
  onToggle 
}: ChainOfThoughtProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  const getStepIcon = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'analysis':
        return '🔍'
      case 'reasoning':
        return '🧠'
      case 'conclusion':
        return '💡'
      case 'verification':
        return '✅'
      default:
        return '🤔'
    }
  }

  const getStepColor = (type: ThoughtStep['type']) => {
    switch (type) {
      case 'analysis':
        return 'from-blue-500 to-blue-600'
      case 'reasoning':
        return 'from-purple-500 to-purple-600'
      case 'conclusion':
        return 'from-green-500 to-green-600'
      case 'verification':
        return 'from-orange-500 to-orange-600'
      default:
        return 'from-slate-500 to-slate-600'
    }
  }

  if (!reasoning || reasoning.length === 0) return null

  return (
    <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50/50 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-white text-sm">🧠</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Chain of Thought
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {reasoning.length} reasoning steps
            </p>
          </div>
        </div>
        
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {isVisible ? (
              <ChevronDownIcon className="w-4 h-4" />
            ) : (
              <ChevronRightIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Reasoning Steps */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3 overflow-hidden"
          >
            {reasoning.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < reasoning.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-6 bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-600" />
                )}

                <div className="flex items-start gap-4">
                  {/* Step Number & Icon */}
                  <div className="flex-shrink-0 relative">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getStepColor(step.type)} flex items-center justify-center shadow-sm`}>
                      <span className="text-white text-lg font-medium">
                        {index + 1}
                      </span>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-xs border-2 border-white dark:border-slate-800">
                      {getStepIcon(step.type)}
                    </div>
                  </div>

                  {/* Step Content */}
                  <div className="flex-1 min-w-0">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                            {step.type}
                          </span>
                          {step.confidence && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">
                              {(step.confidence * 100).toFixed(0)}% confidence
                            </span>
                          )}
                        </div>
                        
                        {step.evidence && step.evidence.length > 0 && (
                          <button
                            onClick={() => toggleStep(index)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {expandedSteps.has(index) ? 'Hide' : 'Show'} evidence
                          </button>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                        {step.thought}
                      </p>

                      {/* Evidence Section */}
                      <AnimatePresence>
                        {expandedSteps.has(index) && step.evidence && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 overflow-hidden"
                          >
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                              Supporting Evidence:
                            </p>
                            <ul className="space-y-1">
                              {step.evidence.map((evidence, evidenceIndex) => (
                                <li key={evidenceIndex} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                  <span className="text-slate-400 mt-1">•</span>
                                  <span>{evidence}</span>
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Duration */}
                      {step.duration && (
                        <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                          Processing time: {step.duration}ms
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Example usage component
export function ExampleChainOfThought() {
  const [isVisible, setIsVisible] = useState(true)

  const exampleReasoning: ThoughtStep[] = [
    {
      type: 'analysis',
      thought: 'The user is asking about implementing a sorting algorithm. I need to consider their experience level and requirements.',
      confidence: 0.95,
      evidence: [
        'User mentioned "beginner-friendly"',
        'Context suggests learning environment',
        'No specific performance requirements mentioned'
      ],
      duration: 120
    },
    {
      type: 'reasoning',
      thought: 'Bubble sort would be easiest to understand, but merge sort offers better performance. Given the learning context, I should explain both options.',
      confidence: 0.87,
      evidence: [
        'Bubble sort has O(n²) complexity but simple logic',
        'Merge sort has O(n log n) but more complex',
        'Educational value in showing progression'
      ],
      duration: 240
    },
    {
      type: 'conclusion',
      thought: 'I will recommend starting with bubble sort for understanding, then introducing merge sort for efficiency.',
      confidence: 0.92,
      duration: 80
    },
    {
      type: 'verification',
      thought: 'This approach balances learning objectives with practical value.',
      confidence: 0.89,
      duration: 60
    }
  ]

  return (
    <ChainOfThought
      reasoning={exampleReasoning}
      isVisible={isVisible}
      onToggle={() => setIsVisible(!isVisible)}
    />
  )
}