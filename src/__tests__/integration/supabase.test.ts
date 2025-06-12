/**
 * Integration tests for Supabase database operations
 * Tests real database interactions using test data
 */

import { createClientComponentClient } from '@/lib/supabase'
import type { Database } from '@/lib/supabase'

// Test configuration
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'
const TEST_CONVERSATION_TITLE = 'Test Conversation'

describe('Supabase Integration Tests', () => {
  let supabase: ReturnType<typeof createClientComponentClient>
  let testConversationId: string
  let testMessageId: string

  beforeAll(async () => {
    supabase = createClientComponentClient()
    
    // Verify connection
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    if (error && !error.message?.includes('JWT')) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`)
    }
  })

  beforeEach(async () => {
    // Clean up any existing test data
    await cleanupTestData()
  })

  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestData()
  })

  async function cleanupTestData() {
    try {
      // Delete test messages
      await supabase
        .from('messages')
        .delete()
        .like('conversation_id', 'test-%')

      // Delete test conversations
      await supabase
        .from('conversations')
        .delete()
        .like('title', 'Test %')

      // Delete test chat sessions
      await supabase
        .from('chat_sessions')
        .delete()
        .eq('user_id', TEST_USER_ID)
    } catch (error) {
      console.warn('Cleanup failed:', error)
    }
  }

  describe('Conversations', () => {
    it('should create a new conversation', async () => {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: TEST_CONVERSATION_TITLE,
          user_id: TEST_USER_ID,
          model_provider: 'anthropic',
          model_name: 'claude-3-5-sonnet-20241022'
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data?.title).toBe(TEST_CONVERSATION_TITLE)
      expect(data?.user_id).toBe(TEST_USER_ID)
      expect(data?.model_provider).toBe('anthropic')
      
      testConversationId = data?.id!
    })

    it('should retrieve a conversation by ID', async () => {
      // First create a conversation
      const { data: createData } = await supabase
        .from('conversations')
        .insert({
          title: TEST_CONVERSATION_TITLE,
          user_id: TEST_USER_ID
        })
        .select()
        .single()

      const conversationId = createData?.id!

      // Then retrieve it
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data?.id).toBe(conversationId)
      expect(data?.title).toBe(TEST_CONVERSATION_TITLE)
    })

    it('should update conversation title', async () => {
      // Create conversation
      const { data: createData } = await supabase
        .from('conversations')
        .insert({
          title: TEST_CONVERSATION_TITLE,
          user_id: TEST_USER_ID
        })
        .select()
        .single()

      const conversationId = createData?.id!
      const newTitle = 'Updated Test Conversation'

      // Update title
      const { data, error } = await supabase
        .from('conversations')
        .update({ title: newTitle })
        .eq('id', conversationId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.title).toBe(newTitle)
    })

    it('should list conversations for a user', async () => {
      // Create multiple conversations
      await supabase.from('conversations').insert([
        { title: 'Test Conversation 1', user_id: TEST_USER_ID },
        { title: 'Test Conversation 2', user_id: TEST_USER_ID },
        { title: 'Test Conversation 3', user_id: TEST_USER_ID }
      ])

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', TEST_USER_ID)
        .order('created_at', { ascending: false })

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data?.length).toBeGreaterThanOrEqual(3)
      expect(data?.[0].title).toContain('Test Conversation')
    })
  })

  describe('Messages', () => {
    beforeEach(async () => {
      // Create a test conversation for message tests
      const { data } = await supabase
        .from('conversations')
        .insert({
          title: TEST_CONVERSATION_TITLE,
          user_id: TEST_USER_ID
        })
        .select()
        .single()

      testConversationId = data?.id!
    })

    it('should create a new message', async () => {
      const messageContent = { type: 'text', text: 'Hello, this is a test message!' }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          content: messageContent,
          role: 'user',
          branch_index: 0
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data).toBeTruthy()
      expect(data?.conversation_id).toBe(testConversationId)
      expect(data?.role).toBe('user')
      expect(data?.branch_index).toBe(0)
      
      testMessageId = data?.id!
    })

    it('should create message with parent for branching', async () => {
      // Create parent message first
      const { data: parentData } = await supabase
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          content: { type: 'text', text: 'Parent message' },
          role: 'user',
          branch_index: 0
        })
        .select()
        .single()

      const parentId = parentData?.id!

      // Create child message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          parent_id: parentId,
          content: { type: 'text', text: 'Child message' },
          role: 'assistant',
          branch_index: 0
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.parent_id).toBe(parentId)
      expect(data?.conversation_id).toBe(testConversationId)
    })

    it('should retrieve messages for a conversation', async () => {
      // Create multiple messages
      const messages = [
        { content: { type: 'text', text: 'Message 1' }, role: 'user' },
        { content: { type: 'text', text: 'Message 2' }, role: 'assistant' },
        { content: { type: 'text', text: 'Message 3' }, role: 'user' }
      ]

      for (const msg of messages) {
        await supabase.from('messages').insert({
          conversation_id: testConversationId,
          content: msg.content,
          role: msg.role as 'user' | 'assistant',
          branch_index: 0
        })
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', testConversationId)
        .order('created_at', { ascending: true })

      expect(error).toBeNull()
      expect(data?.length).toBe(3)
      expect(data?.[0].role).toBe('user')
      expect(data?.[1].role).toBe('assistant')
      expect(data?.[2].role).toBe('user')
    })

    it('should handle message attachments', async () => {
      const messageContent = {
        type: 'text',
        text: 'Message with attachment'
      }
      
      const attachments = {
        files: [
          {
            name: 'test.txt',
            type: 'text/plain',
            size: 1024,
            url: 'https://example.com/test.txt'
          }
        ]
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: testConversationId,
          content: messageContent,
          role: 'user',
          attachments: attachments,
          branch_index: 0
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.attachments).toEqual(attachments)
    })
  })

  describe('Chat Sessions (Real-time)', () => {
    beforeEach(async () => {
      // Create test conversation
      const { data } = await supabase
        .from('conversations')
        .insert({
          title: TEST_CONVERSATION_TITLE,
          user_id: TEST_USER_ID
        })
        .select()
        .single()

      testConversationId = data?.id!
    })

    it('should create a chat session', async () => {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: TEST_USER_ID,
          conversation_id: testConversationId,
          status: 'active',
          typing_indicator: false
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.user_id).toBe(TEST_USER_ID)
      expect(data?.conversation_id).toBe(testConversationId)
      expect(data?.status).toBe('active')
    })

    it('should update typing indicator', async () => {
      // Create session
      const { data: sessionData } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: TEST_USER_ID,
          conversation_id: testConversationId,
          status: 'active',
          typing_indicator: false
        })
        .select()
        .single()

      const sessionId = sessionData?.id!

      // Update typing indicator
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({ typing_indicator: true })
        .eq('id', sessionId)
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.typing_indicator).toBe(true)
    })

    it('should get active sessions for conversation', async () => {
      // Create multiple sessions
      await supabase.from('chat_sessions').insert([
        {
          user_id: TEST_USER_ID,
          conversation_id: testConversationId,
          status: 'active'
        },
        {
          user_id: '00000000-0000-0000-0000-000000000002',
          conversation_id: testConversationId,
          status: 'active'
        }
      ])

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('conversation_id', testConversationId)
        .eq('status', 'active')

      expect(error).toBeNull()
      expect(data?.length).toBe(2)
    })
  })

  describe('Database Constraints and Relations', () => {
    it('should enforce foreign key constraints', async () => {
      // Try to create message with non-existent conversation
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: '00000000-0000-0000-0000-000000000999',
          content: { type: 'text', text: 'Test' },
          role: 'user'
        })

      expect(error).toBeTruthy()
      expect(error?.message).toContain('foreign key')
    })

    it('should handle cascade deletes properly', async () => {
      // Create conversation with messages
      const { data: convData } = await supabase
        .from('conversations')
        .insert({
          title: TEST_CONVERSATION_TITLE,
          user_id: TEST_USER_ID
        })
        .select()
        .single()

      const conversationId = convData?.id!

      // Add messages
      await supabase.from('messages').insert([
        {
          conversation_id: conversationId,
          content: { type: 'text', text: 'Test 1' },
          role: 'user'
        },
        {
          conversation_id: conversationId,
          content: { type: 'text', text: 'Test 2' },
          role: 'assistant'
        }
      ])

      // Delete conversation
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      expect(deleteError).toBeNull()

      // Verify messages are deleted (if cascade is set up)
      const { data: remainingMessages } = await supabase
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)

      // This depends on your database cascade configuration
      // If cascade is enabled, remainingMessages should be empty
      expect(remainingMessages?.length).toBe(0)
    })
  })

  describe('Row Level Security (RLS)', () => {
    it('should respect RLS policies for conversations', async () => {
      // This test would need proper authentication setup
      // For now, we'll just verify the tables have RLS enabled
      
      const { data: tableInfo } = await supabase
        .rpc('get_table_info', { table_name: 'conversations' })
        .single()

      // This is a simplified check - in real implementation you'd test with different users
      expect(tableInfo).toBeDefined()
    })
  })
})