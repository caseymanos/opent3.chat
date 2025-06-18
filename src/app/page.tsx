'use client'

import { useSearchParams } from 'next/navigation'
import ChatInterface from '@/components/ChatInterface'
import LandingPage from '@/components/LandingPage'
import AuthWrapper from '@/components/AuthWrapper'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Suspense } from 'react'

function HomeContent() {
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversationId')
  
  // If there's a conversation ID, show the chat interface
  if (conversationId) {
    return <ChatInterface initialConversationId={conversationId} />
  }
  
  // Otherwise, show the landing page
  return <LandingPage />
}

export default function Home() {
  return (
    <ErrorBoundary>
      <AuthWrapper>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Loading OpenT3...</p>
            </div>
          </div>
        }>
          <HomeContent />
        </Suspense>
      </AuthWrapper>
    </ErrorBoundary>
  );
}
