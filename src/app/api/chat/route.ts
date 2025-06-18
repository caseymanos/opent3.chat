import { streamText } from "ai";
import { getVertexAIProvider } from "@/lib/vertex-ai-provider";
import { getModelById, type AIModel } from "@/lib/models";
import { createServerClient } from "@/lib/supabase";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { UsageTracker } from "@/lib/usage-tracker";

const isDev = process.env.NODE_ENV === "development";
const log = isDev ? console.log : () => {};
const logError = console.error; // Always log errors

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      messages = [],
      model = "gemini-2.5-flash-vertex",
      conversationId 
    } = body;
    
    
    // Get user authentication status
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isAuthenticated = !!user;
    const userId = user?.id || 'anonymous';
    
    // Initialize usage tracker
    const usageTracker = new UsageTracker();
    const currentUsage = await usageTracker.getUsage(user?.id);
    
    // Get user preferences for traits
    let userTraits: string | null = null;
    if (user) {
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (preferences && preferences.traits_enabled !== false) {
        const traits = [];
        if (preferences.display_name) traits.push(`Name: ${preferences.display_name}`);
        if (preferences.occupation) traits.push(`Role: ${preferences.occupation}`);
        if (preferences.personality_traits?.length) traits.push(`Traits: ${preferences.personality_traits.join(', ')}`);
        if (preferences.additional_context) traits.push(`Additional Context: ${preferences.additional_context}`);
        
        if (traits.length > 0) {
          userTraits = `User Context:\n${traits.map(t => `- ${t}`).join('\n')}\n\nPlease tailor your responses considering these user characteristics.`;
        }
      }
    }
    
    
    const modelInfo = getModelById(model);
    if (!modelInfo) {
      return new Response(JSON.stringify({
        error: `Model "${model}" not found`,
        type: "model_not_found"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Check usage limits
    if (!isAuthenticated) {
      // Anonymous users - check if they can use Vertex AI models
      if (!usageTracker.canUseAnonymousModel(currentUsage, model)) {
        return new Response(JSON.stringify({
          error: "You have reached your daily limit of 10 free requests. Please sign in to continue.",
          type: "usage_limit",
          remainingCalls: 0
        }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
    } else {
      // Authenticated users - check based on model tier
      if (!currentUsage.byokEnabled) {
        if (modelInfo.tier === "special" && !usageTracker.canUseSpecialModel(currentUsage)) {
          return new Response(JSON.stringify({
            error: "You have reached your daily limit of 2 Claude requests. You can still use other models or enable BYOK in settings.",
            type: "usage_limit",
            remainingCalls: 0
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        } else if (modelInfo.tier !== "special" && !usageTracker.canUsePremiumModel(currentUsage)) {
          return new Response(JSON.stringify({
            error: "You have reached your daily limit of 20 requests. Please try again tomorrow or enable BYOK in settings.",
            type: "usage_limit",
            remainingCalls: 0
          }), {
            status: 429,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
    
    // Check tier-based access control
    if (!isAuthenticated && modelInfo.tier !== "vertex-ai") {
      return new Response(JSON.stringify({
        error: "Anonymous users can only use Vertex AI models. Please sign in to access premium models.",
        type: "authentication_required",
        modelInfo: {
          id: modelInfo.id,
          tier: modelInfo.tier,
          provider: modelInfo.provider
        }
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    
    // Handle Vertex AI models (for anonymous users and authenticated users)
    // Support both "vertex-ai" and "google" providers that use Vertex AI
    if ((modelInfo.tier === "vertex-ai" && modelInfo.provider === "vertex-ai") || 
        (modelInfo.provider === "google")) {
      
      const vertexProvider = getVertexAIProvider();
      
      if (!vertexProvider || !vertexProvider.isAvailable) {
        return new Response(JSON.stringify({
          error: "Vertex AI is not configured. Please set up Google Cloud credentials.",
          type: "vertex_ai_error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      const vertexModelId = vertexProvider.getModelId(model);
      
      try {
        // Check if vertex is a function or object
        let modelInstance;
        if (typeof vertexProvider.vertex === 'function') {
          modelInstance = vertexProvider.vertex(vertexModelId);
        } else {
          modelInstance = vertexProvider.vertex;
        }
        
        const baseSystemPrompt = "You are a helpful AI assistant. Provide comprehensive, detailed, and accurate responses. When users ask about topics, give thorough explanations with background information, examples, and practical details. Be informative and complete in your answers.";
        const systemPrompt = userTraits ? `${baseSystemPrompt}\n\n${userTraits}` : baseSystemPrompt;
        
        const result = await streamText({
          model: modelInstance,
          messages: messages,
          system: systemPrompt,
          temperature: 0.7,
          maxTokens: 4000,
        });
        
        // Increment usage counter
        if (!isAuthenticated) {
          await usageTracker.incrementPremiumCalls(undefined);
        } else if (!currentUsage.byokEnabled) {
          await usageTracker.incrementPremiumCalls(user.id);
        }
        
        return result.toDataStreamResponse();
      } catch (vertexError) {
        logError("[VERTEX AI] Error:", vertexError);
        return new Response(JSON.stringify({
          error: `Vertex AI error: ${vertexError instanceof Error ? vertexError.message : 'Unknown error'}`,
          type: "vertex_ai_error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Handle OpenAI models (for authenticated users)
    if (modelInfo.provider === "openai") {
      
      if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your-openai-api-key') {
        return new Response(JSON.stringify({
          error: "OpenAI is not configured. Please set up your OpenAI API key.",
          type: "openai_error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const result = await streamText({
          model: openai(modelInfo.id),
          messages: messages,
          system: userTraits || undefined,
          temperature: 0.7,
          maxTokens: 4000,
        });
        
        // Increment usage counter for authenticated users
        if (!currentUsage.byokEnabled && user) {
          await usageTracker.incrementPremiumCalls(user.id);
        }
        
        return result.toDataStreamResponse();
      } catch (openaiError) {
        logError("[OPENAI] Error:", openaiError);
        return new Response(JSON.stringify({
          error: `OpenAI error: ${openaiError instanceof Error ? openaiError.message : 'Unknown error'}`,
          type: "openai_error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Handle Anthropic models (for authenticated users)
    if (modelInfo.provider === "anthropic") {
      
      if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your-anthropic-api-key') {
        return new Response(JSON.stringify({
          error: "Anthropic is not configured. Please set up your Anthropic API key.",
          type: "anthropic_error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      try {
        const result = await streamText({
          model: anthropic(modelInfo.id),
          messages: messages,
          system: userTraits || undefined,
          temperature: 0.7,
          maxTokens: 4000,
        });
        
        // Increment usage counter for authenticated users
        if (!currentUsage.byokEnabled && user) {
          if (modelInfo.tier === "special") {
            await usageTracker.incrementSpecialCalls(user.id);
          } else {
            await usageTracker.incrementPremiumCalls(user.id);
          }
        }
        
        return result.toDataStreamResponse();
      } catch (anthropicError) {
        logError("[ANTHROPIC] Error:", anthropicError);
        return new Response(JSON.stringify({
          error: `Anthropic error: ${anthropicError instanceof Error ? anthropicError.message : 'Unknown error'}`,
          type: "anthropic_error"
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    
    // Fallback for unsupported providers
    return new Response(JSON.stringify({
      error: `Provider "${modelInfo.provider}" is not yet implemented.`,
      type: "provider_not_implemented",
      modelInfo: {
        id: modelInfo.id,
        tier: modelInfo.tier,
        provider: modelInfo.provider
      }
    }), {
      status: 501,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    logError("[CHAT API] Error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      type: "internal_error"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}