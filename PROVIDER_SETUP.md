# AI Provider Setup Guide for T3 Crusher

## Quick Start

### 1. Google AI (Gemini) - Recommended for Speed
- **Free Tier**: Get API key from [aistudio.google.com](https://aistudio.google.com)
- **Paid Tier**: Enable billing at [console.cloud.google.com](https://console.cloud.google.com)
- **Performance**: 500-777ms response time (fastest)

### 2. Azure OpenAI - Enterprise Features
1. Create resource at [portal.azure.com](https://portal.azure.com)
2. Deploy model at [ai.azure.com](https://ai.azure.com)
3. Get credentials from "Keys and Endpoint"

### 3. Other Providers
- **OpenAI**: Direct API at [platform.openai.com](https://platform.openai.com)
- **Anthropic**: API keys at [console.anthropic.com](https://console.anthropic.com)

## Environment Variables

```env
# Google AI (Fastest)
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key

# Azure OpenAI (Enterprise)
AZURE_OPENAI_RESOURCE_NAME=your-resource-name
AZURE_OPENAI_API_KEY=your-azure-key
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini

# Direct APIs (BYOK)
OPENAI_API_KEY=sk-proj-...
ANTHROPIC_API_KEY=sk-ant-api03-...
```

## Model Recommendations

### Free Tier (No Login Required)
- `gemini-1.5-flash` - Best overall performance
- `gemini-2.0-flash` - Latest features
- `gpt-4o-mini-azure` - If Azure is configured

### Premium/BYOK Models
- `gpt-4o` - OpenAI's best
- `claude-3-5-sonnet` - Best for coding
- `gemini-2.5-pro-experimental` - Google's most advanced

## Testing Your Setup

```bash
# Test Google Gemini
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], 
       "conversationId": "test", 
       "model": "gemini-1.5-flash", 
       "provider": "google"}'

# Test Azure OpenAI
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}], 
       "conversationId": "test", 
       "model": "gpt-4o-mini-azure", 
       "provider": "azure"}'
```

## Performance Results

| Provider | Model | Response Time | Status |
|----------|-------|---------------|--------|
| Google | Gemini 1.5 Flash | 509ms | ✅ Fastest |
| Google | Gemini 2.0 Flash | 559ms | ✅ Fast |
| Azure | GPT-4o-mini | TBD | Needs config |
| OpenAI | GPT-4o | 3.8s | ✅ Working |
| Anthropic | Claude 3 Haiku | 4.0s | ✅ Working |

## Troubleshooting

### Google AI Issues
- **Slow responses**: Upgrade to paid tier
- **Rate limits**: Enable billing in Google Cloud Console

### Azure OpenAI Issues
- **"Resource not found"**: Check resource name spelling
- **"Invalid API key"**: Use KEY 1 or KEY 2 from Azure Portal
- **"Deployment not found"**: Verify deployment name matches

### General Issues
- **401 errors**: Check API keys are correct
- **429 errors**: Rate limit exceeded, wait or upgrade tier
- **500 errors**: Check provider status page