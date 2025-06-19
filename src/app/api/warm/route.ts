import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { google } from '@ai-sdk/google'
import { getServerUsageTracker } from '@/lib/usage-tracker-server'

export const runtime = 'edge' // Use edge runtime for faster cold starts

export async function GET() {
  try {
    // Warm up various services in parallel
    const warmupPromises = [
      // Warm up Supabase connection
      createServerClient().then(client => client.auth.getSession()),
      
      // Initialize usage tracker singleton
      Promise.resolve(getServerUsageTracker()),
      
      // Pre-load Google AI SDK (most commonly used)
      Promise.resolve(google('gemini-2.5-flash-preview-05-20'))
    ]
    
    await Promise.allSettled(warmupPromises)
    
    return NextResponse.json({ 
      warmed: true, 
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error('Warming error:', error)
    return NextResponse.json({ warmed: false }, { status: 500 })
  }
}

// Also support POST for flexibility
export async function POST() {
  return GET()
}