'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { DocumentIcon, PhotoIcon, EyeIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import type { Database } from '@/lib/supabase'

type FileUpload = Database['public']['Tables']['file_uploads']['Row']

interface FileSummariesProps {
  conversationId?: string
}

interface FileWithSummary extends Omit<FileUpload, 'processed_data'> {
  processed_data: {
    summary: string
    analysis_timestamp: string
    metadata?: {
      fileName: string
      fileType: string
      fileSize: number
      model: string
      provider: string
      analysisDate: string
    }
  } | null
}

export default function FileSummaries({ conversationId }: FileSummariesProps) {
  const [files, setFiles] = useState<FileWithSummary[]>([])
  const [selectedFile, setSelectedFile] = useState<FileWithSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    loadFilesSummaries()
  }, [conversationId])

  const loadFilesSummaries = async () => {
    try {
      setIsLoading(true)
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || '00000000-0000-0000-0000-000000000001'

      const { data, error } = await supabase
        .from('file_uploads')
        .select('*')
        .eq('user_id', userId)
        .not('processed_data', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading file summaries:', error)
        return
      }

      setFiles(data || [])
    } catch (error) {
      console.error('Error loading file summaries:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType?.startsWith('image/')) {
      return <PhotoIcon className="w-5 h-5 text-blue-500" />
    }
    return <DocumentIcon className="w-5 h-5 text-green-500" />
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
        <DocumentIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">No analyzed files yet</p>
        <p className="text-xs">Upload and analyze files to see summaries here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-slate-900 dark:text-slate-100">
        File Analysis History ({files.length})
      </h3>
      
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getFileIcon(file.file_type || '')}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                    {file.filename || 'Unknown File'}
                  </h4>
                  {file.processed_data?.metadata?.provider && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      {file.processed_data.metadata.provider}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-2">
                  <span>{file.file_size ? formatFileSize(file.file_size) : 'Unknown size'}</span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDate(file.processed_data?.analysis_timestamp || file.created_at)}
                  </span>
                </div>
                
                {file.processed_data?.summary && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                    {file.processed_data.summary.substring(0, 150)}...
                  </p>
                )}
                
                <Button
                  onClick={() => setSelectedFile(file)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <EyeIcon className="w-4 h-4" />
                  View Full Analysis
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Analysis Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              {getFileIcon(selectedFile.file_type || '')}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {selectedFile.filename}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <span>{selectedFile.file_size ? formatFileSize(selectedFile.file_size) : 'Unknown size'}</span>
                  <span>{formatDate(selectedFile.processed_data?.analysis_timestamp || selectedFile.created_at)}</span>
                  {selectedFile.processed_data?.metadata?.model && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs">
                      {selectedFile.processed_data.metadata.model}
                    </span>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setSelectedFile(null)}
                variant="outline"
                size="sm"
              >
                Close
              </Button>
            </div>
            
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                Analysis Summary
              </h4>
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {selectedFile.processed_data?.summary || 'No analysis available'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}