'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDownIcon, 
  ChevronRightIcon,
  PlusIcon,
  ArrowPathIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import type { Database } from '@/lib/supabase'

type Message = Database['public']['Tables']['messages']['Row']

interface BranchNode {
  id: string
  message: Message
  children: BranchNode[]
  depth: number
  isActive: boolean
  hasChildren: boolean
}

interface BranchNavigatorProps {
  messages: Message[]
  activeMessageId?: string
  onBranchSelect: (messageId: string) => void
  onCreateBranch: (parentId: string) => void
  className?: string
}

export default function BranchNavigator({
  messages,
  activeMessageId,
  onBranchSelect,
  onCreateBranch,
  className = ''
}: BranchNavigatorProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  // Build tree structure from flat message list
  const messageTree = useMemo(() => {
    const buildTree = (messages: Message[]): BranchNode[] => {
      const messageMap = new Map<string, Message>()
      const childrenMap = new Map<string, string[]>()

      // Create maps for efficient lookup
      messages.forEach(msg => {
        messageMap.set(msg.id, msg)
        if (msg.parent_id) {
          const siblings = childrenMap.get(msg.parent_id) || []
          siblings.push(msg.id)
          childrenMap.set(msg.parent_id, siblings)
        }
      })

      const buildNode = (messageId: string, depth = 0): BranchNode => {
        const message = messageMap.get(messageId)!
        const childIds = childrenMap.get(messageId) || []
        
        return {
          id: messageId,
          message,
          children: childIds.map(childId => buildNode(childId, depth + 1)),
          depth,
          isActive: messageId === activeMessageId,
          hasChildren: childIds.length > 0
        }
      }

      // Find root messages (no parent)
      const rootMessages = messages.filter(msg => !msg.parent_id)
      return rootMessages.map(msg => buildNode(msg.id))
    }

    return buildTree(messages)
  }, [messages, activeMessageId])

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getBranchColor = (depth: number, isActive: boolean) => {
    const colors = [
      'border-blue-500',
      'border-purple-500', 
      'border-green-500',
      'border-yellow-500',
      'border-red-500',
      'border-indigo-500'
    ]
    
    if (isActive) {
      return colors[depth % colors.length].replace('border-', 'bg-') + ' border-2'
    }
    
    return colors[depth % colors.length] + ' border'
  }

  const renderNode = (node: BranchNode) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasMultipleBranches = node.children.length > 1

    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: node.depth * 0.05 }}
        className={`relative ${node.depth > 0 ? 'ml-6' : ''}`}
      >
        {/* Connection line to parent */}
        {node.depth > 0 && (
          <div className="absolute -left-6 top-4 w-6 h-px bg-gray-300 dark:bg-gray-600" />
        )}
        
        {/* Vertical line for children */}
        {node.hasChildren && isExpanded && (
          <div className="absolute left-3 top-8 w-px h-full bg-gray-300 dark:bg-gray-600" />
        )}

        <div className="flex items-start gap-2 group">
          {/* Expand/Collapse button */}
          {node.hasChildren && (
            <button
              onClick={() => toggleExpanded(node.id)}
              className="flex-shrink-0 w-6 h-6 rounded-full border bg-white dark:bg-gray-800 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {isExpanded ? (
                <ChevronDownIcon className="w-3 h-3" />
              ) : (
                <ChevronRightIcon className="w-3 h-3" />
              )}
            </button>
          )}

          {/* Node content */}
          <div 
            className={`flex-1 p-3 rounded-lg cursor-pointer transition-all ${getBranchColor(node.depth, node.isActive)} ${
              node.isActive 
                ? 'bg-blue-50 dark:bg-blue-900/20 shadow-md' 
                : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            onClick={() => onBranchSelect(node.id)}
          >
            {/* Message preview */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    node.message.role === 'user' 
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                  }`}>
                    {node.message.role}
                  </span>
                  
                  {hasMultipleBranches && (
                    <BeakerIcon className="w-4 h-4 text-yellow-500" title="Multiple branches" />
                  )}
                  
                  {node.isActive && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </div>
                
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                  {typeof node.message.content === 'string' 
                    ? node.message.content 
                    : JSON.stringify(node.message.content).substring(0, 100)
                  }...
                </p>
                
                {/* Branch stats */}
                {hasMultipleBranches && (
                  <div className="text-xs text-gray-500 mt-1">
                    {node.children.length} branches
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCreateBranch(node.id)
                  }}
                  className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                  title="Create branch"
                >
                  <PlusIcon className="w-3 h-3" />
                </button>
                
                {hasMultipleBranches && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Compare branches modal
                    }}
                    className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400 flex items-center justify-center hover:bg-yellow-200 dark:hover:bg-yellow-800 transition-colors"
                    title="Compare branches"
                  >
                    <ArrowPathIcon className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Render children */}
        <AnimatePresence>
          {node.hasChildren && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-2 space-y-2"
            >
              {node.children.map(child => renderNode(child))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  if (messageTree.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 dark:text-gray-400 ${className}`}>
        <BeakerIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No conversation branches yet</p>
        <p className="text-xs mt-1">Start chatting to create your first branch</p>
      </div>
    )
  }

  return (
    <div className={`p-4 space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <BeakerIcon className="w-5 h-5 text-purple-500" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">
          Conversation Tree
        </h3>
        <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
          {messages.length} messages
        </span>
      </div>
      
      <div className="space-y-2">
        {messageTree.map(node => renderNode(node))}
      </div>
    </div>
  )
}