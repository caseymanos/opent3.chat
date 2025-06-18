import { cookies } from "next/headers";

export async function POST(req: Request) {
  console.log("🍪 [CHAT-COOKIES] Handler called");
  
  try {
    console.log("🍪 [CHAT-COOKIES] About to get cookies");
    const cookieStore = await cookies();
    console.log("🍪 [CHAT-COOKIES] Got cookies");
    
    const allCookies = cookieStore.getAll();
    console.log("🍪 [CHAT-COOKIES] Cookie count:", allCookies.length);
    
    return new Response(JSON.stringify({
      status: "ok",
      cookieCount: allCookies.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("🍪 [CHAT-COOKIES] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      type: "cookie_error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}