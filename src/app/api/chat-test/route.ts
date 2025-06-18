export async function POST(req: Request) {
  console.log("🧪 [CHAT-TEST] Handler called");
  
  try {
    const body = await req.json();
    console.log("🧪 [CHAT-TEST] Body:", body);
    
    // Test basic functionality without complex imports
    return new Response(JSON.stringify({
      echo: body,
      status: "received",
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("🧪 [CHAT-TEST] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      type: "test_error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}