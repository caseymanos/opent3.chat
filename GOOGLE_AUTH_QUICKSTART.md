# Google Auth Quick Setup

## Your Project Details
- **Supabase URL**: `https://nhadlfbxbivlhtkbolve.supabase.co`
- **Callback URL**: `https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback`
- **Dashboard**: https://supabase.com/dashboard/project/nhadlfbxbivlhtkbolve/settings/auth

## Step 1: Google Cloud Console

1. Go to https://console.cloud.google.com/
2. Create new project or use existing
3. Enable **Google+ API**
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Add to Authorized redirect URIs:
     ```
     https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback
     ```
5. Copy your **Client ID** and **Client Secret**

## Step 2: Supabase Dashboard

1. Open https://supabase.com/dashboard/project/nhadlfbxbivlhtkbolve/settings/auth
2. Find **Google** provider
3. Toggle **Enable Sign in with Google** ON
4. Paste your:
   - Client ID
   - Client Secret
5. Click **Save**

## Step 3: Test

1. Run `npm run dev`
2. Go to http://localhost:3000/login
3. Click "Continue with Google"

That's it! The code is already set up to handle:
- Google sign-in
- Anonymous users
- Data migration when guests sign in
- User profile display