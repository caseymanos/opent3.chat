#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEnvironment() {
  console.log('🔧 Setting up environment variables for T3 Crusher\n');

  const envPath = path.join(process.cwd(), '.env.local');
  
  // Check if .env.local already exists
  if (fs.existsSync(envPath)) {
    const overwrite = await question('.env.local already exists. Overwrite? (y/n): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
  }

  console.log('\n📝 Please provide your Supabase configuration:');
  console.log('(You can find these in your Supabase project settings)\n');

  const supabaseUrl = await question('Supabase URL (e.g., https://xxx.supabase.co): ');
  const supabaseAnonKey = await question('Supabase Anon Key: ');

  console.log('\n🤖 AI Provider API Keys (Optional - press Enter to skip):');
  const openaiKey = await question('OpenAI API Key: ');
  const anthropicKey = await question('Anthropic API Key: ');
  const googleKey = await question('Google AI API Key: ');

  // Build the .env.local content
  let envContent = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}
`;

  if (openaiKey) {
    envContent += `\n# OpenAI
OPENAI_API_KEY=${openaiKey}
`;
  }

  if (anthropicKey) {
    envContent += `\n# Anthropic
ANTHROPIC_API_KEY=${anthropicKey}
`;
  }

  if (googleKey) {
    envContent += `\n# Google AI
GOOGLE_GENERATIVE_AI_API_KEY=${googleKey}
`;
  }

  // Write the .env.local file
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ .env.local created successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Make sure Google OAuth is configured in your Supabase dashboard');
  console.log('2. Add your domain to the Google OAuth authorized redirects');
  console.log('3. Run `npm run dev` to start the development server\n');

  rl.close();
}

setupEnvironment().catch(console.error);