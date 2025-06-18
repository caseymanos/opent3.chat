#!/usr/bin/env node

/**
 * Test API endpoints are properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing API Endpoint Configuration\n');

// Check if API route exists
const apiRoutePath = path.join(__dirname, '../src/app/api/chat/route.ts');
if (fs.existsSync(apiRoutePath)) {
  console.log('✅ Chat API route exists');
  
  // Read the file and check for provider implementations
  const content = fs.readFileSync(apiRoutePath, 'utf8');
  
  const providers = [
    { name: 'Vertex AI', pattern: /vertex-ai-provider/ },
    { name: 'Azure OpenAI', pattern: /azure-openai-provider/ },
    { name: 'Anthropic', pattern: /@ai-sdk\/anthropic/ },
    { name: 'OpenRouter', pattern: /openrouter/ }
  ];
  
  console.log('\n📦 Provider Imports:');
  providers.forEach(provider => {
    if (provider.pattern.test(content)) {
      console.log(`✅ ${provider.name} provider imported`);
    } else {
      console.log(`❌ ${provider.name} provider not found`);
    }
  });
  
  // Check for tier handling
  console.log('\n🎯 Tier Handling:');
  if (content.includes('vertex-ai')) {
    console.log('✅ Vertex AI tier handling found');
  }
  if (content.includes('premium')) {
    console.log('✅ Premium tier handling found');
  }
  if (content.includes('special')) {
    console.log('✅ Special tier handling found');
  }
  if (content.includes('byok')) {
    console.log('✅ BYOK tier handling found');
  }
} else {
  console.log('❌ Chat API route not found');
}

console.log('\n✅ API configuration check complete!');