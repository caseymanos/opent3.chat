#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

console.log('🚀 Setting up T3 Crusher development environment...')

// Check if .env.local exists
const envPath = path.join(__dirname, '..', '.env.local')
if (!fs.existsSync(envPath)) {
  console.log('⚠️  .env.local not found. Please create it with your Supabase credentials.')
  console.log('   Copy .env.local.example and add your values.')
} else {
  console.log('✅ .env.local found')
}

// Quick Supabase setup check
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL') && !envContent.includes('your-project-url')
const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY') && !envContent.includes('your-anon-key')

if (!hasSupabaseUrl || !hasSupabaseKey) {
  console.log('\n📝 Next steps:')
  console.log('1. Create a Supabase project at https://supabase.com')
  console.log('2. Copy your project URL and anon key to .env.local')
  console.log('3. Run the SQL from supabase/schema.sql in your Supabase SQL editor')
  console.log('4. Run the SQL from supabase/seed.sql to create demo user')
  console.log('5. Start the app with: npm run dev')
} else {
  console.log('✅ Supabase configuration looks good!')
}

console.log('\n🔧 Available commands:')
console.log('  npm run dev          - Start development server')
console.log('  npm run dev:debug    - Start with Node.js debugging')
console.log('  npm run debug        - Start with breakpoint debugging')
console.log('\n📱 URLs:')
console.log('  App:   http://localhost:3001')
console.log('  Debug: http://localhost:3001/debug')
console.log('\n🎯 For debugging "New Chat" button:')
console.log('1. Open Chrome DevTools (F12)')
console.log('2. Go to /debug page and run tests')
console.log('3. Check Console for detailed logs')