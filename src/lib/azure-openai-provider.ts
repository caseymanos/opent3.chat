import { createAzure } from '@ai-sdk/azure'

export interface AzureConfig {
  resourceName: string
  apiKey: string
  deploymentName: string
}

export function getAzureProvider(config?: AzureConfig) {
  // Check environment variables if config not provided
  const resourceName = config?.resourceName || process.env.AZURE_OPENAI_RESOURCE_NAME
  const apiKey = config?.apiKey || process.env.AZURE_OPENAI_API_KEY
  const deploymentName = config?.deploymentName || process.env.AZURE_OPENAI_DEPLOYMENT_NAME

  if (!resourceName || !apiKey || !deploymentName) {
    return null
  }

  try {
    const azure = createAzure({
      resourceName,
      apiKey,
    })

    return {
      provider: azure,
      deploymentName,
      isAvailable: true
    }
  } catch (error) {
    console.error('Failed to create Azure provider:', error)
    return null
  }
}

export function isAzureConfigured(): boolean {
  return !!(
    process.env.AZURE_OPENAI_RESOURCE_NAME &&
    process.env.AZURE_OPENAI_API_KEY &&
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME
  )
}