/**
 * @jest-environment node
 */

// Mock the AI SDK
jest.mock('ai', () => ({
  streamText: jest.fn(),
  convertToCoreMessages: jest.fn(),
}))

// Mock the model providers
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn(() => 'mocked-openai-model'),
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mocked-anthropic-model'),
}))

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn(() => 'mocked-google-model'),
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  createServerClient: jest.fn(() => Promise.resolve({
    from: jest.fn(() => ({
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({
            data: { id: 'message-id-123' },
            error: null
          }))
        }))
      }))
    }))
  }))
}))

// Mock file processing
jest.mock('@/lib/file-utils', () => ({
  processAttachments: jest.fn(() => Promise.resolve([])),
}))

// Mock reasoning prompt
jest.mock('@/lib/reasoning', () => ({
  REASONING_SYSTEM_PROMPT: 'Test reasoning prompt'
}))

import { POST } from '../chat/route'
import { streamText, convertToCoreMessages } from 'ai'

const mockStreamText = streamText as jest.Mock
const mockConvertToCoreMessages = convertToCoreMessages as jest.Mock

// Helper to create a mock request
function createMockRequest(body: any, headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] || null
    },
    json: async () => body
  }
}

describe('/api/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup default mocks
    mockConvertToCoreMessages.mockReturnValue([
      { role: 'user', content: 'Hello' }
    ])
    
    mockStreamText.mockReturnValue({
      toDataStreamResponse: jest.fn(() => new Response('mock-stream'))
    })
  })

  it('handles basic chat request with OpenAI', async () => {
    const mockRequest = createMockRequest({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: 'conv-123',
      provider: 'openai',
      model: 'gpt-4'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-openai-model',
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Hello' })
        ])
      })
    )
  })

  it('handles chat request with Anthropic', async () => {
    const mockRequest = createMockRequest({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: 'conv-123',
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model'
      })
    )
  })

  it('handles chat request with Google (unsupported)', async () => {
    const mockRequest = createMockRequest({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: 'conv-123',
      provider: 'google',
      model: 'gemini-pro'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(response).toBeInstanceOf(Response)
    // Should fallback to anthropic since google is not implemented
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model'
      })
    )
  })

  it('defaults to anthropic provider when none specified', async () => {
    const mockRequest = createMockRequest({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: 'conv-123'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model'
      })
    )
  })

  it('handles RAG context', async () => {
    const mockRequest = createMockRequest({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: 'conv-123',
      provider: 'anthropic',
      ragContext: 'This is some RAG context from documents'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalled()
  })

  it('returns error for invalid JSON', async () => {
    const mockRequest = {
      headers: {
        get: (name: string) => name === 'content-type' ? 'application/json' : null
      },
      json: async () => {
        throw new SyntaxError('Unexpected token')
      }
    }

    const response = await POST(mockRequest as any)
    
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('handles form data with files', async () => {
    const mockFile = {
      name: 'test.txt',
      size: 100,
      type: 'text/plain'
    }

    const mockFormData = {
      get: (key: string) => {
        if (key === 'messages') return JSON.stringify([{ role: 'user', content: 'Hello' }])
        if (key === 'conversationId') return 'conv-123'
        if (key === 'model') return 'claude-3-haiku-20240307'
        if (key === 'provider') return 'anthropic'
        return null
      },
      entries: () => [
        ['messages', JSON.stringify([{ role: 'user', content: 'Hello' }])],
        ['conversationId', 'conv-123'],
        ['file_0', mockFile]
      ][Symbol.iterator]()
    }

    const mockRequest = {
      headers: {
        get: (name: string) => name === 'content-type' ? 'multipart/form-data' : null
      },
      formData: async () => mockFormData
    }

    const response = await POST(mockRequest as any)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalled()
  })

  it('includes system message in conversation', async () => {
    const mockMessages = [
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ]

    const mockRequest = createMockRequest({
      messages: mockMessages,
      conversationId: 'conv-123'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'user' })
        ])
      })
    )
  })

  it('handles streaming response correctly', async () => {
    const mockToDataStreamResponse = jest.fn(() => new Response('stream-data'))
    mockStreamText.mockReturnValue({
      toDataStreamResponse: mockToDataStreamResponse
    })

    const mockRequest = createMockRequest({
      messages: [{ role: 'user', content: 'Hello' }],
      conversationId: 'conv-123'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(mockToDataStreamResponse).toHaveBeenCalled()
    expect(response).toBeInstanceOf(Response)
  })

  it('processes messages correctly', async () => {
    const inputMessages = [
      { role: 'user', content: 'What is TypeScript?' }
    ]

    const mockRequest = createMockRequest({
      messages: inputMessages,
      conversationId: 'conv-123',
      model: 'claude-3-haiku-20240307'
    }, { 'content-type': 'application/json' })

    const response = await POST(mockRequest as any)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model',
        messages: expect.any(Array)
      })
    )
  })
})