'use client'

import { useState, useEffect } from 'react'
import { 
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { Badge } from './ui/badge'
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


  const extractTasks = async () => {
    if (!conversationId) return

    // Show modal immediately and start extracting
    setIsPanelOpen(true)
    setIsExtracting(true)
    setError(null)
    setExtractionResult(null) // Clear previous results

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      setIsPanelOpen(false) // Close modal on error
    } finally {
      setIsExtracting(false)
    }
  }

  const handleExport = () => {
    if (!extractionResult) return
    
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
      console.error('Failed to copy tasks to clipboard:', err)
      alert('Failed to copy to clipboard. Please check console for details.')
    })
  }


  return (
    <>
      {/* Extract Tasks Button - OpenRouter Style */}
      <button
        onClick={extractTasks}
        disabled={isExtracting || !conversationId}
        className={`relative text-xs px-3 py-1.5 rounded-full transition-colors ${
          isExtracting
            ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
        } ${className}`}
        title="Extract action items and tasks from conversation"
      >
        📋 {isExtracting ? 'Extracting...' : 'Extract Tasks'}
        {extractionResult && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full"></span>
        )}
      </button>



      {/* Extract Tasks Modal - OpenRouter Style */}
      {isPanelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  📋 {extractionResult ? 'Extracted Tasks' : 'Task Extraction'}
                  {extractionResult && (
                    <Badge variant="outline" className="text-purple-600">
                      {extractionResult.totalTasksFound} tasks
                    </Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {extractionResult 
                    ? `${extractionResult.extractionMetadata.complexity} complexity • ${extractionResult.extractionMetadata.conversationLength} messages`
                    : 'Analyzing conversation for actionable items...'
                  }
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsPanelOpen(false)}>
                ✕
              </Button>
            </div>

            
            <div className="p-6 space-y-6">
              {!extractionResult ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Analyzing conversation...</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">This may take a few seconds</p>
                </div>
              ) : (
                <>
                  {/* Summary */}
                  {extractionResult.summary && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Summary</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{extractionResult.summary}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-3">
                        {extractionResult.extractionMetadata.primaryTopics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-blue-600">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Tasks */}
                {extractionResult.tasks.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      Action Items ({extractionResult.tasks.length})
                    </h4>
                    
                    {extractionResult.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`p-4 border-l-4 rounded-lg ${
                          task.priority === 'urgent' ? 'border-l-red-500 bg-red-50 dark:bg-red-950/20' :
                          task.priority === 'high' ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20' :
                          task.priority === 'medium' ? 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20' :
                          'border-l-green-500 bg-green-50 dark:bg-green-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {task.priority === 'urgent' || task.priority === 'high' ? (
                                <ExclamationTriangleIcon className={`w-4 h-4 ${task.priority === 'urgent' ? 'text-red-500' : 'text-orange-500'}`} />
                              ) : (
                                <ClockIcon className={`w-4 h-4 ${task.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'}`} />
                              )}
                              <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {task.priority}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {task.category === 'technical' ? '⚙️' :
                                 task.category === 'research' ? '🔍' :
                                 task.category === 'design' ? '🎨' :
                                 task.category === 'business' ? '💼' :
                                 task.category === 'testing' ? '🧪' :
                                 task.category === 'documentation' ? '📝' : '📋'} {task.category}
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
                      </div>
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
              )}
              
              {/* Footer */}
              <div className="flex items-center justify-between pt-6 border-t">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {extractionResult 
                    ? `Extracted from ${extractionResult.extractionMetadata.conversationLength} messages`
                    : 'Processing conversation...'
                  }
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setIsPanelOpen(false)}>
                    Close
                  </Button>
                  {extractionResult && (
                    <Button 
                      onClick={handleExport}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      data-export-button
                    >
                      Export Tasks
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}