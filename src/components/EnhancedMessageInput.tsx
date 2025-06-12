'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import FileUpload, { UploadedFile } from './FileUpload'
import { 
  PaperAirplaneIcon, 
  PaperClipIcon, 
  XMarkIcon,
  PhotoIcon,
  DocumentIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface EnhancedMessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (message: string, attachedFiles?: UploadedFile[]) => void
  disabled?: boolean
  placeholder?: string
}

export default function EnhancedMessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type your message...'
}: EnhancedMessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [showFileUpload, setShowFileUpload] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSend = () => {
    if (!value.trim() && attachedFiles.length === 0) return
    
    let messageContent = value.trim()
    
    // If we have files but no text, create a descriptive message
    if (attachedFiles.length > 0 && !messageContent) {
      const fileDescriptions = attachedFiles.map(file => {
        if (file.analysis?.summary) {
          return `📎 ${file.file.name}: ${file.analysis.summary}`
        }
        return `📎 ${file.file.name}`
      })
      messageContent = `I've uploaded ${attachedFiles.length} file(s):\n\n${fileDescriptions.join('\n')}`
    } else if (attachedFiles.length > 0) {
      // Add file context to existing message
      const fileContext = attachedFiles.map(file => {
        if (file.analysis?.content) {
          return `\n\n--- ${file.file.name} ---\n${file.analysis.content}`
        }
        return `\n\n[Attached: ${file.file.name}]`
      }).join('')
      
      messageContent = `${messageContent}${fileContext}`
    }
    
    onSend(messageContent, attachedFiles)
    
    // Clear input and files
    onChange('')
    setAttachedFiles([])
    setShowFileUpload(false)
  }

  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    setAttachedFiles(prev => [...prev, ...newFiles])
  }

  const handleFileAnalyzed = (fileId: string, analysis: UploadedFile['analysis']) => {
    setAttachedFiles(prev => 
      prev.map(file => 
        file.id === fileId 
          ? { ...file, analysis }
          : file
      )
    )
  }

  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId))
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-4 h-4" />
    }
    return <DocumentIcon className="w-4 h-4" />
  }

  const completedFiles = attachedFiles.filter(file => file.status === 'completed')
  const processingFiles = attachedFiles.filter(file => file.status !== 'completed')

  return (
    <div className="space-y-4">
      {/* Attached Files Preview */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Attached Files ({attachedFiles.length})
            </div>
            
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="bg-slate-100 dark:bg-slate-800 rounded-lg p-3 flex items-center gap-3 max-w-md"
                >
                  {/* File Preview */}
                  <div className="flex-shrink-0">
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.file.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                        {getFileIcon(file.file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {file.file.name}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      {file.status === 'completed' && file.analysis && (
                        <span className="ml-2 text-green-600 dark:text-green-400">
                          ✓ Analyzed
                        </span>
                      )}
                      {file.status === 'processing' && (
                        <span className="ml-2 text-blue-600 dark:text-blue-400">
                          🔄 Processing...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeAttachedFile(file.id)}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            {/* Processing Status */}
            {processingFiles.length > 0 && (
              <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Processing {processingFiles.length} file(s) with AI...
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Upload Component */}
      <AnimatePresence>
        {showFileUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Upload Files for AI Analysis
              </h3>
              <button
                onClick={() => setShowFileUpload(false)}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
            
            <FileUpload
              conversationId=""
              onFilesUploaded={handleFilesUploaded}
              onFileAnalyzed={handleFileAnalyzed}
              maxFiles={5}
              disabled={disabled}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Input Area */}
      <div className="relative">
        <div className="flex items-end gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          {/* File Upload Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowFileUpload(!showFileUpload)}
            disabled={disabled}
            className={`flex-shrink-0 mb-1 ${showFileUpload ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
          >
            <PaperClipIcon className="w-5 h-5" />
          </Button>

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={attachedFiles.length > 0 ? 'Add a message (optional) or press Enter to send files...' : placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 min-h-[40px] max-h-[200px] py-2 px-0"
          />

          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={disabled || (!value.trim() && attachedFiles.length === 0)}
            size="icon"
            className="flex-shrink-0 mb-1"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Status Bar */}
        <div className="flex justify-between items-center mt-2 px-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {attachedFiles.length > 0 && (
              <span className="flex items-center gap-1">
                <EyeIcon className="w-3 h-3" />
                {completedFiles.length}/{attachedFiles.length} files analyzed
              </span>
            )}
            {value.length > 0 && attachedFiles.length === 0 && (
              <span>{value.length} characters</span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {attachedFiles.length > 0 ? 'Press Enter to send with files' : 'Press Enter to send, Shift+Enter for new line'}
          </div>
        </div>
      </div>
    </div>
  )
}