#!/usr/bin/env node

const fetch = require('node-fetch');

// Test configuration
const TEST_QUERY = "What is the capital of France?";
const API_URL = "http://localhost:3000/api/chat";
const CONVERSATION_ID = "test-performance-" + Date.now();

// Test providers in order
const TESTS = [
  {
    name: "Google (Paid API)",
    provider: "google",
    model: "gemini-2.5-flash-preview-05-20", // Free tier, but with paid API
    description: "Google Gemini 2.5 Flash with paid API"
  },
  {
    name: "OpenAI Direct",
    provider: "openai",
    model: "gpt-4o-mini-azure", // This should use Azure if available
    description: "OpenAI GPT-4o Mini (via Azure if configured)"
  },
  {
    name: "Anthropic Direct",
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
    description: "Anthropic Claude 3 Haiku (BYOK)"
  },
  {
    name: "Azure OpenAI",
    provider: "azure",
    model: "gpt-4o-mini-azure",
    description: "Azure OpenAI deployment"
  }
];

// Helper function to measure API call performance
async function testProvider(test) {
  console.log(`\n🧪 Testing ${test.name}...`);
  console.log(`   Model: ${test.model}`);
  console.log(`   Provider: ${test.provider}`);
  console.log(`   ${test.description}`);
  
  const startTime = Date.now();
  let firstTokenTime = null;
  let responseText = '';
  let error = null;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: TEST_QUERY
          }
        ],
        conversationId: CONVERSATION_ID,
        model: test.model,
        provider: test.provider,
        useOpenRouter: false
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
      } catch {
        errorDetails = { error: errorText };
      }
      throw new Error(`HTTP ${response.status}: ${errorDetails.error || errorText}`);
    }
    
    // Process streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      // Record time to first token
      if (firstTokenTime === null) {
        firstTokenTime = Date.now() - startTime;
      }
      
      const chunk = decoder.decode(value);
      
      // Parse AI SDK stream format
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('0:')) {
          // Text content
          const content = line.substring(2);
          if (content.startsWith('"') && content.endsWith('"')) {
            responseText += JSON.parse(content);
          }
        }
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    return {
      success: true,
      firstTokenTime,
      totalTime,
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 100) + '...'
    };
    
  } catch (err) {
    error = err.message;
    const totalTime = Date.now() - startTime;
    
    return {
      success: false,
      error,
      totalTime
    };
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 AI Provider Performance Test");
  console.log("================================");
  console.log(`Test Query: "${TEST_QUERY}"`);
  console.log(`API Endpoint: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  const results = [];
  
  // Check if server is running
  console.log("\n🔍 Checking server status...");
  try {
    const response = await fetch("http://localhost:3000", { method: 'HEAD' });
    console.log("✅ Server is running");
  } catch (err) {
    console.error("❌ Server is not running on port 3000!");
    console.error("   Please start the server with: npm run dev");
    process.exit(1);
  }
  
  // Run tests
  for (const test of TESTS) {
    const result = await testProvider(test);
    results.push({
      ...test,
      ...result
    });
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log("\n📊 Performance Summary");
  console.log("======================");
  console.log("Provider           | Status  | First Token | Total Time | Response");
  console.log("-------------------|---------|-------------|------------|----------");
  
  for (const result of results) {
    const status = result.success ? "✅" : "❌";
    const firstToken = result.firstTokenTime ? `${result.firstTokenTime}ms` : "N/A";
    const totalTime = `${result.totalTime}ms`;
    const response = result.success ? `${result.responseLength} chars` : result.error.substring(0, 30) + "...";
    
    console.log(
      `${result.name.padEnd(18)} | ${status}      | ${firstToken.padEnd(11)} | ${totalTime.padEnd(10)} | ${response}`
    );
  }
  
  // Find fastest successful provider
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const fastestByFirstToken = successfulResults.reduce((prev, current) => 
      (current.firstTokenTime < prev.firstTokenTime) ? current : prev
    );
    const fastestByTotal = successfulResults.reduce((prev, current) => 
      (current.totalTime < prev.totalTime) ? current : prev
    );
    
    console.log("\n🏆 Winners:");
    console.log(`   Fastest First Token: ${fastestByFirstToken.name} (${fastestByFirstToken.firstTokenTime}ms)`);
    console.log(`   Fastest Total Time: ${fastestByTotal.name} (${fastestByTotal.totalTime}ms)`);
  }
  
  // Save detailed results
  const resultsFile = `ai-performance-results-${Date.now()}.json`;
  require('fs').writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    query: TEST_QUERY,
    results: results
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
}

// Run the tests
runTests().catch(console.error);