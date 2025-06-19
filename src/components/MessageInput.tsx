'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/Button'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import VoiceInput from './VoiceInput'

interface AttachedFile {
  file: File
  id: string
  preview?: string
}

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: (files?: FileList | null) => void
  disabled?: boolean
  placeholder?: string
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type your message...'
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isComposing, setIsComposing] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log('⌨️ [MessageInput] Key pressed:', { 
      key: e.key, 
      shiftKey: e.shiftKey, 
      isComposing, 
      disabled,
      hasValue: !!value.trim()
    })
    
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      console.log('✅ [MessageInput] Enter key conditions met, calling handleSend')
      handleSend()
    }
  }

  const handleSend = () => {
    console.log('📤 [MessageInput] handleSend called', { 
      value: value.trim(), 
      hasValue: !!value.trim(), 
      attachedFiles: attachedFiles.length,
      disabled 
    })
    
    // Don't send if disabled or if there's no content
    if (disabled || (!value.trim() && attachedFiles.length === 0)) {
      console.log('❌ [MessageInput] Send blocked - disabled or no content')
      return
    }
    
    // Convert attached files to FileList for AI SDK
    const fileList = attachedFiles.length > 0 ? createFileList(attachedFiles.map(af => af.file)) : null
    onSend(fileList)
    setAttachedFiles([]) // Clear attachments after sending
  }

  // Helper to create FileList from File array
  const createFileList = (files: File[]): FileList => {
    const dt = new DataTransfer()
    files.forEach(file => dt.items.add(file))
    return dt.files
  }

  return (
    <div className="relative space-y-3">
      {/* File Attachments - Removed */}
      {/* <FileAttachment
        attachedFiles={attachedFiles}
        onFilesChange={setAttachedFiles}
        disabled={disabled}
      /> */}

      <div className="flex items-end gap-4 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 min-h-[44px] max-h-[200px] py-3 px-0 text-base leading-relaxed"
        />

        {/* Action Buttons Container */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Voice Input */}
          <VoiceInput
            onTranscriptChange={(transcript) => {
              // Append transcript to existing text instead of replacing it
              const currentValue = value || ''
              const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : ''
              onChange(currentValue + separator + transcript)
            }}
            isDisabled={disabled}
            className="flex-shrink-0"
          />


          {/* Send Button */}
          <Button
            onClick={handleSend}
            disabled={disabled || (!value.trim() && attachedFiles.length === 0)}
            size="default"
            className={`flex-shrink-0 transition-all duration-200 ${
              disabled || (!value.trim() && attachedFiles.length === 0)
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-105 shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Status and Help Text */}
      <div className="flex justify-between items-center mt-3 px-2">
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          {value.length > 0 && (
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
              {value.length} chars
            </span>
          )}
          {attachedFiles.length > 0 && (
            <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
              {attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400 dark:text-slate-500 hidden sm:block">
          {attachedFiles.length > 0 
            ? '⏎ Send with files' 
            : '⏎ Send • ⇧⏎ New line • 🎤 Voice'
          }
        </div>
      </div>
    </div>
  )
}