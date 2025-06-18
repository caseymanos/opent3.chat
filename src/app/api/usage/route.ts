import { createServerClient } from "@/lib/supabase";
import { ServerUsageTracker } from "@/lib/usage-tracker-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const usageTracker = new ServerUsageTracker();
    const usage = await usageTracker.getUsage(user?.id);
    
    return NextResponse.json({
      success: true,
      usage: {
        premiumCalls: usage.premiumCalls,
        specialCalls: usage.specialCalls,
        lastReset: usage.lastReset,
        byokEnabled: usage.byokEnabled,
        isAuthenticated: !!user,
        userId: user?.id || 'anonymous'
      }
    });
  } catch (error) {
    console.error('[USAGE API] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}