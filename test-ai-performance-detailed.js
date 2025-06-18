#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');

// Configuration
const API_URL = new URL('http://localhost:3001/api/chat');
const TEST_QUERY = "What is the capital of France?";
const CONVERSATION_ID = `test-performance-${Date.now()}`;

// Test providers configuration
const TESTS = [
  // Free tier models
  {
    name: "Google Gemini 2.5 Flash (Free)",
    provider: "google",
    model: "gemini-2.5-flash-preview-05-20",
    tier: "free",
    description: "Latest Google Gemini with free tier"
  },
  {
    name: "Google Gemini 2.0 Flash (Free)",
    provider: "google",
    model: "gemini-2.0-flash",
    tier: "free",
    description: "Google Gemini 2.0 Flash free tier"
  },
  {
    name: "Azure OpenAI GPT-4o Mini (Free)",
    provider: "azure",
    model: "gpt-4o-mini-azure",
    tier: "free",
    description: "GPT-4o Mini via Azure (free tier)"
  },
  
  // Direct API access (if configured)
  {
    name: "OpenAI Direct (GPT-4o)",
    provider: "openai",
    model: "gpt-4o",
    tier: "byok",
    description: "OpenAI GPT-4o with direct API key"
  },
  {
    name: "Anthropic Direct (Claude 3.5 Sonnet)",
    provider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    tier: "byok",
    description: "Claude 3.5 Sonnet with direct API key"
  },
  {
    name: "Google Direct (Gemini 2.5 Pro)",
    provider: "google",
    model: "gemini-2.5-pro-experimental",
    tier: "byok",
    description: "Gemini 2.5 Pro Experimental with API key"
  }
];

// Helper to make HTTP request with detailed timing
function makeRequest(options, payload) {
  return new Promise((resolve, reject) => {
    const startTime = process.hrtime.bigint();
    let firstChunkTime = null;
    let responseText = '';
    const chunks = [];
    
    const protocol = options.protocol === 'https:' ? https : http;
    
    const req = protocol.request(options, (res) => {
      res.on('data', (chunk) => {
        if (firstChunkTime === null) {
          firstChunkTime = process.hrtime.bigint();
        }
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        const totalTimeMs = Number(endTime - startTime) / 1000000;
        const firstChunkMs = firstChunkTime ? Number(firstChunkTime - startTime) / 1000000 : null;
        
        const body = Buffer.concat(chunks).toString();
        
        // Extract text from streaming response
        let extractedText = '';
        const lines = body.split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            const content = line.substring(2);
            if (content.startsWith('"') && content.endsWith('"')) {
              try {
                extractedText += JSON.parse(content);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          extractedText,
          timing: {
            totalMs: totalTimeMs,
            firstChunkMs: firstChunkMs,
            streamingMs: firstChunkMs ? totalTimeMs - firstChunkMs : 0
          }
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// Test a single provider
async function testProvider(test) {
  console.log(`\n🧪 Testing ${test.name}...`);
  console.log(`   Model: ${test.model}`);
  console.log(`   Provider: ${test.provider}`);
  console.log(`   Tier: ${test.tier}`);
  console.log(`   ${test.description}`);
  
  const payload = JSON.stringify({
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
  });
  
  const options = {
    hostname: API_URL.hostname,
    port: API_URL.port,
    path: API_URL.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };
  
  try {
    const result = await makeRequest(options, payload);
    
    if (result.statusCode === 200) {
      console.log(`✅ Success`);
      console.log(`   Total time: ${result.timing.totalMs.toFixed(0)}ms`);
      console.log(`   Time to first chunk: ${result.timing.firstChunkMs?.toFixed(0)}ms`);
      console.log(`   Streaming time: ${result.timing.streamingMs.toFixed(0)}ms`);
      console.log(`   Response length: ${result.extractedText.length} chars`);
      console.log(`   Response preview: ${result.extractedText.substring(0, 100)}...`);
      
      return {
        ...test,
        success: true,
        timing: result.timing,
        responseLength: result.extractedText.length,
        response: result.extractedText
      };
    } else {
      let errorMessage = 'Unknown error';
      try {
        const errorBody = JSON.parse(result.body);
        errorMessage = errorBody.error || errorMessage;
      } catch (e) {
        errorMessage = result.body.substring(0, 100);
      }
      
      console.log(`❌ Failed (HTTP ${result.statusCode})`);
      console.log(`   Error: ${errorMessage}`);
      
      return {
        ...test,
        success: false,
        statusCode: result.statusCode,
        error: errorMessage,
        timing: result.timing
      };
    }
  } catch (error) {
    console.log(`❌ Request failed`);
    console.log(`   Error: ${error.message}`);
    
    return {
      ...test,
      success: false,
      error: error.message
    };
  }
}

// Main test runner
async function runTests() {
  console.log("🚀 AI Provider Performance Test - Detailed");
  console.log("==========================================");
  console.log(`Test Query: "${TEST_QUERY}"`);
  console.log(`API Endpoint: ${API_URL.href}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Check server status
  console.log("\n🔍 Checking server status...");
  try {
    await makeRequest({
      hostname: API_URL.hostname,
      port: API_URL.port,
      path: '/',
      method: 'HEAD'
    });
    console.log("✅ Server is running");
  } catch (err) {
    console.error("❌ Server is not running!");
    console.error("   Please start the server with: npm run dev");
    process.exit(1);
  }
  
  // Run tests
  const results = [];
  for (const test of TESTS) {
    const result = await testProvider(test);
    results.push(result);
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Summary
  console.log("\n📊 Performance Summary");
  console.log("======================");
  console.log("Provider                    | Tier    | Status | First Token | Total Time | Response");
  console.log("----------------------------|---------|--------|-------------|------------|----------");
  
  for (const result of results) {
    const status = result.success ? "✅" : "❌";
    const firstToken = result.timing?.firstChunkMs ? `${result.timing.firstChunkMs.toFixed(0)}ms` : "N/A";
    const totalTime = result.timing?.totalMs ? `${result.timing.totalMs.toFixed(0)}ms` : "N/A";
    const response = result.success ? `${result.responseLength} chars` : (result.error?.substring(0, 20) + "...");
    
    console.log(
      `${result.name.padEnd(27)} | ${result.tier.padEnd(7)} | ${status}      | ${firstToken.padEnd(11)} | ${totalTime.padEnd(10)} | ${response}`
    );
  }
  
  // Analysis by tier
  console.log("\n📈 Analysis by Tier");
  console.log("===================");
  
  const tiers = ['free', 'premium', 'byok'];
  for (const tier of tiers) {
    const tierResults = results.filter(r => r.tier === tier && r.success);
    if (tierResults.length > 0) {
      const avgFirstToken = tierResults.reduce((sum, r) => sum + (r.timing?.firstChunkMs || 0), 0) / tierResults.length;
      const avgTotal = tierResults.reduce((sum, r) => sum + (r.timing?.totalMs || 0), 0) / tierResults.length;
      
      console.log(`\n${tier.toUpperCase()} Tier:`);
      console.log(`  Successful tests: ${tierResults.length}`);
      console.log(`  Average first token: ${avgFirstToken.toFixed(0)}ms`);
      console.log(`  Average total time: ${avgTotal.toFixed(0)}ms`);
      
      const fastest = tierResults.reduce((prev, current) => 
        (current.timing.firstChunkMs < prev.timing.firstChunkMs) ? current : prev
      );
      console.log(`  Fastest: ${fastest.name} (${fastest.timing.firstChunkMs.toFixed(0)}ms to first token)`);
    }
  }
  
  // Overall winners
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    console.log("\n🏆 Overall Winners:");
    
    const fastestFirstToken = successfulResults.reduce((prev, current) => 
      (current.timing.firstChunkMs < prev.timing.firstChunkMs) ? current : prev
    );
    const fastestTotal = successfulResults.reduce((prev, current) => 
      (current.timing.totalMs < prev.timing.totalMs) ? current : prev
    );
    
    console.log(`   Fastest First Token: ${fastestFirstToken.name} (${fastestFirstToken.timing.firstChunkMs.toFixed(0)}ms)`);
    console.log(`   Fastest Total Time: ${fastestTotal.name} (${fastestTotal.timing.totalMs.toFixed(0)}ms)`);
    
    // Check if paid APIs are faster
    const paidResults = successfulResults.filter(r => r.tier === 'byok');
    const freeResults = successfulResults.filter(r => r.tier === 'free');
    
    if (paidResults.length > 0 && freeResults.length > 0) {
      const avgPaidFirstToken = paidResults.reduce((sum, r) => sum + r.timing.firstChunkMs, 0) / paidResults.length;
      const avgFreeFirstToken = freeResults.reduce((sum, r) => sum + r.timing.firstChunkMs, 0) / freeResults.length;
      
      const speedup = ((avgFreeFirstToken - avgPaidFirstToken) / avgFreeFirstToken * 100).toFixed(1);
      console.log(`\n   💰 Paid APIs are ${speedup}% faster to first token than free tier`);
    }
  }
  
  // Save detailed results
  const resultsFile = `ai-performance-detailed-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    query: TEST_QUERY,
    results: results.map(r => ({
      ...r,
      response: r.response ? r.response.substring(0, 500) + '...' : undefined
    }))
  }, null, 2));
  
  console.log(`\n💾 Detailed results saved to: ${resultsFile}`);
}

// Run the tests
runTests().catch(console.error);