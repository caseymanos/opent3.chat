import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  console.log('[API Conversations] Creating new conversation')
  
  try {
    const body = await req.json()
    const { 
      title = 'New Chat',
      model_provider = 'anthropic',
      model_name = 'claude-3-5-sonnet-20241022',
      system_prompt = null
    } = body
    
    const supabase = await createServerClient()
    
    // Get authenticated user or use demo user
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || '00000000-0000-0000-0000-000000000001'
    
    console.log('[API Conversations] Creating for user:', userId)
    
    // Create conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title,
        user_id: userId,
        model_provider,
        model_name,
        system_prompt
      })
      .select()
      .single()
    
    if (error) {
      console.error('[API Conversations] Database error:', error)
      return NextResponse.json({ 
        error: 'Failed to create conversation',
        details: error.message 
      }, { status: 400 })
    }
    
    console.log('[API Conversations] Created conversation:', data.id)
    
    return NextResponse.json({ 
      success: true, 
      data 
    }, { status: 201 })
    
  } catch (error) {
    console.error('[API Conversations] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  console.log('[API Conversations] Fetching conversations')
  
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id || '00000000-0000-0000-0000-000000000001'
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) {
      console.error('[API Conversations] Fetch error:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch conversations',
        details: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      data 
    }, { status: 200 })
    
  } catch (error) {
    console.error('[API Conversations] Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}