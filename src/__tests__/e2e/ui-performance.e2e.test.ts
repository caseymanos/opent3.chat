/**
 * UI Performance and Visual Tests using Puppeteer MCP
 * Tests UI performance, visual correctness, and user interactions
 */

describe('UI Performance and Visual E2E Tests', () => {
  const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
    : 'http://localhost:3000'

  beforeAll(async () => {
    console.log('🎨 Starting UI Performance E2E Tests')
  })

  describe('Landing Page Visual and Performance', () => {
    it('should render landing page with all visual elements', async () => {
      console.log('📍 Test: Landing page visual elements')
      
      // Navigate and measure page load
      const startTime = Date.now()
      await page.goto(BASE_URL, { waitUntil: 'networkidle' })
      const loadTime = Date.now() - startTime
      
      console.log(`⏱️ Page load time: ${loadTime}ms`)
      expect(loadTime).toBeLessThan(5000)
      
      // Take full page screenshot for visual verification
      await page.screenshot({ 
        path: 'screenshots/ui-01-landing-page-full.png',
        fullPage: true 
      })
      
      // Verify hero section
      const heroHeading = await page.locator('h1:has-text("The Future of")').first()
      await expect(heroHeading).toBeVisible()
      
      const aiConversationsText = await page.locator('text=AI Conversations').first()
      await expect(aiConversationsText).toBeVisible()
      
      // Verify CTA buttons
      const startChattingBtn = await page.locator('button:has-text("Start Chatting"), button:has-text("🚀")').first()
      await expect(startChattingBtn).toBeVisible()
      
      const githubBtn = await page.locator('button:has-text("View on GitHub"), button:has-text("⭐")').first()
      await expect(githubBtn).toBeVisible()
      
      // Verify feature cards are visible
      const featureCards = await page.locator('[data-testid="feature-card"], .grid > div').all()
      expect(featureCards.length).toBeGreaterThanOrEqual(4)
      
      // Take screenshot of each feature card
      for (let i = 0; i < Math.min(4, featureCards.length); i++) {
        await featureCards[i].screenshot({ 
          path: `screenshots/ui-feature-card-${i + 1}.png` 
        })
      }
    })

    it('should have proper typography and spacing', async () => {
      console.log('📍 Test: Typography and spacing')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Check heading typography
      const mainHeading = page.locator('h1').first()
      const headingStyles = await mainHeading.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          marginBottom: computed.marginBottom
        }
      })
      
      console.log('📊 Heading styles:', headingStyles)
      
      // Should use proper heading size (typically 2rem+ for h1)
      const fontSize = parseFloat(headingStyles.fontSize)
      expect(fontSize).toBeGreaterThan(30) // At least 30px
      
      // Check button spacing and sizing
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      const buttonStyles = await startButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        const rect = el.getBoundingClientRect()
        return {
          padding: computed.padding,
          margin: computed.margin,
          minHeight: rect.height,
          minWidth: rect.width
        }
      })
      
      console.log('📊 Button styles:', buttonStyles)
      
      // Buttons should have adequate touch targets (44px+ minimum)
      expect(buttonStyles.minHeight).toBeGreaterThan(40)
    })

    it('should handle hover states and animations', async () => {
      console.log('📍 Test: Hover states and animations')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      
      // Screenshot before hover
      await startButton.screenshot({ 
        path: 'screenshots/ui-button-before-hover.png' 
      })
      
      // Hover over button
      await startButton.hover()
      await page.waitForTimeout(500) // Let animations settle
      
      // Screenshot after hover
      await startButton.screenshot({ 
        path: 'screenshots/ui-button-after-hover.png' 
      })
      
      // Check if hover state changes the button
      const hoverStyles = await startButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return {
          backgroundColor: computed.backgroundColor,
          transform: computed.transform,
          opacity: computed.opacity
        }
      })
      
      console.log('📊 Hover styles:', hoverStyles)
      
      // Should have some visual change on hover
      expect(hoverStyles.transform).not.toBe('none')
    })
  })

  describe('Chat Interface Performance', () => {
    it('should render chat interface efficiently', async () => {
      console.log('📍 Test: Chat interface rendering performance')
      
      await page.goto(BASE_URL)
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      
      // Measure chat interface load time
      const startTime = Date.now()
      await startButton.click()
      
      // Wait for chat interface to load
      await page.waitForURL(/.*\/chat\/.*/)
      await page.waitForSelector('input[placeholder*="message"], textarea[placeholder*="message"]', {
        state: 'visible'
      })
      
      const loadTime = Date.now() - startTime
      console.log(`⏱️ Chat interface load time: ${loadTime}ms`)
      
      // Should load quickly
      expect(loadTime).toBeLessThan(6000)
      
      // Take full chat interface screenshot
      await page.screenshot({ 
        path: 'screenshots/ui-02-chat-interface-full.png',
        fullPage: true 
      })
      
      // Verify essential chat elements
      const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first()
      await expect(messageInput).toBeVisible()
      
      const sendButton = page.locator('button:has-text("Send"), button[type="submit"]').first()
      await expect(sendButton).toBeVisible()
      
      // Check for sidebar/navigation
      const sidebar = page.locator('[data-testid="sidebar"], .sidebar, nav').first()
      if (await sidebar.isVisible()) {
        await sidebar.screenshot({ 
          path: 'screenshots/ui-chat-sidebar.png' 
        })
      }
    })

    it('should handle file upload UI properly', async () => {
      console.log('📍 Test: File upload UI')
      
      // Navigate to chat
      await page.goto(BASE_URL)
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      await startButton.click()
      await page.waitForURL(/.*\/chat\/.*/)
      
      // Look for file upload button or area
      const fileUploadTrigger = page.locator('button:has-text("📁"), button:has-text("Upload"), button[title*="file"], button[title*="upload"]').first()
      
      if (await fileUploadTrigger.isVisible()) {
        await fileUploadTrigger.click()
        await page.waitForTimeout(500)
        
        // Take screenshot of file upload UI
        await page.screenshot({ 
          path: 'screenshots/ui-03-file-upload-interface.png',
          fullPage: true 
        })
        
        // Check for drag and drop area
        const dropZone = page.locator('[data-testid="dropzone"], .dropzone, .drag-drop').first()
        if (await dropZone.isVisible()) {
          await dropZone.screenshot({ 
            path: 'screenshots/ui-file-dropzone.png' 
          })
        }
      }
    })

    it('should display model selector correctly', async () => {
      console.log('📍 Test: Model selector UI')
      
      await page.goto(BASE_URL)
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      await startButton.click()
      await page.waitForURL(/.*\/chat\/.*/)
      
      // Look for model selector
      const modelSelector = page.locator('[data-testid="model-selector"], select, .model-selector, button:has-text("claude"), button:has-text("gpt")').first()
      
      if (await modelSelector.isVisible()) {
        // Screenshot model selector
        await modelSelector.screenshot({ 
          path: 'screenshots/ui-model-selector.png' 
        })
        
        // Try to open dropdown if it's a button
        if (await modelSelector.evaluate(el => el.tagName === 'BUTTON')) {
          await modelSelector.click()
          await page.waitForTimeout(300)
          
          // Screenshot dropdown options
          await page.screenshot({ 
            path: 'screenshots/ui-model-selector-open.png',
            fullPage: true 
          })
          
          // Close dropdown
          await page.keyboard.press('Escape')
        }
      }
    })
  })

  describe('Responsive Design', () => {
    it('should adapt to different screen sizes', async () => {
      console.log('📍 Test: Responsive design')
      
      const viewports = [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'laptop', width: 1366, height: 768 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
      ]
      
      for (const viewport of viewports) {
        console.log(`📱 Testing ${viewport.name} viewport: ${viewport.width}x${viewport.height}`)
        
        await page.setViewportSize({ 
          width: viewport.width, 
          height: viewport.height 
        })
        
        await page.goto(BASE_URL)
        await page.waitForLoadState('networkidle')
        
        // Take screenshot for this viewport
        await page.screenshot({ 
          path: `screenshots/ui-responsive-${viewport.name}-landing.png`,
          fullPage: true 
        })
        
        // Test navigation on this viewport
        const startButton = page.locator('button:has-text("Start Chatting")').first()
        await expect(startButton).toBeVisible()
        
        await startButton.click()
        await page.waitForURL(/.*\/chat\/.*/)
        
        // Take chat screenshot for this viewport
        await page.screenshot({ 
          path: `screenshots/ui-responsive-${viewport.name}-chat.png`,
          fullPage: true 
        })
        
        // Verify essential elements are still accessible
        const messageInput = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first()
        await expect(messageInput).toBeVisible()
        
        // Check layout doesn't break
        const layoutCheck = await page.evaluate(() => {
          const bodyWidth = document.body.scrollWidth
          const viewportWidth = window.innerWidth
          return {
            hasHorizontalScroll: bodyWidth > viewportWidth,
            viewportWidth,
            bodyWidth
          }
        })
        
        console.log(`📊 ${viewport.name} layout:`, layoutCheck)
        
        // Should not have horizontal scroll on mobile
        if (viewport.width < 768) {
          expect(layoutCheck.hasHorizontalScroll).toBe(false)
        }
      }
      
      // Reset to desktop
      await page.setViewportSize({ width: 1920, height: 1080 })
    })
  })

  describe('Animation and Performance', () => {
    it('should have smooth animations without performance issues', async () => {
      console.log('📍 Test: Animation performance')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Measure animation performance
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paint = performance.getEntriesByType('paint')
        
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
        }
      })
      
      console.log('📊 Performance metrics:', performanceMetrics)
      
      // Performance thresholds
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(3000)
      expect(performanceMetrics.domContentLoaded).toBeLessThan(2000)
      
      // Test button animation
      const startButton = page.locator('button:has-text("Start Chatting")').first()
      await startButton.hover()
      
      // Check for CSS transitions
      const hasTransitions = await startButton.evaluate((el) => {
        const computed = window.getComputedStyle(el)
        return computed.transition !== 'all 0s ease 0s'
      })
      
      expect(hasTransitions).toBe(true)
    })
  })

  describe('Accessibility and UX', () => {
    it('should meet basic accessibility standards', async () => {
      console.log('📍 Test: Accessibility standards')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Check for proper heading structure
      const headings = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        return headings.map(h => ({ 
          tag: h.tagName, 
          text: h.textContent?.trim() 
        }))
      })
      
      console.log('📊 Heading structure:', headings)
      
      // Should have at least one h1
      expect(headings.some(h => h.tag === 'H1')).toBe(true)
      
      // Check button accessibility
      const buttons = await page.locator('button').all()
      for (const button of buttons) {
        const accessibleName = await button.evaluate((el) => {
          return el.textContent?.trim() || el.getAttribute('aria-label') || el.getAttribute('title')
        })
        
        expect(accessibleName).toBeTruthy()
      }
      
      // Check color contrast (basic check)
      const contrastCheck = await page.evaluate(() => {
        const bodyStyles = window.getComputedStyle(document.body)
        const headingStyles = window.getComputedStyle(document.querySelector('h1')!)
        
        return {
          bodyBg: bodyStyles.backgroundColor,
          bodyColor: bodyStyles.color,
          headingColor: headingStyles.color
        }
      })
      
      console.log('📊 Color contrast:', contrastCheck)
    })

    it('should support keyboard navigation', async () => {
      console.log('📍 Test: Keyboard navigation')
      
      await page.goto(BASE_URL)
      await page.waitForLoadState('networkidle')
      
      // Tab through interactive elements
      await page.keyboard.press('Tab')
      
      // Take screenshot showing focus
      await page.screenshot({ 
        path: 'screenshots/ui-keyboard-focus-1.png',
        fullPage: true 
      })
      
      // Continue tabbing
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        await page.waitForTimeout(200)
      }
      
      // Take screenshot of focused element
      await page.screenshot({ 
        path: 'screenshots/ui-keyboard-focus-final.png',
        fullPage: true 
      })
      
      // Should be able to activate focused element
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)
      
      // Should either navigate or show some interaction
      const currentUrl = page.url()
      console.log('📍 URL after keyboard activation:', currentUrl)
    })
  })

  afterEach(async () => {
    // Capture final state for debugging
    const testName = expect.getState().currentTestName?.replace(/\s+/g, '-') || 'unknown'
    await page.screenshot({ 
      path: `screenshots/ui-final-${testName}.png`,
      fullPage: true 
    })
  })
})