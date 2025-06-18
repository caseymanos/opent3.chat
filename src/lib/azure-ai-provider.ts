import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export interface AzureAIConfig {
  endpoint: string
  apiKey: string
}

export function getAzureAIProvider(config?: AzureAIConfig) {
  // Check environment variables if config not provided
  const endpoint = config?.endpoint || process.env.AZURE_AI_ENDPOINT
  const apiKey = config?.apiKey || process.env.AZURE_AI_API_KEY

  if (!endpoint || !apiKey) {
    return null
  }

  try {
    // Azure AI Studio uses OpenAI-compatible API
    const azureAI = createOpenAICompatible({
      name: 'azure-ai',
      baseURL: endpoint,
      headers: {
        'api-key': apiKey,
      },
    })

    return {
      provider: azureAI,
      isAvailable: true
    }
  } catch (error) {
    console.error('Failed to create Azure AI provider:', error)
    return null
  }
}

export function isAzureAIConfigured(): boolean {
  return !!(
    process.env.AZURE_AI_ENDPOINT &&
    process.env.AZURE_AI_API_KEY
  )
}