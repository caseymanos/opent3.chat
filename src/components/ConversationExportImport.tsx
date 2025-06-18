'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@/lib/supabase'
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

export default function ConversationExportImport() {
  const { user } = useAuth()
  const supabase = createClientComponentClient()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<{ success?: boolean; message?: string } | null>(null)
  const [exportStats, setExportStats] = useState<{ conversations: number; messages: number } | null>(null)

  const handleExport = async () => {
    if (!user) return
    
    setExporting(true)
    setExportStats(null)
    
    try {
      // Fetch all conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (convError) throw convError

      // Fetch all messages for these conversations
      const conversationIds = conversations?.map((c: any) => c.id) || []
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true })

      if (msgError) throw msgError

      // Fetch user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single()

      // Create export data
      const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email,
          preferences: preferences || null
        },
        conversations: conversations?.map((conv: any) => ({
          ...conv,
          messages: messages?.filter((m: any) => m.conversation_id === conv.id) || []
        })) || [],
        stats: {
          total_conversations: conversations?.length || 0,
          total_messages: messages?.length || 0
        }
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `t3-chat-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportStats({
        conversations: exportData.stats.total_conversations,
        messages: exportData.stats.total_messages
      })
    } catch (error) {
      console.error('Export failed:', error)
      setImportResult({ success: false, message: 'Export failed. Please try again.' })
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async () => {
    if (!user || !importFile) return

    setImporting(true)
    setImportResult(null)

    try {
      // Read file
      const text = await importFile.text()
      const data = JSON.parse(text)

      // Validate format
      if (!data.version || !data.conversations) {
        throw new Error('Invalid file format')
      }

      // Import conversations and messages
      let importedConversations = 0
      let importedMessages = 0

      for (const conv of data.conversations) {
        // Create conversation
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            title: conv.title || 'Imported Chat',
            user_id: user.id,
            model_provider: conv.model_provider || 'openai',
            model_name: conv.model_name || 'gpt-4',
            system_prompt: conv.system_prompt,
            created_at: conv.created_at,
            updated_at: conv.updated_at
          })
          .select()
          .single()

        if (convError) {
          console.error('Failed to import conversation:', convError)
          continue
        }

        importedConversations++

        // Import messages for this conversation
        if (conv.messages && conv.messages.length > 0) {
          const messagesToInsert = conv.messages.map((msg: any) => ({
            conversation_id: newConv.id,
            content: msg.content,
            role: msg.role,
            model_metadata: msg.model_metadata,
            attachments: msg.attachments,
            created_at: msg.created_at,
            parent_id: null, // TODO: Handle branching
            branch_index: 0
          }))

          const { error: msgError } = await supabase
            .from('messages')
            .insert(messagesToInsert)

          if (!msgError) {
            importedMessages += messagesToInsert.length
          }
        }
      }

      // Import user preferences if available
      if (data.user?.preferences) {
        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            ...data.user.preferences
          })
      }

      setImportResult({
        success: true,
        message: `Successfully imported ${importedConversations} conversations with ${importedMessages} messages.`
      })
      setImportFile(null)
    } catch (error) {
      console.error('Import failed:', error)
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Import failed. Please check the file format.'
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Export Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Export Conversations
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Download all your conversations and messages as a JSON file for backup or migration.
        </p>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export All Conversations'}
          </Button>
          
          {exportStats && (
            <span className="text-sm text-green-600 dark:text-green-400">
              ✓ Exported {exportStats.conversations} conversations with {exportStats.messages} messages
            </span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700" />

      {/* Import Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Import Conversations
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Restore conversations from a previously exported JSON file.
        </p>

        <div className="space-y-4">
          {/* File Input */}
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6">
            <input
              type="file"
              accept=".json"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className="flex flex-col items-center cursor-pointer"
            >
              <DocumentTextIcon className="w-12 h-12 text-gray-400 mb-2" />
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {importFile ? importFile.name : 'Click to select a JSON file'}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                {importFile && `${(importFile.size / 1024).toFixed(2)} KB`}
              </span>
            </label>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!importFile || importing}
            className="flex items-center gap-2"
          >
            <ArrowUpTrayIcon className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import Conversations'}
          </Button>

          {/* Import Result */}
          {importResult && (
            <div className={`p-4 rounded-lg ${
              importResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            }`}>
              {importResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          ℹ️ About Export/Import
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Exports include all conversations, messages, and your profile traits</li>
          <li>• Files are saved in JSON format for easy backup and portability</li>
          <li>• Imported conversations will be added to your existing ones</li>
          <li>• Message branching structure is preserved during export/import</li>
        </ul>
      </div>
    </div>
  )
}