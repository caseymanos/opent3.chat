'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import { useAuth } from '@/contexts/AuthContext'
import ChatSidebar from './ChatSidebar'
import ChatMain from './ChatMain'
import { Button } from './ui/Button'
import { PlusIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline'

interface ChatInterfaceProps {
  initialConversationId?: string
}

export default function ChatInterface({ initialConversationId }: ChatInterfaceProps) {
  const router = useRouter()
  const { user, isAnonymous, signOut } = useAuth()
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    // Start with sidebar closed on mobile
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768
    }
    return true
  })
  const [creatingConversation, setCreatingConversation] = useState(false)
  const [sidebarKey, setSidebarKey] = useState(0) // Force sidebar refresh
  // Model selection state - moved up from ChatMain to ensure new conversations use current model
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307')
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  
  // Initialize with provided conversation ID only once
  useEffect(() => {
    if (initialConversationId && !currentConversationId) {
      console.log('🔄 [ChatInterface] Setting initial conversation ID:', initialConversationId)
      setCurrentConversationId(initialConversationId)
    }
  }, [initialConversationId]) // Remove currentConversationId from deps to prevent loops

  // Debug conversation ID changes
  useEffect(() => {
    console.log('🔄 [ChatInterface] Conversation ID changed:', currentConversationId)
  }, [currentConversationId])
  
  const { 
    messages, 
    conversation, 
    isLoading, 
    createNewConversation,
    deleteConversation,
    clearAllConversations
  } = useRealtimeChat(currentConversationId)

  const handleNewConversation = async () => {
    if (creatingConversation) return // Prevent double-clicks
    
    try {
      setCreatingConversation(true)
      console.log('🆕 [ChatInterface] handleNewConversation called')
      const newConversation = await createNewConversation('New Chat', selectedProvider, selectedModel)
      console.log('✅ [ChatInterface] New conversation created:', newConversation)
      if (newConversation && newConversation.id) {
        console.log('🔄 [ChatInterface] Setting new conversation ID:', newConversation.id)
        // Set the conversation ID directly without navigation for better UX
        setCurrentConversationId(newConversation.id)
        setSidebarKey(prev => prev + 1) // Force sidebar to re-render and reload conversations
        console.log('✅ [ChatInterface] Set conversation ID to:', newConversation.id)
      } else {
        console.error('❌ [ChatInterface] No conversation ID returned:', newConversation)
      }
    } catch (error) {
      console.error('❌ [ChatInterface] Failed to create new conversation:', error)
      // Show error to user without alert (less intrusive)
      console.warn(`Conversation creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setCreatingConversation(false)
    }
  }

  // Only create initial conversation if no initial ID provided
  useEffect(() => {
    if (!initialConversationId && !currentConversationId && !creatingConversation) {
      console.log('🔄 [ChatInterface] Creating initial conversation')
      handleNewConversation()
    }
  }, []) // Empty deps to run only once on mount
  
  // Handle invalid conversation IDs
  if (initialConversationId === 'default' || currentConversationId === 'default') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Initializing chat...</p>
        </div>
      </div>
    )
  }

  const handleConversationSelect = (conversationId: string) => {
    // Set the conversation ID directly for better UX
    setCurrentConversationId(conversationId)
    console.log('🔄 [ChatInterface] Selected conversation:', conversationId)
    
    // Close sidebar on mobile after selection
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false)
    }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId)
      setSidebarKey(prev => prev + 1) // Force sidebar refresh
      // If we deleted the current conversation, create a new one
      if (conversationId === currentConversationId) {
        handleNewConversation()
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleClearAll = async () => {
    try {
      console.log('🗑️ [ChatInterface] Starting clear all conversations')
      
      // First clear the current conversation ID to trigger cleanup of subscriptions
      const previousConversationId = currentConversationId
      setCurrentConversationId('')
      
      // Wait for cleanup to happen
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Now clear all conversations from database
      await clearAllConversations()
      console.log('✅ [ChatInterface] Clear all completed, refreshing UI')
      
      // Force sidebar refresh
      setSidebarKey(prev => prev + 1)
      
      // Create new conversation after ensuring cleanup is complete
      // Use a longer delay to ensure all subscriptions are cleaned up
      setTimeout(async () => {
        // Only create new conversation if we actually cleared the current one
        if (previousConversationId) {
          console.log('🆕 [ChatInterface] Creating new conversation after clear all')
          await handleNewConversation()
        }
      }, 500)
    } catch (error) {
      console.error('❌ [ChatInterface] Failed to clear conversations:', error)
      // Don't create new conversation if clear failed
    }
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-30
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} 
        ${sidebarOpen ? 'w-80' : 'lg:w-0'} 
        transition-all duration-300 ease-in-out 
        border-r border-gray-200/50 dark:border-gray-700/50
        bg-white/80 dark:bg-gray-900/80 
        backdrop-blur-2xl
        flex-shrink-0
        shadow-lg lg:shadow-sm
      `}>
        <ChatSidebar
          key={sidebarKey}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onClearAllConversations={handleClearAll}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-16 border-b border-gray-200/30 dark:border-gray-700/30 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              {conversation?.title || 'T3 Crusher'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {/* User menu */}
            <div className="flex items-center gap-2">
              {user && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <div className="relative">
                    <UserCircleIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    {!isAnonymous && (
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-slate-800"></div>
                    )}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">
                    {user.email?.split('@')[0] || 'User'}
                  </span>
                  {isAnonymous && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">(Guest)</span>
                  )}
                </div>
              )}
              
              {!isAnonymous ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await signOut()
                    router.push('/login')
                  }}
                  className="flex items-center gap-2"
                >
                  <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-2"
                >
                  Sign In
                </Button>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('New Chat button clicked')
                handleNewConversation()
              }}
              disabled={creatingConversation}
              className="flex items-center gap-2"
            >
              {creatingConversation ? (
                <>
                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusIcon className="w-4 h-4" />
                  New Chat
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Chat Messages Area */}
        <div className="flex-1">
          <ChatMain
            conversationId={currentConversationId}
            messages={messages}
            isLoading={isLoading}
            selectedModel={selectedModel}
            selectedProvider={selectedProvider}
            onModelChange={(model, provider) => {
              setSelectedModel(model)
              setSelectedProvider(provider)
            }}
          />
        </div>
      </div>
    </div>
  )
}