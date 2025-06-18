#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

// Configuration
const API_URL = 'http://localhost:3001/api/chat';
const TEST_QUERY = "What is the capital of France?";

// Test configurations for paid providers
const TESTS = [
  {
    name: "Google (Direct API)",
    provider: "google",
    model: "gemini-2.0-flash",
    description: "Google Gemini 2.0 Flash with paid API key"
  },
  {
    name: "OpenAI (Direct API)",
    provider: "openai",
    model: "gpt-4o-mini-azure",
    description: "OpenAI GPT-4o Mini with API key"
  },
  {
    name: "Anthropic (Direct API)",
    provider: "anthropic",
    model: "claude-3-haiku-20240307",
    description: "Claude 3 Haiku with API key"
  },
  {
    name: "Google Gemini 2.5 Flash",
    provider: "google",
    model: "gemini-2.5-flash-preview-05-20",
    description: "Latest Gemini 2.5 Flash Preview"
  },
  {
    name: "Google Gemini 1.5 Flash",
    provider: "google",
    model: "gemini-1.5-flash",
    description: "Gemini 1.5 Flash stable version"
  }
];

// Make HTTP request and measure performance
async function testProvider(test) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    let firstChunkTime = null;
    let responseText = '';
    let fullResponse = '';
    
    const payload = JSON.stringify({
      messages: [
        {
          role: 'user',
          content: TEST_QUERY
        }
      ],
      conversationId: `perf-test-${Date.now()}`,
      model: test.model,
      provider: test.provider
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };
    
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        if (firstChunkTime === null) {
          firstChunkTime = Date.now();
        }
        fullResponse += chunk.toString();
        
        // Extract text from streaming response
        const lines = chunk.toString().split('\n');
        for (const line of lines) {
          if (line.startsWith('0:')) {
            const content = line.substring(2);
            if (content.startsWith('"') && content.endsWith('"')) {
              try {
                responseText += JSON.parse(content);
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        
        resolve({
          ...test,
          statusCode: res.statusCode,
          success: res.statusCode === 200,
          timing: {
            firstChunkMs: firstChunkTime ? firstChunkTime - startTime : null,
            totalMs: endTime - startTime
          },
          responseLength: responseText.length,
          responsePreview: responseText.substring(0, 150),
          error: res.statusCode !== 200 ? fullResponse : null
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        ...test,
        success: false,
        error: error.message,
        timing: {
          totalMs: Date.now() - startTime
        }
      });
    });
    
    req.setTimeout(30000);
    req.write(payload);
    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log("🚀 Paid AI Provider Performance Test");
  console.log("====================================");
  console.log(`Query: "${TEST_QUERY}"`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const results = [];
  
  // Run tests sequentially
  for (const test of TESTS) {
    console.log(`Testing ${test.name}...`);
    const result = await testProvider(test);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Success - First chunk: ${result.timing.firstChunkMs}ms, Total: ${result.timing.totalMs}ms`);
      console.log(`   Response: ${result.responsePreview}...`);
    } else {
      console.log(`❌ Failed - ${result.error || `HTTP ${result.statusCode}`}`);
    }
    console.log();
    
    // Pause between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary table
  console.log("\n📊 Performance Summary");
  console.log("=====================");
  console.log("Provider                  | Status | First Chunk | Total Time | Response Size");
  console.log("--------------------------|--------|-------------|------------|---------------");
  
  results.forEach(result => {
    const status = result.success ? "✅" : "❌";
    const firstChunk = result.timing?.firstChunkMs ? `${result.timing.firstChunkMs}ms` : "N/A";
    const total = `${result.timing.totalMs}ms`;
    const size = result.success ? `${result.responseLength} chars` : "Failed";
    
    console.log(
      `${result.name.padEnd(25)} | ${status}     | ${firstChunk.padEnd(11)} | ${total.padEnd(10)} | ${size}`
    );
  });
  
  // Find winners
  const successfulResults = results.filter(r => r.success);
  
  if (successfulResults.length > 0) {
    console.log("\n🏆 Winners");
    console.log("==========");
    
    // Fastest first chunk
    const fastestFirst = successfulResults.reduce((prev, current) => 
      (current.timing.firstChunkMs < prev.timing.firstChunkMs) ? current : prev
    );
    
    // Fastest total
    const fastestTotal = successfulResults.reduce((prev, current) => 
      (current.timing.totalMs < prev.timing.totalMs) ? current : prev
    );
    
    console.log(`Fastest First Response: ${fastestFirst.name} (${fastestFirst.timing.firstChunkMs}ms)`);
    console.log(`Fastest Total Time: ${fastestTotal.name} (${fastestTotal.timing.totalMs}ms)`);
    
    // Average times by provider
    const providerStats = {};
    successfulResults.forEach(result => {
      if (!providerStats[result.provider]) {
        providerStats[result.provider] = {
          count: 0,
          totalFirst: 0,
          totalTime: 0
        };
      }
      providerStats[result.provider].count++;
      providerStats[result.provider].totalFirst += result.timing.firstChunkMs || 0;
      providerStats[result.provider].totalTime += result.timing.totalMs;
    });
    
    console.log("\n📈 Average Performance by Provider");
    console.log("==================================");
    Object.entries(providerStats).forEach(([provider, stats]) => {
      const avgFirst = Math.round(stats.totalFirst / stats.count);
      const avgTotal = Math.round(stats.totalTime / stats.count);
      console.log(`${provider}: ${avgFirst}ms first chunk, ${avgTotal}ms total (${stats.count} tests)`);
    });
  }
  
  // Save results
  const filename = `paid-provider-performance-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    query: TEST_QUERY,
    results: results
  }, null, 2));
  
  console.log(`\n💾 Results saved to: ${filename}`);
}

// Run tests
runTests().catch(console.error);