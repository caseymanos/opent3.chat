#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Checking Supabase Auth Configuration...\n');

// Check environment variables
console.log('1. Environment Variables:');
console.log(`   SUPABASE_URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('\n❌ Missing required environment variables!');
  console.log('\nMake sure your .env.local file contains:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://nhadlfbxbivlhtkbolve.supabase.co');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkAuthProviders() {
  console.log('\n2. Testing Supabase Connection:');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log(`   Connection: ❌ Error - ${error.message}`);
    } else {
      console.log('   Connection: ✅ Success');
      console.log(`   Current Session: ${data.session ? 'Active' : 'None'}`);
    }
    
    console.log('\n3. OAuth Configuration:');
    console.log('   Google OAuth Callback URL:');
    console.log(`   ${SUPABASE_URL}/auth/v1/callback`);
    
    console.log('\n4. Next Steps:');
    console.log('   1. Go to https://supabase.com/dashboard/project/nhadlfbxbivlhtkbolve/settings/auth');
    console.log('   2. Enable Google provider and add your Client ID & Secret');
    console.log('   3. In Google Cloud Console, add the callback URL above');
    console.log('   4. Test by visiting http://localhost:3000/login');
    
  } catch (err) {
    console.error('   Connection: ❌ Error -', err.message);
  }
}

checkAuthProviders().then(() => {
  console.log('\n✅ Configuration check complete!');
}).catch(err => {
  console.error('\n❌ Configuration check failed:', err);
});