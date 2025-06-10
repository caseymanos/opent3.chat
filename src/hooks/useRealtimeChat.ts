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
      // Delete messages first (due to foreign key constraint)
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

      // Delete all messages for these conversations
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds)

      if (messagesError) {
        console.error('Error deleting messages:', messagesError)
        throw messagesError
      }

      // Delete all conversations
      const { error: conversationsError } = await supabase
        .from('conversations')
        .delete()
        .in('id', conversationIds)

      if (conversationsError) {
        console.error('Error deleting conversations:', conversationsError)
        throw conversationsError
      }

      return { deleted: conversations.length }
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
      
      if (!user) {
        // If no user, try using the demo user id with valid UUID
        const demoUserId = '00000000-0000-0000-0000-000000000001'
        logger.info('No authenticated user, using demo mode with UUID:', demoUserId)
        
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            title: title || 'New Conversation',
            user_id: demoUserId
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
            user_id: demoUserId,
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