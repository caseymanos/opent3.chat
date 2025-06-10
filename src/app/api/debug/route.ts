import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  console.log('[API Debug] Request received')
  
  try {
    const supabase = await createServerClient()
    
    // Test auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[API Debug] Auth result:', { user: user?.id, authError })
    
    // Test database connection
    const { data: profileCount, error: profileError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    console.log('[API Debug] Profile query:', { profileCount, profileError })
    
    // Test conversation creation
    let conversationResult = null
    if (user || true) { // Always try for debugging
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: 'API Debug Test',
          user_id: user?.id || '00000000-0000-0000-0000-000000000001'
        })
        .select()
        .single()
      
      conversationResult = { data, error }
      console.log('[API Debug] Conversation creation:', conversationResult)
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      auth: {
        userId: user?.id,
        email: user?.email,
        error: authError?.message
      },
      database: {
        profilesAccessible: !profileError,
        profileError: profileError?.message
      },
      conversationTest: conversationResult,
      environment: {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      }
    }, { status: 200 })
  } catch (error) {
    console.error('[API Debug] Error:', error)
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  console.log('[API Debug POST] Testing conversation creation')
  
  try {
    const body = await req.json()
    const { title = 'Test Conversation' } = body
    
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title,
        user_id: user?.id || 'demo-user-id'
      })
      .select()
      .single()
    
    console.log('[API Debug POST] Result:', { data, error })
    
    if (error) {
      return NextResponse.json({ error: error.message, details: error }, { status: 400 })
    }
    
    return NextResponse.json({ success: true, data }, { status: 200 })
  } catch (error) {
    console.error('[API Debug POST] Error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}