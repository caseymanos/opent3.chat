'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  XMarkIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline'
import { Badge } from './ui/badge'
import type { Task, TaskExtractionResult } from '@/lib/task-extractor'
import TaskExportSelector from './TaskExportSelector'
import { createPortal } from 'react-dom'

interface TaskExtractorDropdownProps {
  conversationId: string
  className?: string
  messageCount?: number
}

export default function TaskExtractorDropdown({ 
  conversationId, 
  className = '', 
  messageCount = 0 
}: TaskExtractorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<TaskExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const extractTasks = async () => {
    if (!conversationId || isExtracting) return

    setIsExtracting(true)
    setError(null)
    setIsOpen(true)
    
    // Reset previous results when re-extracting
    if (extractionResult) {
      setExtractionResult(null)
    }

    try {
      const response = await fetch('/api/extract-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to extract tasks' }))
        throw new Error(errorData.error || 'Failed to extract tasks')
      }

      const result = await response.json()
      setExtractionResult(result)
    } catch (err) {
      console.error('Task extraction error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleExport = () => {
    if (!extractionResult) return
    setShowExportModal(true)
    setIsOpen(false)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30'
      case 'high': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30'
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-950/30'
      default: return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30'
    }
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => {
          if (!isOpen && !extractionResult) {
            extractTasks()
          } else {
            setIsOpen(!isOpen)
          }
        }}
        disabled={isExtracting}
        className={`relative flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg transition-all ${
          isExtracting 
            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 cursor-wait' 
            : extractionResult 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
        }`}
      >
        <ClipboardDocumentListIcon className="w-4 h-4" />
        <span>
          {isExtracting ? 'Extracting...' : 'Extract Tasks'}
        </span>
        {extractionResult && (
          <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
            {extractionResult.totalTasksFound}
          </Badge>
        )}
        <ChevronDownIcon className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 w-[450px] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardDocumentListIcon className="w-5 h-5 text-purple-600" />
                  <h3 className="font-semibold text-sm">
                    {isExtracting ? 'Analyzing Conversation...' : 'Extracted Tasks'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {isExtracting ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Analyzing {messageCount} messages...
                  </p>
                </div>
              ) : error ? (
                <div className="p-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                      <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">{error}</span>
                    </p>
                  </div>
                  <button
                    onClick={extractTasks}
                    className="mt-3 w-full text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : extractionResult && extractionResult.tasks.length > 0 ? (
                <div className="p-4 space-y-3">
                  {/* Summary */}
                  {extractionResult.summary && (
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {extractionResult.summary}
                      </p>
                    </div>
                  )}

                  {/* Tasks List */}
                  <div className="space-y-2">
                    {extractionResult.tasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className={`p-3 rounded-lg border ${
                          task.priority === 'urgent' ? 'border-red-200 dark:border-red-800' :
                          task.priority === 'high' ? 'border-orange-200 dark:border-orange-800' :
                          task.priority === 'medium' ? 'border-yellow-200 dark:border-yellow-800' :
                          'border-green-200 dark:border-green-800'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`mt-0.5 p-1 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'urgent' || task.priority === 'high' ? (
                              <ExclamationTriangleIcon className="w-3 h-3" />
                            ) : (
                              <CheckCircleIcon className="w-3 h-3" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {task.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 line-clamp-2">
                              {task.description}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {task.category}
                              </Badge>
                              {task.estimatedHours && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <ClockIcon className="w-3 h-3" />
                                  {task.estimatedHours}h
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {extractionResult.tasks.length > 5 && (
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                      +{extractionResult.tasks.length - 5} more tasks
                    </p>
                  )}
                </div>
              ) : extractionResult ? (
                <div className="p-8 text-center">
                  <ClipboardDocumentListIcon className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No actionable tasks found
                  </p>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            {extractionResult && extractionResult.tasks.length > 0 && (
              <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <button
                  onClick={handleExport}
                  className="w-full flex items-center justify-center gap-2 text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" />
                  Export Tasks
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Modal */}
      {showExportModal && extractionResult && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ArrowsPointingOutIcon className="w-5 h-5 text-purple-600" />
                  Export Tasks
                </h2>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <TaskExportSelector 
                taskResult={extractionResult}
                onExportComplete={() => setShowExportModal(false)}
              />
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}