'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from './ui/Button'
import { PaperAirplaneIcon, PaperClipIcon } from '@heroicons/react/24/outline'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
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
      onSend()
    }
  }

  const handleFileUpload = () => {
    // TODO: Implement file upload functionality
    console.log('File upload clicked')
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
        {/* File Upload Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFileUpload}
          disabled={disabled}
          className="flex-shrink-0 mb-1"
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
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border-0 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-0 min-h-[40px] max-h-[200px] py-2 px-0"
        />

        {/* Send Button */}
        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
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
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}