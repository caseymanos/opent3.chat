# Tier System Implementation Summary

## Overview

This document summarizes the multi-provider tier system implementation for the T3 Clone AI chat application.

## Tier Structure

### 1. Free Tier (Anonymous Users)
- **Limit**: 10 calls/day
- **Models**: Vertex AI Gemini models only
  - `gemini-2.5-flash-vertex`
  - `gemini-2.5-flash-lite-vertex`
- **Provider**: Google Vertex AI
- **No authentication required**

### 2. Logged-in Tier
- **Total Limit**: 20 calls/day
  - 18 calls: General models (Gemini, GPT-4o-mini)
  - 2 calls: Claude 4 Sonnet (special allocation)
- **Models**:
  - All free tier models
  - `gpt-4o-mini` (Azure OpenAI)
  - `claude-4-sonnet` (Anthropic Direct API)
  - Additional Gemini models via Azure AI
- **Requires authentication**

### 3. BYOK (Bring Your Own Key) Tier
- **Limit**: Unlimited
- **Models**: All premium models via OpenRouter
  - GPT-4 with vision
  - Gemini 2.5 Pro
  - Claude 4 Sonnet with reasoning
  - Claude 4 Opus
  - And more...
- **User provides their own OpenRouter API key**

## Implementation Details

### Providers Configured

1. **Vertex AI Provider** (`/src/lib/vertex-ai-provider.ts`)
   - Google Cloud service account authentication
   - Supports Gemini 2.5 Flash and Flash Lite
   - Used for anonymous free tier

2. **Azure OpenAI** (existing)
   - Hosts GPT-4o-mini for logged-in users
   - Uses deployment-based configuration

3. **Anthropic Direct API** (existing)
   - Direct integration for Claude 4 Sonnet
   - Special 2-call daily limit

4. **OpenRouter** (existing)
   - Unified access for BYOK tier
   - Supports all premium models

### Usage Tracking

- **Daily Reset**: Usage resets at midnight UTC
- **Separate Counters**:
  - Premium calls (18/day for logged-in)
  - Special calls (2/day for Claude 4 Sonnet)
  - Anonymous calls (10/day for Vertex AI)
- **Storage**: 
  - Logged-in users: Supabase database
  - Anonymous users: localStorage

### UI Updates

1. **UsageCounter Component**
   - Shows X/10 for anonymous (Vertex AI only)
   - Shows X/20 for logged-in (with Y/2 Claude indicator)
   - Shows "Unlimited" for BYOK

2. **ModelSelector Component**
   - Tier badges (Free, Premium, Claude, Vertex AI, BYOK)
   - Clear availability messages
   - Usage remaining indicators

### API Route Logic

The `/api/chat` route now implements smart provider routing:
- Anonymous → Vertex AI only
- Logged-in → Provider based on model and availability
- BYOK → Always OpenRouter

## Environment Variables Required

```env
# For Vertex AI
GOOGLE_VERTEX_AI_CREDENTIALS=<service-account-json>
GOOGLE_CLOUD_PROJECT=<project-id>
GOOGLE_CLOUD_LOCATION=us-central1

# For Azure OpenAI (GPT-4o-mini)
AZURE_OPENAI_RESOURCE_NAME=<resource-name>
AZURE_OPENAI_API_KEY=<api-key>
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

# For Anthropic (Claude 4 Sonnet)
ANTHROPIC_API_KEY=sk-ant-<api-key>

```

## Database Migration

Run the following migrations:
```bash
# Add special_calls_used column
psql -f supabase/migrations/20250118_add_special_calls.sql

# Update for daily reset (if upgrading from 30-day reset)
psql -f supabase/migrations/20250618_daily_usage_reset.sql
```

## Testing

1. **Anonymous User Testing**:
   - Should only see Vertex AI models
   - Limited to 10 calls/day
   - Usage tracked in localStorage

2. **Logged-in User Testing**:
   - Access to all free and premium models
   - 18 general + 2 Claude calls/day
   - Usage tracked in database

3. **BYOK Testing**:
   - Enable BYOK and add OpenRouter API key
   - All models should be available
   - No usage limits

## Security Notes

- API keys are never exposed to the client
- Server-side validation of all model access
- Usage limits enforced on both client and server
- Provider selection happens server-side only