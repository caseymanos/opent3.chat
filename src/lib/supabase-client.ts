import { createClient } from '@supabase/supabase-js'
import type { Database } from './supabase'

// Production-ready Supabase client with proper error handling
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create a custom client that bypasses RLS for demo users
export function createDemoClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing')
  }

  const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 't3-crusher/1.0.0',
      },
    },
  })

  return client
}

// Enhanced client wrapper that handles demo mode
export function createEnhancedClient() {
  const baseClient = createDemoClient()
  
  // Add session-based user ID to all requests
  const getSessionUserId = () => {
    let userId = sessionStorage.getItem('t3-crusher-session-id')
    if (!userId) {
      userId = crypto.randomUUID()
      sessionStorage.setItem('t3-crusher-session-id', userId)
    }
    return userId
  }

  // Wrapper for database operations that adds user context
  const enhancedFrom = (table: string) => {
    const userId = getSessionUserId()
    const baseFrom = baseClient.from(table)
    
    // Override methods to add user context
    return {
      ...baseFrom,
      select: (columns?: string) => {
        const query = baseFrom.select(columns || '*')
        // Add user filter for user-scoped tables
        if (['conversations', 'profiles', 'file_uploads', 'chat_sessions'].includes(table)) {
          return query.eq('user_id', userId)
        }
        return query
      },
      insert: (values: any) => {
        // Add user_id to inserts
        if (Array.isArray(values)) {
          values = values.map(v => ({ ...v, user_id: userId }))
        } else {
          values = { ...values, user_id: userId }
        }
        return baseFrom.insert(values)
      },
      update: (values: any) => {
        const query = baseFrom.update(values)
        // Add user filter for updates
        if (['conversations', 'profiles', 'file_uploads', 'chat_sessions'].includes(table)) {
          return query.eq('user_id', userId)
        }
        return query
      },
      delete: () => {
        const query = baseFrom.delete()
        // Add user filter for deletes
        if (['conversations', 'profiles', 'file_uploads', 'chat_sessions'].includes(table)) {
          return query.eq('user_id', userId)
        }
        return query
      },
      upsert: (values: any) => {
        // Add user_id to upserts
        if (Array.isArray(values)) {
          values = values.map(v => ({ ...v, user_id: userId }))
        } else {
          values = { ...values, user_id: userId }
        }
        return baseFrom.upsert(values)
      }
    }
  }

  return {
    ...baseClient,
    from: enhancedFrom,
    auth: {
      ...baseClient.auth,
      getUser: async () => {
        const userId = getSessionUserId()
        return {
          data: {
            user: {
              id: userId,
              email: `session-${userId.slice(0, 8)}@t3crusher.app`,
              aud: 'authenticated',
              role: 'authenticated',
              app_metadata: {},
              user_metadata: { username: 'Session User' },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as any
          },
          error: null
        }
      }
    }
  }
}