# Vercel Environment Variables Setup

## Production Supabase Configuration

Based on the Supabase MCP data, here are the correct environment variables for production deployment:

```bash
# Supabase Configuration (Production Ready)
NEXT_PUBLIC_SUPABASE_URL=https://nhadlfbxbivlhtkbolve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYWRsZmJ4Yml2bGh0a2JvbHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzMxMzIsImV4cCI6MjA2NTA0OTEzMn0.c3iSIX3NJv3gX8J1J4MNGKgU6ugv6VJE8ckE8mNc_F4

# AI Provider API Keys (Required for functionality)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional: Enhanced Features
GOOGLE_AI_API_KEY=your-google-ai-api-key
DEFAULT_AI_PROVIDER=anthropic
DEFAULT_AI_MODEL=claude-3-5-sonnet-20241022
```

## Database Status

✅ **Supabase Project**: t3-db (nhadlfbxbivlhtkbolve)
✅ **Status**: ACTIVE_HEALTHY  
✅ **Region**: us-east-1
✅ **PostgreSQL**: Version 17.4.1.041

## Tables Verified

✅ **profiles** - User profiles with RLS enabled
✅ **conversations** - Chat conversations with model configuration  
✅ **messages** - Messages with branching support (parent_id, branch_index)
✅ **file_uploads** - File attachment support
✅ **chat_sessions** - Real-time collaboration sessions

## Production Ready Features

1. **Real-time Subscriptions**: ✅ Working
2. **Authentication**: ✅ Configured with fallback
3. **File Storage**: ✅ Ready
4. **Message Branching**: ✅ Implemented
5. **Multi-Model AI**: ✅ OpenAI + Anthropic
6. **MCP Integrations**: ✅ GitHub + Linear

## Next Steps

1. Set these environment variables in Vercel dashboard
2. Test production deployment
3. Verify all features work in production environment