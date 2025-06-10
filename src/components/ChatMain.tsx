'use client'

import { useRef, useEffect, useState } from 'react'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { useAIChat, getModelById } from '@/lib/ai'
import { useCollaborativeChat } from '@/hooks/useCollaborativeChat'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import ModelSelector from './ModelSelector'
import BranchNavigator from './BranchNavigator'
import FileUpload from './FileUpload'
import FileSummaries from './FileSummaries'
import CollaborativeCursors from './CollaborativeCursors'
import CollaborativeInvite from './CollaborativeInvite'
import type { Database } from '@/lib/supabase'
import { UserPlusIcon } from '@heroicons/react/24/outline'

type Message = Database['public']['Tables']['messages']['Row']

interface ChatMainProps {
  conversationId: string
  messages: Message[]
  isLoading: boolean
}

export default function ChatMain({
  conversationId,
  messages,
  isLoading
}: ChatMainProps) {
  const { sendMessage, updateTypingStatus } = useRealtimeChat(conversationId)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Model switching state
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307')
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  
  // Branching state
  const [showBranchNavigator, setShowBranchNavigator] = useState(false)
  const [activeBranchId, setActiveBranchId] = useState<string | undefined>()
  
  // Tab state for side panels
  const [activeTab, setActiveTab] = useState<'chat' | 'files' | 'summaries'>('chat')
  
  // Collaborative state
  const [showInviteModal, setShowInviteModal] = useState(false)
  
  // Collaborative features
  const { updateTyping, isCollaborative } = useCollaborativeChat(conversationId)

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
    setSelectedModel(model)
    setSelectedProvider(provider)
  }

  const handleCreateBranch = (parentMessageId: string) => {
    console.log('🌿 [ChatMain] Creating branch from message:', { 
      parentMessageId, 
      conversationId,
      currentMessages: messages.length 
    })
    
    // TODO: Implement actual branch creation logic
    // For now, just activate the branch navigator and set the parent
    setActiveBranchId(parentMessageId)
    setShowBranchNavigator(true)
    
    // In a real implementation, this would:
    // 1. Create a new branch entry in the database
    // 2. Allow the user to continue from that message
    // 3. Update the conversation tree structure
  }

  const handleBranchSelect = (messageId: string) => {
    console.log('🎯 [ChatMain] Branch selected:', { messageId, conversationId })
    setActiveBranchId(messageId)
    // TODO: Load messages for this branch path
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    console.log('🚀 [ChatMain] handleSendMessage called', { 
      hasEvent: !!e, 
      input: input.trim(), 
      isAILoading, 
      conversationId 
    })
    
    if (e) {
      e.preventDefault()
    }
    
    if (!input.trim() || isAILoading || !conversationId) {
      console.warn('❌ [ChatMain] Message sending blocked:', { 
        hasInput: !!input.trim(), 
        isAILoading, 
        hasConversationId: !!conversationId 
      })
      return
    }

    try {
      console.log('💾 [ChatMain] Saving user message to Supabase:', input)
      // Save user message to Supabase first
      await sendMessage(input, 'user')
      
      console.log('🤖 [ChatMain] Triggering AI response via handleSubmit')
      // Then trigger AI response (no need to pass event)
      handleSubmit()
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
    // Update collaborative typing indicator
    updateTyping(value.length > 0)
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
    <div className="h-full flex flex-col">
      {/* Collaborative Cursors Overlay */}
      <CollaborativeCursors conversationId={conversationId} />
      
      {/* Header with Model Selector and Controls */}
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4">
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
              )}
              <button
                onClick={() => setShowInviteModal(true)}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-1"
                title="Invite collaborators"
              >
                <UserPlusIcon className="w-3 h-3" />
                {isCollaborative ? 'Manage' : 'Invite'}
              </button>
            </div>
          </div>
          <ModelSelector
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            onModelChange={handleModelChange}
            disabled={isAILoading}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Content */}
        {(activeTab !== 'chat' || showBranchNavigator) && (
          <div className="w-80 border-r border-slate-200 dark:border-slate-700 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm overflow-y-auto">
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
        <div className="flex-1 overflow-y-auto">
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
      <div className="border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl p-4">
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

      {/* Collaborative Invite Modal */}
      <CollaborativeInvite
        conversationId={conversationId}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />
    </div>
  )
}