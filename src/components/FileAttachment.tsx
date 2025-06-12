'use client'

import { useState, useRef } from 'react'
import { PaperClipIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { motion, AnimatePresence } from 'framer-motion'

interface AttachedFile {
  file: File
  id: string
  preview?: string
}

interface FileAttachmentProps {
  onFilesChange: (files: AttachedFile[]) => void
  attachedFiles: AttachedFile[]
  disabled?: boolean
}

export default function FileAttachment({ onFilesChange, attachedFiles, disabled }: FileAttachmentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newAttachedFiles: AttachedFile[] = []
    
    for (const file of files) {
      // Create file attachment with preview for images
      let preview: string | undefined
      if (file.type.startsWith('image/')) {
        preview = URL.createObjectURL(file)
      }

      newAttachedFiles.push({
        file,
        id: crypto.randomUUID(),
        preview
      })
    }

    onFilesChange([...attachedFiles, ...newAttachedFiles])
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = (id: string) => {
    const fileToRemove = attachedFiles.find(f => f.id === id)
    if (fileToRemove?.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
    onFilesChange(attachedFiles.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Attached Files Display */}
      <AnimatePresence>
        {attachedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            {attachedFiles.map((attachedFile) => (
              <motion.div
                key={attachedFile.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 bg-white dark:bg-gray-700 px-3 py-2 rounded border border-gray-200 dark:border-gray-600 group hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
              >
                {attachedFile.preview ? (
                  <img 
                    src={attachedFile.preview} 
                    alt={attachedFile.file.name}
                    className="w-6 h-6 rounded object-cover"
                  />
                ) : (
                  <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                )}
                
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[150px]">
                    {attachedFile.file.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(attachedFile.file.size)}
                  </span>
                </div>
                
                <button
                  onClick={() => removeFile(attachedFile.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                  title="Remove file"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-500 hover:text-red-500" />
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* File Attachment Button */}
      <div className="flex items-center">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach files"
        >
          <PaperClipIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}