#!/usr/bin/env node

/**
 * Pre-run checks to ensure everything is set up correctly
 * Run this before starting the dev server
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Running pre-flight checks...\n');

let hasErrors = false;

// 1. Check critical dependencies
console.log('1️⃣ Checking critical dependencies...');
const criticalDeps = [
  '@ai-sdk/google-vertex',
  '@ai-sdk/anthropic',
  '@ai-sdk/azure',
  '@ai-sdk/openai',
  '@openrouter/ai-sdk-provider',
  'ai'
];

const missingDeps = [];
criticalDeps.forEach(dep => {
  try {
    require(dep);
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND' && e.message.includes(dep)) {
      missingDeps.push(dep);
    }
  }
});

if (missingDeps.length > 0) {
  console.log(`❌ Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('   Run: npm install');
  hasErrors = true;
} else {
  console.log('✅ All critical dependencies installed');
}

// 2. Check environment variables
console.log('\n2️⃣ Checking environment variables...');
const envPath = path.join(__dirname, '../.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('   Copy .env.example to .env.local and add your API keys');
  hasErrors = true;
} else {
  console.log('✅ .env.local file exists');
  
  // Check for critical env vars
  const envContent = fs.readFileSync(envPath, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_VERTEX_AI_CREDENTIALS'
  ];
  
  const missingVars = requiredVars.filter(varName => 
    !envContent.includes(varName) || envContent.includes(`${varName}=your-`)
  );
  
  if (missingVars.length > 0) {
    console.log(`⚠️  Missing or placeholder values for: ${missingVars.join(', ')}`);
    console.log('   Some features may not work without proper API keys');
  }
}

// 3. Check critical files
console.log('\n3️⃣ Checking critical files...');
const criticalFiles = [
  'src/app/api/chat/route.ts',
  'src/lib/vertex-ai-provider.ts',
  'src/lib/models.ts',
  'src/lib/usage-tracker.ts'
];

const missingFiles = criticalFiles.filter(file => 
  !fs.existsSync(path.join(__dirname, '..', file))
);

if (missingFiles.length > 0) {
  console.log(`❌ Missing files: ${missingFiles.join(', ')}`);
  hasErrors = true;
} else {
  console.log('✅ All critical files present');
}

// 4. Quick syntax check
console.log('\n4️⃣ Checking for obvious syntax errors...');
try {
  const routePath = path.join(__dirname, '../src/app/api/chat/route.ts');
  const content = fs.readFileSync(routePath, 'utf8');
  
  // Basic checks
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    console.log(`⚠️  Possible brace mismatch in chat route (${openBraces} open, ${closeBraces} close)`);
  } else {
    console.log('✅ Basic syntax looks OK');
  }
} catch (e) {
  console.log('⚠️  Could not check syntax');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('\n❌ Pre-flight checks failed!');
  console.log('   Please fix the issues above before running the dev server.');
  process.exit(1);
} else {
  console.log('\n✅ All pre-flight checks passed!');
  console.log('   You can now run: npm run dev');
  process.exit(0);
}