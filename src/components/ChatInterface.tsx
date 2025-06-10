'use client'

import { useState, useEffect } from 'react'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'
import ChatSidebar from './ChatSidebar'
import ChatMain from './ChatMain'
import { Button } from './ui/Button'
import { PlusIcon } from '@heroicons/react/24/outline'

export default function ChatInterface() {
  const [currentConversationId, setCurrentConversationId] = useState<string>('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [creatingConversation, setCreatingConversation] = useState(false)
  
  // Debug conversation ID changes
  useEffect(() => {
    console.log('🔄 [ChatInterface] Conversation ID changed:', currentConversationId)
  }, [currentConversationId])
  
  const { 
    messages, 
    conversation, 
    isLoading, 
    createNewConversation 
  } = useRealtimeChat(currentConversationId)

  const handleNewConversation = async () => {
    if (creatingConversation) return // Prevent double-clicks
    
    try {
      setCreatingConversation(true)
      console.log('🆕 [ChatInterface] handleNewConversation called')
      const newConversation = await createNewConversation('New Chat')
      console.log('✅ [ChatInterface] New conversation created:', newConversation)
      if (newConversation && newConversation.id) {
        console.log('🔄 [ChatInterface] Setting conversation ID:', newConversation.id)
        // Clear current conversation first to prevent issues
        setCurrentConversationId('')
        // Use setTimeout to prevent React batching issues
        setTimeout(() => {
          setCurrentConversationId(newConversation.id)
          console.log('✅ [ChatInterface] Conversation ID set to:', newConversation.id)
        }, 100)
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

  // Create initial conversation on first load
  useEffect(() => {
    if (!currentConversationId) {
      handleNewConversation()
    }
  }, []) // Remove currentConversationId dependency to prevent infinite loop

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId)
  }

  return (
    <div className="flex h-screen w-full">
      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'w-80' : 'w-0'} 
        transition-all duration-300 ease-in-out 
        border-r border-slate-200 dark:border-slate-700
        bg-white/70 dark:bg-slate-900/70 
        backdrop-blur-xl
      `}>
        {sidebarOpen && (
          <ChatSidebar
            currentConversationId={currentConversationId}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
          />
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex items-center justify-between px-6">
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
            <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {conversation?.title || 'T3 Crusher'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
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
          />
        </div>
      </div>
    </div>
  )
}