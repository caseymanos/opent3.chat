'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClipboardDocumentListIcon, 
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TagIcon,
  ArrowDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import type { Task, TaskExtractionResult } from '@/lib/task-extractor'

interface TaskExtractorProps {
  conversationId: string
  className?: string
}

export default function TaskExtractor({ conversationId, className = '' }: TaskExtractorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<TaskExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Debug logging
  console.log('TaskExtractor rendered with conversationId:', conversationId)

  const extractTasks = async () => {
    console.log('Extract Tasks button clicked!', { conversationId })
    alert('Extract Tasks button clicked!')
    
    if (!conversationId) return

    setIsExtracting(true)
    setError(null)

    try {
      const response = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to extract tasks')
      }

      const result = await response.json()
      setExtractionResult(result)
      setIsOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsExtracting(false)
    }
  }

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
      case 'high':
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" />
      case 'medium':
        return <ClockIcon className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <ClockIcon className="w-4 h-4 text-green-500" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20'
      case 'high':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20'
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20'
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-950/20'
    }
  }

  const getCategoryEmoji = (category: Task['category']) => {
    switch (category) {
      case 'technical': return '⚙️'
      case 'research': return '🔍'
      case 'design': return '🎨'
      case 'business': return '💼'
      case 'testing': return '🧪'
      case 'documentation': return '📝'
      default: return '📋'
    }
  }

  return (
    <div className={`relative z-10 ${className}`}>
      <Button
        onClick={extractTasks}
        disabled={isExtracting || !conversationId}
        variant="outline"
        size="sm"
        className="flex items-center gap-2 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-700"
        title="Extract action items and tasks from conversation"
      >
        {isExtracting ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <SparklesIcon className="w-4 h-4" />
          </motion.div>
        ) : (
          <ClipboardDocumentListIcon className="w-4 h-4" />
        )}
        <span>
          {isExtracting ? 'Extracting...' : 'Extract Tasks'}
        </span>
      </Button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 z-10"
        >
          Failed to extract tasks: {error}
        </motion.div>
      )}

      <AnimatePresence>
        {isOpen && extractionResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
            onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Extracted Tasks
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {extractionResult.totalTasksFound} tasks found • {extractionResult.extractionMetadata.complexity} complexity
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                {/* Summary */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{extractionResult.summary}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    {extractionResult.extractionMetadata.primaryTopics.map((topic, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                      >
                        <TagIcon className="w-3 h-3" />
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Tasks */}
                {extractionResult.tasks.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Action Items ({extractionResult.tasks.length})
                    </h4>
                    
                    {extractionResult.tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 border-l-4 rounded-lg ${getPriorityColor(task.priority)}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {getPriorityIcon(task.priority)}
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {task.priority}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {getCategoryEmoji(task.category)} {task.category}
                              </span>
                              {task.confidence && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {Math.round(task.confidence * 100)}% confidence
                                </span>
                              )}
                            </div>
                            
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {task.title}
                            </h5>
                            
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                              {task.description}
                            </p>
                            
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-4 flex flex-col items-end gap-2">
                            {task.estimatedHours && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ~{task.estimatedHours}h
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No specific tasks were identified in this conversation.</p>
                    <p className="text-sm mt-1">Try having a more action-oriented discussion!</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Extracted from {extractionResult.extractionMetadata.conversationLength} messages
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsOpen(false)}
                    >
                      Close
                    </Button>
                    <Button 
                      onClick={() => {
                        // Export tasks to clipboard as JSON
                        const tasksJson = JSON.stringify(extractionResult.tasks, null, 2)
                        navigator.clipboard.writeText(tasksJson).then(() => {
                          // Show success feedback
                          const button = document.querySelector('[data-export-button]') as HTMLButtonElement
                          if (button) {
                            const originalText = button.textContent
                            button.textContent = 'Copied!'
                            setTimeout(() => {
                              button.textContent = originalText
                            }, 2000)
                          }
                        }).catch((err) => {
                          console.error('Failed to copy tasks:', err)
                        })
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-export-button
                    >
                      Export Tasks
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}