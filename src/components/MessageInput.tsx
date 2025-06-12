'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/Button'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import FileAttachment from './FileAttachment'
import VoiceInput from './VoiceInput'
import { IntegrationsPanel } from './IntegrationsPanel'

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
      {/* File Attachments */}
      <FileAttachment
        attachedFiles={attachedFiles}
        onFilesChange={setAttachedFiles}
        disabled={disabled}
      />

      <div className="flex items-end gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
          className="flex-1 resize-none border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 min-h-[40px] max-h-[200px] py-2 px-0"
        />

        {/* Voice Input */}
        <VoiceInput
          onTranscriptChange={onChange}
          isDisabled={disabled}
          className="flex-shrink-0"
        />

        {/* Integrations Panel */}
        <IntegrationsPanel
          onContentSelect={(content) => {
            const newValue = value ? `${value}\n\n${content}` : content
            onChange(newValue)
          }}
          className="flex-shrink-0"
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

      {/* Character count / status */}
      <div className="flex justify-between items-center mt-2 px-1">
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {value.length > 0 && (
            <span>{value.length} characters</span>
          )}
          {attachedFiles.length > 0 && (
            <span className="ml-2">{attachedFiles.length} file{attachedFiles.length !== 1 ? 's' : ''} attached</span>
          )}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          {attachedFiles.length > 0 
            ? 'Press Enter to send message with files' 
            : 'Press Enter to send, Shift+Enter for new line • Use 📎 to attach files • 🎤 for voice input • 🔗 for integrations'
          }
        </div>
      </div>
    </div>
  )
}