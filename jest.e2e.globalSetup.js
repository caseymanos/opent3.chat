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
      // For test environment, just skip the connection check to avoid node-fetch ESM issues
      console.log('📝 Skipping development server check in test environment')
      console.log('📝 Make sure to run "npm run dev" before E2E tests if needed')
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