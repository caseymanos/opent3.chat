'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CurrencyDollarIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline'
import { getModelById } from '@/lib/ai'

interface CostTrackerProps {
  conversationId: string
  className?: string
}

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalCost: number
  modelId: string
  timestamp: string
}

interface CostSummary {
  totalCost: number
  messagesCount: number
  tokenUsage: {
    input: number
    output: number
    total: number
  }
  byModel: Record<string, {
    cost: number
    tokens: number
    messages: number
  }>
}

export default function CostTracker({ conversationId, className = '' }: CostTrackerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [costSummary, setCostSummary] = useState<CostSummary>({
    totalCost: 0,
    messagesCount: 0,
    tokenUsage: { input: 0, output: 0, total: 0 },
    byModel: {}
  })
  const [recentUsage, setRecentUsage] = useState<TokenUsage[]>([])

  // Cost tracking - currently not implemented, showing placeholder
  useEffect(() => {
    const loadCostData = () => {
      // Real cost tracking not yet implemented
      const emptySummary: CostSummary = {
        totalCost: 0,
        messagesCount: 0,
        tokenUsage: { input: 0, output: 0, total: 0 },
        byModel: {}
      }

      setCostSummary(emptySummary)
      setRecentUsage([])
    }

    loadCostData()
  }, [conversationId])

  const formatCost = (cost: number) => {
    if (cost >= 1) return `$${cost.toFixed(2)}`
    if (cost >= 0.01) return `$${cost.toFixed(3)}`
    return `$${cost.toFixed(4)}`
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    return `${diffHours}h ago`
  }

  const getCostColor = (cost: number) => {
    if (cost > 0.1) return 'text-red-600 dark:text-red-400'
    if (cost > 0.01) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
        title="Cost tracking not yet implemented"
      >
        <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-gray-500 dark:text-gray-400">
          Not tracking
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[9999] overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <ChartBarIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    Cost Breakdown
                  </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Conversation usage and costs
                </p>
              </div>

              {/* Summary */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <div className="text-center py-8">
                  <ChartBarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Cost Tracking Not Active
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Cost tracking will be implemented in a future update to monitor token usage and API costs.
                  </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}