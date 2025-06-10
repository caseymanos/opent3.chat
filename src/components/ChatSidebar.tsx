'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Button } from './ui/Button'
import { PlusIcon, ChatBubbleLeftIcon } from '@heroicons/react/24/outline'
import type { Database } from '@/lib/supabase'

type Conversation = Database['public']['Tables']['conversations']['Row']

interface ChatSidebarProps {
  currentConversationId: string
  onConversationSelect: (id: string) => void
  onNewConversation: () => void
}

export default function ChatSidebar({
  currentConversationId,
  onConversationSelect,
  onNewConversation
}: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadConversations()
  }, [])  // loadConversations is defined inline, so it's stable

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading conversations:', error)
        return
      }

      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
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
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <Button
          onClick={onNewConversation}
          className="w-full flex items-center gap-2 justify-center"
          size="sm"
        >
          <PlusIcon className="w-4 h-4" />
          New Conversation
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 dark:text-slate-400">
            <ChatBubbleLeftIcon className="w-8 h-8 mb-2" />
            <p className="text-sm text-center">No conversations yet</p>
            <p className="text-xs text-center">Start a new chat to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => onConversationSelect(conversation.id)}
                className={`
                  w-full p-3 rounded-lg text-left transition-colors group
                  hover:bg-slate-100 dark:hover:bg-slate-800
                  ${
                    currentConversationId === conversation.id
                      ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                      : 'bg-transparent'
                  }
                `}
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
}