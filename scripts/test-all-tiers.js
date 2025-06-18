#!/usr/bin/env node

/**
 * Comprehensive test script for all tier configurations
 */

const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

// Override process.env for testing
Object.assign(process.env, envVars);

console.log('🧪 Testing All Tier Configurations\n');
console.log('=' .repeat(50));

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to check env variable
function checkEnv(name, required = true) {
  const value = process.env[name];
  if (!value) {
    if (required) {
      results.failed.push(`❌ Missing required: ${name}`);
    } else {
      results.warnings.push(`⚠️  Missing optional: ${name}`);
    }
    return false;
  }
  const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
  results.passed.push(`✅ ${name}: ${displayValue}`);
  return true;
}

// Helper to validate JSON
function validateJSON(envVar) {
  try {
    const value = process.env[envVar];
    if (!value) return false;
    JSON.parse(value);
    return true;
  } catch (e) {
    results.failed.push(`❌ Invalid JSON in ${envVar}: ${e.message}`);
    return false;
  }
}

console.log('\n📋 1. Checking Core Configuration\n');
checkEnv('NEXT_PUBLIC_SUPABASE_URL');
checkEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
checkEnv('SUPABASE_SERVICE_ROLE_KEY');

console.log('\n🏔️ 2. Checking Vertex AI (Free Tier - Anonymous Users)\n');
const hasVertexProject = checkEnv('GOOGLE_CLOUD_PROJECT');
const hasVertexCreds = checkEnv('GOOGLE_VERTEX_AI_CREDENTIALS');
checkEnv('GOOGLE_CLOUD_LOCATION');

if (hasVertexCreds) {
  validateJSON('GOOGLE_VERTEX_AI_CREDENTIALS');
  // Check if project ID in credentials matches
  try {
    const creds = JSON.parse(process.env.GOOGLE_VERTEX_AI_CREDENTIALS);
    if (creds.project_id !== process.env.GOOGLE_CLOUD_PROJECT) {
      results.warnings.push(`⚠️  Project ID mismatch: ${creds.project_id} vs ${process.env.GOOGLE_CLOUD_PROJECT}`);
    }
  } catch (e) {}
}

console.log('\n☁️ 3. Checking Azure OpenAI (Logged-in Tier - GPT-4o-mini)\n');
checkEnv('AZURE_OPENAI_RESOURCE_NAME');
checkEnv('AZURE_OPENAI_API_KEY');
checkEnv('AZURE_OPENAI_DEPLOYMENT_NAME');

console.log('\n🤖 4. Checking Anthropic (Special Tier - Claude 4 Sonnet)\n');
const hasAnthropic = checkEnv('ANTHROPIC_API_KEY');
if (hasAnthropic && !process.env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
  results.warnings.push('⚠️  Anthropic API key should start with "sk-ant-"');
}

console.log('\n🌐 5. Checking Optional Providers\n');
checkEnv('OPENAI_API_KEY', false);
checkEnv('GOOGLE_GENERATIVE_AI_API_KEY', false);
checkEnv('XAI_API_KEY', false);
checkEnv('AZURE_AI_API_KEY', false);

console.log('\n📊 6. Checking Model Definitions\n');

// Check if model files exist
const modelFiles = [
  'src/lib/models.ts',
  'src/lib/vertex-ai-provider.ts',
  'src/lib/azure-openai-provider.ts',
  'src/lib/usage-tracker.ts',
  'src/lib/usage-tracker-server.ts'
];

modelFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    results.passed.push(`✅ Found: ${file}`);
  } else {
    results.failed.push(`❌ Missing: ${file}`);
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 TEST SUMMARY\n');

if (results.passed.length > 0) {
  console.log('✅ Passed Tests:');
  results.passed.forEach(r => console.log(`   ${r}`));
}

if (results.warnings.length > 0) {
  console.log('\n⚠️  Warnings:');
  results.warnings.forEach(r => console.log(`   ${r}`));
}

if (results.failed.length > 0) {
  console.log('\n❌ Failed Tests:');
  results.failed.forEach(r => console.log(`   ${r}`));
}

console.log('\n' + '='.repeat(50));

// Overall status
const criticalProviders = {
  'Vertex AI': hasVertexProject && hasVertexCreds,
  'Azure OpenAI': process.env.AZURE_OPENAI_RESOURCE_NAME && process.env.AZURE_OPENAI_API_KEY,
  'Anthropic': hasAnthropic
};

console.log('\n🎯 Tier Status:\n');
console.log(`1. Free Tier (Anonymous - Vertex AI): ${criticalProviders['Vertex AI'] ? '✅ Ready' : '❌ Not configured'}`);
console.log(`2. Logged-in Tier:`);
console.log(`   - GPT-4o-mini (Azure): ${criticalProviders['Azure OpenAI'] ? '✅ Ready' : '❌ Not configured'}`);
console.log(`   - Claude 4 Sonnet (Anthropic): ${criticalProviders['Anthropic'] ? '✅ Ready' : '❌ Not configured'}`);
console.log(`3. BYOK Tier: ✅ Ready (users provide their own keys)`);

if (results.failed.length === 0) {
  console.log('\n✅ All required configurations are present!');
  console.log('\n🚀 Next steps:');
  console.log('   1. Run "npm run dev" to start the development server');
  console.log('   2. Test each tier:');
  console.log('      - Anonymous: Try Vertex AI Gemini models (10 calls/day)');
  console.log('      - Sign in: Try GPT-4o-mini and Claude 4 Sonnet');
  console.log('      - Enable BYOK: Add OpenRouter key for unlimited access');
} else {
  console.log('\n❌ Some required configurations are missing.');
  console.log('   Please check the failed tests above and add the missing environment variables.');
}

// Test API connectivity
console.log('\n🌐 Testing API Connectivity:\n');

// Test Supabase
try {
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(`✅ Supabase URL is valid: ${supabaseUrl.hostname}`);
} catch (e) {
  console.log('❌ Invalid Supabase URL');
}

// Show deployment name mapping
if (process.env.AZURE_OPENAI_DEPLOYMENT_NAME) {
  console.log(`\n📝 Azure Deployment: "${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}" will be used for GPT-4o-mini`);
}

process.exit(results.failed.length > 0 ? 1 : 0);