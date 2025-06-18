'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import UserTraitsForm from '@/components/UserTraitsForm'
import ConversationExportImport from '@/components/ConversationExportImport'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const router = useRouter()
  const { user, isAnonymous } = useAuth()
  const [activeTab, setActiveTab] = useState<'profile' | 'export'>('profile')

  useEffect(() => {
    // Redirect to login if not authenticated
    if (isAnonymous) {
      router.push('/login?redirect=/settings')
    }
  }, [isAnonymous, router])

  if (isAnonymous) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Chat
          </Button>
          
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your profile, preferences, and conversation history
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'profile'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Profile & Traits
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'export'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Export/Import History
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile & AI Traits</CardTitle>
                <CardDescription>
                  Tell T3 Chat about yourself to personalize AI responses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserTraitsForm />
              </CardContent>
            </Card>
          )}

          {activeTab === 'export' && (
            <Card>
              <CardHeader>
                <CardTitle>Conversation History</CardTitle>
                <CardDescription>
                  Export your conversations or import from a backup
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConversationExportImport />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}