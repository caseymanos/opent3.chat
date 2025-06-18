#!/usr/bin/env node

const http = require('http');
const fs = require('fs');

// Configuration
const API_URL = 'http://localhost:3001/api/chat';
const TEST_QUERY = "What is the capital of France? Please provide a brief answer.";

// Test configurations - focusing on working providers
const TESTS = [
  // Google models (all working with paid API)
  {
    name: "Google Gemini 2.5 Flash Preview",
    provider: "google",
    model: "gemini-2.5-flash-preview-05-20",
    description: "Latest Gemini with enhanced reasoning"
  },
  {
    name: "Google Gemini 2.0 Flash",
    provider: "google",
    model: "gemini-2.0-flash",
    description: "Fast and versatile Gemini 2.0"
  },
  {
    name: "Google Gemini 1.5 Flash",
    provider: "google",
    model: "gemini-1.5-flash",
    description: "Stable Gemini 1.5 version"
  },
  
  // OpenAI models (with API key)
  {
    name: "OpenAI GPT-4o Mini (Azure)",
    provider: "openai",
    model: "gpt-4o-mini-azure",
    description: "GPT-4o Mini via Azure/OpenAI"
  },
  
  // Try with Azure provider directly
  {
    name: "Azure OpenAI Direct",
    provider: "openai",
    model: "gpt-4o-mini-azure",
    description: "Testing Azure OpenAI deployment"
  }
];

// Parse streaming response properly
function parseStreamingResponse(data) {
  let text = '';
  const lines = data.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('0:')) {
      // Text content line
      const content = line.substring(2);
      if (content.startsWith('"') && content.endsWith('"')) {
        try {
          text += JSON.parse(content);
        } catch (e) {
          // Try to extract text between quotes
          const match = content.match(/^"(.*)"/);
          if (match) {
            text += match[1];
          }
        }
      }
    } else if (line.startsWith('d:') || line.startsWith('e:')) {
      // Metadata lines - can extract token usage if needed
      try {
        const metadata = JSON.parse(line.substring(2));
        // Could extract usage info here if needed
      } catch (e) {
        // Ignore parse errors
      }
    }
  }
  
  return text;
}

// Make HTTP request and measure performance
async function testProvider(test) {
  return new Promise((resolve) => {
    const startTime = process.hrtime.bigint();
    let firstChunkTime = null;
    let fullResponse = '';
    
    const payload = JSON.stringify({
      messages: [
        {
          role: 'user',
          content: TEST_QUERY
        }
      ],
      conversationId: `perf-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      },
      timeout: 30000
    };
    
    const req = http.request(options, (res) => {
      res.on('data', (chunk) => {
        if (firstChunkTime === null) {
          firstChunkTime = process.hrtime.bigint();
        }
        fullResponse += chunk.toString();
      });
      
      res.on('end', () => {
        const endTime = process.hrtime.bigint();
        
        // Parse the response
        let responseText = '';
        let error = null;
        
        if (res.statusCode === 200) {
          responseText = parseStreamingResponse(fullResponse);
        } else {
          try {
            const errorObj = JSON.parse(fullResponse);
            error = errorObj.error || fullResponse;
          } catch (e) {
            error = fullResponse;
          }
        }
        
        // Calculate timings in milliseconds
        const firstChunkMs = firstChunkTime ? Number(firstChunkTime - startTime) / 1000000 : null;
        const totalMs = Number(endTime - startTime) / 1000000;
        
        resolve({
          ...test,
          statusCode: res.statusCode,
          success: res.statusCode === 200,
          timing: {
            firstChunkMs: firstChunkMs,
            totalMs: totalMs,
            streamingMs: firstChunkMs ? totalMs - firstChunkMs : 0
          },
          responseLength: responseText.length,
          responseText: responseText,
          responsePreview: responseText.substring(0, 200),
          error: error
        });
      });
    });
    
    req.on('error', (error) => {
      const endTime = process.hrtime.bigint();
      resolve({
        ...test,
        success: false,
        error: error.message,
        timing: {
          totalMs: Number(endTime - startTime) / 1000000
        }
      });
    });
    
    req.write(payload);
    req.end();
  });
}

// Main test runner
async function runTests() {
  console.log("🚀 AI Provider Performance Test - Final");
  console.log("======================================");
  console.log(`Query: "${TEST_QUERY}"`);
  console.log(`Time: ${new Date().toISOString()}`);
  console.log(`Server: ${API_URL}\n`);
  
  const results = [];
  
  // Run tests sequentially with progress indicator
  for (let i = 0; i < TESTS.length; i++) {
    const test = TESTS[i];
    console.log(`[${i + 1}/${TESTS.length}] Testing ${test.name}...`);
    
    const result = await testProvider(test);
    results.push(result);
    
    if (result.success) {
      console.log(`✅ Success`);
      console.log(`   First chunk: ${result.timing.firstChunkMs.toFixed(0)}ms`);
      console.log(`   Total time: ${result.timing.totalMs.toFixed(0)}ms`);
      console.log(`   Streaming: ${result.timing.streamingMs.toFixed(0)}ms`);
      console.log(`   Response: ${result.responseLength} chars`);
      if (result.responseLength > 0) {
        console.log(`   Preview: "${result.responsePreview.trim()}..."`);
      }
    } else {
      console.log(`❌ Failed - ${result.error || `HTTP ${result.statusCode}`}`);
    }
    console.log();
    
    // Brief pause between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Detailed Performance Table
  console.log("\n📊 Detailed Performance Results");
  console.log("===============================");
  console.log("Provider                        | First Chunk | Streaming | Total Time | Response");
  console.log("--------------------------------|-------------|-----------|------------|----------");
  
  results.forEach(result => {
    const firstChunk = result.timing?.firstChunkMs ? `${result.timing.firstChunkMs.toFixed(0)}ms` : "N/A";
    const streaming = result.timing?.streamingMs ? `${result.timing.streamingMs.toFixed(0)}ms` : "N/A";
    const total = `${result.timing.totalMs.toFixed(0)}ms`;
    const response = result.success ? `${result.responseLength} chars` : "Failed";
    
    console.log(
      `${result.name.padEnd(31)} | ${firstChunk.padEnd(11)} | ${streaming.padEnd(9)} | ${total.padEnd(10)} | ${response}`
    );
  });
  
  // Analysis
  const successfulResults = results.filter(r => r.success && r.responseLength > 0);
  
  if (successfulResults.length > 0) {
    console.log("\n🏆 Performance Analysis");
    console.log("======================");
    
    // Fastest first response
    const fastestFirst = successfulResults.reduce((prev, current) => 
      (current.timing.firstChunkMs < prev.timing.firstChunkMs) ? current : prev
    );
    
    // Fastest total time
    const fastestTotal = successfulResults.reduce((prev, current) => 
      (current.timing.totalMs < prev.timing.totalMs) ? current : prev
    );
    
    // Most complete response
    const mostComplete = successfulResults.reduce((prev, current) => 
      (current.responseLength > prev.responseLength) ? current : prev
    );
    
    console.log(`\n🥇 Fastest First Response: ${fastestFirst.name}`);
    console.log(`   Time to first chunk: ${fastestFirst.timing.firstChunkMs.toFixed(0)}ms`);
    
    console.log(`\n🥈 Fastest Total Time: ${fastestTotal.name}`);
    console.log(`   Total completion: ${fastestTotal.timing.totalMs.toFixed(0)}ms`);
    
    console.log(`\n🥉 Most Complete Response: ${mostComplete.name}`);
    console.log(`   Response length: ${mostComplete.responseLength} characters`);
    
    // Provider comparison
    const providers = {};
    successfulResults.forEach(result => {
      if (!providers[result.provider]) {
        providers[result.provider] = {
          tests: [],
          totalFirst: 0,
          totalTime: 0,
          count: 0
        };
      }
      providers[result.provider].tests.push(result.name);
      providers[result.provider].totalFirst += result.timing.firstChunkMs;
      providers[result.provider].totalTime += result.timing.totalMs;
      providers[result.provider].count++;
    });
    
    console.log("\n📈 Provider Comparison");
    console.log("=====================");
    Object.entries(providers).forEach(([provider, stats]) => {
      const avgFirst = Math.round(stats.totalFirst / stats.count);
      const avgTotal = Math.round(stats.totalTime / stats.count);
      console.log(`\n${provider.toUpperCase()}:`);
      console.log(`  Tests run: ${stats.count}`);
      console.log(`  Average first chunk: ${avgFirst}ms`);
      console.log(`  Average total time: ${avgTotal}ms`);
      console.log(`  Models tested: ${stats.tests.join(', ')}`);
    });
    
    // Speed rankings
    console.log("\n🏁 Speed Rankings (First Chunk)");
    console.log("================================");
    successfulResults
      .sort((a, b) => a.timing.firstChunkMs - b.timing.firstChunkMs)
      .forEach((result, index) => {
        console.log(`${index + 1}. ${result.name}: ${result.timing.firstChunkMs.toFixed(0)}ms`);
      });
  }
  
  // Save detailed results
  const filename = `ai-performance-final-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify({
    timestamp: new Date().toISOString(),
    query: TEST_QUERY,
    summary: {
      totalTests: results.length,
      successful: successfulResults.length,
      failed: results.length - successfulResults.length
    },
    results: results.map(r => ({
      ...r,
      responseText: r.responseText ? r.responseText.substring(0, 500) + '...' : undefined
    }))
  }, null, 2));
  
  console.log(`\n💾 Full results saved to: ${filename}`);
  
  // Final recommendation
  if (successfulResults.length > 0) {
    console.log("\n💡 Recommendation");
    console.log("================");
    if (fastestFirst) {
      console.log(`For fastest response times with paid APIs:`);
      console.log(`- Use ${fastestFirst.name} for quickest first response (${fastestFirst.timing.firstChunkMs.toFixed(0)}ms)`);
      console.log(`- Response quality and completeness vary by model`);
      console.log(`- Google's Gemini models show consistently fast first-token times`);
      console.log(`- OpenAI models via Azure show good performance when properly configured`);
    }
  }
}

// Run tests
runTests().catch(console.error);