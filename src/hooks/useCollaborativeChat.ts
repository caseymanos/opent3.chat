'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase'

// Simplified types for demo - using existing tables
type LiveCursor = {
  id: string
  conversation_id: string
  user_id: string
  cursor_position?: any
  selection?: any
  is_typing: boolean
  typing_in_message_id?: string
  updated_at: string
  profiles?: {
    id: string
    username: string | null
    avatar_url: string | null
  }
}

type ConversationParticipant = {
  id: string
  conversation_id: string
  user_id: string
  role: string
  permissions: any
  joined_at: string
  last_active: string
  profiles?: {
    id: string
    username: string | null
    avatar_url: string | null
  }
}

type MessageAnnotation = {
  id: string
  message_id: string
  user_id: string
  annotation_type: string
  content: any
  position?: any
  color: string
  created_at: string
  updated_at: string
}

interface CursorPosition {
  position: number
  messageId?: string
}

interface TextSelection {
  start: number
  end: number
  messageId?: string
}

interface CollaborativeChatState {
  participants: ConversationParticipant[]
  liveCursors: LiveCursor[]
  annotations: MessageAnnotation[]
  currentUser: {
    id: string
    cursor?: CursorPosition
    selection?: TextSelection
    isTyping: boolean
  }
}

export function useCollaborativeChat(conversationId: string) {
  const supabase = createClientComponentClient<Database>()
  const [state, setState] = useState<CollaborativeChatState>({
    participants: [],
    liveCursors: [],
    annotations: [],
    currentUser: {
      id: '',
      isTyping: false
    }
  })
  
  const cursorUpdateTimeout = useRef<NodeJS.Timeout | null>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

  // Initialize current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setState(prev => ({
            ...prev,
            currentUser: { ...prev.currentUser, id: user.id }
          }))
        }
      } catch (error) {
        console.warn('Could not get current user for collaborative features:', error)
      }
    }
    getCurrentUser()
  }, [supabase])

  // Load initial collaborative data
  useEffect(() => {
    if (!conversationId) return

    const loadCollaborativeData = async () => {
      try {
        // For demo purposes, simulate collaborative data
        // In a real implementation, these would query the collaborative tables
        
        // Simulate some participants - add multiple for demo
        const mockParticipants: ConversationParticipant[] = [
          {
            id: '1',
            conversation_id: conversationId,
            user_id: 'demo-user-1',
            role: 'owner',
            permissions: { read: true, write: true, share: true },
            joined_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            profiles: {
              id: 'demo-user-1',
              username: 'You',
              avatar_url: null
            }
          },
          {
            id: '2',
            conversation_id: conversationId,
            user_id: 'demo-user-2',
            role: 'collaborator',
            permissions: { read: true, write: true, share: false },
            joined_at: new Date().toISOString(),
            last_active: new Date().toISOString(),
            profiles: {
              id: 'demo-user-2',
              username: 'Assistant',
              avatar_url: null
            }
          }
        ]

        setState(prev => ({
          ...prev,
          participants: mockParticipants,
          liveCursors: [],
          annotations: []
        }))
      } catch (error) {
        console.warn('Collaborative features temporarily unavailable:', error)
      }
    }

    loadCollaborativeData()
  }, [conversationId, supabase])

  // Set up real-time subscriptions (simplified for demo)
  useEffect(() => {
    if (!conversationId) return

    // For demo, simulate live cursor updates
    const simulateCollaboration = () => {
      if (Math.random() > 0.3) { // 70% chance for better visibility
        const mockCursor: LiveCursor = {
          id: `cursor-${Date.now()}`,
          conversation_id: conversationId,
          user_id: 'demo-user-2',
          is_typing: Math.random() > 0.6, // More frequent typing
          updated_at: new Date().toISOString(),
          profiles: {
            id: 'demo-user-2',
            username: 'Assistant',
            avatar_url: null
          }
        }

        setState(prev => ({
          ...prev,
          liveCursors: [mockCursor]
        }))

        // Clear after a few seconds
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            liveCursors: prev.liveCursors.filter(c => c.id !== mockCursor.id)
          }))
        }, 3000)
      }
    }

    // Simulate occasional collaborative activity
    const interval = setInterval(simulateCollaboration, 3000) // Every 3 seconds for better visibility
    
    // Trigger immediate simulation
    setTimeout(simulateCollaboration, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [conversationId, supabase])

  // Update cursor position (demo mode)
  const updateCursor = useCallback(async (position: CursorPosition) => {
    console.log('🔄 [Collaborative] Cursor updated:', position)
    setState(prev => ({
      ...prev,
      currentUser: { ...prev.currentUser, cursor: position }
    }))
  }, [])

  // Update text selection (demo mode)
  const updateSelection = useCallback(async (selection: TextSelection | null) => {
    console.log('🔄 [Collaborative] Selection updated:', selection)
    setState(prev => ({
      ...prev,
      currentUser: { ...prev.currentUser, selection: selection || undefined }
    }))
  }, [])

  // Update typing indicator (demo mode)
  const updateTyping = useCallback(async (isTyping: boolean, messageId?: string) => {
    console.log('⌨️ [Collaborative] Typing updated:', isTyping)
    
    // Clear existing typing timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current)
    }

    setState(prev => ({
      ...prev,
      currentUser: { ...prev.currentUser, isTyping }
    }))

    // Auto-clear typing indicator after 3 seconds
    if (isTyping) {
      typingTimeout.current = setTimeout(() => {
        updateTyping(false)
      }, 3000)
    }
  }, [])

  // Create annotation (demo mode)
  const createAnnotation = useCallback(async (
    messageId: string,
    type: 'highlight' | 'comment' | 'reaction' | 'bookmark',
    content: any,
    position?: TextSelection,
    color = '#ffeb3b'
  ) => {
    console.log('📝 [Collaborative] Annotation created:', { messageId, type, content })
    
    const mockAnnotation: MessageAnnotation = {
      id: `annotation-${Date.now()}`,
      message_id: messageId,
      user_id: state.currentUser.id,
      annotation_type: type,
      content,
      position,
      color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    setState(prev => ({
      ...prev,
      annotations: [...prev.annotations, mockAnnotation]
    }))

    return mockAnnotation
  }, [state.currentUser.id])

  // Invite user to conversation (demo mode)
  const inviteUser = useCallback(async (email: string, permissions = { read: true, write: true, share: false }) => {
    console.log('📨 [Collaborative] User invited:', { email, permissions })
    
    const mockInvite = {
      id: `invite-${Date.now()}`,
      conversation_id: conversationId,
      inviter_id: state.currentUser.id,
      invitee_email: email,
      token: `demo-token-${Date.now()}`,
      permissions,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      created_at: new Date().toISOString()
    }

    // Simulate adding the invited user as a participant
    const mockParticipant: ConversationParticipant = {
      id: `participant-${Date.now()}`,
      conversation_id: conversationId,
      user_id: `invited-user-${Date.now()}`,
      role: 'participant',
      permissions,
      joined_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      profiles: {
        id: `invited-user-${Date.now()}`,
        username: email.split('@')[0],
        avatar_url: null
      }
    }

    setState(prev => ({
      ...prev,
      participants: [...prev.participants, mockParticipant]
    }))

    return mockInvite
  }, [state.currentUser.id, conversationId])

  // Get other participants' cursors (excluding current user)
  const otherCursors = state.liveCursors.filter(cursor => cursor.user_id !== state.currentUser.id)

  // Get typing participants
  const typingParticipants = otherCursors.filter(cursor => cursor.is_typing)

  return {
    // State
    participants: state.participants,
    liveCursors: otherCursors,
    annotations: state.annotations,
    typingParticipants,
    isCollaborative: state.participants.length > 1,

    // Actions
    updateCursor,
    updateSelection,
    updateTyping,
    createAnnotation,
    inviteUser,

    // Current user state
    currentUser: state.currentUser
  }
}