'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  EllipsisHorizontalIcon,
  DocumentDuplicateIcon,
  ArrowUturnLeftIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  CodeBracketIcon,
  BookmarkIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import type { Database } from '@/lib/supabase'

type Message = Database['public']['Tables']['messages']['Row']

interface MessageActionsProps {
  message: Message
  onCreateBranch: (messageId: string) => void
  onEdit?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onCopy?: (content: string) => void
  onBookmark?: (messageId: string) => void
  onShare?: (messageId: string) => void
  className?: string
}

export default function MessageActions({
  message,
  onCreateBranch,
  onEdit,
  onDelete,
  onCopy,
  onBookmark,
  onShare,
  className = ''
}: MessageActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showBranchOptions, setShowBranchOptions] = useState(false)

  const messageContent = typeof message.content === 'string' 
    ? message.content 
    : JSON.stringify(message.content)

  const handleCreateBranch = (type: 'continue' | 'alternative' | 'question') => {
    console.log('🌿 [MessageActions] Creating branch:', { type, messageId: message.id })
    onCreateBranch(message.id)
    setShowBranchOptions(false)
    setIsOpen(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(messageContent)
    onCopy?.(messageContent)
    setIsOpen(false)
  }

  const actions = [
    {
      id: 'branch',
      label: 'Create Branch',
      icon: ArrowTopRightOnSquareIcon,
      onClick: () => setShowBranchOptions(true),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'hover:bg-green-50 dark:hover:bg-green-900/20',
      primary: true
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: DocumentDuplicateIcon,
      onClick: handleCopy,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
    },
    {
      id: 'bookmark',
      label: 'Bookmark',
      icon: BookmarkIcon,
      onClick: () => {
        onBookmark?.(message.id)
        setIsOpen(false)
      },
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
    },
    {
      id: 'share',
      label: 'Share',
      icon: ShareIcon,
      onClick: () => {
        onShare?.(message.id)
        setIsOpen(false)
      },
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
    }
  ]

  // Add edit/delete for user messages
  if (message.role === 'user') {
    actions.push(
      {
        id: 'edit',
        label: 'Edit',
        icon: PencilIcon,
        onClick: () => {
          onEdit?.(message.id)
          setIsOpen(false)
        },
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'hover:bg-orange-50 dark:hover:bg-orange-900/20'
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: TrashIcon,
        onClick: () => {
          onDelete?.(message.id)
          setIsOpen(false)
        },
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'hover:bg-red-50 dark:hover:bg-red-900/20'
      }
    )
  }

  // Add code view for assistant messages
  if (message.role === 'assistant' && messageContent.includes('```')) {
    actions.push({
      id: 'code',
      label: 'View Code',
      icon: CodeBracketIcon,
      onClick: () => {
        // TODO: Open code viewer modal
        setIsOpen(false)
      },
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
    })
  }

  return (
    <div className={`relative ${className}`}>
      {/* Main trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Message actions"
      >
        <EllipsisHorizontalIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
      </button>

      {/* Actions menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-8 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-48 overflow-hidden"
            onMouseLeave={() => setIsOpen(false)}
          >
            {!showBranchOptions ? (
              <div className="py-2">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${action.color} ${action.bgColor}`}
                  >
                    <action.icon className="w-4 h-4" />
                    {action.label}
                    {action.primary && (
                      <span className="ml-auto text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-2">
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBranchOptions(false)}
                      className="p-0.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <ArrowUturnLeftIcon className="w-3 h-3" />
                    </button>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Create Branch
                    </h4>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Start a new conversation path from this message
                  </p>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => handleCreateBranch('continue')}
                    className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Continue Thread</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Add follow-up messages to this conversation
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleCreateBranch('alternative')}
                    className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <DocumentDuplicateIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Alternative Response</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Get a different AI response to the same prompt
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleCreateBranch('question')}
                    className="w-full flex items-start gap-3 px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <PencilIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 dark:text-gray-100">Ask Question</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Ask a follow-up question about this message
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}