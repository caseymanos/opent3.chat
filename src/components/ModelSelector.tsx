'use client'

import { useState, useEffect } from 'react'
import { ChevronDownIcon, SparklesIcon, BoltIcon, CpuChipIcon, EyeIcon, CodeBracketIcon, CurrencyDollarIcon, LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/outline'
import { AI_MODELS, getModelById, type AIModel } from '@/lib/ai'
import { motion, AnimatePresence } from 'framer-motion'
import { useUsageTracking } from '@/lib/usage-tracker'
import { useAuth } from '@/contexts/AuthContext'
import type { UserUsage } from '@/lib/usage-tracker'

interface ModelSelectorProps {
  selectedModel: string
  selectedProvider: string
  onModelChange: (model: string, provider: string) => void
  disabled?: boolean
}

const PROVIDER_ICONS = {
  openai: '🤖',
  anthropic: '🧠', 
  google: '🔍',
  'vertex-ai': '☁️',
  'azure': '🔷',
  'azure-ai': '🌟',
  xai: '🚀'
}

const PROVIDER_COLORS = {
  openai: 'bg-green-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500',
  'vertex-ai': 'bg-sky-500',
  'azure': 'bg-indigo-500',
  'azure-ai': 'bg-purple-500',
  xai: 'bg-red-500'
}

export default function ModelSelector({ 
  selectedModel, 
  onModelChange, 
  disabled = false 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [usage, setUsage] = useState<UserUsage | null>(null)
  const { user } = useAuth()
  const { getUsage, canUsePremiumModel, canUseSpecialModel, canUseByokModel, getRemainingPremiumCalls, getRemainingSpecialCalls } = useUsageTracking()
  const currentModel = getModelById(selectedModel)

  // Load usage data
  useEffect(() => {
    const loadUsage = async () => {
      const data = await getUsage()
      setUsage(data)
    }
    loadUsage()
  }, [getUsage])

  // Filter models based on tier and usage
  const getAvailableModels = () => {
    return AI_MODELS.filter(model => {
      // Free tier is always available
      if (model.tier === 'free') return true
      
      // Vertex AI models are available for anonymous users with limits
      if (model.tier === 'vertex-ai') {
        if (!usage) return false
        if (!user) {
          // Anonymous users can use Vertex AI models with 10 calls/day limit
          return usage.premiumCalls < 10
        }
        // Logged-in users can use as part of their premium quota
        return canUsePremiumModel(usage)
      }
      
      // Premium/BYOK/Special tiers require authentication
      if (!user) return false
      
      // If we don't have usage data yet, be conservative and only show free models
      if (!usage) return false
      
      // Premium tier requires login and available calls
      if (model.tier === 'premium') {
        return canUsePremiumModel(usage)
      }
      
      // Special tier requires login and available calls
      if (model.tier === 'special') {
        return canUseSpecialModel(usage)
      }
      
      // BYOK tier requires BYOK enabled
      if (model.tier === 'byok') {
        return canUseByokModel(usage)
      }
      
      return false
    })
  }

  const availableModels = getAvailableModels()
  // Show all models but mark which are available
  const groupedModels = AI_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)
  
  // Sort providers to show vertex-ai first for anonymous users
  const providerOrder = user 
    ? ['google', 'openai', 'anthropic', 'azure', 'azure-ai', 'vertex-ai', 'xai']
    : ['vertex-ai', 'google', 'openai', 'anthropic', 'azure', 'azure-ai', 'xai']
  
  const sortedProviders = Object.keys(groupedModels).sort((a, b) => {
    const aIndex = providerOrder.indexOf(a)
    const bIndex = providerOrder.indexOf(b)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const handleModelSelect = (model: AIModel) => {
    onModelChange(model.id, model.provider)
    setIsOpen(false)
  }

  const getModelIcon = (model: AIModel) => {
    if (model.performance.speed === 'fast') return <BoltIcon className="w-4 h-4" />
    if (model.performance.quality === 'high') return <SparklesIcon className="w-4 h-4" />
    return <CpuChipIcon className="w-4 h-4" />
  }

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`
    if (price >= 0.01) return `$${price.toFixed(3)}`
    if (price >= 0.001) return `$${price.toFixed(4)}`
    return `$${price.toFixed(5)}`
  }

  const getPerformanceBadge = (performance: AIModel['performance']) => {
    const speedColors = {
      fast: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      slow: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
    }
    
    const qualityColors = {
      high: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
      medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      basic: 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300'
    }

    return { speedColors: speedColors[performance.speed], qualityColors: qualityColors[performance.quality] }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 text-sm
          ${disabled 
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm hover:shadow-md'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{PROVIDER_ICONS[currentModel?.provider as keyof typeof PROVIDER_ICONS]}</span>
          <div className="text-left">
            <div className="text-xs font-medium">{currentModel?.name}</div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span className="capitalize">{currentModel?.provider}</span>
              {currentModel && (
                <>
                  <span>•</span>
                  <span>{formatPrice(currentModel.pricing.input)}/M</span>
                  {currentModel.capabilities.vision && <span>👁</span>}
                  {currentModel.performance.speed === 'fast' && <span>⚡</span>}
                </>
              )}
            </div>
          </div>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-[9998]" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-0 mb-2 w-96 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[9999] max-h-96 overflow-y-auto"
            >
            {sortedProviders.map((provider) => {
              const models = groupedModels[provider]
              if (!models || models.length === 0) return null
              
              return (
              <div key={provider} className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <span className="text-base">{PROVIDER_ICONS[provider as keyof typeof PROVIDER_ICONS]}</span>
                  {provider}
                  <div className={`w-2 h-2 rounded-full ${PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS]}`} />
                </div>
                
                {models.map((model) => {
                  const badges = getPerformanceBadge(model.performance)
                  const isLocked = !availableModels.find(m => m.id === model.id)
                  const canSelect = !isLocked || 
                    (model.tier === 'premium' && user && usage && canUsePremiumModel(usage)) ||
                    (model.tier === 'special' && user && usage && canUseSpecialModel(usage)) ||
                    (model.tier === 'vertex-ai' && usage && (user ? canUsePremiumModel(usage) : usage.premiumCalls < 10))
                  
                  return (
                    <button
                      key={model.id}
                      onClick={() => canSelect && handleModelSelect(model)}
                      disabled={!canSelect}
                      className={`
                        w-full flex items-start gap-2 px-3 py-2 rounded-md transition-all duration-150 text-left
                        ${!canSelect ? 'opacity-50 cursor-not-allowed' : ''}
                        ${selectedModel === model.id 
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' 
                          : canSelect ? 'hover:bg-gray-50 dark:hover:bg-gray-800' : ''
                        }
                      `}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getModelIcon(model)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {model.name}
                          </span>
                          {selectedModel === model.id && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                          {/* Show tier badges */}
                          {model.tier === 'free' && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                              Free
                            </span>
                          )}
                          {model.tier === 'premium' && (
                            <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                              Premium
                            </span>
                          )}
                          {model.tier === 'special' && (
                            <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-0.5 rounded-full">
                              Claude
                            </span>
                          )}
                          {model.tier === 'vertex-ai' && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                              Vertex AI
                            </span>
                          )}
                          {model.tier === 'byok' && (
                            <span className="text-xs bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                              {usage?.byokEnabled ? <LockOpenIcon className="w-3 h-3" /> : <LockClosedIcon className="w-3 h-3" />}
                              <span>BYOK</span>
                            </span>
                          )}
                          
                          {/* Show usage for available models */}
                          {model.tier === 'premium' && user && usage && !usage.byokEnabled && canUsePremiumModel(usage) && (
                            <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                              <span>{getRemainingPremiumCalls(usage)}</span>
                              <span>left</span>
                            </span>
                          )}
                          {model.tier === 'special' && user && usage && !usage.byokEnabled && canUseSpecialModel(usage) && (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <span>{getRemainingSpecialCalls(usage)}</span>
                              <span>left</span>
                            </span>
                          )}
                          {model.tier === 'vertex-ai' && !user && usage && usage.premiumCalls < 10 && (
                            <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                              <span>{10 - usage.premiumCalls}</span>
                              <span>left</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                          {model.description}
                        </p>
                        
                        {/* Compact info row */}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {model.capabilities.vision && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">👁</span>
                          )}
                          {model.capabilities.codeGeneration && (
                            <span className="text-xs text-green-600 dark:text-green-400">💻</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded ${badges.speedColors}`}>
                            {model.performance.speed.charAt(0).toUpperCase()}
                          </span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${badges.qualityColors}`}>
                            {model.performance.quality.charAt(0).toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPrice(model.pricing.input)}/M
                          </span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
              )
            })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}