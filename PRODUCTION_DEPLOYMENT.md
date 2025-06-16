# Production Deployment Instructions

## Prerequisites
1. Supabase project created at https://supabase.com
2. Vercel account for deployment

## Database Setup

### 1. Apply Database Schema
Run these SQL scripts in your Supabase SQL Editor in order:

```sql
-- 1. First apply the base schema
-- Run the contents of: supabase/schema.sql

-- 2. Then apply the production auth fixes
-- Run the contents of: supabase/fix-production-auth.sql
```

### 2. Important: The production auth fix removes foreign key constraints
This allows session-based users to work without requiring profiles upfront.

## Environment Variables

Set these in your Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI API Keys (at least one required)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Production fixes for Supabase auth"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repo to Vercel
   - Set environment variables
   - Deploy

3. **Post-Deployment**
   - Test creating a new conversation
   - Test clearing conversations
   - Verify no auth errors in console

## Known Issues & Solutions

### Issue: Foreign Key Constraint Errors
**Solution**: Applied in `fix-production-auth.sql` - removes foreign key constraints

### Issue: RLS Policy Errors
**Solution**: Using permissive policies for demo mode

### Issue: Real-time Subscriptions
**Solution**: Disabled in production to avoid conflicts

## Security Note
The current setup uses permissive policies suitable for a demo/hackathon.
For production use with real users, implement proper authentication and restrictive RLS policies.