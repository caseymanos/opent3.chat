export default function DebugEnvPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Environment Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Supabase Configuration</h2>
          <div className="text-sm font-mono">
            <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'}</div>
            <div>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'NOT SET'}</div>
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">AI API Keys</h2>
          <div className="text-sm font-mono">
            <div>OpenAI: {process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET'}</div>
            <div>Anthropic: {process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET'}</div>
            <div>Google AI: {process.env.GOOGLE_AI_API_KEY ? 'SET' : 'NOT SET'}</div>
          </div>
        </div>
        
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Other Environment</h2>
          <div className="text-sm font-mono">
            <div>NODE_ENV: {process.env.NODE_ENV || 'NOT SET'}</div>
            <div>VERCEL: {process.env.VERCEL || 'NOT SET'}</div>
            <div>NEXT_PUBLIC_VERCEL_URL: {process.env.NEXT_PUBLIC_VERCEL_URL || 'NOT SET'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}