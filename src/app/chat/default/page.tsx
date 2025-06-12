'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase'
import AuthWrapper from '@/components/AuthWrapper'
import ErrorBoundary from '@/components/ErrorBoundary'

export default function DefaultChatPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Create a new conversation and redirect to it
    const createAndRedirect = async () => {
      try {
        console.log('🆕 [DefaultChat] Creating new conversation')
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id || '00000000-0000-0000-0000-000000000001'
        
        // Create conversation directly
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            title: 'New Chat',
            user_id: userId
          })
          .select()
          .single()

        if (data?.id) {
          console.log('✅ [DefaultChat] Created conversation, redirecting to:', data.id)
          router.replace(`/chat/${data.id}`)
        } else {
          console.error('❌ [DefaultChat] Failed to create conversation:', error)
        }
      } catch (error) {
        console.error('❌ [DefaultChat] Error:', error)
      }
    }

    createAndRedirect()
  }, [router, supabase])

  return (
    <ErrorBoundary>
      <AuthWrapper>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Setting up your chat...</p>
          </div>
        </div>
      </AuthWrapper>
    </ErrorBoundary>
  )
}