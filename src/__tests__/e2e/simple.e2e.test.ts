/**
 * Simple E2E Test to verify Puppeteer MCP setup works
 */

import { expect } from '@jest/globals'

describe('Simple Puppeteer MCP E2E Test', () => {
  it('should have proper test environment setup', async () => {
    console.log('📍 Test: Simple E2E environment check')
    
    // Check that globals are available
    expect(global.page).toBeDefined()
    expect(page.goto).toBeDefined()
    expect(page.screenshot).toBeDefined()
    
    // Test basic page operations
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')
    
    // Take a test screenshot
    await page.screenshot({ 
      path: 'test-screenshots/simple-e2e-test.png',
      fullPage: true 
    })
    
    // Verify URL
    const currentUrl = page.url()
    expect(currentUrl).toBe('http://localhost:3000')
    
    console.log('✅ Simple E2E test passed')
  })
  
  it('should demonstrate Puppeteer MCP wrapper functionality', async () => {
    console.log('📍 Test: Puppeteer MCP wrapper functions')
    
    // Test wrapper functions are available (mocked in test environment)
    const { setupPuppeteerForTesting } = require('../../lib/mcp-puppeteer-wrapper.js')
    
    expect(setupPuppeteerForTesting).toBeDefined()
    
    const result = await setupPuppeteerForTesting()
    expect(result.success).toBe(true)
    
    console.log('✅ Puppeteer MCP wrapper test passed')
  })
})