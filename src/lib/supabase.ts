import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient as createServerClientSSR } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Log warnings in development if env vars are missing
if (typeof window !== 'undefined') {
  if (!supabaseUrl || supabaseUrl === 'undefined') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  }
  
  if (!supabaseAnonKey || supabaseAnonKey === 'undefined') {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  }
}

// Validate Supabase configuration
if (supabaseUrl && !supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.in')) {
  console.warn('⚠️  Supabase URL may be invalid:', supabaseUrl)
}

if (!supabaseAnonKey || supabaseAnonKey === 'placeholder-key' || supabaseAnonKey === 'undefined') {
  console.error('❌ Invalid Supabase anon key')
}

// Client-side Supabase client
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)

// Server-side Supabase client for Server Components
export const createServerClient = async () => {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClientSSR(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
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
    clientComponentClient = createBrowserClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-key'
    )
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