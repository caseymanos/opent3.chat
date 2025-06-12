/**
 * Jest E2E Setup - Configures Puppeteer MCP for testing
 */

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

// Mock page object for tests that don't use real Puppeteer
global.page = {
  goto: jest.fn().mockResolvedValue(undefined),
  waitForLoadState: jest.fn().mockResolvedValue(undefined),
  waitForSelector: jest.fn().mockResolvedValue({}),
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
  $: jest.fn().mockResolvedValue({}),
  $$: jest.fn().mockResolvedValue([]),
  $eval: jest.fn().mockResolvedValue(''),
  evaluate: jest.fn().mockResolvedValue({}),
  keyboard: {
    press: jest.fn().mockResolvedValue(undefined),
  },
  setViewportSize: jest.fn().mockResolvedValue(undefined),
  url: jest.fn().mockReturnValue('http://localhost:3000'),
  on: jest.fn(),
  mainFrame: jest.fn().mockReturnValue({
    url: jest.fn().mockReturnValue('http://localhost:3000'),
  }),
}

// Import Jest globals for E2E environment
const expectLib = require('expect')
global.expect = expectLib

// Add Jest functions to global scope for E2E tests
global.describe = describe
global.it = it  
global.test = test
global.beforeAll = beforeAll
global.afterAll = afterAll
global.beforeEach = beforeEach
global.afterEach = afterEach

// Mock expect.getState for test name access
global.expect.getState = () => ({
  currentTestName: 'mock-test-name',
})

console.log('✅ E2E test environment setup complete')