'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { ragProcessor, DocumentStructure, DocumentChunk, RAGQuery } from '@/lib/rag-processor'
import { useRAGContext } from '@/lib/rag-context'

interface QuickRAGSearchProps {
  documents: DocumentStructure[]
  onAddToContext?: (chunks: DocumentChunk[], source: string) => void
  className?: string
}

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

export default function QuickRAGSearch({ 
  documents, 
  onAddToContext,
  className 
}: QuickRAGSearchProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { addContext } = useRAGContext()

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
      if (e.key === '/' && e.ctrlKey) {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = async () => {
    if (!query.trim() || documents.length === 0) return

    setIsSearching(true)
    try {
      const searchQuery: RAGQuery = {
        query: query,
        options: {
          maxChunks: 5,
          similarityThreshold: 0.3,
          rankingStrategy: 'hybrid',
          includeContext: false
        }
      }

      const searchResults = await ragProcessor.search(documents, searchQuery)
      setResults(searchResults.chunks)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddChunk = (chunk: DocumentChunk & { relevanceScore: number }) => {
    const source = `Quick search: "${query}"`
    addContext([chunk], source)
    onAddToContext?.([chunk], source)
  }

  const handleAddAllResults = () => {
    if (results.length === 0) return
    
    const source = `Search results: "${query}" (${results.length} chunks)`
    addContext(results, source)
    onAddToContext?.(results, source)
    setIsOpen(false)
    setQuery('')
    setResults([])
  }

  if (documents.length === 0) {
    return null
  }

  return (
    <div className={className}>
      {/* Trigger Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors"
        title="Quick RAG search (Ctrl+/)"
      >
        <MagnifyingGlassIcon className="w-4 h-4" />
        Search docs
      </motion.button>

      {/* Search Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <MagnifyingGlassIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      Quick Document Search
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Search across {documents.length} document{documents.length !== 1 ? 's' : ''} and add relevant chunks to context
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Input */}
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search for relevant content..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSearch}
                    disabled={isSearching || !query.trim()}
                    className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </motion.button>
                </div>
              </div>

              {/* Results */}
              <div className="flex-1 overflow-y-auto p-4 max-h-96">
                {results.length > 0 && (
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {results.length} result{results.length !== 1 ? 's' : ''} found
                    </span>
                    <button
                      onClick={handleAddAllResults}
                      className="text-sm px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Add All to Context
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  {results.map((chunk, index) => (
                    <motion.div
                      key={chunk.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getChunkTypeIcon(chunk.type)}</span>
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-full">
                            {chunk.type}
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {Math.round(chunk.relevanceScore * 100)}% match
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddChunk(chunk)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        >
                          <PlusIcon className="w-3 h-3" />
                          Add
                        </button>
                      </div>

                      <p className="text-sm text-gray-900 dark:text-gray-100 mb-2 line-clamp-3">
                        {chunk.content}
                      </p>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{chunk.documentTitle}</span>
                        {chunk.metadata.page && <span>Page {chunk.metadata.page}</span>}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {query && results.length === 0 && !isSearching && (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      No results found for "{query}"
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Try different keywords or check document processing
                    </p>
                  </div>
                )}

                {!query && (
                  <div className="text-center py-8">
                    <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      Enter a search query to find relevant document chunks
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                      Press Ctrl+/ to open quick search anytime
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}