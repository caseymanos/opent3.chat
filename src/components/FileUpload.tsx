'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  EyeIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid'
import ModelSelector from './ModelSelector'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'

export interface UploadedFile {
  id: string
  file: File
  preview?: string
  status: 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  analysis?: {
    type: 'image' | 'pdf' | 'text'
    content?: string
    ocrText?: string
    summary?: string
    metadata?: Record<string, unknown>
  }
  error?: string
}

interface FileUploadProps {
  conversationId: string
  onAnalysisComplete?: (summary: string, fileInfo: any) => void
  onFilesUploaded?: (files: UploadedFile[]) => void
  onFileAnalyzed?: (fileId: string, analysis: UploadedFile['analysis']) => void
  maxFiles?: number
  maxSize?: number // in bytes
  accept?: Record<string, string[]>
  disabled?: boolean
}

export default function FileUpload({
  conversationId,
  onAnalysisComplete,
  onFilesUploaded,
  onFileAnalyzed,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp'],
    'application/pdf': ['.pdf'],
    'text/*': ['.txt', '.md', '.csv'],
    'application/json': ['.json']
  },
  disabled = false
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307')
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  const [analysisResult, setAnalysisResult] = useState<string>('')
  
  const { saveFileSummary } = useRealtimeChat(conversationId || '')

  const analyzeFile = useCallback(async (file: File): Promise<UploadedFile['analysis']> => {
    const fileType = file.type

    if (fileType.startsWith('image/')) {
      return await analyzeImage(file)
    } else if (fileType === 'application/pdf') {
      return await analyzePDF(file)
    } else if (fileType.startsWith('text/')) {
      return await analyzeText(file)
    }

    throw new Error(`Unsupported file type: ${fileType}`)
  }, [selectedModel, selectedProvider])

  const processFile = useCallback(async (file: File): Promise<UploadedFile> => {
    // Generate a proper UUID v4 for Supabase compatibility
    const fileId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    const uploadedFile: UploadedFile = {
      id: fileId,
      file,
      status: 'uploading',
      progress: 0
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      uploadedFile.preview = URL.createObjectURL(file)
    }

    // Add file to state immediately
    setUploadedFiles(prev => [...prev, uploadedFile])

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadedFiles(prev => 
        prev.map(f => 
          f.id === fileId 
            ? { ...f, progress: Math.min(f.progress + 10, 90) }
            : f
        )
      )
    }, 100)

    try {
      console.log('🔄 [FileUpload] Starting file analysis for:', file.name, 'Type:', file.type)
      // Analyze the file
      const analysis = await analyzeFile(file)
      console.log('✅ [FileUpload] File analysis completed for:', file.name)
      
      clearInterval(progressInterval)
      
      const completedFile: UploadedFile = {
        ...uploadedFile,
        status: 'completed',
        progress: 100,
        analysis
      }

      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? completedFile : f)
      )

      onFileAnalyzed?.(fileId, analysis)
      
      // Save analysis to database if conversationId is provided
      if (conversationId && saveFileSummary) {
        await saveFileSummary(fileId, analysis?.content || analysis?.summary || '', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          model: selectedModel,
          provider: selectedProvider,
          analysisDate: new Date().toISOString()
        })
      }

      onAnalysisComplete?.(analysis?.summary || analysis?.content || '', {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size
      })

      onFilesUploaded?.([completedFile])
      return completedFile

    } catch (error) {
      clearInterval(progressInterval)
      const errorFile: UploadedFile = {
        ...uploadedFile,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      }

      setUploadedFiles(prev => 
        prev.map(f => f.id === fileId ? errorFile : f)
      )

      return errorFile
    }
  }, [onFileAnalyzed, onFilesUploaded, analyzeFile])

  const analyzeImage = async (file: File): Promise<UploadedFile['analysis']> => {
    try {
      // Convert file to base64 for analysis
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })

      // Call analysis API with selected model
      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
          fileType: file.type,
          model: selectedModel,
          provider: selectedProvider,
          analysisType: 'image'
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let analysis = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = new TextDecoder().decode(value)
        analysis += chunk
      }
      
      return {
        type: 'image',
        content: analysis,
        summary: `AI analysis of ${file.name}`,
        metadata: {
          size: file.size,
          type: file.type,
          model: selectedModel,
          provider: selectedProvider
        }
      }
    } catch (error) {
      // Fallback to basic image info
      return {
        type: 'image',
        content: `Image file: ${file.name}`,
        summary: `Uploaded image (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        metadata: {
          size: file.size,
          type: file.type
        }
      }
    }
  }

  const analyzePDF = async (file: File): Promise<UploadedFile['analysis']> => {
    console.log('📄 [FileUpload] Starting PDF analysis for:', file.name)
    try {
      const formData = new FormData()
      formData.append('file', file)

      console.log('📄 [FileUpload] Sending request to /api/pdf...')
      const response = await fetch('/api/pdf', {
        method: 'POST',
        body: formData
      })

      console.log('📄 [FileUpload] PDF API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('📄 [FileUpload] PDF API error:', errorText)
        throw new Error('PDF analysis failed')
      }

      const result = await response.json()
      console.log('📄 [FileUpload] PDF analysis result:', result)
      
      return {
        type: 'pdf',
        content: result.text,
        summary: result.summary,
        metadata: {
          pages: result.pages,
          size: file.size
        }
      }
    } catch (error) {
      console.error('📄 [FileUpload] PDF analysis failed:', error)
      return {
        type: 'pdf',
        content: `PDF file: ${file.name}`,
        summary: `Uploaded PDF document (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        metadata: {
          size: file.size
        }
      }
    }
  }

  const analyzeText = async (file: File): Promise<UploadedFile['analysis']> => {
    try {
      // Convert file to text for analysis
      const fileContent = await file.text()

      // Call analysis API with selected model
      const response = await fetch('/api/analyze-file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileContent,
          fileName: file.name,
          fileType: file.type,
          model: selectedModel,
          provider: selectedProvider,
          analysisType: 'document'
        }),
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      let analysis = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = new TextDecoder().decode(value)
        analysis += chunk
      }
      
      return {
        type: 'text',
        content: analysis,
        summary: `AI analysis of ${file.name}`,
        metadata: {
          size: file.size,
          lines: fileContent.split('\n').length,
          model: selectedModel,
          provider: selectedProvider
        }
      }
    } catch (error) {
      const text = await file.text()
      return {
        type: 'text',
        content: text,
        summary: `Text document with ${text.length} characters`,
        metadata: {
          size: file.size,
          lines: text.split('\n').length
        }
      }
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1]) // Remove data:image/...;base64, prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('📁 [FileUpload] Files dropped:', acceptedFiles.map(f => f.name))
    
    if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Handle single file mode for backwards compatibility
    const file = acceptedFiles[0]
    if (!file) return

    setIsAnalyzing(true)
    setAnalysisResult('')

    try {
      // Use the existing single-file analysis for compatibility
      const processedFile = await processFile(file)
      console.log('📁 [FileUpload] File processed successfully:', file.name)
      
      // Save to database and trigger callbacks
      if (processedFile.analysis) {
        const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        await saveFileSummary(fileId, processedFile.analysis.content || '', {
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          model: selectedModel,
          provider: selectedProvider,
          analysisDate: new Date().toISOString()
        })

        setAnalysisResult(processedFile.analysis.content || '')
        
        onAnalysisComplete?.(processedFile.analysis.content || '', {
          id: fileId,
          name: file.name,
          type: file.type,
          size: file.size
        })
      }
      
      onFilesUploaded?.([processedFile])
    } catch (error) {
      console.error('📁 [FileUpload] File processing failed:', file.name, error)
      setAnalysisResult('Error analyzing file. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [uploadedFiles.length, maxFiles, onFilesUploaded, processFile, saveFileSummary, selectedModel, selectedProvider, onAnalysisComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    disabled: disabled || isAnalyzing,
    multiple: false // Keep single file for backwards compatibility
  })

  const handleModelChange = (model: string, provider: string) => {
    setSelectedModel(model)
    setSelectedProvider(provider)
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="w-8 h-8" />
    } else if (file.type === 'application/pdf') {
      return <DocumentIcon className="w-8 h-8" />
    } else {
      return <DocumentTextIcon className="w-8 h-8" />
    }
  }

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return <Cog6ToothIcon className="w-5 h-5 animate-spin" />
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Model Selection */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Analysis Model:
        </span>
        <ModelSelector
          selectedModel={selectedModel}
          selectedProvider={selectedProvider}
          onModelChange={handleModelChange}
          disabled={isAnalyzing}
        />
      </div>

      {/* Drop Zone */}
      <motion.div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }
          ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}
        `}
        whileHover={{ scale: isAnalyzing ? 1 : 1.02 }}
        whileTap={{ scale: isAnalyzing ? 1 : 0.98 }}
      >
        <input {...getInputProps()} />
        
        <motion.div
          animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          {isAnalyzing ? (
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <CloudArrowUpIcon className="w-8 h-8 text-white" />
            </div>
          )}
          
          <div>
            <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {isAnalyzing ? 'Analyzing file...' : isDragActive ? 'Drop files here' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Supports images, PDFs, and text files
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-slate-400">
            <PhotoIcon className="w-5 h-5" />
            <DocumentIcon className="w-5 h-5" />
          </div>
        </motion.div>
      </motion.div>

      {/* Analysis Result */}
      {analysisResult && (
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
          <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
            Analysis Result
          </h3>
          <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {analysisResult}
          </div>
        </div>
      )}

      {/* File List */}
      <AnimatePresence>
        {uploadedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Uploaded Files ({uploadedFiles.length})
            </h3>
            
            {uploadedFiles.map((uploadedFile) => (
              <motion.div
                key={uploadedFile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  {/* File Preview/Icon */}
                  <div className="flex-shrink-0">
                    {uploadedFile.preview ? (
                      <img
                        src={uploadedFile.preview}
                        alt={uploadedFile.file.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400">
                        {getFileIcon(uploadedFile.file)}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                        {uploadedFile.file.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(uploadedFile.status)}
                        <button
                          onClick={() => removeFile(uploadedFile.id)}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB • {uploadedFile.file.type}
                    </p>

                    {/* Progress Bar */}
                    {(uploadedFile.status === 'uploading' || uploadedFile.status === 'processing') && (
                      <div className="mt-2">
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <motion.div
                            className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadedFile.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {uploadedFile.status === 'uploading' ? 'Uploading...' : 'Analyzing with AI...'}
                        </p>
                      </div>
                    )}

                    {/* Analysis Results */}
                    {uploadedFile.status === 'completed' && uploadedFile.analysis && (
                      <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-2">
                          <EyeIcon className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-green-800 dark:text-green-200">
                              AI Analysis Complete
                            </p>
                            {uploadedFile.analysis.summary && (
                              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                {uploadedFile.analysis.summary}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Error */}
                    {uploadedFile.status === 'error' && (
                      <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-200">
                          Error: {uploadedFile.error}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}