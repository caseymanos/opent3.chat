import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient as createServerClientSSR } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nhadlfbxbivlhtkbolve.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYWRsZmJ4Yml2bGh0a2JvbHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzMxMzIsImV4cCI6MjA2NTA0OTEzMn0.c3iSIX3NJv3gX8J1J4MNGKgU6ugv6VJE8ckE8mNc_F4'

// Validate Supabase configuration
if (!supabaseUrl.includes('supabase.co')) {
  console.error('❌ Invalid Supabase URL:', supabaseUrl)
}

if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key') {
  console.error('❌ Invalid Supabase anon key')
}

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client for Server Components
export const createServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClientSSR(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component
          }
        },
      },
    }
  )
}

// Client-side Supabase client for Client Components (singleton)
let clientComponentClient: ReturnType<typeof createBrowserClient> | null = null

export const createClientComponentClient = () => {
  if (!clientComponentClient) {
    clientComponentClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  return clientComponentClient
}

// Database types (to be generated with Supabase CLI)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
          premium_calls_used?: number
          special_calls_used?: number
          usage_last_reset?: string
          byok_enabled?: boolean
          api_keys?: Record<string, string>
          traits_enabled?: boolean
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          premium_calls_used?: number
          special_calls_used?: number
          usage_last_reset?: string
          byok_enabled?: boolean
          api_keys?: Record<string, string>
          traits_enabled?: boolean
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
          premium_calls_used?: number
          special_calls_used?: number
          usage_last_reset?: string
          byok_enabled?: boolean
          api_keys?: Record<string, string>
          traits_enabled?: boolean
        }
      }
      conversations: {
        Row: {
          id: string
          title: string | null
          user_id: string
          model_provider: string
          model_name: string
          system_prompt: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title?: string | null
          user_id: string
          model_provider?: string
          model_name?: string
          system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string | null
          user_id?: string
          model_provider?: string
          model_name?: string
          system_prompt?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          parent_id: string | null
          content: unknown
          role: 'user' | 'assistant' | 'system'
          model_metadata: Record<string, unknown> | null
          attachments: Record<string, unknown> | null
          created_at: string
          branch_index: number
        }
        Insert: {
          id?: string
          conversation_id: string
          parent_id?: string | null
          content: unknown
          role: 'user' | 'assistant' | 'system'
          model_metadata?: unknown | null
          attachments?: unknown | null
          created_at?: string
          branch_index?: number
        }
        Update: {
          id?: string
          conversation_id?: string
          parent_id?: string | null
          content?: unknown
          role?: 'user' | 'assistant' | 'system'
          model_metadata?: unknown | null
          attachments?: unknown | null
          created_at?: string
          branch_index?: number
        }
      }
      file_uploads: {
        Row: {
          id: string
          user_id: string
          filename: string | null
          file_path: string | null
          file_type: string | null
          file_size: number | null
          processed_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename?: string | null
          file_path?: string | null
          file_type?: string | null
          file_size?: number | null
          processed_data?: unknown | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string | null
          file_path?: string | null
          file_type?: string | null
          file_size?: number | null
          processed_data?: unknown | null
          created_at?: string
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          conversation_id: string
          status: string
          last_seen: string
          typing_indicator: boolean
        }
        Insert: {
          id?: string
          user_id: string
          conversation_id: string
          status?: string
          last_seen?: string
          typing_indicator?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          conversation_id?: string
          status?: string
          last_seen?: string
          typing_indicator?: boolean
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          occupation: string | null
          personality_traits: string[] | null
          additional_context: string | null
          model_instructions: Record<string, unknown> | null
          export_settings: Record<string, unknown> | null
          created_at: string
          updated_at: string
          traits_enabled?: boolean
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
          occupation?: string | null
          personality_traits?: string[] | null
          additional_context?: string | null
          model_instructions?: Record<string, unknown> | null
          export_settings?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
          traits_enabled?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          display_name?: string | null
          occupation?: string | null
          personality_traits?: string[] | null
          additional_context?: string | null
          model_instructions?: Record<string, unknown> | null
          export_settings?: Record<string, unknown> | null
          created_at?: string
          updated_at?: string
          traits_enabled?: boolean
        }
      }
    }
  }
}