import { useChat } from 'ai/react'
import type { Message } from 'ai'

export interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google'
  maxTokens: number
  description: string
}

export const AI_MODELS: AIModel[] = [
  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    maxTokens: 128000,
    description: 'Latest multimodal GPT-4 with vision and faster responses'
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    maxTokens: 128000,
    description: 'Advanced GPT-4 with larger context window'
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    maxTokens: 8192,
    description: 'Most capable OpenAI model for complex reasoning'
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    maxTokens: 16384,
    description: 'Fast and cost-effective for most conversations'
  },
  
  // Anthropic Models
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Latest Claude with enhanced reasoning and coding'
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Most powerful Claude model for complex tasks'
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Balanced performance and speed'
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    maxTokens: 200000,
    description: 'Fastest Claude model for quick responses'
  },
  
  // Google Models (for future implementation)
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    maxTokens: 32768,
    description: 'Google\'s multimodal AI with vision capabilities'
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
  onFinish
}: {
  conversationId: string
  model?: string
  provider?: string
  systemPrompt?: string
  onFinish?: (message: Message) => void
}) {
  const chat = useChat({
    api: '/api/chat',
    body: {
      conversationId,
      model,
      provider,
      systemPrompt
    },
    onFinish: (message) => {
      console.log('🎯 [useAIChat] AI response finished:', message)
      onFinish?.(message)
    },
    onError: (error) => {
      console.error('❌ [useAIChat] Chat error:', error)
    }
  })

  return chat
}

export function getModelById(modelId: string): AIModel | undefined {
  return AI_MODELS.find(model => model.id === modelId)
}

export function getModelsByProvider(provider: string): AIModel[] {
  return AI_MODELS.filter(model => model.provider === provider)
}