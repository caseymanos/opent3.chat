import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log('🚀 [CHAT API] Request received at', new Date().toISOString())
  
  try {
    const body = await req.json()
    const { messages, conversationId, model = 'claude-3-haiku-20240307', provider = 'anthropic' } = body
    
    console.log('📝 [CHAT API] Request details:', {
      messagesCount: messages?.length,
      conversationId,
      model,
      provider,
      firstMessage: messages?.[0]?.content?.substring(0, 100) + '...',
      requestBody: JSON.stringify(body, null, 2)
    })

    if (!messages || !conversationId) {
      console.error('❌ [CHAT API] Missing required fields:', { messages: !!messages, conversationId: !!conversationId })
      return new Response('Missing required fields', { status: 400 })
    }

    // Multi-provider support
    try {
      let result
      
      if (provider === 'anthropic') {
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
            messages,
            temperature: 0.7,
            maxTokens: 1000,
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
            messages,
            temperature: 0.7,
            maxTokens: 1000,
          })
        } else {
          throw new Error('Invalid OpenAI API key')
        }
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      console.log(`✅ [${provider.toUpperCase()}] API call successful, returning stream response`)
      console.log('⏱️ [CHAT API] Total request time:', Date.now() - startTime, 'ms')
      
      const response = result.toDataStreamResponse()
      console.log('📤 [CHAT API] Response headers:', Object.fromEntries(response.headers.entries()))
      
      return response
    } catch (aiError) {
      console.error(`❌ [${provider.toUpperCase()}] API call failed:`, {
        error: aiError,
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : undefined
      })
      
      // Fallback error response
      return new Response(
        JSON.stringify({ 
          error: `${provider} API unavailable. Please check your API key and quota.`,
          type: 'api_error',
          provider,
          details: {
            timestamp: new Date().toISOString()
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