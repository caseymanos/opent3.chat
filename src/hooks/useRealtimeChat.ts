'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/supabase'

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

export function useRealtimeChat(conversationId: string) {
  const supabase = createClientComponentClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)

  // Load initial messages and conversation
  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setConversation(null)
      setIsLoading(false)
      return
    }

    const loadInitialData = async () => {
      setIsLoading(true)
      try {
        // Load conversation
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single()

        if (conversationError) {
          console.error('Error loading conversation:', conversationError)
          return
        }

        setConversation(conversationData)

        // Load messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (messagesError) {
          console.error('Error loading messages:', messagesError)
          return
        }

        setMessages(messagesData || [])
      } catch (error) {
        console.error('Error loading initial data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialData()
  }, [conversationId, supabase])

  // Set up real-time subscriptions - simplified to avoid multiple subscription errors
  useEffect(() => {
    if (!conversationId) return

    let messagesChannel: any = null

    try {
      // Only subscribe to messages, disable typing for now to reduce complexity
      const timestamp = Date.now()
      const channelName = `conv_${conversationId}_${timestamp}`
      
      messagesChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: { new: Message }) => {
            const newMessage = payload.new as Message
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(msg => msg.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }
        )
        .subscribe()
      
    } catch (error) {
      // Silently handle subscription errors to avoid console spam
      console.warn('Subscription setup failed, continuing without real-time updates')
    }

    return () => {
      try {
        if (messagesChannel) {
          supabase.removeChannel(messagesChannel)
        }
      } catch (error) {
        // Silent cleanup
      }
    }
  }, [conversationId, supabase])

  const sendMessage = useCallback(async (content: string, role: 'user' | 'assistant' = 'user') => {
    if (!conversationId) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: { text: content },
          role
        })

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [conversationId, supabase])

  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!conversationId) return

    try {
      // Handle mock authentication in development
      let userId = '00000000-0000-0000-0000-000000000001'
      
      // Try to get real user, but continue with demo if not found
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        userId = user.id
      }

      const { error } = await supabase
        .from('chat_sessions')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          typing_indicator: isTyping,
          last_seen: new Date().toISOString()
        })

      if (error) {
        console.error('Error updating typing status:', error)
      }
    } catch (error) {
      console.error('Error updating typing status:', error)
    }
  }, [conversationId, supabase])

  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      // Delete chat sessions first
      const { error: sessionsError } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('conversation_id', conversationId)

      if (sessionsError) {
        console.error('Error deleting chat sessions:', sessionsError)
        // Don't throw - continue with cleanup
      }

      // Delete messages (due to foreign key constraint)
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)

      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        throw messagesError
      }

      // Delete the conversation
      const { error: conversationError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (conversationError) {
        console.error('Error deleting conversation:', conversationError)
        throw conversationError
      }

      return true
    } catch (error) {
      console.error('Error in deleteConversation:', error)
      throw error
    }
  }, [supabase])

  const clearAllConversations = useCallback(async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || '00000000-0000-0000-0000-000000000001'

      // Get all user conversations
      const { data: conversations, error: fetchError } = await supabase
        .from('conversations')
        .select('id')
        .eq('user_id', userId)

      if (fetchError) {
        console.error('Error fetching conversations:', fetchError)
        throw fetchError
      }

      if (!conversations || conversations.length === 0) {
        return { deleted: 0 }
      }

      const conversationIds = conversations.map((c: any) => c.id)
      console.log(`🗑️ [clearAllConversations] Deleting ${conversationIds.length} conversations`)

      // Process in batches to avoid URL length limits
      const BATCH_SIZE = 50 // Safe batch size for Supabase
      const batches = []
      for (let i = 0; i < conversationIds.length; i += BATCH_SIZE) {
        batches.push(conversationIds.slice(i, i + BATCH_SIZE))
      }

      let totalDeleted = 0

      // Delete related records in batches first
      for (const batch of batches) {
        // Delete chat sessions
        const { error: sessionsError } = await supabase
          .from('chat_sessions')
          .delete()
          .in('conversation_id', batch)

        if (sessionsError) {
          console.error('Error deleting chat sessions batch:', sessionsError)
          // Don't throw - continue with cleanup
        }

        // Delete messages
        const { error: messagesError } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', batch)

        if (messagesError) {
          console.error('Error deleting messages batch:', messagesError)
          throw messagesError
        }
      }

      // Delete conversations in batches
      for (const batch of batches) {
        const { error: conversationsError } = await supabase
          .from('conversations')
          .delete()
          .in('id', batch)

        if (conversationsError) {
          console.error('Error deleting conversations batch:', conversationsError)
          throw conversationsError
        }

        totalDeleted += batch.length
      }

      console.log(`✅ [clearAllConversations] Successfully deleted ${totalDeleted} conversations`)
      return { deleted: totalDeleted }
    } catch (error) {
      console.error('Error in clearAllConversations:', error)
      throw error
    }
  }, [supabase])

  const saveFileSummary = useCallback(async (fileId: string, summary: string, metadata?: any) => {
    try {
      const { error } = await supabase
        .from('file_uploads')
        .update({
          processed_data: {
            summary,
            analysis_timestamp: new Date().toISOString(),
            metadata
          }
        })
        .eq('id', fileId)

      if (error) {
        console.error('Error saving file summary:', error)
        throw error
      }

      return true
    } catch (error) {
      console.error('Error in saveFileSummary:', error)
      throw error
    }
  }, [supabase])

  const getFileSummary = useCallback(async (fileId: string) => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .select('processed_data, filename, file_type')
        .eq('id', fileId)
        .single()

      if (error) {
        console.error('Error getting file summary:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getFileSummary:', error)
      throw error
    }
  }, [supabase])

  const createNewConversation = useCallback(async (title?: string) => {
    try {
      logger.group('createNewConversation')
      logger.info('Starting conversation creation', { title })
      
      // First try to get the current user
      const { data: { user } } = await supabase.auth.getUser()
      logger.info('Auth check result:', { userId: user?.id, email: user?.email })
      
      const userId = user?.id || '00000000-0000-0000-0000-000000000001'
      
      // Clean up old conversations automatically to prevent accumulation
      // Keep only the most recent 50 conversations per user
      try {
        const { data: oldConversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(50, 1000) // Skip first 50, get next 950
        
        if (oldConversations && oldConversations.length > 0) {
          const oldIds = oldConversations.map(c => c.id)
          console.log(`🧹 [createNewConversation] Auto-cleaning ${oldIds.length} old conversations`)
          
          // Process in small batches
          const BATCH_SIZE = 20
          for (let i = 0; i < oldIds.length; i += BATCH_SIZE) {
            const batch = oldIds.slice(i, i + BATCH_SIZE)
            
            // Delete chat sessions first
            await supabase.from('chat_sessions').delete().in('conversation_id', batch)
            // Delete messages
            await supabase.from('messages').delete().in('conversation_id', batch)
            // Delete conversations
            await supabase.from('conversations').delete().in('id', batch)
          }
        }
      } catch (cleanupError) {
        console.warn('Auto-cleanup failed (non-critical):', cleanupError)
      }
      
      if (!user) {
        logger.info('No authenticated user, using demo mode with UUID:', userId)
        
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            title: title || 'New Conversation',
            user_id: userId
          })
          .select()
          .single()

        if (error) {
          logger.error('Error creating conversation without auth:', error)
          // Create a mock conversation for development
          const mockId = `00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`
          return {
            id: mockId,
            title: title || 'New Conversation',
            user_id: userId,
            model_provider: 'openai',
            model_name: 'gpt-4',
            system_prompt: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        }

        return data
      }

      // User is authenticated, create conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: title || 'New Conversation',
          user_id: user.id
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating conversation:', error)
        throw error
      }

      console.log('Successfully created conversation:', data)
      return data
    } catch (error) {
      console.error('Error in createNewConversation:', error)
      throw error
    }
  }, [supabase])

  return {
    messages,
    conversation,
    isLoading,
    isTyping,
    sendMessage,
    updateTypingStatus,
    createNewConversation,
    deleteConversation,
    clearAllConversations,
    saveFileSummary,
    getFileSummary
  }
}