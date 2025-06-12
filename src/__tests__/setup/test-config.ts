/**
 * Test configuration and utilities
 * Centralizes test setup and common testing utilities
 */

import { TextEncoder, TextDecoder } from 'util'

// Test placeholder to avoid "must contain at least one test" error
describe('Test Configuration', () => {
  it('should load test utilities successfully', () => {
    expect(true).toBe(true)
  })
})

// Polyfills for Node.js testing environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver for components that use it
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock as any

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock as any

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
})

// Environment variables for testing
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'

// Test utilities
export const TestUtils = {
  // Create mock user data
  createMockUser: (overrides = {}) => ({
    id: '00000000-0000-0000-0000-000000000001',
    username: 'testuser',
    avatar_url: 'https://example.com/avatar.png',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Create mock conversation data
  createMockConversation: (overrides = {}) => ({
    id: crypto.randomUUID(),
    title: 'Test Conversation',
    user_id: '00000000-0000-0000-0000-000000000001',
    model_provider: 'anthropic',
    model_name: 'claude-3-5-sonnet-20241022',
    system_prompt: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Create mock message data
  createMockMessage: (overrides = {}) => ({
    id: crypto.randomUUID(),
    conversation_id: crypto.randomUUID(),
    parent_id: null,
    content: { type: 'text', text: 'Test message' },
    role: 'user' as const,
    model_metadata: null,
    attachments: null,
    created_at: '2024-01-01T00:00:00Z',
    branch_index: 0,
    ...overrides
  }),

  // Create mock GitHub repository
  createMockGitHubRepo: (overrides = {}) => ({
    id: 1,
    name: 'test-repo',
    full_name: 'user/test-repo',
    description: 'A test repository',
    html_url: 'https://github.com/user/test-repo',
    default_branch: 'main',
    language: 'TypeScript',
    stargazers_count: 42,
    forks_count: 5,
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  }),

  // Create mock GitHub issue
  createMockGitHubIssue: (overrides = {}) => ({
    id: 1,
    number: 123,
    title: 'Test issue',
    body: 'This is a test issue',
    state: 'open' as const,
    html_url: 'https://github.com/user/test-repo/issues/123',
    user: {
      login: 'testuser',
      avatar_url: 'https://github.com/testuser.png'
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    labels: [
      { name: 'bug', color: 'ff0000' }
    ],
    ...overrides
  }),

  // Create mock Linear issue
  createMockLinearIssue: (overrides = {}) => ({
    id: 'issue-1',
    identifier: 'TC-001',
    title: 'Test Linear issue',
    description: 'This is a test issue',
    priority: 2,
    state: {
      id: 'state-1',
      name: 'In Progress',
      color: '#f59e0b'
    },
    assignee: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com'
    },
    team: {
      id: 'team-1',
      name: 'T3 Crusher'
    },
    labels: [
      { id: 'label-1', name: 'feature', color: '#10b981' }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    estimate: 5,
    url: 'https://linear.app/t3-crusher/issue/TC-001',
    ...overrides
  }),

  // Create mock API response
  createMockResponse: (data: any, options = { ok: true, status: 200 }) => ({
    ...options,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'content-type': 'application/json' })
  }),

  // Wait for async operations in tests
  waitFor: (ms: number = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  // Mock Next.js router
  createMockRouter: (overrides = {}) => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    ...overrides
  }),

  // Mock Supabase client
  createMockSupabase: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: TestUtils.createMockUser() },
        error: null
      }),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: TestUtils.createMockConversation(),
        error: null
      }),
      then: jest.fn().mockResolvedValue({
        data: [TestUtils.createMockConversation()],
        error: null
      })
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(() => Promise.resolve({ status: 'SUBSCRIBED' })),
      unsubscribe: jest.fn(() => Promise.resolve({ status: 'CLOSED' }))
    }))
  }),

  // Clean up after tests
  cleanup: () => {
    jest.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  }
}

// Test performance helper
export const measurePerformance = async (fn: () => Promise<any>, name: string) => {
  const start = performance.now()
  await fn()
  const end = performance.now()
  const duration = end - start
  
  console.log(`🚀 Performance: ${name} took ${duration.toFixed(2)}ms`)
  
  // Warn if operation takes too long
  if (duration > 1000) {
    console.warn(`⚠️  Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
  }
  
  return duration
}

// Accessibility testing helper
export const checkAccessibility = (element: Element) => {
  const issues: string[] = []
  
  // Check for missing alt attributes on images
  const images = element.querySelectorAll('img')
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      issues.push(`Image ${index + 1} missing alt attribute`)
    }
  })
  
  // Check for buttons without accessible names
  const buttons = element.querySelectorAll('button')
  buttons.forEach((button, index) => {
    const hasText = button.textContent?.trim()
    const hasAriaLabel = button.getAttribute('aria-label')
    const hasAriaLabelledBy = button.getAttribute('aria-labelledby')
    
    if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
      issues.push(`Button ${index + 1} missing accessible name`)
    }
  })
  
  // Check for proper heading hierarchy
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
  let previousLevel = 0
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1))
    if (index === 0 && level !== 1) {
      issues.push(`First heading should be h1, found ${heading.tagName}`)
    }
    if (level > previousLevel + 1) {
      issues.push(`Heading level jump from h${previousLevel} to h${level}`)
    }
    previousLevel = level
  })
  
  return {
    passed: issues.length === 0,
    issues
  }
}

export default TestUtils