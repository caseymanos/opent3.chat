'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import ChainOfThought from './ChainOfThought'
import MessageActions from './MessageActions'
import { extractReasoning } from '@/lib/reasoning'
import type { Database } from '@/lib/supabase'
import type { Message as AIMessage } from 'ai'

type DBMessage = Database['public']['Tables']['messages']['Row']

interface MessageListProps {
  messages: DBMessage[]
  aiMessages?: AIMessage[]
  onCreateBranch?: (messageId: string) => void
}

export default function MessageList({ messages, aiMessages = [], onCreateBranch }: MessageListProps) {
  console.log('🔄 [MessageList] Rendering with:', { dbMessages: messages.length, aiMessages: aiMessages.length })
  
  // Combine database messages and AI messages for display
  const allMessages = [...messages]
  
  // Add AI messages that aren't yet saved to database
  aiMessages.forEach(aiMsg => {
    // Only add if it's not already in database
    const exists = messages.some(dbMsg => 
      dbMsg.content && 
      typeof dbMsg.content === 'object' && 
      'text' in dbMsg.content && 
      (dbMsg.content as {text: string}).text === aiMsg.content
    )
    
    if (!exists) {
      allMessages.push({
        id: `ai-temp-${aiMsg.id}`,
        conversation_id: 'temp',
        role: aiMsg.role as 'user' | 'assistant' | 'system',
        content: { text: aiMsg.content },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        model_metadata: null
      })
    }
  })

  if (allMessages.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Ready to chat!
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Send your first message to get started with AI-powered conversations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {allMessages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          isLast={index === allMessages.length - 1}
          onCreateBranch={onCreateBranch}
        />
      ))}
    </div>
  )
}

interface MessageBubbleProps {
  message: DBMessage
  isLast: boolean
  onCreateBranch?: (messageId: string) => void
}

function MessageBubble({ message, onCreateBranch }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'
  const [showReasoning, setShowReasoning] = useState(false)

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMessageContent = () => {
    if (typeof message.content === 'string') {
      return message.content
    }
    if (typeof message.content === 'object' && message.content && 'text' in message.content) {
      return (message.content as { text: string }).text
    }
    return 'Invalid message content'
  }

  // Extract reasoning for assistant messages
  const reasoningData = isAssistant ? extractReasoning(getMessageContent()) : null

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {getMessageContent()}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} group relative`}
    >
      <div
        className={`
          max-w-[70%] flex gap-3 
          ${isUser ? 'flex-row-reverse' : 'flex-row'}
        `}
      >
        {/* Avatar */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium
            ${
              isUser
                ? 'bg-blue-600'
                : 'bg-gradient-to-br from-purple-500 to-pink-500'
            }
          `}
        >
          {isUser ? 'U' : 'AI'}
        </div>

        {/* Message Content */}
        <div
          className={`
            rounded-2xl px-4 py-3 max-w-full
            ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'
            }
          `}
        >
          <div className="whitespace-pre-wrap break-words">
            {reasoningData ? reasoningData.mainResponse : getMessageContent()}
          </div>
          
          {/* Reasoning Toggle Button for Assistant Messages */}
          {isAssistant && reasoningData && reasoningData.reasoning.length > 0 && (
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className="mt-3 text-xs px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors flex items-center gap-1"
            >
              <span>🧠</span>
              {showReasoning ? 'Hide' : 'Show'} reasoning
            </button>
          )}
          
          {/* Metadata */}
          <div
            className={`
              text-xs mt-2 flex items-center gap-2
              ${
                isUser
                  ? 'text-blue-100'
                  : 'text-slate-500 dark:text-slate-400'
              }
            `}
          >
            <span>{formatTime(message.created_at)}</span>
            {message.model_metadata && (
              <>
                <span>•</span>
                <span>
                  {(message.model_metadata as { model?: string }).model || 'AI'}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Message Actions */}
        {onCreateBranch && !isSystem && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <MessageActions
              message={message}
              onCreateBranch={onCreateBranch}
              onCopy={(content) => {
                navigator.clipboard.writeText(content)
                console.log('📋 [MessageList] Copied to clipboard:', content.substring(0, 50) + '...')
              }}
            />
          </div>
        )}
      </div>

      {/* Chain of Thought Component */}
      {isAssistant && reasoningData && reasoningData.reasoning.length > 0 && showReasoning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-3 max-w-[70%]"
        >
          <ChainOfThought
            reasoning={reasoningData.reasoning}
            isVisible={showReasoning}
          />
        </motion.div>
      )}
    </motion.div>
  )
}