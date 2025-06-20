import { createVertex } from '@ai-sdk/google-vertex'
import { logger } from './logger'

export interface VertexAIConfig {
  projectId?: string
  location?: string
  serviceAccountKey?: string | object
}

interface VertexAICredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url: string
  client_x509_cert_url: string
}

export function getVertexAIProvider(config?: VertexAIConfig) {
  try {
    // First, let's check what environment variables are actually available
    // Check for Google Cloud credentials
    const projectId = config?.projectId || process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID
    const location = config?.location || process.env.GOOGLE_VERTEX_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
    
    if (!projectId) {
      logger.error('No Google Vertex project ID found')
      return null;
    }
    
    // Parse service account key from environment or config
    let credentials: VertexAICredentials | undefined
    
    if (config?.serviceAccountKey) {
      if (typeof config.serviceAccountKey === 'string') {
        try {
          credentials = JSON.parse(config.serviceAccountKey)
        } catch (error) {
          logger.error('Failed to parse service account key from config:', error)
          return null
        }
      } else {
        credentials = config.serviceAccountKey as VertexAICredentials
      }
    } else if (process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY)
      } catch (error) {
        logger.error('Failed to parse GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY:', error)
        return null
      }
    } else if (process.env.GOOGLE_VERTEX_AI_CREDENTIALS) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_VERTEX_AI_CREDENTIALS)
      } catch (error) {
        logger.error('Failed to parse GOOGLE_VERTEX_AI_CREDENTIALS:', error)
        return null
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // File path to service account key
      logger.info('Using GOOGLE_APPLICATION_CREDENTIALS file path')
    }
    
    // Create the vertex provider instance
    const vertex = createVertex({
      project: projectId,
      location,
      // Pass credentials if available
      ...(credentials && {
        googleAuthOptions: {
          credentials,
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        }
      })
    })
    
    logger.info('✅ Vertex AI provider initialized', { projectId, location })
    
    // Return the provider
    return {
      vertex,
      projectId,
      location,
      isAvailable: true,
      // Map Gemini model names to Vertex AI model IDs
      getModelId: (modelName: string): string => {
        // Handle model name mappings
        const modelMap: Record<string, string> = {
          'gemini-2.5-flash-vertex': 'gemini-2.0-flash-001',
          'gemini-2.5-flash-lite-vertex': 'gemini-2.0-flash-lite',
          'gemini-2.5-flash': 'gemini-2.0-flash-001',
          'gemini-2.5-flash-lite': 'gemini-2.0-flash-lite',
          'gemini-2.0-flash': 'gemini-2.0-flash-001',
          'gemini-1.5-flash': 'gemini-1.5-flash-001',
          'gemini-1.5-pro': 'gemini-1.5-pro-001',
        }
        
        return modelMap[modelName] || modelName
      }
    }
  } catch (error) {
    console.error('❌ [Vertex AI Provider] Failed to create provider:', error)
    logger.error('Failed to create Vertex AI provider:', error)
    return null
  }
}

export function isVertexAIConfigured(): boolean {
  const hasProjectId = !!(
    process.env.GOOGLE_VERTEX_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT || 
    process.env.GCP_PROJECT_ID
  )
  
  const hasCredentials = !!(
    process.env.GOOGLE_VERTEX_AI_CREDENTIALS ||
    process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  )
  
  console.log('🔍 [Vertex AI Config Check]', {
    hasProjectId,
    hasCredentials,
    projectId: process.env.GOOGLE_VERTEX_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
    hasVertexCreds: !!process.env.GOOGLE_VERTEX_AI_CREDENTIALS,
    hasServiceAccountKey: !!process.env.GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY,
    hasAppCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
  })
  
  return hasProjectId && hasCredentials
}

// Helper function to validate service account key structure
export function validateServiceAccountKey(key: any): key is VertexAICredentials {
  return (
    key &&
    typeof key === 'object' &&
    typeof key.type === 'string' &&
    typeof key.project_id === 'string' &&
    typeof key.private_key === 'string' &&
    typeof key.client_email === 'string' &&
    key.type === 'service_account'
  )
}

// Helper to get Vertex AI model capabilities
export function getVertexAIModelCapabilities(modelId: string) {
  const capabilities = {
    'gemini-2.0-flash-001': {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsAudio: true,
      supportsVideo: true,
    },
    'gemini-2.0-flash-002': {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsAudio: false,
      supportsVideo: false,
    },
    'gemini-1.5-flash-001': {
      maxInputTokens: 1000000,
      maxOutputTokens: 8192,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsAudio: true,
      supportsVideo: true,
    },
    'gemini-1.5-pro-001': {
      maxInputTokens: 2000000,
      maxOutputTokens: 8192,
      supportsSystemPrompt: true,
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsAudio: true,
      supportsVideo: true,
    },
  }
  
  return capabilities[modelId as keyof typeof capabilities] || {
    maxInputTokens: 32000,
    maxOutputTokens: 4096,
    supportsSystemPrompt: true,
    supportsStreaming: true,
    supportsTools: false,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
  }
}