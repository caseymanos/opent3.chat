'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CurrencyDollarIcon, ChartBarIcon, ClockIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { getModelById } from '@/lib/ai'
import { createClientComponentClient } from '@/lib/supabase'
import { getOpenRouterProvider } from '@/lib/openrouter'
import { useAuth } from '@/contexts/AuthContext'

interface CostTrackerProps {
  conversationId: string
  className?: string
  openRouterConfig?: { enabled: boolean; apiKey: string }
  selectedModel?: string
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

export default function CostTracker({ 
  conversationId, 
  className = '', 
  openRouterConfig = { enabled: false, apiKey: '' },
  selectedModel = 'claude-3-haiku-20240307'
}: CostTrackerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [costSummary, setCostSummary] = useState<CostSummary>({
    totalCost: 0,
    messagesCount: 0,
    tokenUsage: { input: 0, output: 0, total: 0 },
    byModel: {}
  })
  const [recentUsage, setRecentUsage] = useState<TokenUsage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadAttempts, setLoadAttempts] = useState(0)
  const supabase = createClientComponentClient()
  const { user } = useAuth()

  // Estimate token count for text (rough approximation: 1 token ≈ 4 characters)
  const estimateTokens = (text: string): number => {
    return Math.ceil(text.length / 4)
  }

  // Calculate cost for given model and tokens
  const calculateCost = (modelId: string, inputTokens: number, outputTokens: number, useOpenRouter: boolean = false): number => {
    const model = getModelById(modelId)
    if (!model) return 0

    let inputCost = (inputTokens / 1000) * model.pricing.input
    let outputCost = (outputTokens / 1000) * model.pricing.output

    // Apply OpenRouter fee if enabled (5% additional cost)
    if (useOpenRouter && openRouterConfig.enabled) {
      const provider = getOpenRouterProvider({
        ...openRouterConfig,
        fallbackToDirectAPIs: true
      })
      const fee = provider.getCostSavings() // Returns negative value for fee
      inputCost *= (1 - fee / 100) // This adds the fee since fee is negative
      outputCost *= (1 - fee / 100)
    }

    return inputCost + outputCost
  }

  // Load and calculate cost data from conversation messages
  useEffect(() => {
    const loadCostData = async () => {
      if (!conversationId) return
      
      // Prevent repeated failed attempts
      if (loadAttempts >= 3) return
      
      // Skip if no user session (demo mode)
      if (!user) {
        setCostSummary({
          totalCost: 0,
          messagesCount: 0,
          tokenUsage: { input: 0, output: 0, total: 0 },
          byModel: {}
        })
        setRecentUsage([])
        return
      }

      setIsLoading(true)
      try {
        // Fetch messages from conversation
        const { data: messages, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (error) {
          setLoadAttempts(prev => prev + 1)
          if (loadAttempts === 0) { // Only log on first attempt
            console.error('Error loading messages for cost tracking:', error)
          }
          return
        }
        
        // Reset attempts on success
        setLoadAttempts(0)

        if (!messages || messages.length === 0) {
          setCostSummary({
            totalCost: 0,
            messagesCount: 0,
            tokenUsage: { input: 0, output: 0, total: 0 },
            byModel: {}
          })
          setRecentUsage([])
          return
        }

        let totalCost = 0
        let totalInputTokens = 0
        let totalOutputTokens = 0
        const byModel: Record<string, { cost: number; tokens: number; messages: number }> = {}
        const recentUsageList: TokenUsage[] = []

        // Process each message pair (user + assistant)
        for (let i = 0; i < messages.length; i++) {
          const message = messages[i]
          const content = typeof message.content === 'string' 
            ? message.content 
            : (message.content as any)?.text || ''

          if (message.role === 'user') {
            // User message = input tokens
            const tokens = estimateTokens(content)
            totalInputTokens += tokens

            // Look for the next assistant message
            const nextMessage = messages[i + 1]
            if (nextMessage && nextMessage.role === 'assistant') {
              const assistantContent = typeof nextMessage.content === 'string' 
                ? nextMessage.content 
                : (nextMessage.content as any)?.text || ''
              const outputTokens = estimateTokens(assistantContent)
              totalOutputTokens += outputTokens

              // Use model from message metadata or fallback to selected model
              const messageModel = (message.model_metadata as any)?.model || selectedModel
              const cost = calculateCost(messageModel, tokens, outputTokens, openRouterConfig.enabled)
              totalCost += cost

              // Track by model
              if (!byModel[messageModel]) {
                byModel[messageModel] = { cost: 0, tokens: 0, messages: 0 }
              }
              byModel[messageModel].cost += cost
              byModel[messageModel].tokens += tokens + outputTokens
              byModel[messageModel].messages += 1

              // Add to recent usage (last 10)
              recentUsageList.push({
                inputTokens: tokens,
                outputTokens: outputTokens,
                totalCost: cost,
                modelId: messageModel,
                timestamp: message.created_at
              })
            }
          }
        }

        setCostSummary({
          totalCost,
          messagesCount: messages.filter((m: any) => m.role === 'assistant').length,
          tokenUsage: {
            input: totalInputTokens,
            output: totalOutputTokens,
            total: totalInputTokens + totalOutputTokens
          },
          byModel
        })

        // Keep only the most recent 10 entries
        setRecentUsage(recentUsageList.slice(-10).reverse())

      } catch (error) {
        console.error('Error calculating costs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadCostData()
  }, [conversationId, selectedModel, openRouterConfig, supabase, user, loadAttempts])

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

  const hasData = costSummary.messagesCount > 0 || isLoading

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm shadow-sm hover:shadow-md ${
          hasData 
            ? 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400'
            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        title={hasData ? `Total cost: ${formatCost(costSummary.totalCost)}` : 'No cost data available'}
      >
        {isLoading ? (
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-green-500" />
        ) : (
          <CurrencyDollarIcon className={`w-4 h-4 ${hasData ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`} />
        )}
        <span className={`font-medium ${hasData ? getCostColor(costSummary.totalCost) : 'text-gray-500 dark:text-gray-400'}`}>
          {isLoading ? 'Loading...' : hasData ? formatCost(costSummary.totalCost) : 'No data'}
        </span>
        {openRouterConfig.enabled && hasData && (
          <span className="text-xs text-green-600 dark:text-green-400 font-bold">
            📉 OR
          </span>
        )}
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
                {isLoading ? (
                  <div className="text-center py-6">
                    <div className="w-8 h-8 animate-spin rounded-full border-2 border-gray-300 border-t-green-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading cost data...</p>
                  </div>
                ) : hasData ? (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className={`text-2xl font-bold ${getCostColor(costSummary.totalCost)}`}>
                        {formatCost(costSummary.totalCost)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Cost
                        {openRouterConfig.enabled && (
                          <div className="text-green-600 dark:text-green-400 font-medium">
                            w/ OpenRouter
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {costSummary.tokenUsage.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Total Tokens
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {costSummary.messagesCount}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        AI Responses
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChartBarIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      No Usage Data
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Start a conversation to see cost tracking information.
                    </p>
                  </div>
                )}
              </div>

              {/* Breakdown by Model */}
              {hasData && Object.keys(costSummary.byModel).length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Usage by Model
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(costSummary.byModel).map(([modelId, data]) => {
                      const model = getModelById(modelId)
                      return (
                        <div key={modelId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <SparklesIcon className="w-4 h-4 text-blue-500" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {model?.name || modelId}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              ({data.messages} msgs)
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${getCostColor(data.cost)}`}>
                              {formatCost(data.cost)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {data.tokens.toLocaleString()} tokens
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Recent Usage */}
              {hasData && recentUsage.length > 0 && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                    Recent Usage
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {recentUsage.map((usage, index) => {
                      const model = getModelById(usage.modelId)
                      return (
                        <div key={index} className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded p-2">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-3 h-3 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-300">
                              {model?.name || usage.modelId}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatTime(usage.timestamp)}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${getCostColor(usage.totalCost)}`}>
                              {formatCost(usage.totalCost)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}