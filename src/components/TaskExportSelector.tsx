'use client'

import { useState } from 'react'
import { ExportFormat, TaskExportFormatter } from '@/lib/task-export-formatters'
import { ExportUtils } from '@/lib/export-utils'
import type { TaskExtractionResult } from '@/lib/task-extractor'
import { 
  ArrowDownTrayIcon, 
  ClipboardDocumentIcon,
  EyeIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Button } from './ui/Button'

interface TaskExportSelectorProps {
  taskResult: TaskExtractionResult
  onExportComplete?: () => void
}

export default function TaskExportSelector({ taskResult, onExportComplete }: TaskExportSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(ExportFormat.JSON)
  const [showPreview, setShowPreview] = useState(false)
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeConfidence, setIncludeConfidence] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const formatOptions = [
    { 
      value: ExportFormat.JSON, 
      label: 'JSON', 
      description: 'Complete data with all metadata',
      icon: '{ }'
    },
    { 
      value: ExportFormat.MARKDOWN, 
      label: 'Markdown', 
      description: 'Readable task list for docs',
      icon: '📝'
    },
    { 
      value: ExportFormat.CSV, 
      label: 'CSV', 
      description: 'Universal spreadsheet format',
      icon: '📊'
    },
    { 
      value: ExportFormat.NOTION_CSV, 
      label: 'Notion', 
      description: 'Optimized for Notion import',
      icon: '📑'
    },
    { 
      value: ExportFormat.LINEAR_CSV, 
      label: 'Linear', 
      description: 'Ready for Linear issues',
      icon: '🔄'
    }
  ]

  const handleDownload = async () => {
    setIsExporting(true)
    
    try {
      const exportResult = TaskExportFormatter.format(taskResult, {
        format: selectedFormat,
        includeMetadata,
        includeConfidence,
        dateFormat: selectedFormat === ExportFormat.NOTION_CSV ? 'US' : 'ISO'
      })

      ExportUtils.downloadFile({
        filename: exportResult.filename,
        content: exportResult.content,
        mimeType: exportResult.mimeType
      })

      ExportUtils.showNotification(
        `Tasks exported as ${exportResult.filename}`,
        'success'
      )

      onExportComplete?.()
    } catch (error) {
      console.error('Export failed:', error)
      ExportUtils.showNotification(
        'Failed to export tasks. Please try again.',
        'error'
      )
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    setIsExporting(true)
    
    try {
      const exportResult = TaskExportFormatter.format(taskResult, {
        format: selectedFormat,
        includeMetadata,
        includeConfidence,
        dateFormat: 'ISO'
      })

      const result = await ExportUtils.copyToClipboard(exportResult.content)
      
      ExportUtils.showNotification(
        result.message || 'Copied to clipboard!',
        result.success ? 'success' : 'error'
      )

      if (result.success) {
        onExportComplete?.()
      }
    } catch (error) {
      console.error('Copy failed:', error)
      ExportUtils.showNotification(
        'Failed to copy to clipboard',
        'error'
      )
    } finally {
      setIsExporting(false)
    }
  }

  const getPreview = () => {
    return TaskExportFormatter.getPreview(taskResult, selectedFormat)
  }

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Export Format
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {formatOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedFormat(option.value)}
              className={`relative p-4 rounded-lg border-2 transition-all ${
                selectedFormat === option.value
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="text-2xl mb-2">{option.icon}</div>
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {option.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {option.description}
              </div>
              {selectedFormat === option.value && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full"></div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Format-specific Options */}
      {(selectedFormat === ExportFormat.JSON || 
        selectedFormat === ExportFormat.MARKDOWN || 
        selectedFormat === ExportFormat.CSV) && (
        <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Include metadata (topics, urgency, complexity)
            </span>
          </label>
          
          {(selectedFormat === ExportFormat.JSON || 
            selectedFormat === ExportFormat.MARKDOWN || 
            selectedFormat === ExportFormat.CSV) && (
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={includeConfidence}
                onChange={(e) => setIncludeConfidence(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include AI confidence scores
              </span>
            </label>
          )}
        </div>
      )}

      {/* Format Instructions */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {ExportUtils.getFormatInstructions(selectedFormat)}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex items-center gap-2"
        >
          <ArrowDownTrayIcon className="w-4 h-4" />
          Download {formatOptions.find(f => f.value === selectedFormat)?.label}
        </Button>

        <Button
          onClick={handleCopyToClipboard}
          disabled={isExporting}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ClipboardDocumentIcon className="w-4 h-4" />
          Copy to Clipboard
        </Button>

        <Button
          onClick={() => setShowPreview(!showPreview)}
          variant="ghost"
          className="flex items-center gap-2"
        >
          <EyeIcon className="w-4 h-4" />
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
            Preview ({selectedFormat.toUpperCase()})
          </h4>
          <pre className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto text-xs">
            <code className="text-gray-800 dark:text-gray-200">
              {getPreview()}
            </code>
          </pre>
        </div>
      )}

      {/* Summary */}
      <div className="text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
        {ExportUtils.getExportSummary(taskResult.tasks.length, selectedFormat)}
      </div>
    </div>
  )
}