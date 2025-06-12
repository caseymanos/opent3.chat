import { streamText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { REASONING_SYSTEM_PROMPT } from '@/lib/reasoning'

export async function POST(req: Request) {
  const startTime = Date.now()
  console.log('🚀 [CHAT API] Request received at', new Date().toISOString())
  
  try {
    // Check content type to handle both JSON and FormData
    const contentType = req.headers.get('content-type') || ''
    let body: any = {}
    let attachedFiles: File[] = []
    
    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with file attachments)
      const formData = await req.formData()
      
      // Parse the JSON fields
      const messagesStr = formData.get('messages') as string
      body = {
        messages: messagesStr ? JSON.parse(messagesStr) : [],
        conversationId: formData.get('conversationId') as string,
        model: (formData.get('model') as string) || 'claude-3-haiku-20240307',
        provider: (formData.get('provider') as string) || 'anthropic',
        ragContext: formData.get('ragContext') as string
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
    
    const { messages, conversationId, model = 'claude-3-haiku-20240307', provider = 'anthropic', ragContext } = body
    
    console.log('📝 [CHAT API] Request details:', {
      messagesCount: messages?.length,
      conversationId,
      model,
      provider,
      hasRAGContext: !!ragContext,
      ragContextLength: ragContext?.length || 0,
      attachedFilesCount: attachedFiles?.length || 0,
      contentType,
      firstMessage: messages?.[0]?.content?.substring(0, 100) + '...'
    })

    if (!messages || !conversationId) {
      console.error('❌ [CHAT API] Missing required fields:', { messages: !!messages, conversationId: !!conversationId })
      return new Response('Missing required fields', { status: 400 })
    }

    // Process messages with file attachments
    let processedMessages = messages
    
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
            messages: processedMessages,
            system: REASONING_SYSTEM_PROMPT,
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
            messages: processedMessages,
            system: REASONING_SYSTEM_PROMPT,
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