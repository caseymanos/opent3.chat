import { getModelById } from "@/lib/models";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  console.log("🔧 [CHAT-MINIMAL] Handler called");
  
  try {
    const body = await req.json();
    const { model = "gemini-2.5-flash-vertex" } = body;
    
    console.log("🔧 [CHAT-MINIMAL] Model requested:", model);
    
    const modelInfo = getModelById(model);
    console.log("🔧 [CHAT-MINIMAL] Model info:", modelInfo ? modelInfo.id : "not found");
    
    // Test cookies
    const cookieStore = await cookies();
    console.log("🔧 [CHAT-MINIMAL] Cookies work");
    
    // Check for anonymous user
    const isAnonymous = true; // Simplified for testing
    
    // Determine access
    if (isAnonymous && modelInfo) {
      if (modelInfo.tier === "vertex-ai" && modelInfo.provider === "vertex-ai") {
        return new Response(JSON.stringify({
          status: "ok",
          message: "Anonymous user can use Vertex AI model",
          model: modelInfo.id,
          provider: modelInfo.provider
        }), {
          headers: { "Content-Type": "application/json" }
        });
      } else {
        return new Response(JSON.stringify({
          error: "Anonymous users can only use Vertex AI models",
          modelTier: modelInfo.tier,
          modelProvider: modelInfo.provider
        }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    return new Response(JSON.stringify({
      status: "ok",
      model: model,
      isAnonymous: isAnonymous
    }), {
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("🔧 [CHAT-MINIMAL] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: "minimal_error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}