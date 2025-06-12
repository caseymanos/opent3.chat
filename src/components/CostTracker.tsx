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

  // Simulate cost tracking (in a real app, this would come from the backend)
  useEffect(() => {
    const loadCostData = () => {
      // Mock data for demonstration
      const mockSummary: CostSummary = {
        totalCost: 0.047,
        messagesCount: 12,
        tokenUsage: { input: 2840, output: 1650, total: 4490 },
        byModel: {
          'claude-3-haiku-20240307': { cost: 0.012, tokens: 1500, messages: 5 },
          'claude-3-5-sonnet-20241022': { cost: 0.028, tokens: 2200, messages: 4 },
          'gpt-4o': { cost: 0.007, tokens: 790, messages: 3 }
        }
      }

      const mockRecentUsage: TokenUsage[] = [
        {
          inputTokens: 180,
          outputTokens: 320,
          totalCost: 0.0084,
          modelId: 'claude-3-5-sonnet-20241022',
          timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString()
        },
        {
          inputTokens: 95,
          outputTokens: 140,
          totalCost: 0.0035,
          modelId: 'gpt-4o',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString()
        },
        {
          inputTokens: 220,
          outputTokens: 85,
          totalCost: 0.0018,
          modelId: 'claude-3-haiku-20240307',
          timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString()
        }
      ]

      setCostSummary(mockSummary)
      setRecentUsage(mockRecentUsage)
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
        title="View cost breakdown"
      >
        <CurrencyDollarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
        <span className={`font-medium ${getCostColor(costSummary.totalCost)}`}>
          {formatCost(costSummary.totalCost)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {costSummary.messagesCount} msgs
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {formatCost(costSummary.totalCost)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Cost</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {costSummary.tokenUsage.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Total Tokens</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="text-center">
                    <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {costSummary.tokenUsage.input.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Input</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-purple-600 dark:text-purple-400">
                      {costSummary.tokenUsage.output.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Output</div>
                  </div>
                </div>
              </div>

              {/* By Model */}
              <div className="p-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                  Usage by Model
                </h4>
                <div className="space-y-2">
                  {Object.entries(costSummary.byModel).map(([modelId, usage]) => {
                    const model = getModelById(modelId)
                    return (
                      <div key={modelId} className="flex items-center justify-between p-2 rounded-md bg-gray-50 dark:bg-gray-800">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {model?.name || modelId}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {usage.messages} messages • {usage.tokens.toLocaleString()} tokens
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${getCostColor(usage.cost)}`}>
                          {formatCost(usage.cost)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent Usage */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <ClockIcon className="w-4 h-4" />
                  Recent Activity
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentUsage.map((usage, index) => {
                    const model = getModelById(usage.modelId)
                    return (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {model?.name}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {usage.inputTokens + usage.outputTokens} tokens • {formatTime(usage.timestamp)}
                          </div>
                        </div>
                        <div className={`font-medium ${getCostColor(usage.totalCost)}`}>
                          {formatCost(usage.totalCost)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}