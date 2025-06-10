'use client'

import { useState } from 'react'
import { ChevronDownIcon, SparklesIcon, BoltIcon, CpuChipIcon } from '@heroicons/react/24/outline'
import { AI_MODELS, getModelById, type AIModel } from '@/lib/ai'
import { motion, AnimatePresence } from 'framer-motion'

interface ModelSelectorProps {
  selectedModel: string
  selectedProvider: string
  onModelChange: (model: string, provider: string) => void
  disabled?: boolean
}

const PROVIDER_ICONS = {
  openai: '🤖',
  anthropic: '🧠', 
  google: '🔍'
}

const PROVIDER_COLORS = {
  openai: 'bg-green-500',
  anthropic: 'bg-orange-500',
  google: 'bg-blue-500'
}

export default function ModelSelector({ 
  selectedModel, 
  selectedProvider, 
  onModelChange, 
  disabled = false 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentModel = getModelById(selectedModel)

  const groupedModels = AI_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = []
    }
    acc[model.provider].push(model)
    return acc
  }, {} as Record<string, AIModel[]>)

  const handleModelSelect = (model: AIModel) => {
    onModelChange(model.id, model.provider)
    setIsOpen(false)
  }

  const getModelIcon = (model: AIModel) => {
    if (model.name.includes('Turbo') || model.name.includes('Haiku')) return <BoltIcon className="w-4 h-4" />
    if (model.name.includes('Opus') || model.name.includes('GPT-4')) return <SparklesIcon className="w-4 h-4" />
    return <CpuChipIcon className="w-4 h-4" />
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-3 px-4 py-2 rounded-lg border transition-all duration-200
          ${disabled 
            ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 text-gray-900 dark:text-gray-100 cursor-pointer shadow-sm hover:shadow-md'
          }
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{PROVIDER_ICONS[currentModel?.provider as keyof typeof PROVIDER_ICONS]}</span>
          <div className="text-left">
            <div className="text-sm font-medium">{currentModel?.name}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {currentModel?.provider}
            </div>
          </div>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {Object.entries(groupedModels).map(([provider, models]) => (
              <div key={provider} className="p-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  <span className="text-base">{PROVIDER_ICONS[provider as keyof typeof PROVIDER_ICONS]}</span>
                  {provider}
                  <div className={`w-2 h-2 rounded-full ${PROVIDER_COLORS[provider as keyof typeof PROVIDER_COLORS]}`} />
                </div>
                
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => handleModelSelect(model)}
                    className={`
                      w-full flex items-start gap-3 px-3 py-3 rounded-md transition-all duration-150 text-left
                      ${selectedModel === model.id 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
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
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {model.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {model.maxTokens.toLocaleString()} tokens
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          model.provider === 'openai' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                          model.provider === 'anthropic' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                        }`}>
                          {model.provider}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}