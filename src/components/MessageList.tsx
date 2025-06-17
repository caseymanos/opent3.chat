'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import MessageActions from './MessageActions'
import type { Database } from '@/lib/supabase'
import type { Message as AIMessage } from 'ai'

type DBMessage = Database['public']['Tables']['messages']['Row']

interface MessageListProps {
  messages: DBMessage[]
  aiMessages?: AIMessage[]
  onCreateBranch?: (messageId: string) => void
}

export default function MessageList({ messages, aiMessages = [], onCreateBranch }: MessageListProps) {
  console.log('🔄 [MessageList] Rendering with:', { 
    dbMessages: messages.length, 
    aiMessages: aiMessages.length,
    firstDbMessageId: messages[0]?.id,
    firstAiMessageContent: aiMessages[0]?.content?.substring(0, 50)
  })
  
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
        parent_id: null,
        role: aiMsg.role as 'user' | 'assistant' | 'system',
        content: { text: aiMsg.content },
        created_at: new Date().toISOString(),
        model_metadata: null,
        attachments: null,
        branch_index: 0
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
            Start a conversation
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Send a message to begin.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ height: '100%' }}>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {allMessages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === allMessages.length - 1}
            onCreateBranch={onCreateBranch}
          />
        ))}
        {/* Add padding at bottom for better scrolling */}
        <div className="h-24" />
      </div>
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
      className="group relative"
    >
      <div className="flex flex-col gap-2">
        {/* Role Label */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${
            isUser ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
          }`}>
            {isUser ? 'You' : 'Assistant'}
          </span>
          {message.model_metadata && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {(message.model_metadata as { model?: string }).model || 'AI'}
            </span>
          )}
        </div>

        {/* Message Content */}
        <div className="text-slate-900 dark:text-slate-100">
          <div className="prose prose-base dark:prose-invert max-w-none">
            <ReactMarkdown
              rehypePlugins={[[rehypeHighlight, { detect: true }]]}
              components={{
                pre: ({ children, ...props }) => {
                  const [copied, setCopied] = useState(false)
                  
                  const extractText = (node: any): string => {
                    if (typeof node === 'string') return node
                    if (node?.props?.children) return extractText(node.props.children)
                    if (Array.isArray(node)) return node.map(extractText).join('')
                    return ''
                  }
                  
                  const handleCopy = () => {
                    const code = extractText(children)
                    navigator.clipboard.writeText(code)
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  }
                  
                  return (
                    <div className="relative group">
                      <pre {...props} className="!bg-slate-900 !text-slate-100 overflow-x-auto rounded-lg">
                        {children}
                      </pre>
                      <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100 rounded flex items-center gap-1"
                      >
                        {copied ? (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                  )
                },
                code: ({ className, children, ...props }: any) => {
                  const inline = !className?.includes('language-')
                  if (inline) {
                    return (
                      <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    )
                  }
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {getMessageContent()}
            </ReactMarkdown>
          </div>
          
          
        </div>

        {/* Message Actions and Time */}
        {!isSystem && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {formatTime(message.created_at)}
            </span>
            {onCreateBranch && (
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
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
        )}
      </div>

    </motion.div>
  )
}