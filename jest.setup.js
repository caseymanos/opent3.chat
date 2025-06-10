import '@testing-library/jest-dom'

// Mock Next.js Request and Response properly
jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url: url || 'http://localhost:3000',
    method: init?.method || 'GET',
    headers: new Map(Object.entries(init?.headers || {})),
    json: jest.fn().mockResolvedValue({}),
    formData: jest.fn().mockResolvedValue(new FormData()),
    text: jest.fn().mockResolvedValue(''),
  })),
  NextResponse: {
    json: jest.fn().mockImplementation((data, options = {}) => ({
      status: options.status || 200,
      json: jest.fn().mockResolvedValue(data),
      data,
      ok: (options.status || 200) < 400,
    })),
    redirect: jest.fn(),
  },
}))

// Mock Anthropic
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn().mockReturnValue({
    generateObject: jest.fn(),
  }),
}))

// Mock AI SDK
jest.mock('ai', () => ({
  generateObject: jest.fn().mockResolvedValue({
    object: {
      description: 'Test image description',
      summary: 'Test summary',
      objects: ['test object'],
      colors: ['blue', 'white'],
    },
  }),
}))

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null
  }
  disconnect() {
    return null
  }
  unobserve() {
    return null
  }
}

// Mock window.matchMedia
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

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn()

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
})

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', {
  writable: true,
  value: {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn().mockReturnValue([]),
  },
})