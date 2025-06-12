/**
 * End-to-End Navigation Flow Tests using Puppeteer MCP
 * Tests the critical navigation flows that were recently fixed
 */

const { expect } = require('expect')

describe('Navigation Flow E2E Tests', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
    : 'http://localhost:3000'

  beforeAll(async () => {
    // Start with clean slate - navigate to base URL
    console.log('🚀 Starting Navigation Flow E2E Tests')
  })

  describe('Landing Page to Chat Flow', () => {
    it('should navigate from landing page to chat without loops', async () => {
      console.log('📍 Test: Landing page to chat navigation')
      
      // Navigate to landing page
      await page.goto(BASE_URL, { 
        waitUntil: 'networkidle', 
        timeout: 10000 
      })
      
      // Take initial screenshot
      await page.screenshot({ 
        path: 'screenshots/01-landing-page-initial.png',
        fullPage: true 
      })
      
      // Verify we're on the landing page
      const landingTitle = await page.$eval('h1', el => el.textContent)
      expect(landingTitle).toContain('The Future of')
      
      // Find and verify the Start Chatting button
      const startButton = await page.waitForSelector('button:has-text("Start Chatting"), button:has-text("🚀")', {
        state: 'visible',
        timeout: 5000
      })
      expect(startButton).toBeTruthy()
      
      // Record performance metrics before click
      const beforeClick = await page.evaluate(() => performance.now())
      
      // Click the Start Chatting button
      console.log('🖱️ Clicking Start Chatting button...')
      await startButton.click()
      
      // Wait for navigation and track it
      const navigationPromise = page.waitForURL(/.*\/chat\/.*/, { 
        timeout: 15000 
      })
      
      // Also wait for loading states to resolve
      await Promise.race([
        navigationPromise,
        page.waitForSelector('.animate-spin', { state: 'hidden', timeout: 10000 }).catch(() => {})
      ])
      
      const afterNavigation = await page.evaluate(() => performance.now())
      const navigationTime = afterNavigation - beforeClick
      
      console.log(`⏱️ Navigation took: ${navigationTime.toFixed(2)}ms`)
      
      // Take screenshot after navigation
      await page.screenshot({ 
        path: 'screenshots/02-after-start-chatting-click.png',
        fullPage: true 
      })
      
      // Verify successful navigation
      const currentUrl = page.url()
      console.log(`📍 Current URL: ${currentUrl}`)
      
      expect(currentUrl).toMatch(/\/chat\/[a-f0-9-]+/)
      expect(navigationTime).toBeLessThan(5000) // Should navigate quickly
      
      // Verify we're on a chat page (not back on landing)
      const chatInterface = await page.$('.chat-interface, [data-testid="chat-main"], .min-h-screen')
      expect(chatInterface).toBeTruthy()
      
      // Ensure no error messages
      const errorMessages = await page.$$('.error, [data-testid="error"]')
      expect(errorMessages).toHaveLength(0)
    })

    it('should not create navigation loops', async () => {
      console.log('📍 Test: No navigation loops')
      
      const navigationEvents = []
      
      // Track navigation events
      page.on('framenavigated', (frame) => {
        if (frame === page.mainFrame()) {
          navigationEvents.push({
            url: frame.url(),
            timestamp: Date.now()
          })
        }
      })
      
      // Start from landing page
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      const startButton = await page.waitForSelector('button:has-text("Start Chatting")')
      await startButton.click()
      
      // Wait for navigation to complete
      await page.waitForURL(/.*\/chat\/.*/, { timeout: 10000 })
      
      // Wait a bit more to catch any potential loops
      await page.waitForTimeout(3000)
      
      console.log('📍 Navigation events:', navigationEvents)
      
      // Should have at most 2 navigation events: initial load + chat navigation
      expect(navigationEvents.length).toBeLessThanOrEqual(2)
      
      // Should not navigate back to landing page
      const finalUrl = page.url()
      expect(finalUrl).not.toContain('conversationId=new')
      expect(finalUrl).toMatch(/\/chat\/[a-f0-9-]+/)
    })
  })

  describe('Chat Interface Performance', () => {
    it('should load chat interface efficiently', async () => {
      console.log('📍 Test: Chat interface performance')
      
      // Navigate directly to chat (simulate clicking Start Chatting)
      await page.goto(BASE_URL)
      const startButton = await page.waitForSelector('button:has-text("Start Chatting")')
      
      // Measure time to interactive
      const startTime = await page.evaluate(() => performance.now())
      
      await startButton.click()
      await page.waitForURL(/.*\/chat\/.*/)
      
      // Wait for chat interface to be fully loaded
      await page.waitForSelector('[data-testid="chat-main"], .chat-interface, input[placeholder*="message"]', {
        state: 'visible',
        timeout: 10000
      })
      
      const endTime = await page.evaluate(() => performance.now())
      const loadTime = endTime - startTime
      
      console.log(`⏱️ Chat interface load time: ${loadTime.toFixed(2)}ms`)
      
      // Should load within reasonable time
      expect(loadTime).toBeLessThan(8000)
      
      // Take performance screenshot
      await page.screenshot({ 
        path: 'screenshots/03-chat-interface-loaded.png',
        fullPage: true 
      })
      
      // Verify essential elements are present
      const messageInput = await page.$('input[placeholder*="message"], textarea[placeholder*="message"]')
      const sendButton = await page.$('button:has-text("Send"), button[type="submit"]')
      
      expect(messageInput).toBeTruthy()
      expect(sendButton).toBeTruthy()
    })

    it('should handle real-time subscriptions without errors', async () => {
      console.log('📍 Test: Real-time subscriptions')
      
      // Navigate to chat
      await page.goto(BASE_URL)
      const startButton = await page.waitForSelector('button:has-text("Start Chatting")')
      await startButton.click()
      await page.waitForURL(/.*\/chat\/.*/)
      
      // Monitor console for subscription errors
      const consoleErrors = []
      page.on('console', (msg) => {
        if (msg.type() === 'error' && 
            (msg.text().includes('subscribe multiple times') || 
             msg.text().includes('channel instance'))) {
          consoleErrors.push(msg.text())
        }
      })
      
      // Wait for real-time setup
      await page.waitForTimeout(3000)
      
      console.log('📍 Console errors:', consoleErrors)
      
      // Should not have subscription errors
      expect(consoleErrors.length).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle errors gracefully without crashes', async () => {
      console.log('📍 Test: Error handling')
      
      // Track JavaScript errors
      const jsErrors = []
      page.on('pageerror', (error) => {
        jsErrors.push(error.message)
      })
      
      // Navigate and interact with the app
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      const startButton = await page.waitForSelector('button:has-text("Start Chatting")')
      await startButton.click()
      
      await page.waitForURL(/.*\/chat\/.*/, { timeout: 10000 })
      
      // Wait for any delayed errors
      await page.waitForTimeout(2000)
      
      console.log('📍 JavaScript errors:', jsErrors)
      
      // Should not have any unhandled JavaScript errors
      expect(jsErrors).toHaveLength(0)
      
      // Take error handling screenshot
      await page.screenshot({ 
        path: 'screenshots/04-error-handling-complete.png',
        fullPage: true 
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('should work correctly on mobile viewport', async () => {
      console.log('📍 Test: Mobile responsiveness')
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: 'screenshots/05-mobile-landing.png',
        fullPage: true 
      })
      
      // Verify mobile layout
      const heading = await page.$('h1')
      const startButton = await page.$('button:has-text("Start Chatting")')
      
      expect(heading).toBeTruthy()
      expect(startButton).toBeTruthy()
      
      // Test mobile navigation
      await startButton.click()
      await page.waitForURL(/.*\/chat\/.*/, { timeout: 10000 })
      
      // Take mobile chat screenshot
      await page.screenshot({ 
        path: 'screenshots/06-mobile-chat.png',
        fullPage: true 
      })
      
      // Verify mobile chat interface
      const mobileChat = await page.$('input[placeholder*="message"], textarea[placeholder*="message"]')
      expect(mobileChat).toBeTruthy()
      
      // Reset viewport
      await page.setViewportSize({ width: 1920, height: 1080 })
    })
  })

  describe('PWA Features', () => {
    it('should have working PWA manifest', async () => {
      console.log('📍 Test: PWA manifest')
      
      await page.goto(BASE_URL)
      
      // Check manifest
      const manifestResponse = await page.goto(`${BASE_URL}/manifest.json`)
      expect(manifestResponse.status()).toBe(200)
      
      const manifestText = await manifestResponse.text()
      const manifest = JSON.parse(manifestText)
      
      // Verify fixed manifest properties
      expect(manifest.name).toBe('T3 Crusher - AI Chat Platform')
      expect(manifest.protocol_handlers[0].protocol).toBe('web+t3crusherchat')
      
      console.log('✅ PWA manifest is valid')
    })
  })

  afterEach(async () => {
    // Take final screenshot for debugging
    const testName = expect.getState().currentTestName?.replace(/\s+/g, '-') || 'unknown'
    await page.screenshot({ 
      path: `screenshots/final-${testName}.png`,
      fullPage: true 
    })
  })
})