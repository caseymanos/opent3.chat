import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { getAzureProvider } from '@/lib/azure-openai-provider'
import { getAzureAIProvider } from '@/lib/azure-ai-provider'
import { getVertexAIProvider } from '@/lib/vertex-ai-provider'
import { REASONING_SYSTEM_PROMPT } from '@/lib/reasoning'
import { OPENROUTER_MODEL_MAP } from '@/lib/openrouter'
import { getServerUsageTracker } from '@/lib/usage-tracker-server'
import { getModelById } from '@/lib/models'
import { responseCache } from '@/lib/response-cache'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'

const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // Always log errors

export async function POST(req: Request) {
  const timings: Record<string, number> = {}
  const startTime = Date.now()
  timings.requestStart = startTime
  
  const logTiming = (stage: string) => {
    timings[stage] = Date.now()
    const elapsed = timings[stage] - startTime
    log(`⏱️ [TIMING] ${stage}: ${elapsed}ms (total: ${elapsed}ms)`)
  }
  
  log('🚀 [CHAT API] Request received at', new Date().toISOString())
  logTiming('requestReceived')
  
  try {
    // Start processing request body immediately while auth check happens in parallel
    const contentType = req.headers.get('content-type') || ''
    
    // Create auth promise but don't await it yet
    logTiming('authStart')
    const supabase = createServerComponentClient<Database>({ cookies })
    const authPromise = supabase.auth.getUser()
    
    // Process request body while auth check happens
    let body: any = {}
    const attachedFiles: File[] = []
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with file attachments)
      const formData = await req.formData()
      
      // Parse the JSON fields
      const messagesStr = formData.get('messages') as string
      body = {
        messages: messagesStr ? JSON.parse(messagesStr) : [],
        conversationId: formData.get('conversationId') as string,
        model: (formData.get('model') as string) || 'gemini-2.5-flash-preview-05-20',
        provider: (formData.get('provider') as string) || 'google',
        ragContext: formData.get('ragContext') as string,
        useOpenRouter: formData.get('useOpenRouter') === 'true',
        openRouterApiKey: formData.get('openRouterApiKey') as string
      }
      
      // Extract files
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          attachedFiles.push(value)
        }
      }
    } else {
      // Handle JSON (no file attachments)
      body = await req.json()
    }
    
    logTiming('bodyParsed')
    
    const { 
      messages, 
      conversationId, 
      model = 'gemini-2.5-flash-preview-05-20', 
      provider = 'google', 
      ragContext,
      useOpenRouter = false,
      openRouterApiKey,
      userId
    } = body
    
    log('📝 [CHAT API] Request details:', {
      messagesCount: messages?.length,
      conversationId,
      model,
      provider,
      hasRAGContext: !!ragContext,
      ragContextLength: ragContext?.length || 0,
      attachedFilesCount: attachedFiles?.length || 0,
      contentType,
      useOpenRouter,
      hasOpenRouterKey: !!openRouterApiKey,
      firstMessage: messages?.[0]?.content?.substring(0, 100) + '...'
    })

    if (!conversationId) {
      logError('❌ [CHAT API] Missing conversationId')
      return new Response('Missing conversationId', { status: 400 })
    }
    
    // Quick model check to optimize for free models
    const modelInfo = getModelById(model)
    if (!modelInfo) {
      logError('❌ [USAGE] Model not found:', model)
      return new Response(
        JSON.stringify({
          error: `Model "${model}" not found`,
          type: 'model_not_found'
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    // Check if we have a valid API key for the provider
    const hasValidApiKey = () => {
      switch (provider) {
        case 'anthropic':
          const anthropicKey = process.env.ANTHROPIC_API_KEY
          return anthropicKey && anthropicKey !== 'your-anthropic-api-key' && anthropicKey.startsWith('sk-ant-')
        case 'openai':
          const openaiKey = process.env.OPENAI_API_KEY
          return openaiKey && openaiKey !== 'your-openai-api-key' && openaiKey.startsWith('sk-')
        case 'google':
          const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
          return googleKey && googleKey !== 'your-google-api-key'
        case 'azure':
          return !!getAzureProvider()
        case 'azure-ai':
          return !!getAzureAIProvider()
        case 'vertex-ai':
          return !!getVertexAIProvider()
        default:
          return false
      }
    }
    
    // For free models, skip auth entirely
    let user = null
    let userUsage = null
    
    // Skip auth if we have a valid API key for BYOK models or if it's a free model
    const skipAuth = modelInfo.tier === 'free' || modelInfo.tier === 'vertex-ai' || (modelInfo.tier === 'byok' && hasValidApiKey())
    
    if (skipAuth) {
      log('✅ [USAGE] Free model, Vertex AI model, or BYOK with API key - auth not required')
      logTiming('authSkipped')
      // Still get auth for vertex-ai to check if user is logged in
      if (modelInfo.tier === 'vertex-ai') {
        const { data: authData } = await authPromise
        user = authData?.user || null
        logTiming('authCompleted')
      }
    } else {
      // Only await auth for premium/special models without API keys
      const { data: authData, error: authError } = await authPromise
      user = authData?.user || null
      logTiming('authCompleted')
      
      log('🔐 [CHAT API] Auth check:', {
        hasUser: !!user,
        userId: user?.id,
        authError: authError?.message,
        isAnonymous: !user
      })
      
      // Anonymous users can't use premium/special models
      if (!user) {
        log('👤 [CHAT API] Anonymous user detected - premium models not available')
        return new Response(
          JSON.stringify({
            error: 'Premium models require sign-in. Please sign in or use free models like Gemini 2.5 Flash.',
            type: 'auth_required'
          }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Process messages with file attachments
    let processedMessages = messages || []
    
    // If no messages provided, this might be a new conversation
    if (!messages || messages.length === 0) {
      if (isDev) console.warn('⚠️ [CHAT API] No messages provided, using empty array')
      processedMessages = []
    }
    
    // Handle file attachments for the last user message
    if (attachedFiles && attachedFiles.length > 0) {
      log('📎 [FILES] Processing', attachedFiles.length, 'attached files')
      
      const lastUserMessageIndex = messages.findLastIndex((msg: { role: string }) => msg.role === 'user')
      
      if (lastUserMessageIndex >= 0) {
        processedMessages = [...messages]
        const lastMessage = processedMessages[lastUserMessageIndex]
        
        // Create enhanced message with file content
        const enhancedContent = []
        
        // Add original text content
        if (lastMessage.content && lastMessage.content.trim()) {
          enhancedContent.push({
            type: 'text',
            text: lastMessage.content
          })
        }
        
        // Process all files in parallel for better performance
        logTiming('fileProcessingStart')
        const fileProcessingPromises = attachedFiles.map(async (file) => {
          log('📎 [FILES] Processing file:', {
            name: file.name,
            type: file.type,
            size: file.size
          })
          
          if (file.type?.startsWith('image/')) {
            // Handle images - convert to base64
            const arrayBuffer = await file.arrayBuffer()
            // For large images, consider using streaming in the future
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            return {
              type: 'image',
              image: `data:${file.type};base64,${base64}`
            }
          } else {
            // Handle text-based files (TXT, MD, etc.)
            const text = await file.text()
            log('📄 [FILES] File content read:', {
              filename: file.name,
              contentLength: text.length,
              contentPreview: text.substring(0, 200) + '...'
            })
            
            return {
              type: 'text',
              text: `\n\n[File: ${file.name}]\n${text}`
            }
          }
        })
        
        // Wait for all files to be processed
        const processedFiles = await Promise.all(fileProcessingPromises)
        enhancedContent.push(...processedFiles)
        logTiming('fileProcessingCompleted')
        
        // Update the message with enhanced content
        processedMessages[lastUserMessageIndex] = {
          ...lastMessage,
          content: enhancedContent.length === 1 && enhancedContent[0].type === 'text' 
            ? enhancedContent[0].text 
            : enhancedContent
        }
        
        log('📎 [FILES] Enhanced last message with file content:', {
          enhancedContentLength: enhancedContent.length,
          finalMessageContent: JSON.stringify(processedMessages[lastUserMessageIndex].content).substring(0, 500) + '...'
        })
      }
    }

    // Usage tracking for non-free models
    const currentUserId = user?.id
    const tracker = getServerUsageTracker()
    
    // Skip usage checks if we have a valid API key for BYOK models
    const skipUsageCheck = modelInfo.tier === 'free' || (modelInfo.tier === 'byok' && hasValidApiKey())
    
    if (!skipUsageCheck) {
      // For vertex-ai models, allow anonymous users but check limits
      if (modelInfo.tier === 'vertex-ai') {
        logTiming('usageCheckStart')
        userUsage = await tracker.getUsage(currentUserId)
        const canUse = await tracker.canUseModel(currentUserId, modelInfo.tier, modelInfo.id)
        logTiming('usageCheckCompleted')
        
        if (!canUse) {
          log('🚫 [USAGE] Vertex AI model access denied:', {
            userId: currentUserId,
            isAnonymous: !currentUserId,
            usage: userUsage
          })
          
          const errorMessage = currentUserId 
            ? 'You have reached your daily limit. Please try again tomorrow or use a free model.'
            : 'Anonymous users have reached the 10 calls/day limit for Vertex AI models. Please sign in for more calls or use free models.'
          
          return new Response(
            JSON.stringify({
              error: errorMessage,
              type: 'usage_limit_exceeded',
              usage: {
                used: userUsage?.premiumCalls || 0,
                limit: currentUserId ? 18 : 10,
                resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
              }
            }),
            { 
              status: 429, 
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      } else if (!currentUserId) {
        // Premium/special models require authentication
        log('🚫 [USAGE] Authentication required for premium/special models')
        return new Response(
          JSON.stringify({
            error: 'Premium models require sign-in. Please sign in or use free models like Gemini 2.5 Flash.',
            type: 'auth_required'
          }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json' }
          }
        )
      } else {
        // Check usage for premium/special models
        logTiming('usageCheckStart')
        userUsage = await tracker.getUsage(currentUserId)
        const canUse = await tracker.canUseModelWithUsage(currentUserId, modelInfo.tier, userUsage)
        logTiming('usageCheckCompleted')
        
        if (!canUse) {
          log('🚫 [USAGE] Model access denied:', {
          model,
          tier: modelInfo.tier,
          premiumCalls: userUsage.premiumCalls,
          byokEnabled: userUsage.byokEnabled,
          userId: currentUserId
        })
        
        let errorMessage = 'Access denied to this model.'
        if (modelInfo.tier === 'premium') {
          errorMessage = `Premium model limit reached. You have used ${userUsage.premiumCalls}/10 free calls for premium models. Please use free models or enable BYOK.`
        } else if (modelInfo.tier === 'special') {
          errorMessage = `Special tier model limit reached. You have used ${userUsage.specialCalls}/2 free calls for Claude 4 Sonnet. Please use free models or enable BYOK.`
        } else if (modelInfo.tier === 'byok') {
          errorMessage = 'This model requires BYOK (Bring Your Own Key) to be enabled in settings or a valid API key in environment.'
        }
        
        return new Response(
          JSON.stringify({
            error: errorMessage,
            type: 'usage_limit',
            modelTier: modelInfo.tier,
            usage: {
              premiumCalls: userUsage.premiumCalls,
              specialCalls: userUsage.specialCalls,
              remaining: modelInfo.tier === 'special' 
                ? Math.max(0, 2 - userUsage.specialCalls)
                : Math.max(0, 10 - userUsage.premiumCalls)
            }
          }),
          { 
            status: 429, 
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Check cache for common queries first
    const lastUserMessage = messages?.[messages.length - 1]
    if (lastUserMessage?.role === 'user' && typeof lastUserMessage.content === 'string') {
      const query = lastUserMessage.content
      
      if (responseCache.shouldCache(query)) {
        logTiming('cacheCheckStart')
        const cachedResponse = responseCache.get(query, model, provider)
        logTiming('cacheCheckCompleted')
        
        if (cachedResponse) {
          log('🚀 [CACHE] Returning cached response, skipping AI call')
          
          // Return cached response in AI SDK stream format
          const encoder = new TextEncoder()
          const messageId = `msg-${Math.random().toString(36).substring(2)}`
          
          const stream = new ReadableStream({
            start(controller) {
              // Send message ID
              controller.enqueue(encoder.encode(`f:{"messageId":"${messageId}"}\n`))
              
              // Send cached content
              const escapedContent = cachedResponse.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
              controller.enqueue(encoder.encode(`0:"${escapedContent}"\n`))
              
              // Send finish message
              controller.enqueue(encoder.encode(`e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0},"isContinued":false}\n`))
              controller.enqueue(encoder.encode(`d:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`))
              
              controller.close()
            }
          })
          
          const totalTime = Date.now() - startTime
          log('📊 [CACHE PERFORMANCE]', { totalTime: `${totalTime}ms`, source: 'cache' })
          
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'X-Vercel-AI-Data-Stream': 'v1'
            }
          })
        }
      }
    }

    // Multi-provider support with OpenRouter integration
    logTiming('aiProviderInitStart')
    try {
      let result: any = null
      
      // Start initializing the AI provider early to reduce latency
      let aiProvider: any = null
      
      // Check if we should use Azure AI (Gemini models)
      const azureAIProvider = getAzureAIProvider()
      if (azureAIProvider && azureAIProvider.isAvailable && provider === 'azure-ai') {
        log('🌟 [AZURE AI] Using Azure AI Studio (Gemini)')
        logTiming('aiProviderInitCompleted')
        
        log('🤖 [AZURE AI] Starting API call with model:', model)
        logTiming('aiCallStart')
        
        try {
          result = await streamText({
            model: azureAIProvider.provider(model),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: (errorObj: any) => {
              logError('🚨 [AZURE AI STREAM ERROR]:', errorObj);
            }
          })
        } catch (azureAIError) {
          logError('❌ [AZURE AI] Failed:', azureAIError)
          result = null
        }
      }
      
      // Check if we should use Azure OpenAI
      if (!result) {
        const azureProvider = getAzureProvider()
        if (azureProvider && azureProvider.isAvailable && provider === 'azure') {
          log('🔷 [AZURE] Using Azure OpenAI')
          logTiming('aiProviderInitCompleted')
          
          log('🤖 [AZURE] Starting API call with deployment:', azureProvider.deploymentName)
          logTiming('aiCallStart')
          
          try {
            result = await streamText({
              model: azureProvider.provider(azureProvider.deploymentName),
              messages: processedMessages,
              system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
              temperature: 0.7,
              maxTokens: 4000,
              onError: (errorObj: any) => {
                logError('🚨 [AZURE STREAM ERROR]:', errorObj);
              }
            })
          } catch (azureError) {
            logError('❌ [AZURE] Failed, falling back to other providers:', azureError)
            result = null
          }
        }
      }
      
      // Check if we should use OpenRouter
      if (!result && useOpenRouter && openRouterApiKey) {
        log('🌐 [OPENROUTER] Using OpenRouter for model:', model)
        
        const openRouterModelId = OPENROUTER_MODEL_MAP[model]
        if (!openRouterModelId) {
          throw new Error(`Model ${model} not available on OpenRouter`)
        }
        
        const openRouter = createOpenRouter({
          apiKey: openRouterApiKey,
          extraBody: {
            'HTTP-Referer': 'https://t3-crusher.vercel.app',
            'X-Title': 'T3 Crusher - Open Source AI Chat'
          }
        })
        
        aiProvider = openRouter(openRouterModelId)
        logTiming('aiProviderInitCompleted')
        
        log('🤖 [OPENROUTER] Starting API call with model:', openRouterModelId)
        logTiming('aiCallStart')
        result = await streamText({
          model: aiProvider,
          messages: processedMessages,
          system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
          temperature: 0.7,
          maxTokens: 4000,
          onError: (errorObj: any) => {
            logError('🚨 [OPENROUTER STREAM ERROR]:', errorObj);
          }
        })
      } else if (provider === 'anthropic') {
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        log('🔑 [ANTHROPIC] API Key check:', {
          hasKey: !!anthropicKey,
          keyPrefix: anthropicKey?.substring(0, 10) + '...',
          keyLength: anthropicKey?.length,
          startsWithCorrectPrefix: anthropicKey?.startsWith('sk-ant-'),
        })
        
        if (anthropicKey && anthropicKey !== 'your-anthropic-api-key' && anthropicKey.startsWith('sk-ant-')) {
          logTiming('aiProviderInitCompleted')
          
          // Map claude-4-sonnet to the actual Anthropic model ID
          let anthropicModelId = model
          if (model === 'claude-4-sonnet') {
            anthropicModelId = 'claude-3-5-sonnet-20241022' // Using Claude 3.5 Sonnet as Claude 4 Sonnet
            log('🔄 [ANTHROPIC] Mapping claude-4-sonnet to:', anthropicModelId)
          }
          
          log('🤖 [ANTHROPIC] Starting API call with model:', anthropicModelId)
          logTiming('aiCallStart')
          result = await streamText({
            model: anthropic(anthropicModelId),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: (errorObj: any) => {
              logError('🚨 [ANTHROPIC STREAM ERROR]:', errorObj);
            }
          })
        } else {
          throw new Error('Invalid Anthropic API key')
        }
      } else if (provider === 'openai') {
        const openaiKey = process.env.OPENAI_API_KEY
        log('🔑 [OPENAI] API Key check:', {
          hasKey: !!openaiKey,
          keyPrefix: openaiKey?.substring(0, 10) + '...',
          keyLength: openaiKey?.length,
          startsWithCorrectPrefix: openaiKey?.startsWith('sk-'),
        })
        
        if (openaiKey && openaiKey !== 'your-openai-api-key' && openaiKey.startsWith('sk-')) {
          logTiming('aiProviderInitCompleted')
          log('🤖 [OPENAI] Starting API call with model:', model)
          logTiming('aiCallStart')
          result = await streamText({
            model: openai(model),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: (errorObj: any) => {
              logError('🚨 [OPENAI STREAM ERROR]:', errorObj);
            }
          })
        } else {
          throw new Error('Invalid OpenAI API key')
        }
      } else if (provider === 'google') {
        const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
        log('🔑 [GOOGLE] API Key check:', {
          hasKey: !!googleKey,
          keyLength: googleKey?.length,
        })
        
        if (googleKey && googleKey !== 'your-google-api-key') {
          logTiming('aiProviderInitCompleted')
          log('🤖 [GOOGLE] Starting API call with model:', model)
          logTiming('aiCallStart')
          
          result = await streamText({
            model: google(model),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: (errorObj: any) => {
              logError('🚨 [STREAM TEXT ERROR]:', errorObj);
            }
          })
        } else {
          throw new Error('Invalid Google API key')
        }
      } else if (provider === 'vertex-ai') {
        const vertexProvider = getVertexAIProvider()
        log('🔑 [VERTEX AI] Provider check:', {
          hasProvider: !!vertexProvider,
          isAvailable: vertexProvider?.isAvailable,
        })
        
        if (vertexProvider && vertexProvider.isAvailable) {
          logTiming('aiProviderInitCompleted')
          const vertexModelId = vertexProvider.getModelId(model)
          log('🤖 [VERTEX AI] Starting API call with model:', { 
            requestedModel: model, 
            vertexModelId,
            projectId: vertexProvider.projectId,
            location: vertexProvider.location
          })
          logTiming('aiCallStart')
          
          try {
            result = await streamText({
              model: vertexProvider.provider(vertexModelId),
              messages: processedMessages,
              system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
              temperature: 0.7,
              maxTokens: 4000,
              onError: (errorObj: any) => {
                logError('🚨 [VERTEX AI STREAM ERROR]:', errorObj);
              }
            })
          } catch (vertexError: any) {
            logError('❌ [VERTEX AI] Error details:', {
              message: vertexError?.message,
              stack: vertexError?.stack,
              cause: vertexError?.cause,
              vertexModelId,
              projectId: vertexProvider.projectId
            })
            throw new Error(`Vertex AI error: ${vertexError?.message || 'Unknown error'}`)
          }
        } else {
          throw new Error('Vertex AI is not configured. Please set up Google Cloud credentials.')
        }
      }

      // If no result was generated, throw an error
      if (!result) {
        throw new Error(`Provider ${provider} is not configured or unavailable`)
      }

      logTiming('aiCallCompleted')
      
      const actualProvider = useOpenRouter ? 'OPENROUTER' : provider.toUpperCase()
      log(`✅ [${actualProvider}] API call successful, returning stream response`)
      
      // Log detailed timing breakdown
      const totalTime = Date.now() - startTime
      log('📊 [PERFORMANCE SUMMARY]', {
        totalTime: `${totalTime}ms`,
        breakdown: {
          auth: timings.authCompleted ? `${timings.authCompleted - timings.authStart}ms` : 'skipped',
          bodyParsing: `${timings.bodyParsed - timings.requestReceived}ms`,
          fileProcessing: timings.fileProcessingCompleted ? `${timings.fileProcessingCompleted - timings.fileProcessingStart}ms` : 'none',
          usageCheck: timings.usageCheckCompleted ? `${timings.usageCheckCompleted - timings.usageCheckStart}ms` : 'skipped',
          aiProviderInit: `${timings.aiProviderInitCompleted - timings.aiProviderInitStart}ms`,
          aiCall: `${timings.aiCallCompleted - timings.aiCallStart}ms`
        }
      })
      
      // Increment usage for non-free models
      if (modelInfo && modelInfo.tier !== 'free' && modelInfo.tier !== 'byok') {
        // For vertex-ai models, increment usage for both anonymous and logged-in users
        if (modelInfo.tier === 'vertex-ai') {
          // Get usage data if we don't have it
          if (!userUsage) {
            userUsage = await tracker.getUsage(currentUserId)
          }
          // Always increment for vertex-ai (anonymous users use their localStorage tracking)
          await tracker.incrementUsageWithData(currentUserId || 'anonymous', model, userUsage, 'premium')
          log(`📊 [USAGE] Incremented vertex-ai call count for user:`, currentUserId || 'anonymous')
        } else if (currentUserId) {
          // Premium and special tier models - only for logged-in users
          if (!userUsage) {
            userUsage = await tracker.getUsage(currentUserId)
          }
          if (!userUsage.byokEnabled) {
            await tracker.incrementUsageWithData(currentUserId, model, userUsage, modelInfo.tier as 'premium' | 'special')
            log(`📊 [USAGE] Incremented ${modelInfo.tier} call count for user:`, currentUserId)
          }
        }
      }
      
      try {
        const response = result.toDataStreamResponse({
          getErrorMessage: (error: any) => {
            if (isDev) logError('🔍 [STREAM ERROR] Unmasked error:', error);
            if (isDev) logError('🔍 [STREAM ERROR] Error type:', typeof error);
            if (isDev) logError('🔍 [STREAM ERROR] Error details:', {
              message: error?.message,
              name: error?.name,
              stack: error?.stack,
              cause: error?.cause
            });
            return `Stream processing error: ${error?.message || error}`;
          }
        })
        
        // Cache the response for future requests if it's cacheable
        if (lastUserMessage?.role === 'user' && typeof lastUserMessage.content === 'string') {
          const query = lastUserMessage.content
          if (responseCache.shouldCache(query)) {
            // Get the full response text for caching
            result.text.then((fullText: string) => {
              if (fullText && fullText.length > 50) {
                responseCache.set(query, model, provider, fullText)
              }
            }).catch(() => {
              // Ignore cache errors
            })
          }
        }
        
        // Return response immediately without cloning for better performance
        return response
      } catch (streamError) {
        logError('❌ [CHAT API] Error creating stream response:', streamError)
        
        // Try to get the text response instead
        try {
          const textResult = await result.text
          log('📝 [CHAT API] Fallback to text response:', textResult?.substring(0, 100) + '...')
          
          return new Response(
            JSON.stringify({
              text: textResult,
              type: 'text_fallback'
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        } catch (textError) {
          logError('❌ [CHAT API] Text fallback also failed:', textError)
          
          // Final fallback to error response
          return new Response(
            JSON.stringify({ 
              error: 'Both streaming and text response failed. Please try again.',
              type: 'stream_error',
              originalError: streamError instanceof Error ? streamError.message : 'Unknown stream error'
            }),
            { 
              status: 500,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      }
    } catch (aiError) {
      logError(`❌ [${provider.toUpperCase()}] API call failed:`, {
        error: aiError,
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : undefined,
        model,
        provider,
        userId: currentUserId,
        isAnonymous: !currentUserId
      })
      
      // More specific error messages based on the error
      let errorMessage = `${provider} API unavailable. Please check your API key and quota.`
      let errorType = 'api_error'
      
      if (aiError instanceof Error) {
        if (aiError.message.includes('API key')) {
          errorMessage = `Invalid or missing ${provider} API key. Please check your environment variables.`
          errorType = 'api_key_error'
        } else if (aiError.message.includes('quota') || aiError.message.includes('limit')) {
          errorMessage = `${provider} API quota exceeded. Please try again later or check your usage limits.`
          errorType = 'quota_error'
        } else if (aiError.message.includes('network') || aiError.message.includes('timeout')) {
          errorMessage = `Network error connecting to ${provider}. Please try again.`
          errorType = 'network_error'
        } else {
          errorMessage = `${provider} API error: ${aiError.message}`
        }
      }
      
      // Fallback error response
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          type: errorType,
          provider,
          originalError: aiError instanceof Error ? aiError.message : 'Unknown error',
          details: {
            timestamp: new Date().toISOString(),
            model,
            isAnonymous: !currentUserId
          }
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    logError('Error in chat API:', error)
    return new Response('Internal server error', { status: 500 })
  }
}