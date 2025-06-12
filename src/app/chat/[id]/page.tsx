'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ChatInterface from '@/components/ChatInterface'
import AuthWrapper from '@/components/AuthWrapper'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string>('')

  useEffect(() => {
    const id = params.id as string
    if (!id) {
      // Redirect to home if no ID
      router.push('/')
      return
    }
    setConversationId(id)
  }, [params.id, router])

  if (!conversationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <AuthWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <ChatInterface initialConversationId={conversationId} />
        </div>
      </AuthWrapper>
    </ErrorBoundary>
  )
}