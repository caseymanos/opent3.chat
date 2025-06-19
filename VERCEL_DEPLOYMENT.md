# Vercel Deployment Guide for T3 Crusher

## Prerequisites

1. GitHub repository with your code
2. Vercel account (free tier works)
3. Supabase project for production
4. AI provider API keys based on your tier requirements

## Environment Variables for Vercel

Add these in your Vercel project settings under "Environment Variables":

### Required Variables

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your-production-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-supabase-anon-key

# Application
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NODE_ENV=production
NEXT_PUBLIC_APP_NAME=T3 Crusher
```

### AI Provider Variables (Choose based on your tier system)

#### Free Tier Models
```env
# Google Gemini (Free Tier)
GOOGLE_API_KEY=your-google-api-key

# Azure GPT-4o Mini (Free Tier)
AZURE_OPENAI_RESOURCE_NAME=your-azure-resource
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
```

#### Premium Tier Models (Optional)
```env
# Anthropic Claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key

# OpenAI GPT-4
OPENAI_API_KEY=sk-your-openai-key

# xAI Grok
XAI_API_KEY=your-xai-key

# Azure AI (for Gemini via Azure)
AZURE_AI_API_KEY=your-azure-ai-key
AZURE_AI_DEPLOYMENT_NAME=your-gemini-deployment
```

#### Google Vertex AI (Optional Alternative)
```env
# Option 1: Service account JSON
GOOGLE_VERTEX_AI_CREDENTIALS={"type":"service_account",...}

# Option 2: Service account file path
GOOGLE_VERTEX_AI_KEY_FILE=/path/to/service-account.json

GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
```

## Deployment Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Git Repository"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add all required variables from above
   - Make sure to set them for "Production" environment

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

## Post-Deployment Setup

### 1. Update Supabase Configuration
- Add your Vercel domain to Supabase Auth allowed URLs
- Update CORS settings if needed

### 2. Database Setup
Ensure your production Supabase has all migrations:
```sql
-- Run these in Supabase SQL editor
-- Apply schema from supabase/schema.sql
-- Apply policies from supabase/fix-policies.sql
-- Optional: Apply seed data from supabase/seed.sql
```

### 3. Enable Supabase Realtime
In Supabase dashboard:
- Go to Database → Replication
- Enable realtime for `messages` table

## Verification Checklist

- [ ] Application loads without errors
- [ ] Authentication works (sign up/sign in)
- [ ] Chat functionality works
- [ ] AI models connect properly
- [ ] Real-time updates work
- [ ] File uploads work (if using)
- [ ] Voice features work (if enabled)

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check logs for missing environment variables
   - Ensure all dependencies are in package.json

2. **AI Models Not Working**
   - Verify API keys are correct
   - Check function logs in Vercel dashboard

3. **Supabase Connection Issues**
   - Verify Supabase URL and anon key
   - Check Supabase project is not paused

4. **Real-time Not Working**
   - Ensure realtime is enabled for messages table
   - Check browser console for WebSocket errors

### Function Timeouts
The vercel.json is configured with appropriate timeouts:
- Chat API: 60 seconds
- File analysis: 60 seconds
- Task extraction: 30 seconds

These should handle most AI operations without issues.

## Monitoring

- Use Vercel Analytics to monitor performance
- Check Function logs for API errors
- Monitor Supabase usage dashboard
- Set up error tracking (e.g., Sentry) for production