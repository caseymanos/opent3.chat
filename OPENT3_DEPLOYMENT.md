# Deploying to opent3.chat - Complete Setup Guide

## Overview
This guide covers deploying your T3 Crusher app to opent3.chat with Google OAuth authentication properly configured.

## Step 1: Update Google OAuth Configuration

### In Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "APIs & Services" → "Credentials"
3. Click on your OAuth 2.0 Client ID
4. Update the following:

#### Authorized JavaScript origins:
Add these URLs:
```
https://opent3.chat
https://www.opent3.chat
http://localhost:3000
http://localhost:3001
```

#### Authorized redirect URIs:
Keep the Supabase callback URL:
```
https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback
```

5. Click "Save"

## Step 2: Configure Your Hosting Platform

### If using Vercel:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Domains
3. Add `opent3.chat` as a custom domain
4. Configure DNS as instructed by Vercel

### Environment Variables:
Add these in your hosting platform:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://nhadlfbxbivlhtkbolve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# Optional (for BYOK functionality)
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key
```

## Step 3: Supabase Configuration

### Update Site URL:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to Authentication → URL Configuration
3. Update:
   - **Site URL**: `https://opent3.chat`
   - **Redirect URLs**: Add `https://opent3.chat/**`

### Verify Google Provider:
1. Go to Authentication → Providers → Google
2. Ensure it's enabled with your Client ID and Secret
3. The callback URL remains: `https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback`

## Step 4: Hide Supabase URL (Optional but Recommended)

### Option A: Use Supabase Custom Domain

1. In Supabase Dashboard → Settings → Custom Domains
2. Add a subdomain like `api.opent3.chat`
3. Configure DNS:
   ```
   CNAME api.opent3.chat → your-project.supabase.co
   ```
4. Update your app's environment variable:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://api.opent3.chat
   ```

### Option B: Use a Proxy (Alternative)

Create an API route to proxy Supabase requests:

```typescript
// app/api/supabase/[...path]/route.ts
export async function POST(req: Request) {
  const path = req.url.split('/api/supabase/')[1];
  const response = await fetch(
    `https://nhadlfbxbivlhtkbolve.supabase.co/${path}`,
    {
      method: 'POST',
      headers: req.headers,
      body: await req.text()
    }
  );
  return response;
}
```

## Step 5: Update Application Code

### Update any hardcoded URLs:

1. Search for any instances of `localhost` or development URLs
2. Ensure all URLs use relative paths or environment variables

### Update CORS settings (if applicable):

```typescript
// In your API routes
headers.set('Access-Control-Allow-Origin', 'https://opent3.chat');
```

## Step 6: Pre-Deployment Checklist

- [ ] Remove all hardcoded credentials (completed in previous steps)
- [ ] Environment variables set in hosting platform
- [ ] Google OAuth URLs updated for opent3.chat
- [ ] Supabase Site URL updated
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Build passes locally: `npm run build`

## Step 7: Deploy

```bash
# If using Vercel CLI
vercel --prod

# Or push to main branch if connected to Git
git push origin main
```

## Step 8: Post-Deployment Verification

1. Visit https://opent3.chat
2. Test Google OAuth login flow
3. Verify anonymous user functionality
4. Check browser console for any errors
5. Test all AI model integrations

## Troubleshooting

### OAuth Redirect Issues:
- Ensure exact URL match in Google Console
- Check Supabase redirect URLs include `https://opent3.chat/**`

### Domain Not Working:
- Verify DNS propagation (can take up to 48 hours)
- Check SSL certificate is active
- Ensure proper CNAME/A records

### Supabase Connection Issues:
- Verify environment variables are set correctly
- Check Supabase project is not paused
- Ensure RLS policies are configured

## Security Considerations

1. **Never expose service role key** - Only use anon key in frontend
2. **Enable RLS** on all Supabase tables
3. **Use HTTPS** for all connections
4. **Implement rate limiting** for API routes
5. **Monitor usage** in Supabase dashboard

## Support

- Supabase Issues: Check [Supabase Status](https://status.supabase.com/)
- OAuth Issues: Review Google Cloud Console logs
- Deployment Issues: Check hosting platform logs

## Next Steps

After successful deployment:
1. Monitor application performance
2. Set up error tracking (e.g., Sentry)
3. Configure backup strategies
4. Plan for scaling if needed