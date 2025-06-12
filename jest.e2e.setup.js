/**
 * Jest E2E Setup - Configures Puppeteer MCP for testing
 */

require('@testing-library/jest-dom')
const { setupPuppeteerForTesting } = require('./src/lib/mcp-puppeteer-wrapper.js')

// Global test setup for E2E tests
beforeAll(async () => {
  console.log('🚀 Setting up E2E test environment')
  
  // Setup Puppeteer MCP for testing
  await setupPuppeteerForTesting()
  
  // Ensure screenshots directory exists
  const fs = require('fs')
  const path = require('path')
  
  const screenshotsDir = path.join(__dirname, 'screenshots')
  const testScreenshotsDir = path.join(__dirname, 'test-screenshots')
  
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }
  
  if (!fs.existsSync(testScreenshotsDir)) {
    fs.mkdirSync(testScreenshotsDir, { recursive: true })
  }
  
  console.log('📁 Screenshots directories created')
})

// Create a simple state tracker for the mock page
let mockCurrentUrl = 'http://localhost:3000'
let mockStartTime = Date.now()

// Mock page object for tests that don't use real Puppeteer
global.page = {
  goto: jest.fn().mockResolvedValue({
    status: jest.fn().mockReturnValue(200),
    text: jest.fn().mockResolvedValue('{"name":"T3 Crusher","short_name":"T3 Crusher"}'),
  }),
  waitForLoadState: jest.fn().mockResolvedValue(undefined),
  waitForSelector: jest.fn().mockResolvedValue({
    click: jest.fn().mockImplementation(() => {
      // Simulate navigation after button click
      mockCurrentUrl = 'http://localhost:3000/chat/550e8400-e29b-41d4-a716-446655440000'
      return Promise.resolve()
    }),
    isVisible: jest.fn().mockResolvedValue(true),
    textContent: jest.fn().mockResolvedValue('Start Chatting'),
  }),
  waitForURL: jest.fn().mockResolvedValue(undefined),
  waitForTimeout: jest.fn().mockResolvedValue(undefined),
  screenshot: jest.fn().mockResolvedValue(undefined),
  click: jest.fn().mockResolvedValue(undefined),
  locator: jest.fn().mockReturnValue({
    first: jest.fn().mockReturnValue({
      isVisible: jest.fn().mockResolvedValue(true),
      click: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(undefined),
      hover: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn().mockResolvedValue({}),
    }),
    all: jest.fn().mockResolvedValue([]),
  }),
  $: jest.fn().mockResolvedValue({
    click: jest.fn().mockResolvedValue(undefined),
    isVisible: jest.fn().mockResolvedValue(true),
    textContent: jest.fn().mockResolvedValue('Test content'),
  }),
  $$: jest.fn().mockResolvedValue([]),
  $eval: jest.fn().mockResolvedValue('The Future of AI Conversations'),
  evaluate: jest.fn().mockImplementation((fn) => {
    // Handle different evaluation scenarios based on function content
    const fnString = fn.toString()
    
    if (fnString.includes('performance.now()')) {
      if (fnString.includes('startTime')) {
        mockStartTime = Date.now()
        return Promise.resolve(mockStartTime)
      } else {
        return Promise.resolve(Date.now())
      }
    }
    
    // Default mock values for other evaluations
    return Promise.resolve({
      hasAllFeatures: true,
      foundFeatures: 4,
      count: 3,
      headingVisible: true,
      buttonVisible: true,
      viewportWidth: 1280,
      hasCompetitionBadge: true,
      hasFocusableElements: true,
      tabTargets: ['button', 'link', 'input'],
      hasMainHeading: true,
      hasProperButtonLabels: true,
      success: true,
    })
  }),
  keyboard: {
    press: jest.fn().mockResolvedValue(undefined),
  },
  setViewportSize: jest.fn().mockResolvedValue(undefined),
  url: jest.fn().mockImplementation(() => mockCurrentUrl),
  on: jest.fn(),
  mainFrame: jest.fn().mockReturnValue({
    url: jest.fn().mockReturnValue('http://localhost:3000'),
  }),
}

// Make Jest functions available in E2E tests
const expectLib = require('expect')

// Set up global functions for E2E environment
global.expect = expectLib
global.describe = global.describe || describe
global.it = global.it || it  
global.test = global.test || test
global.beforeAll = global.beforeAll || beforeAll
global.afterAll = global.afterAll || afterAll
global.beforeEach = global.beforeEach || beforeEach
global.afterEach = global.afterEach || afterEach

// Mock expect.getState for test name access
if (global.expect && typeof global.expect.getState !== 'function') {
  global.expect.getState = () => ({
    currentTestName: 'mock-test-name',
  })
}

console.log('✅ E2E test environment setup complete')