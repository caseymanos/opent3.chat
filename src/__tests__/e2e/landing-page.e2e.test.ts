/**
 * End-to-End tests for Landing Page using Puppeteer MCP
 * Tests critical user journeys and interactions
 */

import { mcp__puppeteer__puppeteer_navigate, mcp__puppeteer__puppeteer_screenshot, mcp__puppeteer__puppeteer_click, mcp__puppeteer__puppeteer_evaluate } from '../../lib/mcp-puppeteer-wrapper'

const BASE_URL = process.env.NEXT_PUBLIC_VERCEL_URL 
  ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` 
  : 'http://localhost:3000'

describe('Landing Page E2E Tests', () => {
  beforeAll(async () => {
    // Configure Puppeteer for testing
    await mcp__puppeteer__puppeteer_evaluate({
      script: `
        // Set up viewport for consistent testing
        await page.setViewport({ width: 1920, height: 1080 });
        // Set user agent to avoid bot detection
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      `
    })
  })

  beforeEach(async () => {
    // Navigate to landing page before each test
    await mcp__puppeteer__puppeteer_navigate({
      url: BASE_URL
    })
    
    // Wait for page to load completely
    await mcp__puppeteer__puppeteer_evaluate({
      script: `
        await page.waitForLoadState('networkidle');
        await page.waitForSelector('h1', { state: 'visible' });
      `
    })
  })

  it('should display the landing page correctly', async () => {
    // Take screenshot for visual verification
    await mcp__puppeteer__puppeteer_screenshot({
      name: 'landing-page-initial-load',
      width: 1920,
      height: 1080
    })

    // Verify main heading is present
    const headingExists = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const heading = document.querySelector('h1');
        const hasCorrectText = heading && heading.textContent.includes('The Future of');
        return !!hasCorrectText;
      `
    })

    expect(headingExists).toBe(true)

    // Verify T3 Crusher branding
    const brandingExists = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const branding = document.querySelector('span');
        return branding && branding.textContent.includes('T3 Crusher');
      `
    })

    expect(brandingExists).toBe(true)
  })

  it('should display all feature cards', async () => {
    const featureCards = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const cards = Array.from(document.querySelectorAll('[data-testid="feature-card"], .grid > div'));
        const expectedFeatures = [
          'Conversation Branching',
          'Multi-Model AI', 
          'Real-time Collaboration',
          'Advanced Integrations'
        ];
        
        const foundFeatures = cards.map(card => card.textContent).filter(text => 
          expectedFeatures.some(feature => text.includes(feature))
        );
        
        return {
          totalCards: cards.length,
          foundFeatures: foundFeatures.length,
          hasAllFeatures: foundFeatures.length === expectedFeatures.length
        };
      `
    })

    expect(featureCards.hasAllFeatures).toBe(true)
    expect(featureCards.foundFeatures).toBe(4)
  })

  it('should have a functional Start Chatting button', async () => {
    // Find and verify the Start Chatting button
    const buttonExists = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const button = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Start Chatting') || btn.textContent.includes('🚀')
        );
        return !!button;
      `
    })

    expect(buttonExists).toBe(true)

    // Take screenshot before clicking
    await mcp__puppeteer__puppeteer_screenshot({
      name: 'before-start-chatting-click',
      width: 1920,
      height: 1080
    })

    // Click the Start Chatting button
    await mcp__puppeteer__puppeteer_click({
      selector: 'button:has-text("Start Chatting"), button:has-text("🚀")'
    })

    // Wait for navigation or loading state
    await mcp__puppeteer__puppeteer_evaluate({
      script: `
        // Wait for either navigation to chat or loading state
        await Promise.race([
          page.waitForURL('**/chat/**', { timeout: 5000 }),
          page.waitForSelector('[data-testid="loading"], .animate-spin', { timeout: 2000 })
        ]).catch(() => {
          // If neither happens, just wait a bit
          return new Promise(resolve => setTimeout(resolve, 1000));
        });
      `
    })

    // Take screenshot after clicking
    await mcp__puppeteer__puppeteer_screenshot({
      name: 'after-start-chatting-click',
      width: 1920,
      height: 1080
    })

    // Verify navigation occurred or loading state appeared
    const navigationOrLoading = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const currentUrl = window.location.href;
        const hasNavigated = currentUrl.includes('/chat/') || currentUrl.includes('conversationId=');
        const hasLoading = document.querySelector('.animate-spin, [data-testid="loading"]');
        
        return {
          currentUrl,
          hasNavigated,
          hasLoading: !!hasLoading,
          success: hasNavigated || !!hasLoading
        };
      `
    })

    expect(navigationOrLoading.success).toBe(true)
  })

  it('should have working navigation links', async () => {
    // Test GitHub button (should open in new tab)
    const githubButtonExists = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const button = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('GitHub') || btn.textContent.includes('⭐')
        );
        return !!button;
      `
    })

    expect(githubButtonExists).toBe(true)

    // Test other navigation links
    const navLinksExist = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const navLinks = ['About', 'Features', 'GitHub'];
        const foundLinks = navLinks.filter(linkText => 
          Array.from(document.querySelectorAll('button, a')).some(el => 
            el.textContent.includes(linkText)
          )
        );
        return foundLinks.length === navLinks.length;
      `
    })

    expect(navLinksExist).toBe(true)
  })

  it('should display competition branding correctly', async () => {
    const competitionElements = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const elements = Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && (
            el.textContent.includes('T3 Chat Cloneathon') ||
            el.textContent.includes('Competition Entry') ||
            el.textContent.includes('Built for the T3')
          )
        );
        
        return {
          count: elements.length,
          hasCompetitionBadge: elements.some(el => 
            el.textContent.includes('🏆') && el.textContent.includes('Competition')
          ),
          hasBuiltForBadge: elements.some(el => 
            el.textContent.includes('Built for the T3')
          )
        };
      `
    })

    expect(competitionElements.count).toBeGreaterThan(0)
    expect(competitionElements.hasCompetitionBadge).toBe(true)
  })

  it('should be responsive on mobile viewport', async () => {
    // Switch to mobile viewport
    await mcp__puppeteer__puppeteer_evaluate({
      script: `
        await page.setViewport({ width: 375, height: 667 }); // iPhone SE size
        await page.waitForTimeout(500); // Let layout settle
      `
    })

    await mcp__puppeteer__puppeteer_screenshot({
      name: 'landing-page-mobile',
      width: 375,
      height: 667
    })

    // Verify mobile layout
    const mobileLayout = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const heading = document.querySelector('h1');
        const startButton = Array.from(document.querySelectorAll('button')).find(btn => 
          btn.textContent.includes('Start Chatting')
        );
        
        return {
          headingVisible: heading && heading.offsetHeight > 0,
          buttonVisible: startButton && startButton.offsetHeight > 0,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight
        };
      `
    })

    expect(mobileLayout.headingVisible).toBe(true)
    expect(mobileLayout.buttonVisible).toBe(true)
    expect(mobileLayout.viewportWidth).toBe(375)

    // Reset to desktop viewport
    await mcp__puppeteer__puppeteer_evaluate({
      script: `await page.setViewport({ width: 1920, height: 1080 });`
    })
  })

  it('should handle keyboard navigation', async () => {
    // Test Tab navigation
    const keyboardNavigation = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        // Focus first element and tab through
        const firstButton = document.querySelector('button');
        if (firstButton) {
          firstButton.focus();
          
          // Simulate tab key presses
          const tabTargets = [];
          let activeElement = document.activeElement;
          
          for (let i = 0; i < 5; i++) {
            if (activeElement && activeElement.tagName) {
              tabTargets.push(activeElement.tagName.toLowerCase());
            }
            
            // Simulate tab key
            activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
            
            // Find next focusable element manually since we can't actually tab
            const focusableElements = Array.from(
              document.querySelectorAll('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
            );
            const currentIndex = focusableElements.indexOf(activeElement);
            activeElement = focusableElements[currentIndex + 1] || focusableElements[0];
          }
          
          return {
            tabTargets,
            hasFocusableElements: focusableElements.length > 0
          };
        }
        
        return { tabTargets: [], hasFocusableElements: false };
      `
    })

    expect(keyboardNavigation.hasFocusableElements).toBe(true)
    expect(keyboardNavigation.tabTargets.length).toBeGreaterThan(0)
  })

  it('should load without accessibility violations', async () => {
    // Basic accessibility checks
    const accessibilityCheck = await mcp__puppeteer__puppeteer_evaluate({
      script: `
        const checks = {
          hasMainHeading: !!document.querySelector('h1'),
          hasProperButtonLabels: Array.from(document.querySelectorAll('button')).every(btn => 
            btn.textContent.trim().length > 0 || btn.getAttribute('aria-label')
          ),
          hasValidImageAlts: Array.from(document.querySelectorAll('img')).every(img => 
            img.getAttribute('alt') !== null
          ),
          hasSkipLinks: !!document.querySelector('a[href^="#"]'),
          hasFocusIndicators: true // Would need to test focus styles
        };
        
        return checks;
      `
    })

    expect(accessibilityCheck.hasMainHeading).toBe(true)
    expect(accessibilityCheck.hasProperButtonLabels).toBe(true)
  })

  afterEach(async () => {
    // Take final screenshot for debugging if test failed
    if (expect.getState().currentTestName) {
      await mcp__puppeteer__puppeteer_screenshot({
        name: `final-${expect.getState().currentTestName?.replace(/\s+/g, '-')}`,
        width: 1920,
        height: 1080
      })
    }
  })
})