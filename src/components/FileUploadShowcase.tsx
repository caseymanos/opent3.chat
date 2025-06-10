'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import FileUpload, { UploadedFile } from './FileUpload'
import { 
  PhotoIcon, 
  DocumentIcon, 
  EyeIcon, 
  BeakerIcon,
  DocumentTextIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

export default function FileUploadShowcase() {
  const [analyzedFiles, setAnalyzedFiles] = useState<UploadedFile[]>([])

  const handleFilesUploaded = (files: UploadedFile[]) => {
    console.log('🔍 [FileUploadShowcase] Files uploaded:', files.map(f => f.file.name))
  }

  const handleFileAnalyzed = (fileId: string, analysis: UploadedFile['analysis']) => {
    console.log('✅ [FileUploadShowcase] File analyzed:', fileId, analysis)
    setAnalyzedFiles(prev => {
      const existingIndex = prev.findIndex(f => f.id === fileId)
      if (existingIndex >= 0) {
        // Update existing file
        const updated = [...prev]
        updated[existingIndex] = { ...updated[existingIndex], analysis }
        return updated
      }
      // This shouldn't happen in normal flow, but handle it gracefully
      return prev
    })
  }

  const features = [
    {
      title: 'Smart Image Analysis',
      description: 'AI-powered vision analysis with object detection, OCR, and mood recognition',
      icon: <PhotoIcon className="w-8 h-8" />,
      capabilities: [
        'Object and entity detection',
        'Text extraction (OCR)',
        'Color and composition analysis',
        'Mood and atmosphere recognition'
      ]
    },
    {
      title: 'PDF Processing',
      description: 'Extract and summarize content from PDF documents with AI',
      icon: <DocumentIcon className="w-8 h-8" />,
      capabilities: [
        'Text content extraction',
        'Document summarization',
        'Topic identification',
        'Key points extraction'
      ]
    },
    {
      title: 'Text Analysis',
      description: 'Process and analyze text files with AI-powered insights',
      icon: <DocumentTextIcon className="w-8 h-8" />,
      capabilities: [
        'Content analysis',
        'Structure recognition',
        'Summary generation',
        'Metadata extraction'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 dark:from-slate-900 dark:to-purple-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-6 py-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl border border-slate-200/50 dark:border-slate-700/50"
          >
            <BeakerIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              File Upload & Vision Processing
            </h1>
          </motion.div>
          
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Advanced AI-powered file analysis supporting images, PDFs, and text documents with 
            real-time processing, OCR capabilities, and intelligent content extraction.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50 shadow-lg"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {feature.title}
                </h3>
              </div>
              
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {feature.description}
              </p>
              
              <ul className="space-y-2">
                {feature.capabilities.map((capability, capIndex) => (
                  <li key={capIndex} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    {capability}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* File Upload Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl flex items-center justify-center">
              <EyeIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Try File Upload & AI Analysis
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Upload images, PDFs, or text files to see AI-powered analysis in action
              </p>
            </div>
          </div>

          <FileUpload
            onFilesUploaded={handleFilesUploaded}
            onFileAnalyzed={handleFileAnalyzed}
            maxFiles={5}
            maxSize={10 * 1024 * 1024} // 10MB
          />
        </motion.div>

        {/* Analysis Results */}
        {analyzedFiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 shadow-xl"
          >
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              AI Analysis Results
            </h3>
            
            <div className="space-y-6">
              {analyzedFiles.map((file) => (
                file.analysis && (
                  <div key={file.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <DocumentIcon className="w-8 h-8 text-slate-500 dark:text-slate-400" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          {file.file.name}
                        </h4>
                        
                        {file.analysis.summary && (
                          <p className="text-slate-600 dark:text-slate-400 mb-4">
                            {file.analysis.summary}
                          </p>
                        )}
                        
                        {file.analysis.content && (
                          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                              AI Analysis:
                            </h5>
                            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                              {file.analysis.content.length > 500 
                                ? `${file.analysis.content.substring(0, 500)}...` 
                                : file.analysis.content
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </motion.div>
        )}

        {/* Technical Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200/50 dark:border-blue-700/50"
        >
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            🚀 Powered by Advanced AI
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Vision Analysis</h4>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• Claude 3.5 Sonnet Vision Model</li>
                <li>• Real-time object detection</li>
                <li>• OCR text extraction</li>
                <li>• Mood and color analysis</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-slate-800 dark:text-slate-200 mb-2">Document Processing</h4>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                <li>• Intelligent text extraction</li>
                <li>• Content summarization</li>
                <li>• Topic identification</li>
                <li>• Structured metadata generation</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}