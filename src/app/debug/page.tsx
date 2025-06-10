'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([])

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toISOString()}] ${message}`])
  }

  const testSupabaseConnection = async () => {
    addLog('Testing Supabase connection...')
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
      
      if (error) {
        addLog(`Connection error: ${error.message}`)
      } else {
        addLog(`Connection successful! Data: ${JSON.stringify(data)}`)
      }
    } catch (error) {
      addLog(`Exception: ${error}`)
    }
  }

  const testAuth = async () => {
    addLog('Testing authentication...')
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error) {
        addLog(`Auth error: ${error.message}`)
      } else if (user) {
        addLog(`Authenticated user: ${JSON.stringify(user, null, 2)}`)
      } else {
        addLog('No authenticated user')
      }
    } catch (error) {
      addLog(`Auth exception: ${error}`)
    }
  }

  const testCreateConversation = async () => {
    addLog('Testing conversation creation...')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || 'demo-user-id'
      
      addLog(`Using user ID: ${userId}`)
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          title: 'Debug Test Conversation',
          user_id: userId
        })
        .select()
        .single()
      
      if (error) {
        addLog(`Create conversation error: ${JSON.stringify(error, null, 2)}`)
      } else {
        addLog(`Created conversation: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      addLog(`Create conversation exception: ${error}`)
    }
  }

  const checkEnvironment = () => {
    addLog('=== Environment Check ===')
    addLog(`Host: ${window.location.hostname}`)
    addLog(`Protocol: ${window.location.protocol}`)
    addLog(`Port: ${window.location.port}`)
    addLog(`Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'}`)
    addLog(`Has Anon Key: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`)
  }

  const testServerAPI = async () => {
    addLog('Testing server-side API...')
    try {
      const response = await fetch('/api/debug')
      const data = await response.json()
      addLog(`Server API response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      addLog(`Server API error: ${error}`)
    }
  }

  const testServerCreateConversation = async () => {
    addLog('Testing server-side conversation creation...')
    try {
      const response = await fetch('/api/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Server Debug Test' })
      })
      const data = await response.json()
      addLog(`Server create response: ${JSON.stringify(data, null, 2)}`)
    } catch (error) {
      addLog(`Server create error: ${error}`)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">T3 Crusher Debug Page</h1>
      
      <div className="space-y-4 mb-8">
        <Button onClick={checkEnvironment}>Check Environment</Button>
        <Button onClick={testSupabaseConnection}>Test Supabase Connection</Button>
        <Button onClick={testAuth}>Test Authentication</Button>
        <Button onClick={testCreateConversation}>Test Create Conversation</Button>
        <Button onClick={testServerAPI}>Test Server API</Button>
        <Button onClick={testServerCreateConversation}>Test Server Create</Button>
        <Button onClick={() => setLogs([])}>Clear Logs</Button>
      </div>

      <div className="bg-slate-900 text-slate-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Debug Logs:</h2>
        <pre className="text-xs font-mono whitespace-pre-wrap">
          {logs.length > 0 ? logs.join('\n') : 'No logs yet. Click a button above to run tests.'}
        </pre>
      </div>
    </div>
  )
}