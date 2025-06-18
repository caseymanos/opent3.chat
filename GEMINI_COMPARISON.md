# Gemini Model Comparison Guide

## Three Ways to Access Gemini Models

### 1. Google AI Direct (Currently Working)
- **Provider**: `google`
- **Models**: `gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-2.5-flash-preview-05-20`
- **Setup**: Just need API key from [aistudio.google.com](https://aistudio.google.com)
- **Performance**: With paid billing enabled, expect <1s response times
- **Cost**: Pay-as-you-go directly to Google

### 2. Azure AI Studio (New Option)
- **Provider**: `azure-ai`
- **Model**: `gemini-2.5-flash-azure`
- **Setup**: Deploy Gemini in Azure AI Studio
- **Performance**: Potentially lower latency depending on region
- **Cost**: Pay through Azure billing

### 3. OpenRouter (BYOK)
- **Provider**: Set `useOpenRouter: true`
- **Models**: All Gemini models available
- **Setup**: Need OpenRouter API key
- **Performance**: Additional hop may add latency
- **Cost**: Small markup on top of base model costs

## Setting Up Azure AI Studio for Gemini

1. **Go to Azure AI Studio**: [ai.azure.com](https://ai.azure.com)

2. **Create AI Hub**:
   - Click "Create new hub"
   - Select subscription and resource group
   - Choose region closest to you
   - Name it (e.g., "my-ai-hub")

3. **Deploy Gemini Model**:
   - Go to "Model catalog"
   - Search for "Gemini"
   - Select "Gemini 2.5 Flash" 
   - Click "Deploy"
   - Choose "Serverless API" deployment
   - Name your deployment

4. **Get Credentials**:
   - Go to your deployment
   - Click "Keys and endpoint"
   - Copy:
     - Endpoint URL (e.g., `https://YOUR-DEPLOYMENT.eastus2.inference.ai.azure.com/v1/chat/completions`)
     - API Key

5. **Update .env.local**:
   ```env
   AZURE_AI_ENDPOINT=https://YOUR-DEPLOYMENT.eastus2.inference.ai.azure.com/v1/chat/completions
   AZURE_AI_API_KEY=your-actual-key
   ```

## Performance Testing Commands

Test all three Gemini providers:

```bash
# Test Google Direct (with paid billing)
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the capital of France?"}],
    "conversationId": "test-google-direct",
    "model": "gemini-2.5-flash-preview-05-20",
    "provider": "google"
  }'

# Test Azure AI Studio Gemini
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the capital of France?"}],
    "conversationId": "test-azure-gemini",
    "model": "gemini-2.5-flash-azure",
    "provider": "azure-ai"
  }'

# Test via OpenRouter
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is the capital of France?"}],
    "conversationId": "test-openrouter-gemini",
    "model": "gemini-2.5-flash-preview-05-20",
    "provider": "google",
    "useOpenRouter": true,
    "openRouterApiKey": "your-openrouter-key"
  }'
```

## Expected Performance Comparison

| Provider | Expected Latency | Pros | Cons |
|----------|-----------------|------|------|
| Google Direct | <1s | Fastest, direct to source | Requires Google billing |
| Azure AI | 1-2s | Azure infrastructure, unified billing | Additional setup required |
| OpenRouter | 2-3s | Easy multi-provider access | Extra hop, small markup |

## Which Should You Use?

- **For lowest latency**: Google Direct with paid billing
- **For enterprise/Azure users**: Azure AI Studio
- **For multi-provider flexibility**: OpenRouter
- **For cost optimization**: Compare pricing between Google and Azure

## Monitoring Performance

Check the server logs for timing information:
```
📊 [PERFORMANCE SUMMARY] {
  totalTime: '523ms',
  breakdown: {
    auth: 'skipped',
    bodyParsing: '18ms',
    aiProviderInit: '0ms',
    aiCall: '505ms'
  }
}
```