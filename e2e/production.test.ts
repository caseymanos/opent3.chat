import { test, expect } from '@playwright/test'

test.describe('Production Authentication and Mobile Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('https://t3-crusher.vercel.app')
  })

  test('Landing page loads correctly', async ({ page }) => {
    // Check main elements are visible
    await expect(page.locator('text=T3 Crusher')).toBeVisible()
    await expect(page.locator('text=The Future of AI Conversations')).toBeVisible()
    await expect(page.locator('button:has-text("Start Chatting")')).toBeVisible()
    await expect(page.locator('text=Conversation Branching')).toBeVisible()
  })

  test('Start Chatting button works without page reload', async ({ page }) => {
    // Click the Start Chatting button
    await page.click('button:has-text("Start Chatting")')
    
    // Wait for navigation to chat interface
    await page.waitForURL(/\/chat\/[a-f0-9-]+/, { timeout: 10000 })
    
    // Verify we're on the chat page
    const url = page.url()
    expect(url).toMatch(/\/chat\/[a-f0-9-]+/)
    
    // Verify chat interface elements
    await expect(page.locator('text=Ready to chat!')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('textarea[placeholder*="Type your message"]')).toBeVisible()
  })

  test('Demo authentication works in production', async ({ page }) => {
    // Navigate directly to chat route
    await page.goto('https://t3-crusher.vercel.app/chat')
    
    // Should show AuthWrapper with Start Chatting button
    await expect(page.locator('text=Welcome to T3 Crusher')).toBeVisible()
    await expect(page.locator('button:has-text("Start Chatting")')).toBeVisible()
    
    // Click Start Chatting in AuthWrapper
    await page.click('button:has-text("Start Chatting")')
    
    // Should redirect to landing page or chat
    await page.waitForLoadState('networkidle')
  })

  test('Mobile responsiveness - Landing page', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    // Check mobile layout
    await expect(page.locator('text=T3 Crusher')).toBeVisible()
    await expect(page.locator('button:has-text("Start Chatting")')).toBeVisible()
    
    // Check navigation is mobile-friendly
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
  })

  test('Mobile responsiveness - Chat interface', async ({ page }) => {
    // Navigate to chat
    await page.click('button:has-text("Start Chatting")')
    await page.waitForURL(/\/chat\/[a-f0-9-]+/, { timeout: 10000 })
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 })
    
    // Check if sidebar toggle exists
    const sidebarToggle = page.locator('button[aria-label*="menu"], button svg')
    const toggleCount = await sidebarToggle.count()
    expect(toggleCount).toBeGreaterThan(0)
  })

  test('Chat functionality works', async ({ page }) => {
    // Navigate to chat
    await page.click('button:has-text("Start Chatting")')
    await page.waitForURL(/\/chat\/[a-f0-9-]+/, { timeout: 10000 })
    
    // Type a message
    const messageInput = page.locator('textarea[placeholder*="Type your message"]')
    await messageInput.fill('Hello, this is a test message!')
    
    // Send message (press Enter or click send button)
    await messageInput.press('Enter')
    
    // Wait for response
    await expect(page.locator('text=Hello, this is a test message!')).toBeVisible({ timeout: 5000 })
  })

  test('Multiple conversations appear in sidebar', async ({ page }) => {
    // Navigate to chat
    await page.click('button:has-text("Start Chatting")')
    await page.waitForURL(/\/chat\/[a-f0-9-]+/, { timeout: 10000 })
    
    // Check sidebar has conversations
    const conversations = page.locator('[role="button"]:has-text("New Chat")')
    const count = await conversations.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Performance - Page load time', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('https://t3-crusher.vercel.app')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Page should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('No console errors in production', async ({ page }) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.goto('https://t3-crusher.vercel.app')
    await page.click('button:has-text("Start Chatting")')
    await page.waitForURL(/\/chat\/[a-f0-9-]+/, { timeout: 10000 })
    
    // Filter out expected errors (if any)
    const unexpectedErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('Failed to load resource')
    )
    
    expect(unexpectedErrors).toHaveLength(0)
  })
})

test.describe('Desktop vs Mobile Comparison', () => {
  const viewports = [
    { name: 'Desktop', width: 1280, height: 800 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Mobile', width: 375, height: 812 }
  ]

  viewports.forEach(({ name, width, height }) => {
    test(`${name} viewport - UI elements scale properly`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('https://t3-crusher.vercel.app')
      
      // Check key elements are visible
      await expect(page.locator('text=T3 Crusher')).toBeVisible()
      await expect(page.locator('button:has-text("Start Chatting")')).toBeVisible()
      
      // Take screenshot for visual comparison
      await page.screenshot({ 
        path: `screenshots/${name.toLowerCase()}-landing.png`,
        fullPage: true 
      })
    })
  })
})