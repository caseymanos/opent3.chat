'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TagIcon,
  ArrowDownIcon,
  MinusIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import type { Task, TaskExtractionResult } from '@/lib/task-extractor'

interface TasksPanelProps {
  isOpen: boolean
  onClose: () => void
  extractionResult: TaskExtractionResult | null
  onExport: () => void
}

const handleExportClick = (extractionResult: TaskExtractionResult | null, onExport: () => void) => {
  console.log('Export button clicked', { extractionResult, onExport })
  
  if (!extractionResult) {
    console.warn('No extraction result available')
    return
  }
  
  // Try the passed export function first
  if (onExport) {
    try {
      onExport()
      return
    } catch (error) {
      console.error('Error with passed export function:', error)
    }
  }
  
  // Fallback export implementation
  try {
    const tasksJson = JSON.stringify(extractionResult.tasks, null, 2)
    navigator.clipboard.writeText(tasksJson).then(() => {
      console.log('Tasks copied to clipboard successfully')
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
      console.error('Failed to copy tasks to clipboard:', err)
    })
  } catch (error) {
    console.error('Error in fallback export:', error)
  }
}

export default function TasksPanel({ isOpen, onClose, extractionResult, onExport }: TasksPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [panelWidth, setPanelWidth] = useState(420)
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsResizing(true)
    const startX = e.clientX
    const startWidth = panelWidth
    
    const handleMouseMove = (e: MouseEvent) => {
      const diff = startX - e.clientX
      const newWidth = Math.max(300, Math.min(800, startWidth + diff))
      setPanelWidth(newWidth)
    }
    
    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [panelWidth])
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: isMinimized ? `calc(100% - 60px)` : 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex"
          style={{ width: isMinimized ? '60px' : `${panelWidth}px` }}
        >
          {/* Resize Handle */}
          <div
            className={`w-1 bg-gray-300 dark:bg-gray-600 hover:bg-purple-500 cursor-col-resize transition-colors ${
              isResizing ? 'bg-purple-500' : ''
            } ${isMinimized ? 'hidden' : ''}`}
            onMouseDown={handleMouseDown}
          />
          
          {/* Panel Content */}
          <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            {isMinimized ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={() => setIsMinimized(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Expand Tasks Panel"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <ClipboardDocumentListIcon className="w-4 h-4 text-white" />
                </div>
                {extractionResult && (
                  <div className="text-xs text-center text-slate-500 dark:text-slate-400 writing-mode-vertical transform rotate-180">
                    {extractionResult.totalTasksFound}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <ClipboardDocumentListIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Extracted Tasks
                    </h3>
                    {extractionResult && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {extractionResult.totalTasksFound} tasks found • {extractionResult.extractionMetadata.complexity} complexity
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Minimize Panel"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    title="Close Panel"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="flex-1 overflow-y-auto p-4">
              {extractionResult ? (
              <>
                {/* Summary - Always show if we have extraction result */}
                {extractionResult.summary && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Summary</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-3">{extractionResult.summary}</p>
                    
                    {extractionResult.extractionMetadata.primaryTopics.length > 0 && (
                      <div className="flex flex-wrap gap-2">
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
                    )}
                  </div>
                )}

                {/* Tasks */}
                {extractionResult.tasks.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Action Items ({extractionResult.tasks.length})
                    </h4>
                    
                    {extractionResult.tasks.map((task, index) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-3 border-l-4 rounded-lg ${getPriorityColor(task.priority)}`}
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
                            </div>
                            
                            <h5 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">
                              {task.title}
                            </h5>
                            
                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                              {task.description}
                            </p>
                            
                            {task.tags && task.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {task.tags.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-3 flex flex-col items-end gap-1 text-xs">
                            {task.estimatedHours && (
                              <span className="text-gray-500 dark:text-gray-400">
                                ~{task.estimatedHours}h
                              </span>
                            )}
                            {task.confidence && (
                              <span className="text-gray-500 dark:text-gray-400">
                                {Math.round(task.confidence * 100)}%
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
              </>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tasks extracted yet.</p>
              </div>
            )}
            </div>
          )}

          {/* Footer */}
          {extractionResult && !isMinimized && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  From {extractionResult.extractionMetadata.conversationLength} messages
                </div>
                <Button 
                  onClick={() => handleExportClick(extractionResult, onExport)}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-1.5 px-3"
                  data-export-button
                >
                  Export Tasks
                </Button>
              </div>
            </div>
          )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}