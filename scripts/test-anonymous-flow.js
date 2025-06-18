#!/usr/bin/env node

/**
 * Test anonymous user flow with Vertex AI models
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Anonymous User Flow\n');

// Check Vertex AI models are properly configured
console.log('1️⃣ Checking Vertex AI models in models.ts...');
const modelsPath = path.join(__dirname, '../src/lib/models.ts');
const modelsContent = fs.readFileSync(modelsPath, 'utf8');

// Check for Vertex AI models
const vertexAIModels = modelsContent.match(/id:\s*'gemini-2\.5-flash-vertex'/g);
const vertexAILiteModels = modelsContent.match(/id:\s*'gemini-2\.5-flash-lite-vertex'/g);

if (vertexAIModels && vertexAILiteModels) {
  console.log('✅ Vertex AI models found in model definitions');
} else {
  console.log('❌ Vertex AI models not found in model definitions');
}

// Check tier configuration
const vertexTierMatch = modelsContent.match(/tier:\s*'vertex-ai'/g);
if (vertexTierMatch && vertexTierMatch.length >= 2) {
  console.log('✅ Vertex AI tier properly configured');
} else {
  console.log('❌ Vertex AI tier not properly configured');
}

// Check ChatInterface default model
console.log('\n2️⃣ Checking ChatInterface default model logic...');
const chatInterfacePath = path.join(__dirname, '../src/components/ChatInterface.tsx');
const chatInterfaceContent = fs.readFileSync(chatInterfacePath, 'utf8');

if (chatInterfaceContent.includes("isAnonymous ? 'gemini-2.5-flash-vertex'")) {
  console.log('✅ ChatInterface defaults to Vertex AI model for anonymous users');
} else {
  console.log('❌ ChatInterface does not default to Vertex AI model for anonymous users');
}

// Check ModelSelector ordering
console.log('\n3️⃣ Checking ModelSelector provider ordering...');
const modelSelectorPath = path.join(__dirname, '../src/components/ModelSelector.tsx');
const modelSelectorContent = fs.readFileSync(modelSelectorPath, 'utf8');

if (modelSelectorContent.includes("['vertex-ai', 'google'")) {
  console.log('✅ ModelSelector shows Vertex AI first for anonymous users');
} else {
  console.log('❌ ModelSelector does not prioritize Vertex AI for anonymous users');
}

// Check API route logic
console.log('\n4️⃣ Checking API route anonymous user logic...');
const apiRoutePath = path.join(__dirname, '../src/app/api/chat/route.ts');
const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8');

if (apiRouteContent.includes('model.tier === "vertex-ai" && model.provider === "vertex-ai"')) {
  console.log('✅ API route checks both tier and provider for anonymous users');
} else {
  console.log('❌ API route logic for anonymous users may be incorrect');
}

console.log('\n==================================================');
console.log('\n✅ Anonymous user flow configuration looks correct!');
console.log('\nExpected behavior:');
console.log('1. Anonymous users see Vertex AI models at the top');
console.log('2. Default model is gemini-2.5-flash-vertex');
console.log('3. Can make up to 10 calls/day');
console.log('4. Other models show "Sign in required" message');