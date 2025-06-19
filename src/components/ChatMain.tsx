'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { useAIChat } from '@/lib/ai'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ModelSelector from './ModelSelector'
import CostTracker from './CostTracker'
import ModelComparison from './ModelComparison'
import TaskExtractorDropdown from './TaskExtractorDropdownPortal'
import OpenRouterSettings from './OpenRouterSettings'
import VoiceDiagnostics from './VoiceDiagnostics'
import { useScrollPosition } from '@/hooks/useScrollPosition'
import type { Database } from '@/lib/supabase'
import { useUsageTracking } from '@/lib/usage-tracker'
import { useAuth } from '@/contexts/AuthContext'

type Message = Database['public']['Tables']['messages']['Row']

interface ChatMainProps {
  conversationId: string | null
  messages: Message[]
  isLoading: boolean
  selectedModel: string
  selectedProvider: string
  onModelChange: (model: string, provider: string) => void
  onCreateConversation?: () => Promise<string | null>
  onMessageSent?: () => void
}

export default function ChatMain({
  conversationId,
  messages,
  isLoading,
  selectedModel,
  selectedProvider,
  onModelChange,
  onCreateConversation,
  onMessageSent
}: ChatMainProps) {
  const { sendMessage, updateTypingStatus } = useRealtimeChat(conversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageListRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [isAIResponding, setIsAIResponding] = useState(false)
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef(0)
  const { updateByokStatus, getUsage } = useUsageTracking()
  const { user } = useAuth()
  
  // Use scroll position hook
  const { saveScrollPosition } = useScrollPosition(conversationId, messageListRef)
  
  // Branching state
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>()
  
  // State for pending message when no conversation exists
  const [pendingMessage, setPendingMessage] = useState<{ text: string; files?: FileList | null } | null>(null)
  
  // OpenRouter configuration state
  const [openRouterConfig, setOpenRouterConfig] = useState({ enabled: false, apiKey: '' })
  const [showOpenRouterSettings, setShowOpenRouterSettings] = useState(false)
  
  // Load OpenRouter config from localStorage or user profile
  useEffect(() => {
    const loadOpenRouterConfig = async () => {
      // First check localStorage
      const stored = localStorage.getItem('openrouter-config')
      if (stored) {
        try {
          const config = JSON.parse(stored)
          setOpenRouterConfig(config)
          
          // Update BYOK status based on OpenRouter config
          if (config.enabled && config.apiKey) {
            updateByokStatus(true, { openRouter: config.apiKey })
          }
          return // Exit if found in localStorage
        } catch (error) {
          console.warn('Failed to parse OpenRouter config from localStorage:', error)
        }
      }
      
      // If not in localStorage and user is logged in, check profile
      if (user) {
        const usage = await getUsage()
        if (usage?.apiKeys?.openRouter) {
          const profileConfig = {
            enabled: true,
            apiKey: usage.apiKeys.openRouter
          }
          setOpenRouterConfig(profileConfig)
          // Save to localStorage for consistency
          localStorage.setItem('openrouter-config', JSON.stringify(profileConfig))
          // Update BYOK status
          updateByokStatus(true, { openRouter: usage.apiKeys.openRouter })
        }
      } else {
        // User logged out - clear OpenRouter config
        setOpenRouterConfig({ enabled: false, apiKey: '' })
        localStorage.removeItem('openrouter-config')
        updateByokStatus(false, {})
      }
    }
    
    loadOpenRouterConfig()
  }, [user]) // Re-run when user changes (login/logout)


  // Convert database messages to AI SDK format for initialization
  // Implement sliding window to limit context size for faster processing
  const initialAIMessages = React.useMemo(() => {
    const MAX_CONTEXT_MESSAGES = 25 // Reduced from 50 for faster processing
    const MAX_CONTEXT_LENGTH = 50000 // Reduced from 100K for faster processing
    
    // Filter messages based on branch if needed
    let relevantMessages = messages
    if (activeBranchId) {
      // TODO: Implement branch path filtering
      // For now, use all messages but this should filter to only the active branch path
      console.log('🌿 [ChatMain] Branch mode active, should filter messages for branch:', activeBranchId)
    }
    
    // Start from the end and work backwards
    const formattedMessages = relevantMessages.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: typeof msg.content === 'object' && msg.content && 'text' in msg.content 
        ? (msg.content as { text: string }).text 
        : typeof msg.content === 'string' ? msg.content : ''
    }))
    
    // Take only the most recent messages that fit within our limits
    let contextLength = 0
    const contextMessages = []
    
    for (let i = formattedMessages.length - 1; i >= 0 && contextMessages.length < MAX_CONTEXT_MESSAGES; i--) {
      const message = formattedMessages[i]
      const messageLength = message.content.length
      
      if (contextLength + messageLength > MAX_CONTEXT_LENGTH) {
        console.log('📏 [ChatMain] Reached context length limit, truncating older messages')
        break
      }
      
      contextMessages.unshift(message) // Add to beginning to maintain order
      contextLength += messageLength
    }
    
    console.log('📚 [ChatMain] Initialized AI messages:', {
      totalMessages: messages.length,
      contextMessages: contextMessages.length,
      contextLength,
      oldestIncluded: contextMessages[0]?.content.substring(0, 50) + '...',
      newestIncluded: contextMessages[contextMessages.length - 1]?.content.substring(0, 50) + '...'
    })
    
    return contextMessages
  }, [messages, activeBranchId])

  // Use AI chat hook for streaming responses
  const {
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isAILoading,
    messages: aiMessages,
    error: aiError,
    isUsingOpenRouter,
    getOpenRouterFee
  } = useAIChat({
    conversationId,
    model: selectedModel,
    provider: selectedProvider,
    initialMessages: initialAIMessages, // Pass conversation history
    useOpenRouter: openRouterConfig.enabled,
    openRouterApiKey: openRouterConfig.apiKey,
    onFinish: async (message) => {
      console.log('🎯 [ChatMain] AI response finished:', message)
      // Save AI response to Supabase
      await sendMessage(message.content, 'assistant')
      // Refresh usage counter after AI response is complete
      onMessageSent?.()
    }
  })

  const handleModelChange = (model: string, provider: string) => {
    console.log('🔄 [ChatMain] Model changed:', { 
      previousModel: selectedModel, 
      previousProvider: selectedProvider,
      newModel: model, 
      newProvider: provider,
      conversationId
    })
    onModelChange(model, provider)
  }


  // Debug AI messages and handle errors
  useEffect(() => {
    if (aiMessages.length > 0) {
      console.log('💬 [ChatMain] AI messages updated:', aiMessages)
    }
    if (aiError) {
      console.error('❌ [ChatMain] AI error:', aiError)
    }
  }, [aiMessages, aiError])

  // Parse error messages to show user-friendly messages
  const getErrorMessage = (error: Error | undefined) => {
    if (!error) return null
    
    console.log('🔍 [ChatMain] Parsing error message:', {
      message: error.message,
      startsWithBrace: error.message?.startsWith('{'),
      messageLength: error.message?.length
    })
    
    // Try to parse structured error responses
    if (error.message && error.message.startsWith('{')) {
      try {
        const parsedError = JSON.parse(error.message)
        console.log('✅ [ChatMain] Parsed error object:', parsedError)
        
        if (parsedError.type === 'usage_limit') {
          return parsedError.error
        } else if (parsedError.type === 'api_error' || parsedError.type === 'api_key_error') {
          return parsedError.error
        }
        return parsedError.error || error.message
      } catch (parseError) {
        console.warn('❌ [ChatMain] Failed to parse error JSON:', parseError)
        // Fall back to original error message
      }
    }
    
    console.log('📝 [ChatMain] Using original error message:', error.message)
    return error.message
  }

  // Enhanced auto-scroll with user scroll detection
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight
    }
  }, [])

  // Handle scroll events to detect user scrolling with debouncing
  const handleScroll = useCallback(() => {
    if (!messageListRef.current) return
    
    // Don't allow user scrolling while AI is responding
    if (isAIResponding) {
      // Force scroll back to bottom during AI response
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight
        }
      })
      return
    }
    
    // Clear existing debounce
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current)
    }
    
    // Debounce scroll handling for better performance
    scrollDebounceRef.current = setTimeout(() => {
      if (!messageListRef.current || isAIResponding) return
      
      const { scrollTop, scrollHeight, clientHeight } = messageListRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
      
      setShowScrollButton(!isAtBottom)
      
      // If user scrolls up, set flag to prevent auto-scroll
      if (!isAtBottom) {
        setIsUserScrolling(true)
        saveScrollPosition()
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current)
        }
        // Reset after 30 seconds of no scrolling
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false)
        }, 30000)
      } else {
        setIsUserScrolling(false)
      }
    }, 50) // 50ms debounce
  }, [saveScrollPosition, isAIResponding])

  // Track AI responding state
  useEffect(() => {
    // Check if we have a new user message (message count increased)
    if (messages.length > lastMessageCountRef.current) {
      const newMessages = messages.slice(lastMessageCountRef.current)
      const hasNewUserMessage = newMessages.some(msg => msg.role === 'user')
      
      if (hasNewUserMessage) {
        // User sent a message, start AI response mode
        setIsAIResponding(true)
        setIsUserScrolling(false)
        console.log('🚀 Starting AI response mode')
      }
    }
    lastMessageCountRef.current = messages.length
  }, [messages])

  // Monitor AI loading state
  useEffect(() => {
    if (!isAILoading && isAIResponding) {
      // AI finished responding, allow free scrolling
      setIsAIResponding(false)
      console.log('✅ AI response complete, enabling free scroll')
    }
  }, [isAILoading, isAIResponding])

  // Auto-scroll when messages arrive or during AI response
  useEffect(() => {
    if (messages.length > 0 && (isAIResponding || !isUserScrolling)) {
      // Always scroll to bottom during AI response or when user hasn't scrolled
      requestAnimationFrame(() => {
        scrollToBottom('auto')
      })
    }
  }, [messages, isAIResponding, isUserScrolling, scrollToBottom])

  // Auto-scroll when AI messages are streaming
  useEffect(() => {
    if (aiMessages.length > 0 && (isAILoading || isAIResponding)) {
      // Continuous scroll during AI response
      requestAnimationFrame(() => {
        scrollToBottom('auto')
      })
    }
  }, [aiMessages, isAILoading, isAIResponding, scrollToBottom])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
      if (scrollDebounceRef.current) clearTimeout(scrollDebounceRef.current)
    }
  }, [])

  // Send pending message when conversation is created
  useEffect(() => {
    if (conversationId && pendingMessage) {
      console.log('📨 [ChatMain] Sending pending message to new conversation:', conversationId)
      const message = pendingMessage.text
      const files = pendingMessage.files
      // Clear pending message
      setPendingMessage(null)
      // Use setTimeout to ensure state updates have propagated
      setTimeout(() => {
        // Update input and trigger send
        handleInputValueChange(message)
        handleSendMessage(files)
      }, 100)
    }
  }, [conversationId])

  const handleSendMessage = async (fileList?: FileList | null, e?: React.FormEvent) => {
    console.log('🚀 [ChatMain] handleSendMessage called', { 
      hasEvent: !!e, 
      input: input.trim(), 
      isAILoading, 
      conversationId,
      attachedFilesCount: fileList?.length || 0,
      attachedFiles: fileList ? Array.from(fileList).map(f => ({ name: f.name, type: f.type, size: f.size })) : []
    })
    
    if (e) {
      e.preventDefault()
    }
    
    if ((!input.trim() && (!fileList || fileList.length === 0)) || isAILoading) {
      console.warn('❌ [ChatMain] Message sending blocked:', { 
        hasInput: !!input.trim(), 
        hasAttachedFiles: !!(fileList && fileList.length > 0),
        isAILoading
      })
      return
    }

    // Create conversation if it doesn't exist
    if (!conversationId) {
      console.log('🆕 [ChatMain] No conversation exists, storing pending message and creating conversation...')
      setPendingMessage({ text: input.trim(), files: fileList })
      if (onCreateConversation) {
        const newConversationId = await onCreateConversation()
        if (newConversationId) {
          console.log('✅ [ChatMain] New conversation created:', newConversationId)
          // The pending message will be sent automatically via the useEffect
        } else {
          console.error('❌ [ChatMain] Failed to create conversation')
        }
        return
      } else {
        console.error('❌ [ChatMain] No onCreateConversation handler provided')
        return
      }
    }

    try {
      console.log('💾 [ChatMain] Saving user message to Supabase:', input)
      
      // Check if we're creating a branch from a specific message
      const parentId = activeBranchId
      if (parentId) {
        console.log('🌿 [ChatMain] Creating branch message with parent:', parentId)
        await sendMessage(input, 'user', parentId)
        // Reset branch mode after creating the branch
        setActiveBranchId(undefined)
      } else {
        // Normal message (no branching)
        await sendMessage(input, 'user')
      }
      
      // Notify parent that a message was sent to refresh sidebar
      onMessageSent?.()
      
      console.log('🤖 [ChatMain] Triggering AI response with files:', {
        filesCount: fileList?.length || 0,
        hasFiles: !!(fileList && fileList.length > 0)
      })
      
      // The AI SDK now has the full conversation history via initialMessages
      // Just submit with attachments if any
      await handleSubmit(undefined, {
        experimental_attachments: fileList || undefined
      } as any)
      
      // Clear the input after successful send (AI SDK should do this, but let's be explicit)
      console.log('✅ [ChatMain] Message sent successfully, input should be cleared')
    } catch (error) {
      console.error('❌ [ChatMain] Error sending message:', error)
    }
  }

  // const handleKeyPress = (e: React.KeyboardEvent) => {
  //   if (e.key === 'Enter' && !e.shiftKey) {
  //     e.preventDefault()
  //     handleSendMessage()
  //   }
  // }

  const handleInputValueChange = (value: string) => {
    handleInputChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>)
    // Update typing status for real-time chat
    updateTypingStatus(value.length > 0)
  }

  // Show chat interface even without conversation ID - it will be created on first message

  return (
    <div className="h-full flex flex-col">
      {/* Collaborative Cursors Overlay */}
      
      {/* Header with Model Selector and Controls */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              OpenT3
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              Conversation {conversationId.split('-')[0]}
            </span>
            
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center gap-4">
            {/* OpenRouter Settings Button */}
            <button
              onClick={() => setShowOpenRouterSettings(true)}
              className={`relative text-xs px-3 py-1.5 rounded-full transition-colors ${
                openRouterConfig.enabled
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
              }`}
              title="OpenRouter Configuration - Save 60-80% on AI costs"
            >
              🌐 OpenRouter
              {openRouterConfig.enabled && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
              )}
              {isUsingOpenRouter && getOpenRouterFee() < 0 && (
                <span className="ml-1 text-xs font-bold">+{Math.abs(getOpenRouterFee())}%</span>
              )}
            </button>
            
            <TaskExtractorDropdown conversationId={conversationId} messageCount={messages.length} />
            <ModelComparison 
              selectedModels={[selectedModel]}
              onModelSelect={handleModelChange}
            />
            <CostTracker 
              conversationId={conversationId} 
              openRouterConfig={openRouterConfig}
              selectedModel={selectedModel}
            />
            
            {/* Voice Diagnostics Button */}
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="px-3 py-1.5 text-xs rounded-md bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors text-purple-700 dark:text-purple-300"
              title="Voice diagnostics"
            >
              🎤 Diagnostics
            </button>
          </div>
        </div>
      </div>

      {/* Voice Diagnostics Panel */}
      {showDiagnostics && (
        <div className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <VoiceDiagnostics />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Main Content Area */}
        <div className="flex-1 relative min-w-0 z-0">
          {isLoading && conversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="h-full flex flex-col relative overflow-hidden">
              <MessageList 
                ref={messageListRef}
                messages={messages} 
                aiMessages={conversationId ? aiMessages : []} 
                onScroll={handleScroll}
                isAIResponding={isAIResponding}
              />
              <div ref={messagesEndRef} className="flex-shrink-0 h-4" />
              
              {/* Scroll to bottom button - only show when not AI responding */}
              {showScrollButton && !isAIResponding && (
                <button
                  onClick={() => {
                    setIsUserScrolling(false)
                    scrollToBottom('smooth')
                  }}
                  className="absolute bottom-4 right-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 z-10"
                  aria-label="Scroll to bottom"
                >
                  <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              )}
              
              {/* AI responding indicator */}
              {isAIResponding && (
                <div className="absolute bottom-4 right-4 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700/50 rounded-full text-xs text-blue-700 dark:text-blue-300 animate-pulse">
                  AI responding...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 flex-shrink-0">
        
        {/* Error Display */}
        {aiError && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg">
            <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <div className="flex-1">
                <div className="font-medium mb-1">Error</div>
                <div className="text-xs">{getErrorMessage(aiError)}</div>
              </div>
              <button 
                onClick={() => {
                  setIsAIResponding(false)
                  window.location.reload()
                }}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 text-xs"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Branch Mode Indicator */}
        {activeBranchId && (
          <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-orange-700 dark:text-orange-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.5 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM6 6.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0zm2.5 6a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM5 14a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0zm8.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM12 15.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                <path d="M8.5 8.5v4M13.5 8.5v2"/>
              </svg>
              <span className="font-medium">Branch Mode:</span>
              <span>Your next message will create a new conversation branch</span>
              <button 
                onClick={() => setActiveBranchId(undefined)}
                className="ml-auto text-orange-600 hover:text-orange-800 dark:text-orange-400 dark:hover:text-orange-200"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-3">
          {/* Model Selector */}
          <div className="flex-shrink-0">
            <ModelSelector
              selectedModel={selectedModel}
              selectedProvider={selectedProvider}
              onModelChange={handleModelChange}
              disabled={isAILoading}
            />
          </div>
          
          {/* Message Input */}
          <div className="flex-1 flex items-end gap-2">
            <div className="flex-1">
              <MessageInput
                value={input}
                onChange={handleInputValueChange}
                onSend={handleSendMessage}
                disabled={isAILoading}
                placeholder={
                  isAILoading
                    ? 'AI is thinking...'
                    : 'Type your message... (Press Enter to send, Shift+Enter for new line)'
                }
              />
            </div>
            
          </div>
        </div>
      </div>

      {/* OpenRouter Settings Modal */}
      <OpenRouterSettings
        isOpen={showOpenRouterSettings}
        onClose={() => setShowOpenRouterSettings(false)}
        onConfigChange={(config) => {
          setOpenRouterConfig(config)
          console.log('🌐 [ChatMain] OpenRouter config updated:', config)
        }}
        currentConfig={openRouterConfig}
      />

    </div>
  )
}