'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { DocumentIcon, PhotoIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/Button'
import ModelSelector from './ModelSelector'
import { useRealtimeChat } from '@/hooks/useRealtimeChat'

interface FileUploadProps {
  conversationId: string
  onAnalysisComplete?: (summary: string, fileInfo: any) => void
}

export default function FileUpload({ conversationId, onAnalysisComplete }: FileUploadProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedModel, setSelectedModel] = useState('claude-3-haiku-20240307')
  const [selectedProvider, setSelectedProvider] = useState('anthropic')
  const [analysisResult, setAnalysisResult] = useState<string>('')
  
  const { saveFileSummary } = useRealtimeChat(conversationId)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setIsAnalyzing(true)
    setAnalysisResult('')

    try {
      // Convert file to base64 for analysis
      const fileContent = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        
        if (file.type.startsWith('image/')) {
          reader.readAsDataURL(file)
        } else {
          reader.readAsText(file)
        }
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
          analysisType: file.type.startsWith('image/') ? 'image' : 'document'
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
        setAnalysisResult(analysis)
      }

      // Save analysis to database
      const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      await saveFileSummary(fileId, analysis, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        model: selectedModel,
        provider: selectedProvider,
        analysisDate: new Date().toISOString()
      })

      onAnalysisComplete?.(analysis, {
        id: fileId,
        name: file.name,
        type: file.type,
        size: file.size
      })

    } catch (error) {
      console.error('File analysis error:', error)
      setAnalysisResult('Error analyzing file. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [selectedModel, selectedProvider, saveFileSummary, onAnalysisComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.md', '.json', '.csv'],
      'application/json': ['.json'],
    },
    maxFiles: 1,
    disabled: isAnalyzing
  })

  const handleModelChange = (model: string, provider: string) => {
    setSelectedModel(model)
    setSelectedProvider(provider)
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

      {/* File Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50 dark:bg-blue-950' 
            : 'border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-slate-50 dark:hover:bg-slate-800'
          }
          ${isAnalyzing ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-3">
          {isAnalyzing ? (
            <div className="w-8 h-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          ) : (
            <ArrowUpTrayIcon className="w-8 h-8 text-slate-400" />
          )}
          
          <div>
            <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
              {isAnalyzing ? 'Analyzing file...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Supports images, PDFs, and text files
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-slate-400">
            <PhotoIcon className="w-5 h-5" />
            <DocumentIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

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
    </div>
  )
}