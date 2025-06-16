# Google Authentication Setup for T3 Crusher

## Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click and Enable it

4. Configure OAuth Consent Screen:
   - Go to "APIs & Services" → "OAuth consent screen"
   - Choose "External" user type
   - Fill in required fields:
     - App name: "T3 Crusher"
     - User support email: Your email
     - Developer contact: Your email
   - Add scopes:
     - `.../auth/userinfo.email`
     - `.../auth/userinfo.profile`
     - `openid`
   - Add test users if in development

5. Create OAuth 2.0 Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Name: "T3 Crusher Web"
   - Add Authorized JavaScript origins:
     ```
     http://localhost:3000
     http://localhost:3001
     https://t3-crusher.vercel.app
     https://t3-crusher-*.vercel.app
     ```
   - Add Authorized redirect URIs:
     ```
     https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback
     ```
   - Click "Create"
   - **Save your Client ID and Client Secret**

## Step 2: Configure Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/nhadlfbxbivlhtkbolve/settings/auth)
2. Navigate to Authentication → Providers
3. Find **Google** and expand it
4. Toggle **Enable Sign in with Google** to ON
5. Enter your credentials:
   - **Client ID**: (from Google Cloud Console)
   - **Client Secret**: (from Google Cloud Console)
6. The callback URL is already set to:
   ```
   https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback
   ```
7. Click **Save**

## Step 3: Update Environment Variables

Make sure your `.env.local` file has:
```env
NEXT_PUBLIC_SUPABASE_URL=https://nhadlfbxbivlhtkbolve.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oYWRsZmJ4Yml2bGh0a2JvbHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzMxMzIsImV4cCI6MjA2NTA0OTEzMn0.c3iSIX3NJv3gX8J1J4MNGKgU6ugv6VJE8ckE8mNc_F4
```

## Step 4: Test the Integration

1. Run your development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/login

3. Click "Continue with Google"

4. You should be redirected to Google's OAuth consent screen

5. After authorization, you'll be redirected back to /chat

## Production Deployment

For production on Vercel:

1. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. In Google Cloud Console, add your production domain to:
   - Authorized JavaScript origins:
     ```
     https://your-domain.vercel.app
     https://your-custom-domain.com
     ```

## Troubleshooting

- **"Redirect URI mismatch"**: Ensure the callback URL in Google matches exactly:
  ```
  https://nhadlfbxbivlhtkbolve.supabase.co/auth/v1/callback
  ```

- **"Access blocked: This app's request is invalid"**: 
  - Check that you've enabled the Google+ API
  - Verify all URLs are correctly added in Google Console

- **No redirect after Google login**:
  - Check browser console for errors
  - Verify Supabase Google provider is enabled
  - Ensure Client ID and Secret are correct

## Features Implemented

- ✅ Google OAuth sign-in
- ✅ Anonymous user support (Continue as Guest)
- ✅ Automatic migration of anonymous data to authenticated user
- ✅ User profile display in header
- ✅ Sign out functionality
- ✅ Session persistence across page reloads

## Security Notes

- The current RLS policies are permissive for development
- Users can only see their own conversations (filtered by user_id)
- Anonymous users get a session-based UUID
- Authenticated users use their Google account ID