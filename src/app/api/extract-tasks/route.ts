import { NextRequest, NextResponse } from 'next/server'
import { createClientComponentClient } from '@/lib/supabase'
import { taskExtractor } from '@/lib/task-extractor'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { conversationId } = await request.json()
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    logger.group('extract-tasks API')
    logger.info('Extracting tasks for conversation', { conversationId })

    // Get messages from the conversation
    const supabase = createClientComponentClient()
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, role, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      logger.error('Failed to fetch messages', error)
      return NextResponse.json(
        { error: 'Failed to fetch conversation messages' },
        { status: 500 }
      )
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({
        tasks: [],
        summary: 'No messages found in conversation',
        totalTasksFound: 0,
        extractionMetadata: {
          conversationLength: 0,
          primaryTopics: [],
          urgencyLevel: 'low' as const,
          complexity: 'simple' as const
        }
      })
    }

    // Extract tasks using AI
    logger.info('About to extract tasks', { 
      messageCount: messages.length,
      firstMessage: typeof messages[0]?.content === 'string' 
        ? messages[0].content.substring(0, 100) + '...' 
        : 'Content not string type'
    })
    
    const result = await taskExtractor.extractTasks(messages)
    
    // Optionally save tasks to database for persistence
    // This could be implemented later with a tasks table
    
    logger.info('Task extraction successful', { 
      tasksFound: result.totalTasksFound,
      conversationLength: messages.length 
    })

    return NextResponse.json(result)

  } catch (error) {
    logger.error('Task extraction API error', error)
    return NextResponse.json(
      { 
        error: 'Failed to extract tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve cached tasks for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // For now, return empty result as we don't have persistent task storage yet
    // This could query a tasks table in the future
    return NextResponse.json({
      tasks: [],
      summary: 'No cached tasks found',
      totalTasksFound: 0,
      extractionMetadata: {
        conversationLength: 0,
        primaryTopics: [],
        urgencyLevel: 'low' as const,
        complexity: 'simple' as const
      }
    })

  } catch (error) {
    logger.error('Task retrieval API error', error)
    return NextResponse.json(
      { error: 'Failed to retrieve tasks' },
      { status: 500 }
    )
  }
}