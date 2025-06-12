/**
 * Jest E2E Global Setup - Starts services needed for E2E testing
 */

const { spawn } = require('child_process')
const { setupPuppeteerForTesting } = require('./src/lib/mcp-puppeteer-wrapper.js')

module.exports = async () => {
  console.log('🌍 Starting E2E global setup')
  
  // Check if Next.js dev server is running
  const testServerUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : 'http://localhost:3000'
  
  console.log(`🌐 Testing against: ${testServerUrl}`)
  
  // If testing against localhost, ensure dev server is available
  if (testServerUrl.includes('localhost')) {
    try {
      const fetch = require('node-fetch')
      const response = await fetch(testServerUrl)
      if (response.ok) {
        console.log('✅ Development server is running')
      } else {
        console.warn('⚠️ Development server may not be ready')
      }
    } catch (error) {
      console.warn('⚠️ Could not connect to development server:', error.message)
      console.warn('📝 Make sure to run "npm run dev" before E2E tests')
    }
  }
  
  // Setup Puppeteer MCP for testing
  await setupPuppeteerForTesting()
  
  // Store global state for tests
  global.__E2E_CONFIG__ = {
    baseUrl: testServerUrl,
    timeout: 30000,
    screenshotsEnabled: true,
  }
  
  console.log('✅ E2E global setup complete')
}