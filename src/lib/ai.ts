import { useChat } from 'ai/react'
import type { Message } from 'ai'

export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google'
  maxTokens: number
  description: string
  pricing: {
    input: number // cost per 1k tokens
    output: number // cost per 1k tokens
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
}

export const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 128000,
    description: 'Latest multimodal GPT-4 with vision and faster responses',
    pricing: { input: 0.005, output: 0.015, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' }
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 128000,
    description: 'Advanced GPT-4 with larger context window',
    pricing: { input: 0.01, output: 0.03, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' }
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    maxTokens: 8192,
    description: 'Most capable OpenAI model for complex reasoning',
    pricing: { input: 0.03, output: 0.06, currency: 'USD' },
    capabilities: { vision: false, functionCalling: true, codeGeneration: true, multimodal: false },
    performance: { speed: 'slow', quality: 'high' }
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    maxTokens: 16384,
    description: 'Fast and cost-effective for most conversations',
    pricing: { input: 0.0005, output: 0.0015, currency: 'USD' },
    capabilities: { vision: false, functionCalling: true, codeGeneration: true, multimodal: false },
    performance: { speed: 'fast', quality: 'medium' }
  },
  
  // Anthropic Models
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Latest Claude with enhanced reasoning and coding',
    pricing: { input: 0.003, output: 0.015, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' }
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Most powerful Claude model for complex tasks',
    pricing: { input: 0.015, output: 0.075, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'slow', quality: 'high' }
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Balanced performance and speed',
    pricing: { input: 0.003, output: 0.015, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'medium', quality: 'high' }
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Fastest Claude model for quick responses',
    pricing: { input: 0.00025, output: 0.00125, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'medium' }
  },
  
  // Google Models (for future implementation)
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    maxTokens: 32768,
    description: 'Google\'s multimodal AI with vision capabilities',
    pricing: { input: 0.0005, output: 0.0015, currency: 'USD' },
    capabilities: { vision: true, functionCalling: true, codeGeneration: true, multimodal: true },
    performance: { speed: 'fast', quality: 'high' }
  }
]

export interface ChatState {
  messages: Message[]
  input: string
  isLoading: boolean
  error: Error | undefined
  stop: () => void
  reload: () => void
  append: (message: Message) => void
  setInput: (input: string) => void
  setMessages: (messages: Message[]) => void
}

export function useAIChat({
  conversationId,
  model = 'claude-3-haiku-20240307',
  provider = 'anthropic',
  systemPrompt,
  ragContext,
  onFinish
}: {
  conversationId: string
  model?: string
  provider?: string
  systemPrompt?: string
  ragContext?: string
  onFinish?: (message: Message) => void
}) {
  const chat = useChat({
    api: '/api/chat',
    body: {
      conversationId,
      model,
      provider,
      systemPrompt,
      ragContext
    },
    onFinish: (message) => {
      console.log('🎯 [useAIChat] AI response finished:', message)
      onFinish?.(message)
    },
    onError: (error) => {
      console.error('❌ [useAIChat] Chat error:', error)
    }
  })

  // Override handleSubmit to support experimental_attachments
  const enhancedHandleSubmit = (event?: React.FormEvent<HTMLFormElement>, chatRequestOptions?: { experimental_attachments?: FileList }) => {
    if (event) {
      event.preventDefault()
    }
    
    const hasInput = chat.input.trim().length > 0
    const hasAttachments = chatRequestOptions?.experimental_attachments && chatRequestOptions.experimental_attachments.length > 0
    
    if (hasInput || hasAttachments) {
      console.log('🤖 [useAIChat] Submitting with attachments:', {
        hasInput,
        hasAttachments,
        attachmentCount: chatRequestOptions?.experimental_attachments?.length || 0
      })
      
      return chat.handleSubmit(event, {
        body: {
          conversationId,
          model,
          provider,
          systemPrompt,
          ragContext
        },
        experimental_attachments: chatRequestOptions?.experimental_attachments
      })
    }
  }

  return {
    ...chat,
    handleSubmit: enhancedHandleSubmit
  }
}

export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === modelId)
}

export function getModelsByProvider(provider: string): AIModel[] {
  return AI_MODELS.filter(model => model.provider === provider)
}