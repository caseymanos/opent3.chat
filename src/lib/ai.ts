import React from 'react'
import { useChat, type Message } from 'ai/react'
import { getOpenRouterProvider } from './openrouter'

// Re-export from models for backward compatibility
export type { AIModel } from './models'
export { AI_MODELS, getModelById, getModelsByProvider } from './models'

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
  model = 'gemini-2.5-flash-preview-05-20',
  provider = 'google',
  systemPrompt,
  ragContext,
  onFinish,
  initialMessages = [],
  useOpenRouter = false,
  openRouterApiKey = ''
}: {
  conversationId: string | null
  model?: string
  provider?: string
  systemPrompt?: string
  ragContext?: string
  onFinish?: (message: Message) => void
  initialMessages?: Message[]
  useOpenRouter?: boolean
  openRouterApiKey?: string
}) {
  const [previousConversationId, setPreviousConversationId] = React.useState<string | null>(null)
  
  // Initialize OpenRouter if requested
  const openRouterProvider = React.useMemo(() => {
    if (useOpenRouter && openRouterApiKey) {
      return getOpenRouterProvider({
        apiKey: openRouterApiKey,
        enabled: true,
        fallbackToDirectAPIs: true
      })
    }
    return null
  }, [useOpenRouter, openRouterApiKey])
  
  const chat = useChat({
    id: conversationId || 'no-conversation', // Force reset when conversation changes
    api: '/api/chat',
    initialMessages: initialMessages, // Initialize with conversation history
    body: {
      conversationId,
      model,
      provider,
      systemPrompt,
      ragContext,
      useOpenRouter,
      openRouterApiKey: useOpenRouter ? openRouterApiKey : undefined
    },
    onFinish: (message) => {
      console.log('🎯 [useAIChat] AI response finished:', message)
      onFinish?.(message)
    },
    onError: (error) => {
      console.error('❌ [useAIChat] Chat error:', error)
      
      // Try to parse structured error responses
      if (error.message && error.message.startsWith('{')) {
        try {
          const parsedError = JSON.parse(error.message)
          if (parsedError.type === 'usage_limit') {
            console.error('🚫 [useAIChat] Usage limit error:', parsedError)
          }
        } catch (parseError) {
          console.warn('Failed to parse error message as JSON:', parseError)
        }
      }
    }
  })

  // Override handleSubmit to support experimental_attachments
  const enhancedHandleSubmit = (event?: React.FormEvent<HTMLFormElement>, chatRequestOptions?: any) => {
    if (event) {
      event.preventDefault()
    }
    
    const hasInput = chat.input.trim().length > 0
    const hasAttachments = chatRequestOptions?.experimental_attachments && chatRequestOptions.experimental_attachments.length > 0
    
    if (hasInput || hasAttachments) {
      console.log('🤖 [useAIChat] Submitting with attachments:', {
        hasInput,
        hasAttachments,
        attachmentCount: chatRequestOptions?.experimental_attachments?.length || 0,
        currentMessages: chat.messages.length
      })
      
      return chat.handleSubmit(event, {
        body: {
          conversationId,
          model,
          provider,
          systemPrompt,
          ragContext,
          useOpenRouter,
          openRouterApiKey: useOpenRouter ? openRouterApiKey : undefined
        },
        experimental_attachments: chatRequestOptions?.experimental_attachments
      })
    }
  }

  // Update messages when conversation changes or initial messages change
  React.useEffect(() => {
    if (previousConversationId !== conversationId) {
      console.log('🧹 [useAIChat] Conversation changed, updating AI messages with history')
      // Set the messages to the initial messages (conversation history)
      chat.setMessages(initialMessages)
      setPreviousConversationId(conversationId)
    }
  }, [conversationId, previousConversationId, chat, initialMessages])

  return {
    ...chat,
    handleSubmit: enhancedHandleSubmit,
    openRouterProvider,
    isUsingOpenRouter: useOpenRouter && !!openRouterProvider?.isAvailable(),
    getOpenRouterFee: () => openRouterProvider?.getCostSavings() || 0 // Returns negative value (fee)
  }
}

