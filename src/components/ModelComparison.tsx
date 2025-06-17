'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChartBarIcon, 
  SparklesIcon, 
  BoltIcon, 
  CpuChipIcon, 
  EyeIcon, 
  CodeBracketIcon,
  CurrencyDollarIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import { AI_MODELS, type AIModel } from '@/lib/ai'

interface ModelComparisonProps {
  selectedModels?: string[]
  onModelSelect?: (modelId: string, provider: string) => void
  className?: string
}

interface ModelScore {
  overall: number
  speed: number
  quality: number
  cost: number
  capabilities: number
}

export default function ModelComparison({ 
  selectedModels = [], 
  onModelSelect,
  className = '' 
}: ModelComparisonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>(
    selectedModels.length > 0 ? selectedModels : ['o3', 'gemini-2.5-flash-preview-05-20', 'claude-4-opus', 'gemma-3-4b']
  )

  // Sync selectedForComparison with selectedModels prop changes
  useEffect(() => {
    if (selectedModels.length > 0) {
      setSelectedForComparison(prev => {
        // If the selected model isn't in the comparison, add it
        const newModel = selectedModels[0]
        if (!prev.includes(newModel)) {
          return [newModel, ...prev.slice(0, 3)] // Keep max 4 models
        }
        return prev
      })
    }
  }, [selectedModels])

  const calculateModelScore = (model: AIModel): ModelScore => {
    // Speed scoring (higher is better)
    const speedScore = model.performance.speed === 'fast' ? 100 : 
                      model.performance.speed === 'medium' ? 70 : 40

    // Quality scoring (higher is better)  
    const qualityScore = model.performance.quality === 'high' ? 100 :
                        model.performance.quality === 'medium' ? 70 : 40

    // Cost scoring (lower cost = higher score)
    const avgCost = (model.pricing.input + model.pricing.output) / 2
    // Updated range for 2025 models: o3-pro ($50/M avg) to Gemma 3 4B ($0.00003/M avg)
    const maxCost = 50.0 // o3-pro average cost
    const minCost = 0.00003 // Gemma 3 4B cost
    const normalizedCost = Math.min(Math.max(avgCost, minCost), maxCost)
    // Use logarithmic scaling for better distribution across the wide price range
    const logMaxCost = Math.log10(maxCost)
    const logMinCost = Math.log10(minCost)
    const logNormalizedCost = Math.log10(normalizedCost)
    const costScore = Math.round(100 * (1 - (logNormalizedCost - logMinCost) / (logMaxCost - logMinCost)))

    // Capabilities scoring
    const capabilitiesCount = Object.values(model.capabilities).filter(Boolean).length
    const capabilitiesScore = (capabilitiesCount / 4) * 100

    // Overall score (weighted average)
    const overall = (speedScore * 0.25 + qualityScore * 0.35 + costScore * 0.25 + capabilitiesScore * 0.15)

    return {
      overall: Math.round(overall),
      speed: speedScore,
      quality: qualityScore,
      cost: costScore,
      capabilities: Math.round(capabilitiesScore)
    }
  }

  const getModelsForComparison = () => {
    return AI_MODELS.filter(model => selectedForComparison.includes(model.id))
  }

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`
    if (price >= 0.01) return `$${price.toFixed(3)}`
    if (price >= 0.001) return `$${price.toFixed(4)}`
    return `$${price.toFixed(5)}`
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const toggleModelInComparison = (modelId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(modelId)) {
        return prev.filter(id => id !== modelId)
      } else if (prev.length < 4) { // Limit to 4 models for comparison
        return [...prev, modelId]
      }
      return prev
    })
  }

  const getRecommendation = (models: AIModel[]) => {
    const scores = models.map(model => ({ model, score: calculateModelScore(model) }))
    
    // Find best for different use cases
    const fastest = scores.reduce((a, b) => a.score.speed > b.score.speed ? a : b)
    const highest_quality = scores.reduce((a, b) => a.score.quality > b.score.quality ? a : b)
    const most_cost_effective = scores.reduce((a, b) => a.score.cost > b.score.cost ? a : b)
    const best_overall = scores.reduce((a, b) => a.score.overall > b.score.overall ? a : b)

    return {
      fastest: fastest.model,
      highest_quality: highest_quality.model,
      most_cost_effective: most_cost_effective.model,
      best_overall: best_overall.model
    }
  }

  const modelsToCompare = getModelsForComparison()
  const recommendations = getRecommendation(modelsToCompare)

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 text-sm shadow-sm hover:shadow-md"
        title="Compare AI models"
      >
        <ChartBarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-gray-900 dark:text-gray-100">Compare</span>
        <ChevronRightIcon className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-[99998] bg-black/20" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] max-w-[90vw] max-h-[90vh] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl z-[99999] flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      AI Model Comparison
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Compare performance, cost, and capabilities
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      * Data current as of December 2024. Pricing subject to change.
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedForComparison.length}/4 selected
                  </div>
                </div>

                {/* Model Selector */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {AI_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => toggleModelInComparison(model.id)}
                      className={`text-xs px-2 py-1 rounded-full transition-colors ${
                        selectedForComparison.includes(model.id)
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      disabled={!selectedForComparison.includes(model.id) && selectedForComparison.length >= 4}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* Recommendations */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Quick Recommendations
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <BoltIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Fastest:</span>
                    <button
                      onClick={() => {
                        onModelSelect?.(recommendations.fastest.id, recommendations.fastest.provider)
                        setIsOpen(false)
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {recommendations.fastest.name}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Best Quality:</span>
                    <button
                      onClick={() => {
                        onModelSelect?.(recommendations.highest_quality.id, recommendations.highest_quality.provider)
                        setIsOpen(false)
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {recommendations.highest_quality.name}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Most Cost-Effective:</span>
                    <button
                      onClick={() => {
                        onModelSelect?.(recommendations.most_cost_effective.id, recommendations.most_cost_effective.provider)
                        setIsOpen(false)
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {recommendations.most_cost_effective.name}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChartBarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Best Overall:</span>
                    <button
                      onClick={() => {
                        onModelSelect?.(recommendations.best_overall.id, recommendations.best_overall.provider)
                        setIsOpen(false)
                      }}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {recommendations.best_overall.name}
                    </button>
                  </div>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3 text-xs font-medium text-gray-900 dark:text-gray-100">Model</th>
                      <th className="text-center p-3 text-xs font-medium text-gray-900 dark:text-gray-100">Overall Score</th>
                      <th className="text-center p-3 text-xs font-medium text-gray-900 dark:text-gray-100">Speed</th>
                      <th className="text-center p-3 text-xs font-medium text-gray-900 dark:text-gray-100">Quality</th>
                      <th className="text-center p-3 text-xs font-medium text-gray-900 dark:text-gray-100">Cost/M</th>
                      <th className="text-center p-3 text-xs font-medium text-gray-900 dark:text-gray-100">Capabilities</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelsToCompare.map((model, index) => {
                      const scores = calculateModelScore(model)
                      return (
                        <tr key={model.id} className={index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800/50'}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  onModelSelect?.(model.id, model.provider)
                                  setIsOpen(false)
                                }}
                                className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                {model.name}
                              </button>
                              <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {model.provider}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className={`text-lg font-bold ${getScoreColor(scores.overall)}`}>
                              {scores.overall}
                            </div>
                            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mt-1">
                              <div 
                                className={`h-full rounded-full ${getScoreBarColor(scores.overall)}`}
                                style={{ width: `${scores.overall}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className={`text-sm font-medium ${getScoreColor(scores.speed)}`}>
                              {model.performance.speed}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className={`text-sm font-medium ${getScoreColor(scores.quality)}`}>
                              {model.performance.quality}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {formatPrice(model.pricing.input)}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              out: {formatPrice(model.pricing.output)}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {model.capabilities.vision && <EyeIcon className="w-3 h-3 text-blue-500" title="Vision" />}
                              {model.capabilities.codeGeneration && <CodeBracketIcon className="w-3 h-3 text-green-500" title="Code Generation" />}
                              {model.capabilities.functionCalling && <CpuChipIcon className="w-3 h-3 text-purple-500" title="Function Calling" />}
                              {model.capabilities.multimodal && <SparklesIcon className="w-3 h-3 text-orange-500" title="Multimodal" />}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}