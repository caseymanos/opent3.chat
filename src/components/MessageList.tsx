'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import { XMarkIcon } from '@heroicons/react/24/outline'
import EnhancedChainOfThought from './EnhancedChainOfThought'
import MessageActions from './MessageActions'
import { extractReasoning } from '@/lib/reasoning'
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card'
import { ScrollArea } from './ui/ScrollArea'
import { cn } from '@/lib/utils'
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
          <div className="prose prose-sm dark:prose-invert max-w-none">
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
              {reasoningData ? reasoningData.mainResponse : getMessageContent()}
            </ReactMarkdown>
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

      {/* Enhanced Chain of Thought Component */}
      {isAssistant && reasoningData && reasoningData.reasoning.length > 0 && showReasoning && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          transition={{ duration: 0.3, type: "spring", damping: 25 }}
          className="fixed top-20 right-4 bottom-20 w-96 z-40 overflow-hidden"
          style={{ 
            maxHeight: 'calc(100vh - 10rem)',
            width: 'min(384px, calc(100vw - 2rem))'
          }}
        >
          <Card className="h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-slate-200 dark:border-slate-700 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Enhanced Chain of Thought
                </CardTitle>
                <button
                  onClick={() => setShowReasoning(false)}
                  className="p-1 rounded-lg hover:bg-accent transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <EnhancedChainOfThought
                    reasoning={reasoningData.reasoning}
                    isVisible={true}
                    autoPlay={true}
                    showMetrics={true}
                    enableVoice={false}
                    theme="neural"
                  />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
}