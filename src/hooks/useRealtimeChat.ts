'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'
import { LocalStorageFallback } from '@/lib/local-storage-fallback'
import type { Database } from '@/lib/supabase'

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = Database['public']['Tables']['conversations']['Row']

export function useRealtimeChat(conversationId: string) {
  const supabase = createClientComponentClient()
  const { getSessionId } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [useLocalFallback, setUseLocalFallback] = useState(false)
  
  // Disable real-time in production until RLS is fixed
  const isProduction = typeof window !== 'undefined' && 
    (window.location.hostname.includes('vercel.app') || 
     window.location.hostname.includes('t3-crusher') ||
     window.location.hostname !== 'localhost')
  const ENABLE_REALTIME = !isProduction

  // Helper function to validate UUID format
  const isValidUUID = (uuid: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }

  // Load initial messages and conversation
  useEffect(() => {
    // Immediately clear messages when conversation changes to prevent showing old messages
    setMessages([])
    setConversation(null)
    
    if (!conversationId || conversationId === '' || conversationId === 'default') {
      setIsLoading(false)
      return
    }

    // Check if conversationId is a valid UUID
    if (!isValidUUID(conversationId)) {
      console.error('Invalid conversation ID format:', conversationId)
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
  }, [conversationId, supabase, getSessionId])

  // Store active channel reference
  const [activeChannel, setActiveChannel] = useState<any>(null)

  // Enable real-time subscriptions for enhanced collaboration
  useEffect(() => {
    // Skip real-time in production
    if (!ENABLE_REALTIME) {
      console.log('🔌 [useRealtimeChat] Real-time disabled in production')
      return
    }
    
    // Only set up subscriptions for valid UUIDs, not empty strings or 'default'
    if (!conversationId || conversationId === '' || conversationId === 'default' || !isValidUUID(conversationId)) {
      console.log('🔌 [useRealtimeChat] Skipping subscription setup for invalid conversation ID:', conversationId)
      return
    }

    // Don't create new subscription if conversation hasn't loaded yet
    if (!conversation) {
      console.log('🔌 [useRealtimeChat] Waiting for conversation to load before subscribing')
      return
    }

    console.log('🔌 [useRealtimeChat] Setting up real-time subscription for conversation:', conversationId)
    
    // Clean up any existing active channel first
    if (activeChannel) {
      console.log('🔌 [useRealtimeChat] Cleaning up previous active channel')
      try {
        activeChannel.unsubscribe()
        supabase.removeChannel(activeChannel)
      } catch (error) {
        console.warn('⚠️ [useRealtimeChat] Error cleaning up previous channel:', error)
      }
    }
    
    // Create a unique channel name without timestamp to allow proper cleanup
    const channelName = `conversation:${conversationId}`
    
    // Remove any existing channels for this conversation
    const existingChannels = supabase.getChannels()
    existingChannels.forEach((ch: any) => {
      if (ch.topic === channelName) {
        console.log('🔌 [useRealtimeChat] Found existing channel, removing:', ch.topic)
        try {
          supabase.removeChannel(ch)
        } catch (error) {
          console.warn('⚠️ [useRealtimeChat] Error removing existing channel:', error)
        }
      }
    })
    
    // Small delay to ensure cleanup completes
    const setupTimeout = setTimeout(() => {
      // Set up real-time subscription for new messages
      const channel = supabase
        .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          console.log('📨 [useRealtimeChat] New message received:', payload.new)
          setMessages(currentMessages => {
            // Check if message already exists to prevent duplicates
            const exists = currentMessages.some(msg => msg.id === payload.new.id)
            if (exists) return currentMessages
            
            // Add new message in correct chronological order
            const newMessage = payload.new as Message
            const updatedMessages = [...currentMessages, newMessage].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
            return updatedMessages
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          console.log('✏️ [useRealtimeChat] Message updated:', payload.new)
          setMessages(currentMessages => 
            currentMessages.map(msg => 
              msg.id === payload.new.id ? payload.new as Message : msg
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload: any) => {
          console.log('🗑️ [useRealtimeChat] Message deleted:', payload.old)
          setMessages(currentMessages => 
            currentMessages.filter(msg => msg.id !== payload.old.id)
          )
        }
      )
      .subscribe((status: any) => {
        console.log('🔌 [useRealtimeChat] Subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ [useRealtimeChat] Successfully subscribed to real-time updates')
          setActiveChannel(channel)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [useRealtimeChat] Real-time subscription error, falling back to polling')
          // Fallback to polling if real-time fails
          setupPollingFallback()
        }
      })

      // Store channel reference
      setActiveChannel(channel)
    }, 100) // Small delay to ensure cleanup

    // Polling fallback function
    const setupPollingFallback = () => {
      const interval = setInterval(async () => {
        if (document.visibilityState === 'visible') {
          try {
            const { data: newMessages, error } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversationId)
              .order('created_at', { ascending: true })

            if (!error && newMessages) {
              setMessages(newMessages)
            }
          } catch (error) {
            console.warn('⚠️ [useRealtimeChat] Polling failed:', error)
          }
        }
      }, 5000) // Poll every 5 seconds as fallback

      return interval
    }

    // Cleanup function
    return () => {
      clearTimeout(setupTimeout)
      if (activeChannel) {
        console.log('🔌 [useRealtimeChat] Cleaning up subscription for:', conversationId)
        try {
          activeChannel.unsubscribe()
          supabase.removeChannel(activeChannel)
          setActiveChannel(null)
          console.log('🔌 [useRealtimeChat] Channel cleanup completed')
        } catch (error) {
          console.warn('⚠️ [useRealtimeChat] Error cleaning up channel:', error)
        }
      }
    }
  }, [conversationId, conversation, supabase, activeChannel])

  const sendMessage = useCallback(async (
    content: string, 
    role: 'user' | 'assistant' = 'user',
    parentId?: string,
    branchIndex?: number
  ) => {
    if (!conversationId) return

    try {
      // Calculate branch index if not provided
      let finalBranchIndex = branchIndex
      if (parentId && finalBranchIndex === undefined) {
        // Find existing siblings to determine next branch index
        const { data: siblings } = await supabase
          .from('messages')
          .select('branch_index')
          .eq('conversation_id', conversationId)
          .eq('parent_id', parentId)
        
        finalBranchIndex = siblings ? Math.max(...siblings.map((s: any) => s.branch_index || 0), -1) + 1 : 0
      }

      const messageData: any = {
        conversation_id: conversationId,
        content: { text: content },
        role
      }

      // Add branching info if this is a branch message
      if (parentId) {
        messageData.parent_id = parentId
        messageData.branch_index = finalBranchIndex || 0
      }

      const { error } = await supabase
        .from('messages')
        .insert(messageData)

      if (error) {
        console.error('Error sending message:', error)
        throw error
      }

      console.log('✅ Message sent with branching info:', { parentId, branchIndex: finalBranchIndex })
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }, [conversationId, supabase, getSessionId])

  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!conversationId) return

    try {
      const userId = getSessionId()

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
  }, [conversationId, supabase, getSessionId])

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
  }, [supabase, getSessionId])

  const clearAllConversations = useCallback(async () => {
    try {
      const userId = getSessionId()

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

      // Process in smaller batches to reduce errors and avoid URL length limits
      const BATCH_SIZE = 10 // Smaller batch size for better reliability
      const batches = []
      for (let i = 0; i < conversationIds.length; i += BATCH_SIZE) {
        batches.push(conversationIds.slice(i, i + BATCH_SIZE))
      }

      let totalDeleted = 0
      const errors = []

      // Delete related records in batches first
      for (const batch of batches) {
        try {
          // Delete chat sessions
          const { error: sessionsError } = await supabase
            .from('chat_sessions')
            .delete()
            .in('conversation_id', batch)

          if (sessionsError) {
            console.error('Error deleting chat sessions batch:', sessionsError)
            errors.push(`Sessions: ${sessionsError.message}`)
            // Don't throw - continue with cleanup
          }

          // Delete messages
          const { error: messagesError } = await supabase
            .from('messages')
            .delete()
            .in('conversation_id', batch)

          if (messagesError) {
            console.error('Error deleting messages batch:', messagesError)
            errors.push(`Messages: ${messagesError.message}`)
            // Continue instead of throwing to try to clean up what we can
          }
        } catch (batchError) {
          console.error('Batch deletion error:', batchError)
          errors.push(`Batch: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`)
        }
      }

      // Delete conversations in batches
      for (const batch of batches) {
        try {
          const { error: conversationsError } = await supabase
            .from('conversations')
            .delete()
            .in('id', batch)

          if (conversationsError) {
            console.error('Error deleting conversations batch:', conversationsError)
            errors.push(`Conversations: ${conversationsError.message}`)
          } else {
            totalDeleted += batch.length
          }
        } catch (batchError) {
          console.error('Conversation batch deletion error:', batchError)
          errors.push(`ConvoBatch: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`)
        }
      }

      console.log(`✅ [clearAllConversations] Completed deletion: ${totalDeleted} conversations deleted`)
      
      if (errors.length > 0) {
        console.warn(`⚠️ [clearAllConversations] Some errors occurred:`, errors)
        // Still return success if we deleted most conversations
        if (totalDeleted > 0) {
          return { deleted: totalDeleted, errors }
        } else {
          throw new Error(`Clear all failed: ${errors.join(', ')}`)
        }
      }
      
      return { deleted: totalDeleted }
    } catch (error) {
      console.error('Error in clearAllConversations:', error)
      throw error
    }
  }, [supabase, getSessionId])

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
  }, [supabase, getSessionId])

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
  }, [supabase, getSessionId])

  const createNewConversation = useCallback(async (title?: string, modelProvider?: string, modelName?: string) => {
    try {
      logger.group('createNewConversation')
      logger.info('Starting conversation creation', { title })
      
      const userId = getSessionId()
      logger.info('Using user ID:', userId)
      
      // Check if a conversation with the same title was just created (within last 5 seconds)
      // to prevent duplicates from double-clicks or race conditions
      const recentThreshold = new Date(Date.now() - 5000).toISOString()
      const { data: recentConversations } = await supabase
        .from('conversations')
        .select('id, title, created_at')
        .eq('user_id', userId)
        .eq('title', title || 'New Chat')
        .gte('created_at', recentThreshold)
        .limit(1)
      
      if (recentConversations && recentConversations.length > 0) {
        console.log('🔄 [createNewConversation] Found recent duplicate, using existing:', recentConversations[0])
        return recentConversations[0]
      }
      
      // Clean up old conversations automatically to prevent accumulation
      // Keep only the most recent 100 conversations per user
      try {
        const { data: oldConversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .range(100, 1000) // Skip first 100, get next 900
        
        if (oldConversations && oldConversations.length > 0) {
          const oldIds = oldConversations.map((c: any) => c.id)
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
      
      // Create conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: title || 'New Conversation',
          user_id: userId,
          model_provider: modelProvider || 'anthropic',
          model_name: modelName || 'claude-3-haiku-20240307'
        })
        .select()
        .single()

      if (error) {
        logger.error('Error creating conversation:', error)
        // Always return a mock conversation on any error
        const timestamp = Date.now().toString(16).padStart(12, '0').slice(-12)
        const mockId = `00000000-0000-4000-8000-${timestamp}`
        const mockConversation = {
          id: mockId,
          title: title || 'New Conversation',
          user_id: userId,
          model_provider: modelProvider || 'anthropic',
          model_name: modelName || 'claude-3-haiku-20240307',
          system_prompt: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        
        // Store in localStorage as backup
        try {
          const stored = localStorage.getItem('t3-crusher-conversations') || '[]'
          const conversations = JSON.parse(stored)
          conversations.push(mockConversation)
          localStorage.setItem('t3-crusher-conversations', JSON.stringify(conversations))
        } catch (e) {
          console.warn('Could not store conversation locally:', e)
        }
        
        return mockConversation
      }

      logger.info('Successfully created conversation:', data)
      return data
    } catch (error) {
      console.error('Error in createNewConversation:', error)
      throw error
    }
  }, [supabase, getSessionId])

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