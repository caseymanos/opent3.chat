// Setup for Node.js environment tests (API routes, server-side code)
const { TextEncoder, TextDecoder } = require('util')

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

// Mock AI SDK modules for Node.js tests
jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn().mockReturnValue('mocked-openai-model'),
}))

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn().mockReturnValue('mocked-anthropic-model'),
}))

jest.mock('@ai-sdk/google', () => ({
  google: jest.fn().mockReturnValue('mocked-google-model'),
}))

jest.mock('ai', () => ({
  streamText: jest.fn(),
}))

// Silence console logs during tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}