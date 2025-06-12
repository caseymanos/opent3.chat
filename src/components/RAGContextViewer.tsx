'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  XMarkIcon, 
  EyeIcon, 
  EyeSlashIcon,
  DocumentTextIcon,
  ClockIcon,
  TagIcon,
  Bars3Icon,
  TrashIcon,
  PowerIcon
} from '@heroicons/react/24/outline'
import { useRAGContext, RAGContextItem } from '@/lib/rag-context'
import { DocumentChunk } from '@/lib/rag-processor'

const getChunkTypeIcon = (type: DocumentChunk['type']) => {
  switch (type) {
    case 'heading': return '📋'
    case 'text': return '📄'
    case 'list': return '📋'
    case 'code': return '💻'
    case 'table': return '📊'
    case 'image': return '🖼️'
    default: return '📝'
  }
}

const getChunkTypeColor = (type: DocumentChunk['type']) => {
  switch (type) {
    case 'heading': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    case 'text': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    case 'list': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
    case 'code': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
    case 'table': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
    case 'image': return 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300'
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }
}

interface RAGContextViewerProps {
  className?: string
}

export default function RAGContextViewer({ className }: RAGContextViewerProps) {
  const { 
    state, 
    removeContext, 
    toggleContext, 
    clearAllContext, 
    toggleEnabled 
  } = useRAGContext()

  if (state.items.length === 0) {
    return null
  }

  return (
    <div className={`bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700/50 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-purple-200 dark:border-purple-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md flex items-center justify-center">
              <DocumentTextIcon className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-purple-900 dark:text-purple-100 text-sm">
              RAG Context
            </span>
            <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <span>{state.totalChunks} chunks</span>
              <span>•</span>
              <span>~{Math.round(state.totalTokens / 1000)}k tokens</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={toggleEnabled}
              className={`p-1 rounded transition-colors ${
                state.isEnabled
                  ? 'text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300'
                  : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'
              }`}
              title={state.isEnabled ? 'Disable RAG context' : 'Enable RAG context'}
            >
              <PowerIcon className="w-4 h-4" />
            </button>
            
            <button
              onClick={clearAllContext}
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Clear all context"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Items */}
      <div className="max-h-48 overflow-y-auto">
        <AnimatePresence>
          {state.items.map((item) => (
            <ContextItem
              key={item.id}
              item={item}
              onRemove={() => removeContext(item.id)}
              onToggle={() => toggleContext(item.id)}
              isEnabled={state.isEnabled}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ContextItem({ 
  item, 
  onRemove, 
  onToggle, 
  isEnabled 
}: { 
  item: RAGContextItem
  onRemove: () => void
  onToggle: () => void
  isEnabled: boolean
}) {
  const chunkTypes = [...new Set(item.chunks.map(c => c.type))]
  const totalTokens = item.chunks.reduce((acc, chunk) => acc + Math.ceil(chunk.content.length / 4), 0)

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={`border-b border-purple-100 dark:border-purple-800/50 last:border-b-0 ${
        !item.isActive ? 'opacity-50' : ''
      } ${!isEnabled ? 'opacity-30' : ''}`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100 truncate">
                {item.source}
              </span>
              <span className="text-xs text-purple-600 dark:text-purple-400 flex-shrink-0">
                {item.chunks.length} chunk{item.chunks.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
              {item.summary}
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {chunkTypes.map(type => (
                <span
                  key={type}
                  className={`text-xs px-1.5 py-0.5 rounded-full ${getChunkTypeColor(type)}`}
                >
                  {getChunkTypeIcon(type)} {type}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            <button
              onClick={onToggle}
              className={`p-1 rounded transition-colors ${
                item.isActive
                  ? 'text-green-600 hover:text-green-700 dark:text-green-400'
                  : 'text-gray-400 hover:text-gray-500 dark:text-gray-500'
              }`}
              title={item.isActive ? 'Hide from context' : 'Include in context'}
            >
              {item.isActive ? (
                <EyeIcon className="w-4 h-4" />
              ) : (
                <EyeSlashIcon className="w-4 h-4" />
              )}
            </button>
            
            <button
              onClick={onRemove}
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
              title="Remove context"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            <span>{item.addedAt.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <TagIcon className="w-3 h-3" />
            <span>~{Math.round(totalTokens / 100) / 10}k tokens</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Compact version for inline display
export function RAGContextIndicator({ 
  className,
  onClick 
}: { 
  className?: string
  onClick?: () => void
}) {
  const { state } = useRAGContext()

  if (state.items.length === 0 || !state.isEnabled) {
    return null
  }

  const activeItems = state.items.filter(item => item.isActive)

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 border border-purple-200 dark:border-purple-700/50 rounded-full text-sm text-purple-700 dark:text-purple-300 hover:from-purple-200 hover:to-pink-200 dark:hover:from-purple-800/50 dark:hover:to-pink-800/50 transition-all ${className}`}
    >
      <div className="w-4 h-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
        <DocumentTextIcon className="w-2.5 h-2.5 text-white" />
      </div>
      <span className="font-medium">
        {activeItems.length} context{activeItems.length !== 1 ? 's' : ''}
      </span>
      <span className="text-xs opacity-75">
        {state.totalChunks} chunks
      </span>
    </motion.button>
  )
}