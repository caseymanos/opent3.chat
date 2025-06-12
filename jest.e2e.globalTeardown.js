/**
 * Jest E2E Global Teardown - Cleans up after E2E testing
 */

const { cleanupPuppeteerAfterTesting } = require('./src/lib/mcp-puppeteer-wrapper.js')

module.exports = async () => {
  console.log('🧹 Starting E2E global teardown')
  
  // Cleanup Puppeteer MCP
  await cleanupPuppeteerAfterTesting()
  
  // Clean up global state
  delete global.__E2E_CONFIG__
  
  console.log('✅ E2E global teardown complete')
}