#!/usr/bin/env node

const { getVertexAIProvider, isVertexAIConfigured } = require('../src/lib/vertex-ai-provider');

console.log('🔍 Testing Vertex AI Provider Configuration\n');

// Check if configured
const isConfigured = isVertexAIConfigured();
console.log(`✅ Is Vertex AI Configured: ${isConfigured}`);

if (!isConfigured) {
  console.log('\n❌ Vertex AI is not configured. Please set up:');
  console.log('  - GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID');
  console.log('  - GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY or GOOGLE_APPLICATION_CREDENTIALS');
  console.log('\nSee VERTEX_AI_SETUP.md for detailed instructions.');
  process.exit(1);
}

// Try to initialize provider
console.log('\n🚀 Attempting to initialize Vertex AI provider...');
const provider = getVertexAIProvider();

if (provider) {
  console.log('\n✅ Vertex AI provider initialized successfully!');
  console.log(`  - Project ID: ${provider.projectId}`);
  console.log(`  - Location: ${provider.location}`);
  console.log(`  - Is Available: ${provider.isAvailable}`);
  
  console.log('\n📋 Model ID Mapping:');
  const testModels = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro'
  ];
  
  testModels.forEach(model => {
    console.log(`  ${model} → ${provider.getModelId(model)}`);
  });
  
  console.log('\n✅ Vertex AI provider is ready to use!');
} else {
  console.log('\n❌ Failed to initialize Vertex AI provider');
  console.log('Check the logs above for error details.');
  process.exit(1);
}

console.log('\n📝 Next steps:');
console.log('  1. Install required dependencies: npm install @ai-sdk/google-vertex');
console.log('  2. Select a Vertex AI model in the chat interface');
console.log('  3. Start chatting with enterprise-grade Gemini models!');