#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('\nPlease ensure your .env.local file contains these variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying user preferences migration...\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250119_user_preferences.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Apply the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSql });

    if (error) {
      // If exec_sql doesn't exist, try direct query (less secure, but works for setup)
      console.log('⚠️  exec_sql RPC not available, skipping direct SQL execution.');
      console.log('📝 Please run the following SQL in your Supabase SQL editor:\n');
      console.log('File: supabase/migrations/20250119_user_preferences.sql');
      console.log('\nOr use the Supabase CLI:');
      console.log('supabase db push');
    } else {
      console.log('✅ Migration applied successfully!');
    }

    // Test the new table
    console.log('\n🔍 Testing user_preferences table...');
    const { data, error: testError } = await supabase
      .from('user_preferences')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('⚠️  Table not yet available. Please apply the migration manually.');
    } else {
      console.log('✅ user_preferences table is ready!');
    }

  } catch (error) {
    console.error('❌ Error applying migration:', error);
    console.log('\n📝 Please apply the migration manually in your Supabase dashboard.');
  }
}

applyMigration();