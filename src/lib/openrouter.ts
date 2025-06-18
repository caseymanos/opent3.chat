import { createOpenRouter } from '@openrouter/ai-sdk-provider'

export interface OpenRouterConfig {
  apiKey: string
  enabled: boolean
  fallbackToDirectAPIs: boolean
}

// OpenRouter model mappings for the latest models
export const OPENROUTER_MODEL_MAP: Record<string, string> = {
  // OpenAI Models
  'o3-pro': 'openai/o3-pro',
  'o3': 'openai/o3',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'gpt-4o-mini-azure': 'openai/gpt-4o-mini',
  'gpt-4-vision': 'openai/gpt-4-turbo',
  
  // Anthropic Models  
  'claude-4-opus': 'anthropic/claude-4-opus',
  'claude-4-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-sonnet-4': 'anthropic/claude-3.5-sonnet',
  'claude-4-sonnet-reasoning': 'anthropic/claude-3.5-sonnet',
  'claude-3-5-sonnet-20241022': 'anthropic/claude-3.5-sonnet',
  'claude-3-haiku-20240307': 'anthropic/claude-3-haiku',
  
  // Google Models
  'gemini-2.5-pro': 'google/gemini-pro-1.5',
  'gemini-2.5-pro-experimental': 'google/gemini-pro-1.5',
  'gemini-2.5-flash-preview-05-20': 'google/gemini-flash-1.5',
  'gemini-2.5-flash-azure': 'google/gemini-flash-1.5',
  'gemini-2.0-flash': 'google/gemini-flash-1.5',
  'gemini-1.5-flash': 'google/gemini-flash-1.5',
  'gemini-2.5-flash-vertex': 'google/gemini-flash-1.5',
  'gemini-2.5-flash-lite-vertex': 'google/gemini-flash-1.5',
  
  // xAI Models
  'grok-3-reasoning': 'x-ai/grok-3'
}

// OpenRouter charges a 5% fee on top of direct API costs
export const OPENROUTER_FEE_PERCENTAGE = 5

export class OpenRouterProvider {
  private provider: ReturnType<typeof createOpenRouter> | null
  private config: OpenRouterConfig

  constructor(config: OpenRouterConfig) {
    this.config = config
    
    if (config.enabled && config.apiKey) {
      this.provider = createOpenRouter({
        apiKey: config.apiKey,
        // Add cost tracking headers
        extraBody: {
          'HTTP-Referer': 'https://t3-crusher.vercel.app',
          'X-Title': 'T3 Crusher - Open Source AI Chat'
        }
      })
    } else {
      this.provider = null
    }
  }

  isAvailable(): boolean {
    return this.config.enabled && !!this.config.apiKey && !!this.provider
  }

  getModel(modelId: string) {
    if (!this.isAvailable()) {
      return null
    }

    const openrouterModelId = OPENROUTER_MODEL_MAP[modelId]
    if (!openrouterModelId) {
      console.warn(`Model ${modelId} not available on OpenRouter`)
      return null
    }

    return this.provider!(openrouterModelId)
  }

  getCostSavings(): number {
    // OpenRouter doesn't provide savings - it charges 5% more
    return -OPENROUTER_FEE_PERCENTAGE
  }

  getOpenRouterModelId(modelId: string): string | null {
    return OPENROUTER_MODEL_MAP[modelId] || null
  }

  // Calculate estimated cost with OpenRouter vs direct API
  calculateCostComparison(modelId: string, inputTokens: number, outputTokens: number) {
    const directCost = this.calculateDirectAPICost(modelId, inputTokens, outputTokens)
    const openrouterCost = directCost * (1 + OPENROUTER_FEE_PERCENTAGE / 100)
    
    return {
      directCost,
      openrouterCost,
      additionalCost: openrouterCost - directCost,
      feePercentage: OPENROUTER_FEE_PERCENTAGE
    }
  }

  private calculateDirectAPICost(modelId: string, inputTokens: number, outputTokens: number): number {
    // This would use the pricing from AI_MODELS
    // For now, return a placeholder
    return (inputTokens * 0.001) + (outputTokens * 0.002)
  }
}

// Default configuration - can be overridden by user settings
export const defaultOpenRouterConfig: OpenRouterConfig = {
  apiKey: '',
  enabled: false,
  fallbackToDirectAPIs: true
}

// Singleton instance
let openRouterInstance: OpenRouterProvider | null = null

export function getOpenRouterProvider(config?: OpenRouterConfig): OpenRouterProvider {
  if (!openRouterInstance || config) {
    openRouterInstance = new OpenRouterProvider(config || defaultOpenRouterConfig)
  }
  return openRouterInstance
}

export function initializeOpenRouter(apiKey: string): OpenRouterProvider {
  const config: OpenRouterConfig = {
    apiKey,
    enabled: true,
    fallbackToDirectAPIs: true
  }
  
  openRouterInstance = new OpenRouterProvider(config)
  return openRouterInstance
}