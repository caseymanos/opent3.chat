'use client'

import React, { useState, useMemo, useCallback, memo, forwardRef, startTransition, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import MessageActions from './MessageActions'
import CodeBlock from './CodeBlock'
import { detectCodeLanguage } from '@/lib/code-detection'
import type { Database } from '@/lib/supabase'
import type { Message as AIMessage } from 'ai'

type DBMessage = Database['public']['Tables']['messages']['Row']

interface MessageListProps {
  messages: DBMessage[]
  aiMessages?: AIMessage[]
  onCreateBranch?: (messageId: string) => void
  onScroll?: () => void
  isAIResponding?: boolean
}

// Memoized markdown components to prevent recreation on every render
const MarkdownComponents = {
  pre: memo(({ children, ...props }: any) => {
    // Extract code content and language
    const extractCodeInfo = useCallback((node: any): { code: string, language?: string } => {
      if (!node || !node.props || !node.props.children) {
        return { code: '' }
      }
      
      const codeElement = node.props.children
      const className = codeElement.props?.className || ''
      const languageMatch = className.match(/language-(\w+)/)
      const language = languageMatch ? languageMatch[1] : undefined
      
      const extractText = (n: any): string => {
        if (typeof n === 'string') return n
        if (n?.props?.children) return extractText(n.props.children)
        if (Array.isArray(n)) return n.map(extractText).join('')
        return ''
      }
      
      const code = extractText(codeElement.props?.children || codeElement)
      
      return { code, language }
    }, [])
    
    const { code, language } = extractCodeInfo(children)
    
    // Use our custom CodeBlock component with Prisma detection
    return <CodeBlock code={code} language={language} />
  }),
  code: memo(({ className, children, ...props }: any) => {
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
  })
}

// Memoized empty state component
const EmptyState = memo(() => (
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
))

EmptyState.displayName = 'EmptyState'

// Memoized message bubble component
interface MessageBubbleProps {
  message: DBMessage
  isLast: boolean
  onCreateBranch?: (messageId: string) => void
}

const MessageBubble = memo(({ message, onCreateBranch }: MessageBubbleProps) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  const getMessageContent = useCallback(() => {
    if (typeof message.content === 'string') {
      return message.content
    }
    if (typeof message.content === 'object' && message.content && 'text' in message.content) {
      return (message.content as { text: string }).text
    }
    return 'Invalid message content'
  }, [message.content])

  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content)
    console.log('📋 [MessageList] Copied to clipboard:', content.substring(0, 50) + '...')
  }, [])

  const messageContent = getMessageContent()

  if (isSystem) {
    return (
      <div className="flex justify-center animate-slide-in">
        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
          {messageContent}
        </div>
      </div>
    )
  }

  return (
    <div className="group relative animate-slide-in gpu-accelerated message-container">
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
              components={MarkdownComponents}
            >
              {messageContent}
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
                  onCopy={handleCopy}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return prevProps.message.id === nextProps.message.id &&
         prevProps.message.content === nextProps.message.content &&
         prevProps.isLast === nextProps.isLast
})

MessageBubble.displayName = 'MessageBubble'

// Main MessageList component with memoization and ref forwarding
const MessageList = memo(forwardRef<HTMLDivElement, MessageListProps>(({ messages, aiMessages = [], onCreateBranch, onScroll, isAIResponding = false }, ref) => {
  // Use startTransition for non-urgent updates
  const [visibleMessages, setVisibleMessages] = useState<DBMessage[]>([])
  
  console.log('🔄 [MessageList] Rendering with:', { 
    dbMessages: messages.length, 
    aiMessages: aiMessages.length,
    visibleMessages: visibleMessages.length
  })
  
  // Memoize the combined messages to prevent recalculation
  const allMessages = useMemo(() => {
    const combined = [...messages]
    
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
        combined.push({
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
    
    return combined
  }, [messages, aiMessages])

  // Update visible messages with React 18 transitions for better performance
  useEffect(() => {
    startTransition(() => {
      setVisibleMessages(allMessages)
    })
  }, [allMessages])

  if (visibleMessages.length === 0 && allMessages.length === 0) {
    return <EmptyState />
  }

  return (
    <div 
      ref={ref}
      className={`flex-1 overflow-y-auto scroll-optimized ${isAIResponding ? 'pointer-events-none' : ''}`}
      style={{ height: '100%' }}
      onScroll={onScroll}
    >
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6 contain-layout message-list">
        {(visibleMessages.length > 0 ? visibleMessages : allMessages).map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLast={index === visibleMessages.length - 1}
            onCreateBranch={onCreateBranch}
          />
        ))}
        {/* Add padding at bottom for better scrolling */}
        <div className="h-24" />
      </div>
    </div>
  )
}), (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return prevProps.messages.length === nextProps.messages.length &&
         prevProps.messages[prevProps.messages.length - 1]?.id === 
         nextProps.messages[nextProps.messages.length - 1]?.id &&
         prevProps.aiMessages?.length === nextProps.aiMessages?.length &&
         prevProps.aiMessages?.[prevProps.aiMessages.length - 1]?.content === 
         nextProps.aiMessages?.[nextProps.aiMessages.length - 1]?.content
})

MessageList.displayName = 'MessageList'

export default MessageList