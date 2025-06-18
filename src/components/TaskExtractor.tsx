'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
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
import TasksPanel from './TasksPanel'
import type { Task, TaskExtractionResult } from '@/lib/task-extractor'

interface TaskExtractorProps {
  conversationId: string
  className?: string
  messageCount?: number
}

export default function TaskExtractor({ conversationId, className = '', messageCount = 0 }: TaskExtractorProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<TaskExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Debug logging
  console.log('TaskExtractor rendered with conversationId:', conversationId)

  const extractTasks = async () => {
    console.log('Extract Tasks button clicked!', { conversationId })
    
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
      setIsPanelOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleExport = () => {
    console.log('handleExport called', { extractionResult })
    
    if (!extractionResult) {
      console.warn('No extraction result available for export')
      return
    }
    
    // Export tasks to clipboard as JSON
    const tasksJson = JSON.stringify(extractionResult.tasks, null, 2)
    console.log('Attempting to copy tasks to clipboard:', tasksJson)
    
    navigator.clipboard.writeText(tasksJson).then(() => {
      console.log('Successfully copied tasks to clipboard')
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
      // Fallback: try to show an alert
      alert('Failed to copy to clipboard. Please check console for details.')
    })
  }


  return (
    <>
      {/* Header Button - Compact Version */}
      <div className={`relative ${className}`}>
        <Button
          onClick={extractTasks}
          disabled={isExtracting || !conversationId}
          variant="outline"
          size="sm"
          className="flex items-center gap-1 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50 border border-purple-300 dark:border-purple-700 px-2 py-1"
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
          <span className="text-xs hidden lg:inline">
            {isExtracting ? 'Extracting...' : 'Tasks'}
          </span>
        </Button>
      </div>

      {/* Floating Action Button - More Prominent */}
      {conversationId && messageCount > 1 && typeof window !== 'undefined' && createPortal(
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-24 right-6"
          style={{ zIndex: 999999 }}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            {/* Enhanced Glowing Background Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full blur-xl opacity-75 animate-pulse"></div>
            <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-2xl"></div>
            
            {/* Main Button */}
            <Button
              onClick={extractTasks}
              disabled={isExtracting || !conversationId}
              size="lg"
              className="relative rounded-full w-20 h-20 shadow-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white border-4 border-white/30 transition-all duration-300 backdrop-blur-sm"
              title="Extract action items and tasks from conversation"
            >
              {isExtracting ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <SparklesIcon className="w-8 h-8" />
                </motion.div>
              ) : (
                <ClipboardDocumentListIcon className="w-8 h-8" />
              )}
            </Button>
            
            {/* Tooltip/Label */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-slate-700 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
            >
              Extract Tasks
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-slate-900 dark:border-l-slate-700"></div>
            </motion.div>
          </motion.div>
        </motion.div>,
        document.body
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 mt-2 p-3 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200 z-10"
        >
          Failed to extract tasks: {error}
        </motion.div>
      )}

      {/* Tasks Panel */}
      <TasksPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        extractionResult={extractionResult}
        onExport={handleExport}
      />
    </>
  )
}