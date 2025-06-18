#!/usr/bin/env node

/**
 * Test the chat API endpoint directly
 */

const http = require('http');

console.log('🧪 Testing Chat API Endpoint\n');

const testData = {
  messages: [{ role: 'user', content: 'Hello' }],
  conversationId: 'test-conv-123',
  model: 'gemini-2.5-flash-vertex',
  provider: 'vertex-ai',
  useOpenRouter: false
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('📤 Sending test request to /api/chat...');
console.log('Request data:', JSON.stringify(testData, null, 2));

const req = http.request(options, (res) => {
  console.log(`\n📥 Response Status: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 Response Body:');
    
    // Try to parse as JSON first
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.error) {
        console.log('\n❌ Error Details:');
        console.log('- Error:', jsonData.error);
        console.log('- Type:', jsonData.type);
        if (jsonData.provider) console.log('- Provider:', jsonData.provider);
        if (jsonData.originalError) console.log('- Original Error:', jsonData.originalError);
        if (jsonData.details) console.log('- Details:', jsonData.details);
      }
    } catch (e) {
      // Not JSON, print as is
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Request Error: ${e.message}`);
  console.log('\nMake sure the dev server is running on port 3002');
});

req.write(postData);
req.end();