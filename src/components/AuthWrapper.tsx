'use client'

import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { Button } from './ui/Button'
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js'

interface AuthWrapperProps {
  children: React.ReactNode
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signInAnonymously = async () => {
    setLoading(true)
    try {
      // For development, bypass auth and set a mock user
      if (window.location.hostname === 'localhost') {
        // Create a mock user object with valid UUID
        const mockUserId = '00000000-0000-0000-0000-000000000001' // Valid UUID format
        const mockUser: User = {
          id: mockUserId,
          email: 'demo@t3crusher.app',
          aud: 'authenticated',
          role: 'authenticated',
          app_metadata: {},
          user_metadata: { username: 'Demo User' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as User
        
        // Try to create profile entry for mock user
        await supabase.from('profiles').upsert({
          id: mockUserId,
          username: 'Demo User'
        }).then((result: any) => {
          console.log('Mock profile upsert result:', result)
        })
        
        setUser(mockUser)
        console.log('Development mode: Using mock authentication')
        return
      }
      
      // Production auth flow
      const demoEmail = 'demo@t3crusher.app'
      const demoPassword = 'demo123456'
      
      let { data, error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword
      })
      
      if (error && error.message.includes('Invalid login credentials')) {
        const signUpResult = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: { username: 'Demo User' }
          }
        })
        
        if (signUpResult.error) {
          console.error('Error creating demo account:', signUpResult.error)
          return
        }
        
        const signInResult = await supabase.auth.signInWithPassword({
          email: demoEmail,
          password: demoPassword
        })
        
        data = signInResult.data
        error = signInResult.error
      }
      
      if (error) {
        console.error('Authentication error:', error)
        return
      }
      
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: data.user.user_metadata?.username || 'Demo User'
        })
      }
    } catch (error) {
      console.error('Error during authentication:', error)
    } finally {
      setLoading(false)
    }
  }

  // const signOut = async () => {
  //   setLoading(true)
  //   try {
  //     const { error } = await supabase.auth.signOut()
  //     if (error) {
  //       console.error('Error signing out:', error)
  //     }
  //   } catch (error) {
  //     console.error('Error signing out:', error)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Welcome to T3 Crusher
          </h1>
          
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            The most advanced AI chat application built with the T3 Stack. 
            Sign in to start having intelligent conversations with multiple AI models.
          </p>

          <div className="space-y-4">
            <Button
              onClick={signInAnonymously}
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Signing in...
                </div>
              ) : (
                'Start Chatting'
              )}
            </Button>
            
            <p className="text-xs text-slate-500 dark:text-slate-400">
              By clicking &quot;Start Chatting&quot;, you agree to our terms and will be signed in with a demo account.
            </p>
            
            {/* Development notice */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Development Mode:</strong> Using demo@t3crusher.app for testing. 
                Check browser console for any authentication errors.
              </p>
              <button 
                onClick={async () => {
                  console.log('Testing Supabase connection...')
                  const { data, error } = await supabase.from('profiles').select('count').limit(1)
                  console.log('Supabase test result:', { data, error })
                }}
                className="mt-2 text-xs underline text-blue-600 dark:text-blue-400"
              >
                Test Supabase Connection
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <div className="flex items-center justify-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">7+</div>
                <div className="text-xs text-slate-500">AI Models</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">∞</div>
                <div className="text-xs text-slate-500">Conversations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">⚡</div>
                <div className="text-xs text-slate-500">Real-time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}