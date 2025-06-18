#!/usr/bin/env node

/**
 * Test all required dependencies and imports
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Dependencies and Imports\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test function
function testImport(packageName, displayName) {
  try {
    require(packageName);
    results.passed.push(`✅ ${displayName || packageName}`);
    return true;
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND' && error.message.includes(packageName)) {
      results.failed.push(`❌ ${displayName || packageName}: Not installed`);
    } else {
      results.warnings.push(`⚠️  ${displayName || packageName}: ${error.message.split('\n')[0]}`);
    }
    return false;
  }
}

// Test function for local files
function testLocalFile(filePath, displayName) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (fs.existsSync(fullPath)) {
    results.passed.push(`✅ ${displayName}: Found at ${filePath}`);
    return true;
  } else {
    results.failed.push(`❌ ${displayName}: Missing at ${filePath}`);
    return false;
  }
}

console.log('📦 1. Testing AI SDK Dependencies\n');

// AI SDKs
const aiSdks = [
  { package: '@ai-sdk/anthropic', name: 'Anthropic SDK' },
  { package: '@ai-sdk/azure', name: 'Azure SDK' },
  { package: '@ai-sdk/google', name: 'Google SDK' },
  { package: '@ai-sdk/google-vertex', name: 'Google Vertex AI SDK' },
  { package: '@ai-sdk/openai', name: 'OpenAI SDK' },
  { package: '@openrouter/ai-sdk-provider', name: 'OpenRouter SDK' },
  { package: 'ai', name: 'Vercel AI SDK Core' }
];

aiSdks.forEach(sdk => testImport(sdk.package, sdk.name));

console.log('\n📁 2. Testing Provider Files\n');

// Provider files
const providerFiles = [
  { path: 'src/lib/vertex-ai-provider.ts', name: 'Vertex AI Provider' },
  { path: 'src/lib/azure-openai-provider.ts', name: 'Azure OpenAI Provider' },
  { path: 'src/lib/azure-ai-provider.ts', name: 'Azure AI Provider' },
  { path: 'src/lib/openrouter.ts', name: 'OpenRouter Provider' }
];

providerFiles.forEach(file => testLocalFile(file.path, file.name));

console.log('\n🔧 3. Testing Core Files\n');

// Core files
const coreFiles = [
  { path: 'src/lib/models.ts', name: 'Model Definitions' },
  { path: 'src/lib/usage-tracker.ts', name: 'Usage Tracker (Client)' },
  { path: 'src/lib/usage-tracker-server.ts', name: 'Usage Tracker (Server)' },
  { path: 'src/app/api/chat/route.ts', name: 'Chat API Route' }
];

coreFiles.forEach(file => testLocalFile(file.path, file.name));

console.log('\n🌐 4. Testing Other Dependencies\n');

// Other important dependencies
const otherDeps = [
  { package: '@supabase/supabase-js', name: 'Supabase Client' },
  { package: '@supabase/auth-helpers-nextjs', name: 'Supabase Auth Helpers' },
  { package: 'next', name: 'Next.js' },
  { package: 'react', name: 'React' }
];

otherDeps.forEach(dep => testImport(dep.package, dep.name));

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY\n');

if (results.passed.length > 0) {
  console.log('✅ Passed Tests:', results.passed.length);
  results.passed.forEach(r => console.log(`   ${r}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:', results.warnings.length);
  results.warnings.forEach(r => console.log(`   ${r}`));
}

if (results.failed.length > 0) {
  console.log('\n❌ Failed Tests:', results.failed.length);
  results.failed.forEach(r => console.log(`   ${r}`));
  
  console.log('\n🔧 To fix missing dependencies, run:');
  console.log('   npm install');
} else {
  console.log('\n✅ All dependencies are properly installed!');
}

// Test specific imports that might fail
console.log('\n🔍 5. Testing Specific Imports\n');

// Test Vertex AI import specifically
try {
  const vertexPath = path.join(__dirname, '../src/lib/vertex-ai-provider.ts');
  const content = fs.readFileSync(vertexPath, 'utf8');
  
  // Check for the specific import
  if (content.includes("import { createVertex } from '@ai-sdk/google-vertex'")) {
    console.log('✅ Vertex AI provider has correct import statement');
    
    // Try to actually load the module
    try {
      require('@ai-sdk/google-vertex');
      console.log('✅ @ai-sdk/google-vertex module can be loaded');
    } catch (e) {
      console.log('❌ @ai-sdk/google-vertex module cannot be loaded:', e.message);
    }
  }
} catch (e) {
  console.log('⚠️  Could not check Vertex AI imports');
}

process.exit(results.failed.length > 0 ? 1 : 0);