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
    // Auto-authenticate immediately for demo mode (works in both dev and production)
    const isDemoMode = window.location.hostname === 'localhost' || 
                      window.location.hostname.includes('vercel.app') ||
                      window.location.hostname.includes('t3-crusher')
    
    if (isDemoMode) {
      const mockUserId = '00000000-0000-0000-0000-000000000001'
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
      
      setUser(mockUser)
      setLoading(false)
      console.log('🔐 [AuthWrapper] Auto-authenticated in demo mode:', window.location.hostname)
      return
    }

    // Check if Supabase is properly configured before attempting auth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon-key')) {
      console.warn('🔐 [AuthWrapper] Supabase not configured, using demo mode')
      const mockUserId = '00000000-0000-0000-0000-000000000001'
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
      
      setUser(mockUser)
      setLoading(false)
      return
    }

    // Production auth flow (only if Supabase is properly configured)
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Error getting user:', error)
          // Fall back to demo mode on error
          const mockUserId = '00000000-0000-0000-0000-000000000001'
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
          setUser(mockUser)
        } else {
          setUser(user)
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
        // Fall back to demo mode on error
        const mockUserId = '00000000-0000-0000-0000-000000000001'
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
        setUser(mockUser)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Listen for auth changes (only if Supabase is configured)
    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null)
        setLoading(false)
      })

      return () => subscription.unsubscribe()
    } catch (error) {
      console.warn('Could not set up auth listener:', error)
    }
  }, [supabase.auth])

  const signInAnonymously = async () => {
    setLoading(true)
    try {
      // Check if we're in demo mode (any environment that should use demo auth)
      const isDemoMode = window.location.hostname === 'localhost' || 
                        window.location.hostname.includes('vercel.app') ||
                        window.location.hostname.includes('t3-crusher')
      
      if (isDemoMode) {
        // Create a mock user object with valid UUID for demo mode
        const mockUserId = '00000000-0000-0000-0000-000000000001'
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
        
        setUser(mockUser)
        console.log('🔐 [AuthWrapper] Demo mode authentication completed for:', window.location.hostname)
        return
      }
      
      // Production auth flow (only if not in demo mode and Supabase is properly configured)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      
      // If Supabase isn't configured for production, fall back to demo mode
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project') || supabaseKey.includes('your-anon-key')) {
        console.warn('🔐 [AuthWrapper] Supabase not configured, falling back to demo mode')
        const mockUserId = '00000000-0000-0000-0000-000000000001'
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
        
        setUser(mockUser)
        return
      }
      
      // Real production authentication (only if Supabase is properly configured)
      const demoEmail = 'demo@t3crusher.app'
      const demoPassword = 'demo123456'
      
      let { data, error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword
      })
      
      if (error && error.message?.includes('Invalid login credentials')) {
        const signUpResult = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPassword,
          options: {
            data: { username: 'Demo User' }
          }
        })
        
        if (signUpResult.error) {
          console.error('Error creating demo account:', signUpResult.error)
          // Fall back to demo mode if real auth fails
          const mockUserId = '00000000-0000-0000-0000-000000000001'
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
          setUser(mockUser)
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
        // Fall back to demo mode if real auth fails
        const mockUserId = '00000000-0000-0000-0000-000000000001'
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
        setUser(mockUser)
        return
      }
      
      if (data.user) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: data.user.user_metadata?.username || 'Demo User'
          })
        } catch (profileError) {
          console.warn('Could not create profile, continuing with auth:', profileError)
        }
      }
    } catch (error) {
      console.error('Error during authentication:', error)
      // Always fall back to demo mode on any error
      const mockUserId = '00000000-0000-0000-0000-000000000001'
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
      setUser(mockUser)
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
            
            {/* Demo mode notice */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Demo Mode:</strong> Using mock authentication for demo purposes. 
                All features work normally without requiring a real account.
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Environment: {window.location.hostname}
              </p>
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