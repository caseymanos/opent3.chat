import { NextRequest } from 'next/server'
import { POST } from '../chat/route'

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

import { streamText, convertToCoreMessages } from 'ai'

const mockStreamText = streamText as jest.Mock
const mockConvertToCoreMessages = convertToCoreMessages as jest.Mock

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
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123',
        provider: 'openai',
        model: 'gpt-4'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-openai-model',
        messages: [{ role: 'user', content: 'Hello' }]
      })
    )
  })

  it('handles chat request with Anthropic', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123',
        provider: 'anthropic',
        model: 'claude-3-sonnet-20240229'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model'
      })
    )
  })

  it('handles chat request with Google', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123',
        provider: 'google',
        model: 'gemini-pro'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-google-model'
      })
    )
  })

  it('defaults to anthropic provider when none specified', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model'
      })
    )
  })

  it('handles requests with attachments', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Analyze this file' }],
        conversationId: 'conv-123',
        provider: 'openai',
        model: 'gpt-4',
        attachments: [
          {
            name: 'test.txt',
            contentType: 'text/plain',
            url: 'data:text/plain;base64,VGVzdCBjb250ZW50'
          }
        ]
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalled()
  })

  it('handles parent_id for conversation branching', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123',
        parentId: 'parent-message-123',
        provider: 'anthropic'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response).toBeInstanceOf(Response)
    expect(mockStreamText).toHaveBeenCalled()
  })

  it('returns 400 for invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Invalid JSON in request body')
  })

  it('returns 400 for missing messages', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        conversationId: 'conv-123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Messages are required')
  })

  it('returns 400 for missing conversationId', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }]
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Conversation ID is required')
  })

  it('handles unsupported provider gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123',
        provider: 'unsupported-provider'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    // Should default to anthropic
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mocked-anthropic-model'
      })
    )
  })

  it('includes system message in conversation', async () => {
    mockConvertToCoreMessages.mockReturnValue([
      { role: 'system', content: 'You are a helpful assistant' },
      { role: 'user', content: 'Hello' }
    ])

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ],
        conversationId: 'conv-123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [
          { role: 'system', content: 'You are a helpful assistant' },
          { role: 'user', content: 'Hello' }
        ]
      })
    )
  })

  it('handles streaming response correctly', async () => {
    const mockToDataStreamResponse = jest.fn(() => new Response('stream-data'))
    mockStreamText.mockReturnValue({
      toDataStreamResponse: mockToDataStreamResponse
    })

    const request = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        conversationId: 'conv-123'
      }),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    
    expect(mockToDataStreamResponse).toHaveBeenCalled()
    expect(response).toBeInstanceOf(Response)
  })
})