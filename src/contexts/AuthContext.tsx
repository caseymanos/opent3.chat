'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAnonymous: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  getSessionId: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAnonymous, setIsAnonymous] = useState(true)
  const supabase = createClientComponentClient()

  // Get or create consistent session ID
  const getSessionId = () => {
    if (user?.id) return user.id
    
    let sessionId = sessionStorage.getItem('t3-crusher-session-id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem('t3-crusher-session-id', sessionId)
    }
    return sessionId
  }

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session) {
          setSession(session)
          setUser(session.user)
          setIsAnonymous(false)
        } else {
          // Create anonymous user
          const sessionId = getSessionId()
          const mockUser: User = {
            id: sessionId,
            email: `user-${sessionId.slice(0, 8)}@t3crusher.app`,
            aud: 'anon',
            role: 'anon',
            app_metadata: {},
            user_metadata: { username: `User ${sessionId.slice(0, 8)}` },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          } as User
          
          setUser(mockUser)
          setIsAnonymous(true)
        }
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      if (session) {
        setSession(session)
        setUser(session.user)
        setIsAnonymous(false)
        
        // Migrate anonymous data to authenticated user
        migrateAnonymousData(session.user.id)
      } else {
        setSession(null)
        setUser(null)
        setIsAnonymous(true)
        // Recreate anonymous user
        checkSession()
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const migrateAnonymousData = async (newUserId: string) => {
    try {
      const oldSessionId = sessionStorage.getItem('t3-crusher-session-id')
      if (!oldSessionId || oldSessionId === newUserId) return

      // Update conversations from anonymous to authenticated user
      const { error } = await supabase
        .from('conversations')
        .update({ user_id: newUserId })
        .eq('user_id', oldSessionId)

      if (error) {
        console.error('Error migrating conversations:', error)
      } else {
        console.log('Successfully migrated anonymous conversations to authenticated user')
        // Clear old session ID
        sessionStorage.removeItem('t3-crusher-session-id')
      }
    } catch (error) {
      console.error('Error during data migration:', error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with Google:', error)
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error signing in with email:', error)
      throw error
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      })
      
      if (error) throw error
    } catch (error) {
      console.error('Error signing up:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAnonymous,
      signInWithGoogle,
      signInWithEmail,
      signUp,
      signOut,
      getSessionId
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}