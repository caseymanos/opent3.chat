'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  ChartBarIcon,
  CubeIcon,
  BoltIcon,
  EyeIcon,
  ClockIcon,
  TagIcon,
  AdjustmentsHorizontalIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/outline'
import { ragProcessor, type DocumentStructure, type DocumentChunk, type RAGQuery, type RAGResult } from '@/lib/rag-processor'

// Helper functions for chunk type icons and colors (moved to global scope)
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

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

interface VisualRAGInterfaceProps {
  conversationId: string
  onAddToContext?: (chunks: DocumentChunk[], source: string) => void
  onDocumentsChange?: (documents: DocumentStructure[]) => void
}

export default function VisualRAGInterface({ conversationId, onAddToContext, onDocumentsChange }: VisualRAGInterfaceProps) {
  const [documents, setDocuments] = useState<DocumentStructure[]>([])
  const [selectedDocument, setSelectedDocument] = useState<DocumentStructure | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RAGResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [activeView, setActiveView] = useState<'upload' | 'chunks' | 'search' | 'hierarchy'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Search configuration
  const [searchConfig, setSearchConfig] = useState({
    maxChunks: 5,
    similarityThreshold: 0.3,
    rankingStrategy: 'hybrid' as const,
    includeContext: true
  })

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      // Simulate processing progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 15
        })
      }, 200)

      console.log('🔄 [VisualRAG] Processing document:', file.name)
      
      const documentStructure = await ragProcessor.processDocument(file, {
        chunkingStrategy: 'hybrid',
        maxChunkSize: 1000,
        preserveFormatting: true,
        extractImages: true
      })

      clearInterval(progressInterval)
      setProcessingProgress(100)

      const updatedDocuments = [...documents, documentStructure]
      setDocuments(updatedDocuments)
      setSelectedDocument(documentStructure)
      setActiveView('chunks')
      
      // Notify parent component of documents change
      onDocumentsChange?.(updatedDocuments)

      console.log('✅ [VisualRAG] Document processed successfully:', {
        id: documentStructure.id,
        chunks: documentStructure.chunks.length,
        hierarchy: documentStructure.hierarchy.length
      })

    } catch (error) {
      console.error('❌ [VisualRAG] Processing failed:', error)
    } finally {
      setIsProcessing(false)
      setProcessingProgress(0)
    }
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || documents.length === 0) return

    setIsSearching(true)
    try {
      const query: RAGQuery = {
        query: searchQuery,
        filters: selectedDocument ? { documentIds: [selectedDocument.id] } : undefined,
        options: searchConfig
      }

      const results = await ragProcessor.search(documents, query)
      setSearchResults(results)
      setActiveView('search')

      console.log('🔍 [VisualRAG] Search completed:', {
        query: searchQuery,
        results: results.chunks.length,
        processingTime: results.context.processingTimeMs
      })

    } catch (error) {
      console.error('❌ [VisualRAG] Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, documents, selectedDocument, searchConfig])



  if (documents.length === 0) {
    return (
      <div className="p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
            <CubeIcon className="w-8 h-8 text-white" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Visual RAG Processing
          </h3>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Upload documents for intelligent chunking and semantic search with visual layout analysis.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            accept=".pdf,.txt,.md,.docx"
            className="hidden"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing... {Math.round(processingProgress)}%
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Upload Document
              </div>
            )}
          </motion.button>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Supported: PDF, TXT, Markdown, DOCX
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Visual RAG
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {documents.length} document{documents.length !== 1 ? 's' : ''} • {documents.reduce((acc, doc) => acc + doc.chunks.length, 0)} chunks
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
          >
            + Add Document
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1 p-4 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'chunks', label: 'Chunks', icon: CubeIcon },
          { id: 'search', label: 'Search', icon: MagnifyingGlassIcon },
          { id: 'hierarchy', label: 'Structure', icon: RectangleGroupIcon }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id as any)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeView === tab.id
                ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document Selector */}
      {documents.length > 1 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
          <select
            value={selectedDocument?.id || ''}
            onChange={(e) => {
              const doc = documents.find(d => d.id === e.target.value)
              setSelectedDocument(doc || null)
            }}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
          >
            <option value="">All Documents</option>
            {documents.map(doc => (
              <option key={doc.id} value={doc.id}>
                {doc.metadata.title || doc.filename} ({doc.chunks.length} chunks)
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeView === 'chunks' && (
            <ChunksView
              document={selectedDocument}
              documents={documents}
              onAddToContext={onAddToContext}
            />
          )}
          
          {activeView === 'search' && (
            <SearchView
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchConfig={searchConfig}
              setSearchConfig={setSearchConfig}
              searchResults={searchResults}
              isSearching={isSearching}
              onSearch={handleSearch}
              onAddToContext={onAddToContext}
            />
          )}
          
          {activeView === 'hierarchy' && (
            <HierarchyView
              document={selectedDocument}
              documents={documents}
            />
          )}
        </AnimatePresence>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileUpload}
        accept=".pdf,.txt,.md,.docx"
        className="hidden"
      />
    </div>
  )
}

function ChunksView({ document, documents, onAddToContext }: {
  document: DocumentStructure | null
  documents: DocumentStructure[]
  onAddToContext?: (chunks: DocumentChunk[], source: string) => void
}) {
  const chunks = document ? document.chunks : documents.flatMap(d => d.chunks)
  const [selectedChunks, setSelectedChunks] = useState<Set<string>>(new Set())

  const toggleChunk = (chunkId: string) => {
    setSelectedChunks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(chunkId)) {
        newSet.delete(chunkId)
      } else {
        newSet.add(chunkId)
      }
      return newSet
    })
  }

  const addSelectedToContext = () => {
    const selectedChunkObjects = chunks.filter(chunk => selectedChunks.has(chunk.id))
    const source = document ? `${document.filename} (${selectedChunks.size} chunks)` : `Multiple documents (${selectedChunks.size} chunks)`
    onAddToContext?.(selectedChunkObjects, source)
    setSelectedChunks(new Set())
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {selectedChunks.size > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {selectedChunks.size} chunk{selectedChunks.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedChunks(new Set())}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear
              </button>
              <button
                onClick={addSelectedToContext}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Add to Context
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chunks.map((chunk, index) => (
          <motion.div
            key={chunk.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              selectedChunks.has(chunk.id)
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => toggleChunk(chunk.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getChunkTypeIcon(chunk.type)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getChunkTypeColor(chunk.type)}`}>
                  {chunk.type}
                </span>
                {chunk.metadata.hierarchy && (
                  <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    H{chunk.metadata.hierarchy}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {chunk.metadata.page && <span>Page {chunk.metadata.page}</span>}
                <span>{Math.ceil(chunk.content.length / 4)} tokens</span>
              </div>
            </div>

            <p className="text-sm text-gray-900 dark:text-gray-100 mb-3 line-clamp-3">
              {chunk.content}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {chunk.metadata.keywords.slice(0, 3).map(keyword => (
                  <span key={keyword} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                    {keyword}
                  </span>
                ))}
                {chunk.metadata.keywords.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    +{chunk.metadata.keywords.length - 3} more
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {chunk.metadata.confidence && `${Math.round(chunk.metadata.confidence * 100)}% confidence`}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

function SearchView({ 
  searchQuery, 
  setSearchQuery, 
  searchConfig, 
  setSearchConfig, 
  searchResults, 
  isSearching, 
  onSearch,
  onAddToContext
}: {
  searchQuery: string
  setSearchQuery: (query: string) => void
  searchConfig: any
  setSearchConfig: (config: any) => void
  searchResults: RAGResult | null
  isSearching: boolean
  onSearch: () => void
  onAddToContext?: (chunks: DocumentChunk[], source: string) => void
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="h-full flex flex-col"
    >
      {/* Search Input */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && onSearch()}
              placeholder="Search across document chunks..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Search'
            )}
          </motion.button>
        </div>

        {/* Advanced Options */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            Advanced Options
          </button>
        </div>

        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Max Results
                  </label>
                  <input
                    type="number"
                    value={searchConfig.maxChunks}
                    onChange={(e) => setSearchConfig({ ...searchConfig, maxChunks: parseInt(e.target.value) })}
                    min="1"
                    max="20"
                    className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Similarity Threshold
                  </label>
                  <input
                    type="range"
                    value={searchConfig.similarityThreshold}
                    onChange={(e) => setSearchConfig({ ...searchConfig, similarityThreshold: parseFloat(e.target.value) })}
                    min="0"
                    max="1"
                    step="0.1"
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">{searchConfig.similarityThreshold}</div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ranking Strategy
                </label>
                <select
                  value={searchConfig.rankingStrategy}
                  onChange={(e) => setSearchConfig({ ...searchConfig, rankingStrategy: e.target.value })}
                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-900"
                >
                  <option value="hybrid">Hybrid (Semantic + Keyword)</option>
                  <option value="semantic">Semantic Only</option>
                  <option value="keyword">Keyword Only</option>
                </select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {searchResults && (
          <div className="p-4">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {searchResults.chunks.length} results
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  in {formatDuration(searchResults.context.processingTimeMs)}
                </span>
              </div>
              {searchResults.chunks.length > 0 && (
                <button
                  onClick={() => onAddToContext?.(searchResults.chunks, `Search: "${searchQuery}"`)}
                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                >
                  Add All to Context
                </button>
              )}
            </div>

            {/* Results List */}
            <div className="space-y-3">
              {searchResults.chunks.map((chunk, index) => (
                <motion.div
                  key={chunk.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getChunkTypeIcon(chunk.type)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getChunkTypeColor(chunk.type)}`}>
                        {chunk.type}
                      </span>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          {Math.round(chunk.relevanceScore * 100)}% match
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {(chunk as any).documentTitle || 'Document'}
                    </div>
                  </div>

                  <p className="text-sm text-gray-900 dark:text-gray-100 mb-3">
                    {chunk.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {chunk.metadata.keywords.slice(0, 3).map(keyword => (
                        <span key={keyword} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                          #{keyword}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => onAddToContext?.([chunk], `Search result: ${chunk.metadata.summary}`)}
                      className="text-xs px-2 py-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                    >
                      Add to Context
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {!searchResults && (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <MagnifyingGlassIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Enter a search query to find relevant document chunks</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function HierarchyView({ document, documents }: {
  document: DocumentStructure | null
  documents: DocumentStructure[]
}) {
  const hierarchy = document ? document.hierarchy : documents.flatMap(d => d.hierarchy)

  const renderHierarchyNode = (node: any, depth = 0) => (
    <motion.div
      key={node.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`ml-${depth * 4} mb-2`}
    >
      <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
        <RectangleGroupIcon className="w-4 h-4 text-gray-400" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {node.title}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          ({node.chunkIds.length} chunks)
        </span>
      </div>
      {node.children.map((child: any) => renderHierarchyNode(child, depth + 1))}
    </motion.div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-4 overflow-y-auto"
    >
      {hierarchy.length > 0 ? (
        <div className="space-y-2">
          {hierarchy.map(node => renderHierarchyNode(node))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <RectangleGroupIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No document structure detected</p>
          </div>
        </div>
      )}
    </motion.div>
  )
}

