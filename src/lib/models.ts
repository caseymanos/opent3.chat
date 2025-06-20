export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'xai' | 'azure' | 'azure-ai' | 'vertex-ai'
  maxTokens: number
  description: string
  pricing: {
    input: number // cost per 1M tokens
    output: number // cost per 1M tokens
    currency: 'USD'
  }
  capabilities: {
    vision: boolean
    functionCalling: boolean
    codeGeneration: boolean
    multimodal: boolean
  }
  performance: {
    speed: 'fast' | 'medium' | 'slow'
    quality: 'high' | 'medium' | 'basic'
  }
  tier: 'free' | 'premium' | 'special' | 'byok' | 'vertex-ai' // Access tier - special tier has 2-call limit, vertex-ai for anonymous users
}

export const AI_MODELS: AIModel[] = [
  // Vertex AI Models (Free Tier for Anonymous Users - 10 calls/day)
  {
    id: 'gemini-2.5-flash-vertex',
    name: 'Gemini 2.5 Flash (Vertex AI)',
    provider: 'vertex-ai',
    maxTokens: 1000000,
    description: 'Enterprise-grade Gemini hosted on Google Cloud - Available for anonymous users (10 calls/day)',
    pricing: { input: 0.15, output: 0.60, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'vertex-ai'
  },
  {
    id: 'gemini-2.5-flash-lite-vertex',
    name: 'Gemini 2.5 Flash Lite (Vertex AI)',
    provider: 'vertex-ai',
    maxTokens: 1000000,
    description: 'Lightweight Gemini model optimized for cost and speed - Available for anonymous users (10 calls/day)',
    pricing: { input: 0.075, output: 0.30, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: false },
    performance: { speed: 'fast', quality: 'medium' },
    tier: 'vertex-ai'
  },

  // Free Tier Models (Available for Logged-in Users)
  {
    id: 'gemini-2.5-flash-azure',
    name: 'Gemini 2.5 Flash (Azure AI)',
    provider: 'azure-ai',
    maxTokens: 1000000,
    description: 'Google Gemini hosted on Azure infrastructure - Low latency and high reliability',
    pricing: { input: 0.15, output: 0.60, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'free'
  },
  {
    id: 'gemini-2.5-flash-preview-05-20',
    name: 'Gemini 2.5 Flash Preview',
    provider: 'google',
    maxTokens: 1000000,
    description: 'Latest Gemini with enhanced reasoning and multimodal capabilities - Free for logged-in users',
    pricing: { input: 0.15, output: 0.60, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'free'
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    maxTokens: 1000000,
    description: 'Fast and versatile AI model for code, images, and data analysis - Free for logged-in users',
    pricing: { input: 0.10, output: 0.40, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'free'
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    maxTokens: 1000000,
    description: 'Fast and versatile performance across diverse tasks - Free for logged-in users',
    pricing: { input: 0.075, output: 0.30, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'free'
  },
  
  // Special Tier Models (2 free calls for logged-in users)
  {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Latest Claude 4 Sonnet model - Limited to 2 free calls per user',
    pricing: { input: 3, output: 15, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'special'
  },
  
  // Premium Tier Models (10 free calls for logged-in users)
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    maxTokens: 128000,
    description: 'Fast and efficient GPT-4o Mini - Premium tier (10 free calls/day)',
    pricing: { input: 0.15, output: 0.60, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'premium'
  },
  {
    id: 'gpt-4o-mini-azure',
    name: 'GPT-4o Mini (Azure)',
    provider: 'azure',
    maxTokens: 128000,
    description: 'Fast and efficient GPT-4o via Azure OpenAI - Premium tier with higher rate limits',
    pricing: { input: 0.15, output: 0.60, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'premium'
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Advanced reasoning with superior coding capabilities - Premium model',
    pricing: { input: 3, output: 15, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'premium'
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    maxTokens: 200000,
    description: 'Advanced reasoning model with 80% price reduction (June 2025) - Premium model',
    pricing: { input: 2, output: 8, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'premium'
  },
  {
    id: 'grok-3-reasoning',
    name: 'Grok 3 Reasoning',
    provider: 'xai',
    maxTokens: 131072,
    description: 'Think mode with extended reasoning capabilities - Premium model',
    pricing: { input: 3, output: 15, currency: 'USD' },
    capabilities: { vision: false, functionCalling: true, codeGeneration: true, multimodal: false },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'premium'
  },
  
  // BYOK Only Models (Expensive)
  {
    id: 'o3-pro',
    name: 'o3-pro',
    provider: 'openai',
    maxTokens: 200000,
    description: 'OpenAI\'s most advanced reasoning model - BYOK required',
    pricing: { input: 20, output: 80, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'claude-4-opus',
    name: 'Claude 4 Opus',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Latest flagship Claude model - BYOK required',
    pricing: { input: 15, output: 75, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'byok'
  },
  
  // Additional BYOK Models via OpenRouter
  {
    id: 'gpt-4-vision',
    name: 'GPT-4 Vision',
    provider: 'openai',
    maxTokens: 128000,
    description: 'GPT-4 with vision capabilities - BYOK via OpenRouter required',
    pricing: { input: 10, output: 30, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 128000,
    description: 'Latest multimodal GPT-4 - BYOK via OpenRouter required',
    pricing: { input: 5, output: 15, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    maxTokens: 2000000,
    description: 'Google\'s most advanced model - BYOK via OpenRouter required',
    pricing: { input: 1.25, output: 5, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'gemini-2.5-pro-experimental',
    name: 'Gemini 2.5 Pro Experimental',
    provider: 'google',
    maxTokens: 2000000,
    description: 'Google\'s experimental model with thinking capabilities - BYOK via OpenRouter required',
    pricing: { input: 1.25, output: 10, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'claude-4-sonnet-reasoning',
    name: 'Claude 4 Sonnet Reasoning',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Claude 4 with enhanced reasoning capabilities - BYOK via OpenRouter required',
    pricing: { input: 3, output: 15, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Balanced performance with enhanced reasoning - BYOK via OpenRouter required',
    pricing: { input: 3, output: 15, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' },
    tier: 'byok'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Fast and cost-efficient Claude model - BYOK via OpenRouter required',
    pricing: { input: 0.25, output: 1.25, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'medium' },
    tier: 'byok'
  }
]

export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === modelId)
}

export function getModelsByProvider(provider: string): AIModel[] {
  return AI_MODELS.filter(model => model.provider === provider)
}