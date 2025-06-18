'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { useAIChat } from '@/lib/ai'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ModelSelector from './ModelSelector'
import BranchNavigator from './BranchNavigator'
import FileUpload from './FileUpload'
import FileSummaries from './FileSummaries'
import CostTracker from './CostTracker'
import ModelComparison from './ModelComparison'
import TaskExtractor from './TaskExtractor'
import OpenRouterSettings from './OpenRouterSettings'
import { useScrollPosition } from '@/hooks/useScrollPosition'
import type { Database } from '@/lib/supabase'

type Message = Database['public']['Tables']['messages']['Row']

interface ChatMainProps {
  conversationId: string | null
  messages: Message[]
  isLoading: boolean
  selectedModel: string
  selectedProvider: string
  onModelChange: (model: string, provider: string) => void
  onCreateConversation?: () => Promise<void>
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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scrollDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastMessageCountRef = useRef(0)
  
  // Use scroll position hook
  const { saveScrollPosition } = useScrollPosition(conversationId, messageListRef)
  
  // Branching state
  const [showBranchNavigator, setShowBranchNavigator] = useState(false)
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>()
  
  // State for pending message when no conversation exists
  const [pendingMessage, setPendingMessage] = useState<{ text: string; files?: FileList | null } | null>(null)
  
  // OpenRouter configuration state
  const [openRouterConfig, setOpenRouterConfig] = useState({ enabled: false, apiKey: '' })
  const [showOpenRouterSettings, setShowOpenRouterSettings] = useState(false)
  
  // Tab state for side panels
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'summaries'>('chat')
  
  // Load OpenRouter config from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('openrouter-config')
    if (stored) {
      try {
        setOpenRouterConfig(JSON.parse(stored))
      } catch (error) {
        console.warn('Failed to parse OpenRouter config from localStorage:', error)
      }
    }
  }, [])


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

  const handleCreateBranch = async (parentMessageId: string) => {
    console.log('🌿 [ChatMain] Creating branch from message:', { 
      parentMessageId, 
      conversationId,
      currentMessages: messages.length 
    })
    
    try {
      // Find the parent message to get its branch info
      const parentMessage = messages.find(m => m.id === parentMessageId)
      if (!parentMessage) {
        console.error('Parent message not found')
        return
      }

      // Calculate next branch index for this parent
      const siblingBranches = messages.filter(m => m.parent_id === parentMessageId)
      const nextBranchIndex = siblingBranches.length

      console.log(`🌿 Creating branch ${nextBranchIndex} from message ${parentMessageId}`)
      
      // Set up for branching - user can now respond and it will create a new branch
      setActiveBranchId(parentMessageId)
      setShowBranchNavigator(true)
      
      // Store the branch context for next message
      // When user sends next message, it will use this parent and branch index
      
    } catch (error) {
      console.error('Error creating branch:', error)
    }
  }

  const handleBranchSelect = (messageId: string) => {
    console.log('🎯 [ChatMain] Branch selected:', { messageId, conversationId })
    setActiveBranchId(messageId)
    
    // In a full implementation, this would filter messages to show only the selected branch path
    // For now, we'll highlight the selected branch in the navigator
    
    // TODO: Implement branch path filtering to show only messages in the selected branch
    // This would involve:
    // 1. Finding all ancestor messages from root to selected message
    // 2. Finding all descendant messages from selected message
    // 3. Filtering the message list to show only this path
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
        await onCreateConversation()
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

  if (!conversationId) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Welcome to OpenT3
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Start a new conversation to begin chatting with AI
          </p>
        </div>
      </div>
    )
  }

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
            
            {/* Tab Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('chat')}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  activeTab === 'chat'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30'
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  activeTab === 'files'
                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/30'
                }`}
              >
                📁 Upload
              </button>
              <button
                onClick={() => setActiveTab('summaries')}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                  activeTab === 'summaries'
                    ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                }`}
              >
                📄 Files
              </button>
              {activeTab === 'chat' && (
                <>
                  <button
                    onClick={() => setShowBranchNavigator(!showBranchNavigator)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                      showBranchNavigator
                        ? 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/30'
                    }`}
                    title="Toggle conversation tree"
                  >
                    🌿 Tree
                  </button>
                </>
              )}
            </div>
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
            
            <TaskExtractor conversationId={conversationId} />
            <ModelComparison 
              selectedModels={[selectedModel]}
              onModelSelect={handleModelChange}
            />
            <CostTracker 
              conversationId={conversationId} 
              openRouterConfig={openRouterConfig}
              selectedModel={selectedModel}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Content */}
        {(activeTab !== 'chat' || showBranchNavigator) && (
          <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm overflow-y-auto flex-shrink-0">
            {activeTab === 'chat' && showBranchNavigator && (
              <BranchNavigator
                messages={messages}
                activeMessageId={activeBranchId}
                onBranchSelect={handleBranchSelect}
                onCreateBranch={handleCreateBranch}
              />
            )}
            {activeTab === 'files' && conversationId && (
              <div className="p-4">
                <FileUpload
                  conversationId={conversationId}
                  onAnalysisComplete={(summary, fileInfo) => {
                    console.log('File analysis completed:', { summary, fileInfo })
                    // Optionally switch back to chat tab or add message
                    setActiveTab('chat')
                  }}
                />
              </div>
            )}
            {activeTab === 'files' && !conversationId && (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p>Start a conversation first to upload files</p>
              </div>
            )}
            {activeTab === 'summaries' && conversationId && (
              <div className="p-4">
                <FileSummaries conversationId={conversationId} />
              </div>
            )}
            {activeTab === 'summaries' && !conversationId && (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                <p>Start a conversation first to view summaries</p>
              </div>
            )}
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 relative min-w-0">
          {!conversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Welcome to OpenT3
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Start a conversation by typing a message below.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'chat' ? (
            <div className="h-full flex flex-col relative">
              <MessageList 
                ref={messageListRef}
                messages={messages} 
                aiMessages={conversationId ? aiMessages : []} 
                onCreateBranch={handleCreateBranch}
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
                  className="absolute bottom-4 right-4 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 gpu-accelerated"
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
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-slate-500 dark:text-slate-400">
                <div className="text-4xl mb-4">
                  {activeTab === 'files' ? '📁' : '📄'}
                </div>
                <p className="text-lg font-medium mb-2">
                  {activeTab === 'files' ? 'File Upload & Analysis' : 'File Summaries'}
                </p>
                <p className="text-sm">
                  {activeTab === 'files' 
                    ? 'Use the sidebar to upload and analyze files with your selected AI model'
                    : 'View and manage your analyzed file summaries from the sidebar'
                  }
                </p>
              </div>
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
                disabled={isAILoading || !conversationId}
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