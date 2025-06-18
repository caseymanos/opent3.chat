import { getModelById } from "@/lib/models";

export async function GET() {
  try {
    // Test imports
    const testModel = getModelById('gemini-2.5-flash-vertex');
    
    return new Response(JSON.stringify({ 
      status: 'ok',
      testModel: testModel ? {
        id: testModel.id,
        name: testModel.name,
        provider: testModel.provider,
        tier: testModel.tier
      } : null,
      hasVertexAIProvider: true,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}