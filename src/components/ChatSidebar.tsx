'use client'

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, memo, useMemo } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { ScrollArea } from './ui/ScrollArea'
import { cn } from '@/lib/utils'
import { PlusIcon, ChatBubbleLeftIcon, TrashIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type { Database } from '@/lib/supabase'

type Conversation = Database['public']['Tables']['conversations']['Row']

interface ChatSidebarProps {
  currentConversationId: string
  onConversationSelect: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation?: (id: string) => void
  onClearAllConversations?: () => void
  isCollapsed?: boolean
}

// Memoized conversation item component
const ConversationItem = memo(({
  conversation,
  isActive,
  onSelect,
  onDelete,
  isDeleting
}: {
  conversation: Conversation
  isActive: boolean
  onSelect: () => void
  onDelete: (e: React.MouseEvent) => void
  isDeleting: boolean
}) => {
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }, [])

  return (
    <div
      className={`
        w-full p-3 rounded-lg transition-colors group flex items-center gap-2
        hover:bg-slate-100 dark:hover:bg-slate-800
        ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
            : 'bg-transparent'
        }
      `}
    >
      <button
        onClick={onSelect}
        className="flex-1 text-left"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-1">
            <ChatBubbleLeftIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
              {conversation.title || 'Untitled Chat'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {formatDate(conversation.updated_at)}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {conversation.model_provider}
              </span>
              <span className="text-xs text-slate-400">
                {conversation.model_name}
              </span>
            </div>
          </div>
        </div>
      </button>
      
      {onDelete && (
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex-shrink-0 p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
          title="Delete conversation"
        >
          {isDeleting ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <TrashIcon className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.conversation.id === nextProps.conversation.id &&
         prevProps.conversation.updated_at === nextProps.conversation.updated_at &&
         prevProps.isActive === nextProps.isActive &&
         prevProps.isDeleting === nextProps.isDeleting
})

ConversationItem.displayName = 'ConversationItem'

// Memoized clear confirmation modal
const ClearConfirmModal = memo(({
  isOpen,
  conversationCount,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  conversationCount: number
  onConfirm: () => void
  onCancel: () => void
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center gap-3 mb-4">
          <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Clear All Conversations
          </h3>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          This will permanently delete all {conversationCount} conversations and their messages. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={onCancel}
            variant="outline"
            className="flex-1"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            Delete All
          </Button>
        </div>
      </div>
    </div>
  )
})

ClearConfirmModal.displayName = 'ClearConfirmModal'

const ChatSidebar = forwardRef<{ refresh: () => void }, ChatSidebarProps>(({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  onDeleteConversation,
  onClearAllConversations,
  isCollapsed = false
}, ref) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null)
  const supabase = createClientComponentClient()
  const { getSessionId } = useAuth()

  const loadConversations = useCallback(async () => {
    try {
      const userId = getSessionId()
      console.log('🔍 [ChatSidebar] Loading conversations for user:', userId)
      
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      console.log(`📚 [ChatSidebar] Loaded ${data?.length || 0} conversations`)
      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getSessionId, supabase])

  // Expose refresh method to parent via ref
  useImperativeHandle(ref, () => ({
    refresh: loadConversations
  }), [loadConversations])

  useEffect(() => {
    loadConversations()
    
    // For now, disable real-time subscriptions to eliminate errors
    // We'll use the sidebar key refresh mechanism instead
    console.log('🔌 [ChatSidebar] Loading conversations once (no polling)')
  }, [loadConversations])

  const handleDeleteConversation = useCallback(async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onDeleteConversation) return

    setDeletingConversation(conversationId)
    try {
      await onDeleteConversation(conversationId)
      // Remove from local state
      setConversations(prev => prev.filter((c: any) => c.id !== conversationId))
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    } finally {
      setDeletingConversation(null)
    }
  }, [onDeleteConversation])

  const handleClearAll = useCallback(async () => {
    if (!onClearAllConversations) return

    try {
      console.log('🗑️ [ChatSidebar] Starting clear all operation')
      await onClearAllConversations()
      console.log('✅ [ChatSidebar] Clear all completed successfully')
      
      // Close the confirmation modal
      setShowClearConfirm(false)
      
      // Wait a moment for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Reload conversations from database to ensure UI is in sync
      console.log('🔄 [ChatSidebar] Reloading conversations after clear')
      await loadConversations()
    } catch (error) {
      console.error('❌ [ChatSidebar] Failed to clear conversations:', error)
      // Don't clear local state if the operation failed
      // Keep the confirmation modal closed though
      setShowClearConfirm(false)
      
      // Still try to reload to ensure UI is in sync with database
      await loadConversations()
      
      // Show error to user (you could add a toast notification here)
      console.warn('Clear all operation failed. Please try again.')
    }
  }, [onClearAllConversations, loadConversations])

  const handleConversationClick = useCallback((id: string) => {
    onConversationSelect(id)
  }, [onConversationSelect])

  const handleCancelClear = useCallback(() => {
    setShowClearConfirm(false)
  }, [])

  const handleShowClearConfirm = useCallback(() => {
    setShowClearConfirm(true)
  }, [])

  // Memoize empty state
  const emptyState = useMemo(() => (
    <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
      <ChatBubbleLeftIcon className="w-8 h-8 mb-2" />
      <p className="text-sm text-center">No conversations yet</p>
      <p className="text-xs text-center">Start a new chat to get started</p>
    </div>
  ), [])

  // Memoize loading state
  const loadingState = useMemo(() => (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"
        />
      ))}
    </div>
  ), [])

  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col items-center py-4 px-2">
        {/* Collapsed Header */}
        <div className="space-y-2 mb-4">
          <Button
            onClick={onNewConversation}
            variant="ghost"
            size="sm"
            className="p-2 w-12 h-12 flex items-center justify-center"
            title="New Conversation"
          >
            <PlusIcon className="w-5 h-5" />
          </Button>
          
          {conversations.length > 0 && (
            <Button
              onClick={handleShowClearConfirm}
              variant="ghost"
              size="sm"
              className="p-2 w-12 h-12 flex items-center justify-center text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="Clear All"
            >
              <TrashIcon className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Clear All Confirmation Modal */}
        <ClearConfirmModal
          isOpen={showClearConfirm}
          conversationCount={conversations.length}
          onConfirm={handleClearAll}
          onCancel={handleCancelClear}
        />

        {/* Collapsed Conversations List */}
        <div className="flex-1 overflow-y-auto w-full space-y-2">
          {!isLoading && conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => handleConversationClick(conversation.id)}
              className={cn(
                'w-12 h-12 flex items-center justify-center rounded-lg transition-all',
                currentConversationId === conversation.id
                  ? 'bg-purple-600 text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
              )}
              title={conversation.title || 'Untitled'}
            >
              <ChatBubbleLeftIcon className="w-5 h-5" />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-2">
        <Button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 justify-center"
          size="sm"
        >
          <PlusIcon className="w-4 h-4" />
          New Conversation
        </Button>
        
        {conversations.length > 0 && (
          <Button
            onClick={handleShowClearConfirm}
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2 justify-center text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
          >
            <TrashIcon className="w-4 h-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Clear All Confirmation Modal */}
      <ClearConfirmModal
        isOpen={showClearConfirm}
        conversationCount={conversations.length}
        onConfirm={handleClearAll}
        onCancel={handleCancelClear}
      />

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          loadingState
        ) : conversations.length === 0 ? (
          emptyState
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={currentConversationId === conversation.id}
                onSelect={() => handleConversationClick(conversation.id)}
                onDelete={(e) => handleDeleteConversation(conversation.id, e)}
                isDeleting={deletingConversation === conversation.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
          T3 Crusher v1.0
        </div>
      </div>
    </div>
  )
})

ChatSidebar.displayName = 'ChatSidebar'

export default memo(ChatSidebar)