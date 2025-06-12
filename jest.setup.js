require('@testing-library/jest-dom')
const { TextEncoder, TextDecoder } = require('util')

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Add Request and Response globals for Next.js server components
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url
      this.method = init?.method || 'GET'
      this.headers = new Map()
      this.body = init?.body
      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value)
        })
      }
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.statusText = init?.statusText || 'OK'
      this.headers = new Map()
      if (init?.headers) {
        Object.entries(init.headers).forEach(([key, value]) => {
          this.headers.set(key, value)
        })
      }
    }
    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = Map
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
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
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock framer-motion completely
jest.mock('framer-motion', () => {
  const React = require('react')
  return {
    motion: {
      div: jest.fn(({ children, ...props }) => React.createElement('div', props, children)),
      button: jest.fn(({ children, ...props }) => React.createElement('button', props, children)),
      section: jest.fn(({ children, ...props }) => React.createElement('section', props, children)),
      h1: jest.fn(({ children, ...props }) => React.createElement('h1', props, children)),
      h2: jest.fn(({ children, ...props }) => React.createElement('h2', props, children)),
      p: jest.fn(({ children, ...props }) => React.createElement('p', props, children)),
      span: jest.fn(({ children, ...props }) => React.createElement('span', props, children)),
      a: jest.fn(({ children, ...props }) => React.createElement('a', props, children)),
    },
    AnimatePresence: jest.fn(({ children }) => children),
    useAnimation: () => ({
      start: jest.fn(),
      set: jest.fn(),
      stop: jest.fn(),
    }),
  }
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256)
      }
      return arr
    }
  }
})

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
  value: jest.fn(),
  writable: true
})

// Mock URL.createObjectURL for file handling
global.URL.createObjectURL = jest.fn(() => 'mock-url')
global.URL.revokeObjectURL = jest.fn()

// Mock File API methods
File.prototype.text = jest.fn().mockImplementation(function() {
  return Promise.resolve('Mock file content')
})

File.prototype.arrayBuffer = jest.fn().mockImplementation(function() {
  return Promise.resolve(new ArrayBuffer(8))
})

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(function(file) {
    this.result = 'data:text/plain;base64,bW9jayBmaWxlIGNvbnRlbnQ='
    setTimeout(() => this.onload?.({ target: this }), 0)
  }),
  readAsText: jest.fn(function(file) {
    this.result = 'Mock file content'
    setTimeout(() => this.onload?.({ target: this }), 0)
  }),
  result: null,
  onload: null,
  onerror: null,
}))

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'