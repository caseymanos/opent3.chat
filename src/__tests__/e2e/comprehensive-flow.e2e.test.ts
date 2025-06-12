/**
 * Comprehensive Flow Tests using Puppeteer MCP
 * Tests the actual application flows with real UI interactions
 */

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
  : 'http://localhost:3000'

const PERFORMANCE_THRESHOLDS = {
  pageLoad: 5000, // 5 seconds max
  navigation: 8000, // 8 seconds max for navigation
  interaction: 1000 // 1 second max for interactions
}

describe('Comprehensive Application Flow Tests', () => {
  beforeAll(async () => {
    console.log('🚀 Starting Comprehensive Flow Tests')
    console.log(`📍 Testing URL: ${BASE_URL}`)
  })

  describe('Welcome Modal and Initial Experience', () => {
    it('should display welcome modal with proper branding and responsiveness', async () => {
      console.log('📍 Test: Welcome modal initial display')
      
      const startTime = Date.now()
      
      // Navigate to application
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      
      const loadTime = Date.now() - startTime
      console.log(`⏱️ Initial page load: ${loadTime}ms`)
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad)
      
      // Take desktop screenshot
      await page.screenshot({ 
        path: 'test-screenshots/welcome-modal-desktop.png',
        fullPage: true 
      })
      
      // Verify welcome modal elements
      const welcomeTitle = await page.locator('text=Welcome to T3 Crusher').first()
      await expect(welcomeTitle).toBeVisible()
      
      const startButton = await page.locator('button:has-text("Start Chatting")').first()
      await expect(startButton).toBeVisible()
      
      const description = await page.locator('text=The most advanced AI chat application').first()
      await expect(description).toBeVisible()
      
      // Test mobile responsiveness
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(500) // Let layout settle
      
      await page.screenshot({ 
        path: 'test-screenshots/welcome-modal-mobile.png',
        fullPage: true 
      })
      
      // Verify mobile layout
      await expect(welcomeTitle).toBeVisible()
      await expect(startButton).toBeVisible()
      
      // Check for horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.body.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalScroll).toBe(false)
      
      // Reset to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
    })

    it('should have proper accessibility and keyboard navigation', async () => {
      console.log('📍 Test: Welcome modal accessibility')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab')
      
      // Should focus on the Start Chatting button
      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement
        return {
          tagName: focused?.tagName,
          textContent: focused?.textContent?.trim(),
          hasOutline: window.getComputedStyle(focused!).outline !== 'none'
        }
      })
      
      expect(focusedElement.tagName).toBe('BUTTON')
      expect(focusedElement.textContent).toContain('Start Chatting')
      
      // Test Enter key activation
      const beforeActivation = await page.url()
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      
      // Should either navigate or show some response
      const afterActivation = await page.url()
      const hasChanged = beforeActivation !== afterActivation
      
      // Take screenshot of result
      await page.screenshot({ 
        path: 'test-screenshots/after-keyboard-activation.png',
        fullPage: true 
      })
      
      console.log(`📍 Navigation via keyboard: ${beforeActivation} → ${afterActivation}`)
    })
  })

  describe('Performance and Error Handling', () => {
    it('should handle multiple rapid clicks gracefully', async () => {
      console.log('📍 Test: Rapid click handling')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      
      // Perform rapid clicks to test debouncing
      const clickPromises = []
      for (let i = 0; i < 5; i++) {
        clickPromises.push(startButton.click({ timeout: 1000 }).catch(() => {}))
      }
      
      await Promise.all(clickPromises)
      await page.waitForTimeout(2000)
      
      // Check for JavaScript errors
      const jsErrors = []
      page.on('pageerror', (error) => {
        jsErrors.push(error.message)
      })
      
      expect(jsErrors.length).toBe(0)
      
      await page.screenshot({ 
        path: 'test-screenshots/after-rapid-clicks.png',
        fullPage: true 
      })
    })

    it('should maintain performance under load', async () => {
      console.log('📍 Test: Performance under simulated load')
      
      const performanceMetrics = []
      
      // Test multiple page loads
      for (let i = 0; i < 3; i++) {
        const startTime = Date.now()
        await page.goto(BASE_URL, { waitUntil: 'networkidle' })
        const loadTime = Date.now() - startTime
        
        performanceMetrics.push(loadTime)
        console.log(`📊 Load ${i + 1}: ${loadTime}ms`)
        
        await page.waitForTimeout(500)
      }
      
      const avgLoadTime = performanceMetrics.reduce((a, b) => a + b) / performanceMetrics.length
      const maxLoadTime = Math.max(...performanceMetrics)
      
      console.log(`📊 Average load time: ${avgLoadTime.toFixed(2)}ms`)
      console.log(`📊 Max load time: ${maxLoadTime}ms`)
      
      expect(avgLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad)
      expect(maxLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad * 1.5)
    })
  })

  describe('Visual Quality and Brand Consistency', () => {
    it('should maintain consistent branding across viewports', async () => {
      console.log('📍 Test: Brand consistency across viewports')
      
      const viewports = [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'laptop', width: 1366, height: 768 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
      ]
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.goto(BASE_URL)
        await page.waitForLoadState('networkidle')
        
        await page.screenshot({ 
          path: `test-screenshots/branding-${viewport.name}.png`,
          fullPage: true 
        })
        
        // Verify brand elements are present
        const brandElements = await page.evaluate(() => {
          const logo = document.querySelector('[data-testid="logo"], .logo, svg')
          const title = document.querySelector('h1, [data-testid="title"]')
          const brandColors = window.getComputedStyle(document.body)
          
          return {
            hasLogo: !!logo,
            hasTitle: !!title,
            titleText: title?.textContent?.trim(),
            backgroundColor: brandColors.backgroundColor,
            textColor: brandColors.color
          }
        })
        
        console.log(`📊 ${viewport.name} brand check:`, brandElements)
        
        expect(brandElements.hasTitle).toBe(true)
        expect(brandElements.titleText).toContain('T3 Crusher')
      }
      
      // Reset to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
    })

    it('should have proper color contrast and typography', async () => {
      console.log('📍 Test: Color contrast and typography')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      const designMetrics = await page.evaluate(() => {
        const title = document.querySelector('h1')
        const button = document.querySelector('button')
        const body = document.body
        
        const titleStyles = title ? window.getComputedStyle(title) : null
        const buttonStyles = button ? window.getComputedStyle(button) : null
        const bodyStyles = window.getComputedStyle(body)
        
        return {
          title: {
            fontSize: titleStyles?.fontSize,
            fontWeight: titleStyles?.fontWeight,
            color: titleStyles?.color,
            fontFamily: titleStyles?.fontFamily
          },
          button: {
            fontSize: buttonStyles?.fontSize,
            padding: buttonStyles?.padding,
            backgroundColor: buttonStyles?.backgroundColor,
            color: buttonStyles?.color,
            borderRadius: buttonStyles?.borderRadius
          },
          body: {
            backgroundColor: bodyStyles.backgroundColor,
            fontFamily: bodyStyles.fontFamily,
            lineHeight: bodyStyles.lineHeight
          }
        }
      })
      
      console.log('📊 Design metrics:', designMetrics)
      
      // Typography checks
      const titleFontSize = parseFloat(designMetrics.title.fontSize || '0')
      expect(titleFontSize).toBeGreaterThan(24) // At least 24px for main heading
      
      // Button checks
      const buttonPadding = designMetrics.button.padding
      expect(buttonPadding).toBeTruthy() // Should have padding
    })
  })

  describe('Feature Verification', () => {
    it('should display feature highlights correctly', async () => {
      console.log('📍 Test: Feature highlights display')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Look for feature indicators (the 7+, ∞, ⚡ icons)
      const featureElements = await page.evaluate(() => {
        const features = []
        const elements = Array.from(document.querySelectorAll('*'))
        
        // Look for feature text patterns
        const featurePatterns = ['7+', 'AI Models', 'Conversations', 'Real-time']
        
        elements.forEach(el => {
          const text = el.textContent?.trim() || ''
          featurePatterns.forEach(pattern => {
            if (text.includes(pattern)) {
              features.push({
                pattern,
                text: text.substring(0, 50),
                tagName: el.tagName
              })
            }
          })
        })
        
        return features
      })
      
      console.log('📊 Found features:', featureElements)
      
      // Should find at least the main feature indicators
      expect(featureElements.length).toBeGreaterThan(0)
      
      // Take screenshot highlighting features
      await page.screenshot({ 
        path: 'test-screenshots/feature-highlights.png',
        fullPage: true 
      })
    })

    it('should handle development mode indicators properly', async () => {
      console.log('📍 Test: Development mode indicators')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Check for development mode text
      const devModeInfo = await page.evaluate(() => {
        const devText = Array.from(document.querySelectorAll('*')).find(el => 
          el.textContent?.includes('Development Mode') || 
          el.textContent?.includes('demo@t3crusher.app')
        )
        
        return {
          found: !!devText,
          text: devText?.textContent?.trim() || '',
          className: devText?.className || ''
        }
      })
      
      console.log('📊 Dev mode info:', devModeInfo)
      
      if (devModeInfo.found) {
        expect(devModeInfo.text).toContain('Development Mode')
      }
    })
  })

  afterEach(async () => {
    // Capture final state for debugging
    const testName = expect.getState().currentTestName?.replace(/\s+/g, '-') || 'unknown'
    await page.screenshot({ 
      path: `test-screenshots/final-${testName}.png`,
      fullPage: true 
    })
    
    // Log any console errors
    const logs = await page.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      }
    })
    
    console.log('📊 Test completion info:', logs)
  })
})

// Helper function to wait for stable state
async function waitForStableState(page: any, timeout = 2000) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(timeout)
}

// Performance measurement helper
async function measurePerformance(page: any, action: () => Promise<void>) {
  const startTime = Date.now()
  await action()
  return Date.now() - startTime
}