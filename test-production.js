// Simple production test script
const puppeteer = require('puppeteer');

async function testProduction() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  console.log('🧪 Starting production tests...\n');
  
  try {
    // Test 1: Landing page loads
    console.log('1️⃣ Testing landing page...');
    await page.goto('https://t3-crusher.vercel.app');
    const title = await page.title();
    console.log(`   ✅ Page title: ${title}`);
    
    // Test 2: Start Chatting button exists
    console.log('\n2️⃣ Testing Start Chatting button...');
    const buttonExists = await page.$('button.bg-gradient-to-r') !== null;
    console.log(`   ${buttonExists ? '✅' : '❌'} Start Chatting button found`);
    
    // Test 3: Click button and check navigation
    console.log('\n3️⃣ Testing authentication flow...');
    await page.click('button.bg-gradient-to-r');
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 });
    const newUrl = page.url();
    const navigatedToChat = newUrl.includes('/chat/');
    console.log(`   ${navigatedToChat ? '✅' : '❌'} Navigated to chat: ${newUrl}`);
    
    // Test 4: Chat interface loads
    if (navigatedToChat) {
      console.log('\n4️⃣ Testing chat interface...');
      try {
        await page.waitForSelector('textarea', { timeout: 5000 });
        console.log('   ✅ Chat input found');
        
        const readyText = await page.$eval('*', el => el.textContent.includes('Ready to chat'));
        console.log(`   ${readyText ? '✅' : '❌'} "Ready to chat" message displayed`);
      } catch (e) {
        console.log('   ❌ Chat interface elements not found');
      }
    }
    
    // Test 5: Mobile responsiveness
    console.log('\n5️⃣ Testing mobile view...');
    await page.setViewport({ width: 375, height: 812 });
    await page.goto('https://t3-crusher.vercel.app');
    await page.screenshot({ path: 'mobile-test.png' });
    console.log('   ✅ Mobile screenshot saved as mobile-test.png');
    
    // Test 6: Check for console errors
    console.log('\n6️⃣ Checking for console errors...');
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('https://t3-crusher.vercel.app');
    await page.click('button.bg-gradient-to-r');
    await page.waitForTimeout(3000);
    console.log(`   ${errors.length === 0 ? '✅' : '⚠️'} Console errors: ${errors.length}`);
    if (errors.length > 0) {
      errors.forEach(err => console.log(`     - ${err}`));
    }
    
    console.log('\n✨ All tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  testProduction().catch(console.error);
}

module.exports = testProduction;