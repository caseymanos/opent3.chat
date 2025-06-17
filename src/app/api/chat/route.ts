import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { REASONING_SYSTEM_PROMPT } from '@/lib/reasoning'
import { OPENROUTER_MODEL_MAP } from '@/lib/openrouter'
import { getServerUsageTracker } from '@/lib/usage-tracker-server'
import { getModelById } from '@/lib/models'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log('🚀 [CHAT API] Request received at', new Date().toISOString())
  
  try {
    // Start processing request body immediately while auth check happens in parallel
    const contentType = req.headers.get('content-type') || ''
    
    // Create auth promise but don't await it yet
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
    
    console.log('📝 [CHAT API] Request details:', {
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
      console.error('❌ [CHAT API] Missing conversationId')
      return new Response('Missing conversationId', { status: 400 })
    }
    
    // Now await the auth result
    const { data: { user }, error: authError } = await authPromise
    
    console.log('🔐 [CHAT API] Auth check:', {
      hasUser: !!user,
      userId: user?.id,
      authError: authError?.message,
      isAnonymous: !user
    })
    
    // Anonymous users are allowed - don't treat auth errors as failures for them
    if (!user) {
      console.log('👤 [CHAT API] Anonymous user detected - proceeding with free model access only')
    }

    // Process messages with file attachments
    let processedMessages = messages || []
    
    // If no messages provided, this might be a new conversation
    if (!messages || messages.length === 0) {
      console.warn('⚠️ [CHAT API] No messages provided, using empty array')
      processedMessages = []
    }
    
    // Handle file attachments for the last user message
    if (attachedFiles && attachedFiles.length > 0) {
      console.log('📎 [FILES] Processing', attachedFiles.length, 'attached files')
      
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
        
        // Add file contents
        for (const file of attachedFiles) {
          console.log('📎 [FILES] Processing file:', {
            name: file.name,
            type: file.type,
            size: file.size
          })
          
          if (file.type?.startsWith('image/')) {
            // Handle images - convert to base64
            const arrayBuffer = await file.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            enhancedContent.push({
              type: 'image',
              image: `data:${file.type};base64,${base64}`
            })
          } else {
            // Handle text-based files (TXT, MD, etc.)
            const text = await file.text()
            console.log('📄 [FILES] File content read:', {
              filename: file.name,
              contentLength: text.length,
              contentPreview: text.substring(0, 200) + '...'
            })
            
            enhancedContent.push({
              type: 'text',
              text: `\n\n[File: ${file.name}]\n${text}`
            })
          }
        }
        
        // Update the message with enhanced content
        processedMessages[lastUserMessageIndex] = {
          ...lastMessage,
          content: enhancedContent.length === 1 && enhancedContent[0].type === 'text' 
            ? enhancedContent[0].text 
            : enhancedContent
        }
        
        console.log('📎 [FILES] Enhanced last message with file content:', {
          enhancedContentLength: enhancedContent.length,
          finalMessageContent: JSON.stringify(processedMessages[lastUserMessageIndex].content).substring(0, 500) + '...'
        })
      }
    }

    // Quick model tier check without database calls for free models
    const modelInfo = getModelById(model)
    const currentUserId = user?.id // Use authenticated user
    
    console.log('🔍 [USAGE] Checking model access:', {
      model,
      modelInfo: modelInfo ? { id: modelInfo.id, tier: modelInfo.tier } : 'NOT_FOUND',
      userId: currentUserId,
      isAnonymous: !currentUserId
    })
    
    if (!modelInfo) {
      console.error('❌ [USAGE] Model not found:', model)
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
    
    // Store usage data to avoid multiple queries
    let userUsage: { premiumCalls: number; byokEnabled: boolean } | null = null
    const tracker = getServerUsageTracker()
    
    // Skip database calls for free models - they're always allowed
    if (modelInfo.tier === 'free') {
      console.log('✅ [USAGE] Free model - skipping usage checks')
    } else {
      // Only check usage for premium/byok models
      // Get usage data once and reuse it
      userUsage = await tracker.getUsage(currentUserId)
      const canUse = await tracker.canUseModelWithUsage(currentUserId, modelInfo.tier, userUsage)
      
      if (!canUse) {
        console.log('🚫 [USAGE] Model access denied:', {
          model,
          tier: modelInfo.tier,
          premiumCalls: userUsage.premiumCalls,
          byokEnabled: userUsage.byokEnabled,
          userId: currentUserId,
          isAnonymous: !currentUserId
        })
        
        let errorMessage = 'Access denied to this model.'
        if (modelInfo.tier === 'premium') {
          if (!currentUserId) {
            errorMessage = 'Premium models require sign-in. Please sign in or use free models like Gemini 2.5 Flash.'
          } else {
            errorMessage = `Premium model limit reached. You have used ${userUsage.premiumCalls}/10 free calls for premium models. Please use free models or enable BYOK.`
          }
        } else if (modelInfo.tier === 'byok') {
          errorMessage = 'This model requires BYOK (Bring Your Own Key) to be enabled.'
        }
        
        return new Response(
          JSON.stringify({
            error: errorMessage,
            type: 'usage_limit',
            modelTier: modelInfo.tier,
            usage: {
              premiumCalls: userUsage.premiumCalls,
              remaining: Math.max(0, 10 - userUsage.premiumCalls)
            }
          }),
          { 
            status: 429, 
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Multi-provider support with OpenRouter integration
    try {
      let result
      
      // Start initializing the AI provider early to reduce latency
      let aiProvider: any = null
      
      // Check if we should use OpenRouter
      if (useOpenRouter && openRouterApiKey) {
        console.log('🌐 [OPENROUTER] Using OpenRouter for model:', model)
        
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
        
        console.log('🤖 [OPENROUTER] Starting API call with model:', openRouterModelId)
        result = await streamText({
          model: aiProvider,
          messages: processedMessages,
          system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
          temperature: 0.7,
          maxTokens: 4000,
          onError: ({ error }) => {
            console.error('🚨 [OPENROUTER STREAM ERROR]:', error?.message);
          }
        })
      } else if (provider === 'anthropic') {
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        console.log('🔑 [ANTHROPIC] API Key check:', {
          hasKey: !!anthropicKey,
          keyPrefix: anthropicKey?.substring(0, 10) + '...',
          keyLength: anthropicKey?.length,
          startsWithCorrectPrefix: anthropicKey?.startsWith('sk-ant-'),
        })
        
        if (anthropicKey && anthropicKey !== 'your-anthropic-api-key' && anthropicKey.startsWith('sk-ant-')) {
          console.log('🤖 [ANTHROPIC] Starting API call with model:', model)
          result = await streamText({
            model: anthropic(model),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: ({ error }) => {
              console.error('🚨 [ANTHROPIC STREAM ERROR]:', error?.message);
            }
          })
        } else {
          throw new Error('Invalid Anthropic API key')
        }
      } else if (provider === 'openai') {
        const openaiKey = process.env.OPENAI_API_KEY
        console.log('🔑 [OPENAI] API Key check:', {
          hasKey: !!openaiKey,
          keyPrefix: openaiKey?.substring(0, 10) + '...',
          keyLength: openaiKey?.length,
          startsWithCorrectPrefix: openaiKey?.startsWith('sk-'),
        })
        
        if (openaiKey && openaiKey !== 'your-openai-api-key' && openaiKey.startsWith('sk-')) {
          console.log('🤖 [OPENAI] Starting API call with model:', model)
          result = await streamText({
            model: openai(model),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: ({ error }) => {
              console.error('🚨 [OPENAI STREAM ERROR]:', error?.message);
            }
          })
        } else {
          throw new Error('Invalid OpenAI API key')
        }
      } else if (provider === 'google') {
        const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
        console.log('🔑 [GOOGLE] API Key check:', {
          hasKey: !!googleKey,
          keyLength: googleKey?.length,
        })
        
        if (googleKey && googleKey !== 'your-google-api-key') {
          console.log('🤖 [GOOGLE] Starting API call with model:', model)
          
          result = await streamText({
            model: google(model),
            messages: processedMessages,
            system: "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.",
            temperature: 0.7,
            maxTokens: 4000,
            onError: ({ error }) => {
              console.error('🚨 [STREAM TEXT ERROR]:', error?.message);
            }
          })
        } else {
          throw new Error('Invalid Google API key')
        }
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      const actualProvider = useOpenRouter ? 'OPENROUTER' : provider.toUpperCase()
      console.log(`✅ [${actualProvider}] API call successful, returning stream response`)
      console.log('⏱️ [CHAT API] Total request time:', Date.now() - startTime, 'ms')
      
      // Increment usage for premium models
      if (modelInfo && modelInfo.tier === 'premium' && currentUserId) {
        // Reuse the usage data we already fetched (or fetch it now if it's a free model)
        if (!userUsage) {
          userUsage = await tracker.getUsage(currentUserId)
        }
        if (!userUsage.byokEnabled) {
          await tracker.incrementUsageWithData(currentUserId, model, userUsage)
          console.log('📊 [USAGE] Incremented premium call count for user:', currentUserId)
        }
      }
      
      try {
        const response = result.toDataStreamResponse({
          getErrorMessage: (error) => {
            console.error('🔍 [STREAM ERROR] Unmasked error:', error);
            console.error('🔍 [STREAM ERROR] Error type:', typeof error);
            console.error('🔍 [STREAM ERROR] Error details:', {
              message: error?.message,
              name: error?.name,
              stack: error?.stack,
              cause: error?.cause
            });
            return `Stream processing error: ${error?.message || error}`;
          }
        })
        
        console.log('📤 [CHAT API] Response headers:', Object.fromEntries(response.headers.entries()))
        console.log('📤 [CHAT API] Response status:', response.status)
        
        // Add debugging for the response body
        const responseClone = response.clone()
        if (responseClone.body) {
          console.log('📤 [CHAT API] Response has body, checking stream...')
        }
        
        return response
      } catch (streamError) {
        console.error('❌ [CHAT API] Error creating stream response:', streamError)
        
        // Try to get the text response instead
        try {
          const textResult = await result.text
          console.log('📝 [CHAT API] Fallback to text response:', textResult?.substring(0, 100) + '...')
          
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
          console.error('❌ [CHAT API] Text fallback also failed:', textError)
          
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
      console.error(`❌ [${provider.toUpperCase()}] API call failed:`, {
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
    console.error('Error in chat API:', error)
    return new Response('Internal server error', { status: 500 })
  }
}