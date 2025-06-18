'use client'

import React, { useState, useEffect, useRef, useCallback, memo } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/lib/supabase'

type Conversation = Database['public']['Tables']['conversations']['Row']
type Message = Database['public']['Tables']['messages']['Row']

interface SearchResult {
  type: 'conversation' | 'message'
  conversation: Conversation
  message?: Message
  matchedText?: string
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectConversation: (conversationId: string) => void
}

const SearchModal = memo(({ isOpen, onClose, onSelectConversation }: SearchModalProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClientComponentClient()
  const { getSessionId } = useAuth()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Debounced search function
  const searchDebounced = useRef<NodeJS.Timeout>()
  
  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults([])
      return
    }

    setIsLoading(true)
    try {
      const userId = getSessionId()
      
      // Search conversations by title
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${searchQuery}%`)
        .limit(5)

      if (convError) {
        console.error('Search error:', convError)
        return
      }

      // Search messages by content
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*, conversation:conversations!inner(*)')
        .eq('conversations.user_id', userId)
        .textSearch('content', searchQuery, {
          type: 'plain',
          config: 'english'
        })
        .limit(10)

      if (msgError) {
        console.error('Message search error:', msgError)
      }

      // Combine results
      const searchResults: SearchResult[] = []
      
      // Add conversation results
      conversations?.forEach(conv => {
        searchResults.push({
          type: 'conversation',
          conversation: conv
        })
      })

      // Add message results
      messages?.forEach(msg => {
        const conversation = (msg as any).conversation
        if (conversation) {
          searchResults.push({
            type: 'message',
            conversation: conversation,
            message: msg,
            matchedText: typeof msg.content === 'string' 
              ? msg.content.substring(0, 100) + '...'
              : JSON.stringify(msg.content).substring(0, 100) + '...'
          })
        }
      })

      setResults(searchResults)
    } finally {
      setIsLoading(false)
    }
  }, [getSessionId, supabase])

  // Handle search input change
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    setSelectedIndex(0)

    // Debounce search
    if (searchDebounced.current) {
      clearTimeout(searchDebounced.current)
    }
    searchDebounced.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          onSelectConversation(results[selectedIndex].conversation.id)
          onClose()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [results, selectedIndex, onSelectConversation, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-lg shadow-2xl animate-slide-in">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search conversations and messages..."
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          <kbd className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
            ESC
          </kbd>
        </div>
        
        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 mx-auto mb-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              {query.length >= 2 ? 'No results found' : 'Type to search...'}
            </div>
          ) : (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.conversation.id}-${result.message?.id || ''}`}
                  onClick={() => {
                    onSelectConversation(result.conversation.id)
                    onClose()
                  }}
                  className={`
                    w-full px-4 py-3 text-left hover:bg-slate-100 dark:hover:bg-slate-800
                    ${selectedIndex === index ? 'bg-slate-100 dark:bg-slate-800' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {result.type === 'conversation' ? (
                        <svg
                          className="w-4 h-4 text-slate-400"
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
                      ) : (
                        <svg
                          className="w-4 h-4 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {result.conversation.title || 'Untitled Chat'}
                      </h3>
                      {result.matchedText && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {result.matchedText}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↵</kbd>
              Select
            </span>
          </div>
        </div>
      </div>
    </div>
  )
})

SearchModal.displayName = 'SearchModal'

export default SearchModal