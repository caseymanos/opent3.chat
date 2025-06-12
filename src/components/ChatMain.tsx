'use client'

import { useRef, useEffect, useState } from 'react'
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
import type { Database } from '@/lib/supabase'

type Message = Database['public']['Tables']['messages']['Row']

interface ChatMainProps {
  conversationId: string
  messages: Message[]
  isLoading: boolean
  selectedModel: string
  selectedProvider: string
  onModelChange: (model: string, provider: string) => void
}

export default function ChatMain({
  conversationId,
  messages,
  isLoading,
  selectedModel,
  selectedProvider,
  onModelChange
}: ChatMainProps) {
  const { sendMessage, updateTypingStatus } = useRealtimeChat(conversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Branching state
  const [showBranchNavigator, setShowBranchNavigator] = useState(false)
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>()
  
  
  // Tab state for side panels
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'summaries'>('chat')
  


  // Use AI chat hook for streaming responses
  const {
    input,
    handleInputChange,
    handleSubmit,
    isLoading: isAILoading,
    messages: aiMessages,
    error: aiError
  } = useAIChat({
    conversationId,
    model: selectedModel,
    provider: selectedProvider,
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

  // Debug AI messages
  useEffect(() => {
    if (aiMessages.length > 0) {
      console.log('💬 [ChatMain] AI messages updated:', aiMessages)
    }
    if (aiError) {
      console.error('❌ [ChatMain] AI error:', aiError)
    }
  }, [aiMessages, aiError])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
    
    if ((!input.trim() && (!fileList || fileList.length === 0)) || isAILoading || !conversationId) {
      console.warn('❌ [ChatMain] Message sending blocked:', { 
        hasInput: !!input.trim(), 
        hasAttachedFiles: !!(fileList && fileList.length > 0),
        isAILoading, 
        hasConversationId: !!conversationId 
      })
      return
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
      
      console.log('🤖 [ChatMain] Triggering AI response with files:', {
        filesCount: fileList?.length || 0,
        hasFiles: !!(fileList && fileList.length > 0)
      })
      
      // Use the proper AI SDK flow with file attachments
      await handleSubmit(undefined, {
        experimental_attachments: fileList || undefined
      })
      
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
            Welcome to T3 Crusher
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Start a new conversation to begin chatting with AI
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Collaborative Cursors Overlay */}
      
      {/* Header with Model Selector and Controls */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              T3 Crusher
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
            
            
            <TaskExtractor conversationId={conversationId} />
            <ModelComparison 
              selectedModels={[selectedModel]}
              onModelSelect={handleModelChange}
            />
            <CostTracker conversationId={conversationId} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
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
            {activeTab === 'files' && (
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
            {activeTab === 'summaries' && (
              <div className="p-4">
                <FileSummaries conversationId={conversationId} />
              </div>
            )}
          </div>
        )}
        
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto relative min-w-0">
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'chat' ? (
            <>
              <MessageList 
                messages={messages} 
                aiMessages={aiMessages} 
                onCreateBranch={handleCreateBranch}
              />
              <div ref={messagesEndRef} />
            </>
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

    </div>
  )
}