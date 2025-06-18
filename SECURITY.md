# Security Configuration Guide

## Overview

This guide explains how to properly secure your T3 Crusher application, especially regarding Supabase authentication and Google OAuth.

## Key Security Points

### 1. Environment Variables

**NEVER** commit sensitive credentials to version control. Always use environment variables:

- `.env.local` - For local development (git ignored)
- Vercel/hosting environment variables - For production

### 2. Supabase Security

#### The Supabase URL Issue

When using Google OAuth, your Supabase project URL (`https://xxx.supabase.co`) is visible in:
- OAuth consent screens
- Network requests from the browser
- Client-side JavaScript bundles

This is **by design** and is safe when properly configured:

1. **Anon Key is Public**: The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is meant to be public and is safe to expose
2. **Row Level Security (RLS)**: Protects your data at the database level
3. **Service Role Key**: Never expose this key - keep it server-side only

#### Solutions to Hide Supabase URL

If you need to hide the Supabase URL from OAuth screens:

**Option 1: Custom Domain (Recommended)**
1. Go to Supabase Dashboard > Settings > Custom Domains
2. Add your custom domain (e.g., `api.yourdomain.com`)
3. Update your OAuth callback URLs in Google Console
4. The custom domain will appear instead of `*.supabase.co`

**Option 2: Proxy Server**
1. Create an API proxy that forwards requests to Supabase
2. Use your domain for all Supabase operations
3. More complex but gives full control

### 3. Row Level Security (RLS)

Ensure RLS is enabled on all tables:

```sql
-- Example: Users can only see their own data
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see own conversations" ON conversations
  FOR ALL USING (auth.uid() = user_id);
```

### 4. API Key Management

- **Frontend**: Only use `NEXT_PUBLIC_*` variables
- **Backend**: Use server-only environment variables
- **BYOK (Bring Your Own Key)**: Store user API keys encrypted in the database

### 5. Google OAuth Setup

1. In Google Cloud Console:
   - Add authorized redirect URIs
   - Configure OAuth consent screen
   - Verify your domain for production use

2. In Supabase Dashboard:
   - Enable Google provider
   - Add your Google OAuth credentials
   - Configure redirect URLs

## Security Checklist

- [ ] Remove all hardcoded credentials
- [ ] Enable RLS on all database tables
- [ ] Use environment variables for all secrets
- [ ] Configure proper CORS settings
- [ ] Implement rate limiting
- [ ] Regular security audits
- [ ] Monitor for exposed credentials in git history

## Rotating Exposed Keys

If keys were accidentally exposed:

1. **Immediate Actions**:
   - Generate new Supabase anon key in dashboard
   - Update all environment variables
   - Redeploy application

2. **Git History Cleanup**:
   ```bash
   # Use BFG Repo-Cleaner or git filter-branch
   # to remove sensitive data from history
   ```

## Getting Help

- [Supabase Security Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Google OAuth Security](https://developers.google.com/identity/protocols/oauth2/security)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)