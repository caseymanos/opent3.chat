import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log('🚀 [FILE ANALYSIS API] Request received at', new Date().toISOString())
  
  try {
    const body = await req.json()
    const { fileContent, fileName, fileType, model = 'claude-3-haiku-20240307', provider = 'anthropic', analysisType = 'general' } = body
    
    console.log('📝 [FILE ANALYSIS API] Request details:', {
      fileName,
      fileType,
      model,
      provider,
      analysisType,
      contentLength: fileContent?.length
    })

    if (!fileContent || !fileName) {
      console.error('❌ [FILE ANALYSIS API] Missing required fields:', { 
        fileContent: !!fileContent, 
        fileName: !!fileName 
      })
      return new Response('Missing required fields', { status: 400 })
    }

    // Build analysis prompt based on file type and analysis type
    let analysisPrompt = ''
    
    if (fileType?.includes('image')) {
      analysisPrompt = `Please analyze this image file "${fileName}". Provide:
1. A detailed description of what you see
2. Key elements, text, or objects in the image
3. Any relevant insights or observations
4. A brief summary for future reference

Be thorough but concise.`
    } else if (fileType?.includes('pdf') || analysisType === 'document') {
      analysisPrompt = `Please analyze this document "${fileName}". Provide:
1. A comprehensive summary of the content
2. Key topics and main points
3. Important details or data
4. Structure and organization
5. A brief summary for future reference

Focus on extracting actionable information.`
    } else {
      analysisPrompt = `Please analyze this file "${fileName}" of type "${fileType}". Provide:
1. A detailed analysis of the content
2. Key insights and observations
3. Important information extracted
4. A summary for future reference

Be comprehensive and helpful.`
    }

    const messages = [
      {
        role: 'user' as const,
        content: fileType?.includes('image') ? [
          { type: 'text' as const, text: analysisPrompt },
          { type: 'image' as const, image: fileContent }
        ] : `${analysisPrompt}\n\nFile content:\n\n${fileContent}`
      }
    ]

    // Multi-provider support with selected model
    try {
      let result
      
      if (provider === 'anthropic') {
        const anthropicKey = process.env.ANTHROPIC_API_KEY
        console.log('🔑 [ANTHROPIC ANALYSIS] API Key check:', {
          hasKey: !!anthropicKey,
          keyPrefix: anthropicKey?.substring(0, 10) + '...',
          modelUsed: model,
        })
        
        if (anthropicKey && anthropicKey !== 'your-anthropic-api-key' && anthropicKey.startsWith('sk-ant-')) {
          console.log('🤖 [ANTHROPIC ANALYSIS] Starting file analysis with model:', model)
          result = await streamText({
            model: anthropic(model),
            messages,
            temperature: 0.3, // Lower temperature for more focused analysis
            maxTokens: 2000,
          })
        } else {
          throw new Error('Invalid Anthropic API key')
        }
      } else if (provider === 'openai') {
        const openaiKey = process.env.OPENAI_API_KEY
        console.log('🔑 [OPENAI ANALYSIS] API Key check:', {
          hasKey: !!openaiKey,
          keyPrefix: openaiKey?.substring(0, 10) + '...',
          modelUsed: model,
        })
        
        if (openaiKey && openaiKey !== 'your-openai-api-key' && openaiKey.startsWith('sk-')) {
          console.log('🤖 [OPENAI ANALYSIS] Starting file analysis with model:', model)
          result = await streamText({
            model: openai(model),
            messages,
            temperature: 0.3,
            maxTokens: 2000,
          })
        } else {
          throw new Error('Invalid OpenAI API key')
        }
      } else {
        throw new Error(`Unsupported provider: ${provider}`)
      }

      console.log(`✅ [${provider.toUpperCase()} ANALYSIS] File analysis successful, returning stream response`)
      console.log('⏱️ [FILE ANALYSIS API] Total request time:', Date.now() - startTime, 'ms')
      
      const response = result.toDataStreamResponse()
      console.log('📤 [FILE ANALYSIS API] Response headers:', Object.fromEntries(response.headers.entries()))
      
      return response
    } catch (aiError) {
      console.error(`❌ [${provider.toUpperCase()} ANALYSIS] File analysis failed:`, {
        error: aiError,
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : undefined
      })
      
      // Fallback error response
      return new Response(
        JSON.stringify({ 
          error: `${provider} file analysis unavailable. Please check your API key and quota.`,
          type: 'api_error',
          provider,
          details: {
            timestamp: new Date().toISOString(),
            fileName,
            fileType
          }
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('Error in file analysis API:', error)
    return new Response('Internal server error', { status: 500 })
  }
}