'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DocumentTextIcon, 
  TrashIcon, 
  XMarkIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  PlayIcon,
  InformationCircleIcon,
  ChartBarIcon,
  BeakerIcon
} from '@heroicons/react/24/outline'
import { useUnifiedDocumentStore } from '@/lib/unified-document-store'
import type { RAGResponse, SearchResult } from '@/lib/unified-rag'

export default function UnifiedDocumentInterface() {
  const { 
    documents, 
    isRAGEnabled, 
    isProcessing, 
    lastError, 
    stats,
    addDocument, 
    removeDocument, 
    clearAllDocuments, 
    toggleRAG,
    clearError,
    searchDocuments,
    testRAGSystem
  } = useUnifiedDocumentStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<RAGResponse | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [isRunningTest, setIsRunningTest] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      for (const file of Array.from(files)) {
        await addDocument(file)
      }
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [addDocument])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || documents.length === 0) return

    setIsSearching(true)
    try {
      const results = await searchDocuments(searchQuery)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, searchDocuments, documents.length])

  const handleTestSystem = useCallback(async () => {
    setIsRunningTest(true)
    try {
      const result = await testRAGSystem()
      setTestResult(result)
    } catch (error) {
      setTestResult({ 
        success: false, 
        message: 'Test failed with error', 
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
    } finally {
      setIsRunningTest(false)
    }
  }, [testRAGSystem])

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className="p-4 space-y-6 max-h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-6 h-6 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Document Knowledge Base
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleRAG()}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              isRAGEnabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 shadow-sm'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {isRAGEnabled ? '✅ RAG Enabled' : '❌ RAG Disabled'}
          </button>
          
          {documents.length > 0 && (
            <>
              <button
                onClick={handleTestSystem}
                disabled={isRunningTest}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors flex items-center gap-1"
              >
                <BeakerIcon className="w-4 h-4" />
                {isRunningTest ? 'Testing...' : 'Test RAG'}
              </button>

              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/rag')
                    const data = await response.json()
                    console.log('Server RAG Status:', data)
                    alert(`Server has ${data.documents.length} documents, ${data.stats.totalChunks} chunks`)
                  } catch (error) {
                    console.error('Server check failed:', error)
                    alert('Failed to check server status')
                  }
                }}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
              >
                Check Server
              </button>
              
              <button
                onClick={clearAllDocuments}
                className="px-3 py-1.5 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats.documentCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Documents</span>
            </div>
            <p className="text-lg font-bold text-blue-600">{stats.documentCount}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <DocumentTextIcon className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Chunks</span>
            </div>
            <p className="text-lg font-bold text-green-600">{stats.totalChunks}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Total Size</span>
            </div>
            <p className="text-lg font-bold text-purple-600">{formatFileSize(stats.totalSize)}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Avg Chunks</span>
            </div>
            <p className="text-lg font-bold text-orange-600">{stats.avgChunksPerDoc}</p>
          </div>
        </div>
      )}

      {/* Test Results */}
      <AnimatePresence>
        {testResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-lg border ${
              testResult.success
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className={`font-medium ${
                  testResult.success 
                    ? 'text-green-800 dark:text-green-300' 
                    : 'text-red-800 dark:text-red-300'
                }`}>
                  RAG System Test {testResult.success ? 'Passed' : 'Failed'}
                </h4>
                <p className={`text-sm mt-1 ${
                  testResult.success 
                    ? 'text-green-700 dark:text-green-400' 
                    : 'text-red-700 dark:text-red-400'
                }`}>
                  {testResult.message}
                </p>
                {testResult.details && (
                  <pre className={`text-xs mt-2 ${
                    testResult.success 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                )}
              </div>
              <button
                onClick={() => setTestResult(null)}
                className={testResult.success 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-red-600 dark:text-red-400'
                }
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileUpload}
          accept=".pdf,.txt,.md,.docx"
          multiple
          className="hidden"
        />
        
        {isProcessing ? (
          <div className="space-y-3">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing documents...</p>
          </div>
        ) : (
          <>
            <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Upload Documents
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              PDF, TXT, Markdown, DOCX • Multiple files supported
            </p>
          </>
        )}
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {lastError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
          >
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300 flex-1">{lastError}</span>
            <button
              onClick={clearError}
              className="text-red-600 dark:text-red-400"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Interface */}
      {documents.length > 0 && isRAGEnabled && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search your documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim() || isSearching}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSearching ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <PlayIcon className="w-4 h-4" />
              )}
              Search
            </button>
          </div>

          {/* Search Results */}
          {searchResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">
                  Search Results ({searchResults.results.length})
                </h4>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {searchResults.searchTime}ms
                </span>
              </div>
              
              {searchResults.hasResults ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.results.map((result: SearchResult, index: number) => (
                    <motion.div
                      key={`${result.document.id}-${result.chunk.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                            {result.document.filename}
                          </span>
                          {result.chunk.pageNumber && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Page {result.chunk.pageNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded">
                            {(result.relevanceScore * 100).toFixed(0)}% match
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 line-clamp-3">
                        {result.chunk.content}
                      </p>
                      
                      {result.matchedTerms.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400">Matched:</span>
                          {result.matchedTerms.map((term, i) => (
                            <span 
                              key={i}
                              className="text-xs px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                  <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No results found for "{searchQuery}"</p>
                  <p className="text-sm">Try different keywords or check your documents.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Documents ({documents.length})
        </h4>
        
        <div className="space-y-2">
          <AnimatePresence>
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {doc.filename}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {doc.chunks.length} chunks • {formatFileSize(doc.fileSize)} • {new Date(doc.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-xs text-gray-600 dark:text-gray-300">
                      <p className="font-medium mb-1">Summary:</p>
                      <p className="line-clamp-2">{doc.summary}</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => removeDocument(doc.id)}
                    className="ml-3 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Help Text */}
      {documents.length > 0 && isRAGEnabled && (
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ✨ Documents are ready! Ask any questions in chat and I'll automatically search them for relevant information with source citations.
          </p>
        </div>
      )}
    </div>
  )
}