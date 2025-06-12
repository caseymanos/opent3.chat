'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  DocumentTextIcon, 
  TrashIcon, 
  XMarkIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useDocumentStore } from '@/lib/document-store'

export default function SimpleDocumentUpload() {
  const { documents, isRAGEnabled, addDocument, removeDocument, clearAllDocuments, toggleRAG } = useDocumentStore()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadError(null)

    try {
      for (const file of Array.from(files)) {
        await addDocument(file)
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [addDocument])

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5 text-purple-600" />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            Documents ({documents.length})
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleRAG()}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              isRAGEnabled
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {isRAGEnabled ? 'RAG Enabled' : 'RAG Disabled'}
          </button>
          
          {documents.length > 0 && (
            <button
              onClick={clearAllDocuments}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

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
        
        {isUploading ? (
          <div className="space-y-2">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Processing documents...</p>
          </div>
        ) : (
          <>
            <ArrowUpTrayIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Upload Documents
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              PDF, TXT, Markdown, DOCX
            </p>
          </>
        )}
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {uploadError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
          >
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{uploadError}</span>
            <button
              onClick={() => setUploadError(null)}
              className="ml-auto"
            >
              <XMarkIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document List */}
      <div className="space-y-2">
        <AnimatePresence>
          {documents.map((doc) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.chunks.length} chunks • {new Date(doc.uploadedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => removeDocument(doc.id)}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Help Text */}
      {documents.length > 0 && isRAGEnabled && (
        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ✨ Documents are ready! Ask any questions and I'll automatically search them for relevant information.
          </p>
        </div>
      )}
    </div>
  )
}