'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@/lib/supabase'

export interface UserUsage {
  premiumCalls: number
  specialCalls: number // For special tier models like Claude 4 Sonnet
  lastReset: string
  byokEnabled: boolean
  apiKeys?: {
    openRouter?: string
    openai?: string
    anthropic?: string
    google?: string
    xai?: string
  }
}

const ANONYMOUS_CALL_LIMIT = 10 // Anonymous users: 10 calls/day (Vertex AI Gemini only)
const PREMIUM_CALL_LIMIT = 18 // Logged-in users: 18 general calls/day
const SPECIAL_CALL_LIMIT = 2 // Logged-in users: 2 special calls/day (Claude special)
const RESET_INTERVAL_DAYS = 1 // Daily reset instead of monthly

export class UsageTracker {
  private supabase: ReturnType<typeof createClientComponentClient>
  private storageKey = 't3-crusher-usage'

  constructor() {
    this.supabase = createClientComponentClient()
  }

  // Get usage data for current user
  async getUsage(userId?: string): Promise<UserUsage> {
    // Try to get from API first (works for both authenticated and anonymous users)
    try {
      const response = await fetch('/api/usage')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.usage) {
          console.log('📊 [UsageTracker] Got usage from API:', data.usage)
          return {
            premiumCalls: data.usage.premiumCalls || 0,
            specialCalls: data.usage.specialCalls || 0,
            lastReset: data.usage.lastReset || new Date().toISOString(),
            byokEnabled: data.usage.byokEnabled || false,
            apiKeys: data.usage.apiKeys || {}
          }
        }
      }
    } catch (error) {
      console.error('Error fetching usage from API:', error)
    }

    // Fallback for offline or error scenarios
    if (userId) {
      // Authenticated user - try to get from Supabase directly
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('premium_calls_used, special_calls_used, usage_last_reset, byok_enabled, api_keys')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          return {
            premiumCalls: data.premium_calls_used || 0,
            specialCalls: data.special_calls_used || 0,
            lastReset: data.usage_last_reset || new Date().toISOString(),
            byokEnabled: data.byok_enabled || false,
            apiKeys: data.api_keys || {}
          }
        }
      } catch (error) {
        console.error('Error fetching usage from Supabase:', error)
      }
    }

    // Return default usage
    return this.resetUsage()
  }

  // Increment premium call count
  async incrementPremiumCalls(userId?: string): Promise<UserUsage> {
    const usage = await this.getUsage(userId)
    
    // Don't increment if BYOK is enabled
    if (usage.byokEnabled) {
      return usage
    }

    usage.premiumCalls += 1

    if (userId) {
      // Save to Supabase for authenticated users - don't try to create profile here
      try {
        await this.supabase
          .from('profiles')
          .update({ 
            premium_calls_used: usage.premiumCalls,
            usage_last_reset: usage.lastReset 
          })
          .eq('id', userId)
      } catch (error) {
        console.error('Error updating usage in Supabase:', error)
      }
    } else {
      // Save to localStorage for anonymous users
      localStorage.setItem(this.storageKey, JSON.stringify(usage))
    }

    return usage
  }

  // Increment special tier call count
  async incrementSpecialCalls(userId?: string): Promise<UserUsage> {
    const usage = await this.getUsage(userId)
    
    // Don't increment if BYOK is enabled
    if (usage.byokEnabled) {
      return usage
    }

    usage.specialCalls += 1

    if (userId) {
      // Save to Supabase for authenticated users
      try {
        await this.supabase
          .from('profiles')
          .update({ 
            special_calls_used: usage.specialCalls,
            usage_last_reset: usage.lastReset 
          })
          .eq('id', userId)
      } catch (error) {
        console.error('Error updating special usage in Supabase:', error)
      }
    } else {
      // Save to localStorage for anonymous users
      localStorage.setItem(this.storageKey, JSON.stringify(usage))
    }

    return usage
  }

  // Check if anonymous user can use model (only Vertex AI Gemini models)
  canUseAnonymousModel(usage: UserUsage, modelId: string): boolean {
    // Anonymous users can only use Vertex AI Gemini models
    const vertexAIModels = ['gemini-2.5-flash-vertex', 'gemini-2.5-flash-lite-vertex']
    if (!vertexAIModels.includes(modelId)) {
      return false
    }
    return usage.premiumCalls < ANONYMOUS_CALL_LIMIT
  }

  // Check if user can use premium model
  canUsePremiumModel(usage: UserUsage): boolean {
    return usage.byokEnabled || usage.premiumCalls < PREMIUM_CALL_LIMIT
  }

  // Check if user can use special tier model
  canUseSpecialModel(usage: UserUsage): boolean {
    return usage.byokEnabled || usage.specialCalls < SPECIAL_CALL_LIMIT
  }

  // Check if user can use BYOK-only model
  canUseByokModel(usage: UserUsage): boolean {
    return usage.byokEnabled
  }

  // Get remaining calls for anonymous users
  getRemainingAnonymousCalls(usage: UserUsage): number {
    return Math.max(0, ANONYMOUS_CALL_LIMIT - usage.premiumCalls)
  }

  // Get remaining premium calls
  getRemainingPremiumCalls(usage: UserUsage, isAnonymous: boolean = false): number {
    if (usage.byokEnabled) {
      return Infinity
    }
    if (isAnonymous) {
      return this.getRemainingAnonymousCalls(usage)
    }
    return Math.max(0, PREMIUM_CALL_LIMIT - usage.premiumCalls)
  }

  // Get remaining special tier calls
  getRemainingSpecialCalls(usage: UserUsage): number {
    if (usage.byokEnabled) {
      return Infinity
    }
    return Math.max(0, SPECIAL_CALL_LIMIT - usage.specialCalls)
  }

  // Update BYOK status
  async updateByokStatus(userId: string | undefined, enabled: boolean, apiKeys?: UserUsage['apiKeys']): Promise<UserUsage> {
    const usage = await this.getUsage(userId)
    usage.byokEnabled = enabled
    if (apiKeys) {
      usage.apiKeys = apiKeys
    }

    if (userId) {
      // Save to Supabase
      try {
        await this.supabase
          .from('profiles')
          .update({ 
            byok_enabled: enabled,
            api_keys: apiKeys || {}
          })
          .eq('id', userId)
      } catch (error) {
        console.error('Error updating BYOK status in Supabase:', error)
      }
    } else {
      // Save to localStorage
      localStorage.setItem(this.storageKey, JSON.stringify(usage))
    }

    return usage
  }

  // Check if usage should be reset (daily)
  private shouldReset(lastReset: string): boolean {
    const lastResetDate = new Date(lastReset)
    const now = new Date()
    const daysSinceReset = (now.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceReset >= RESET_INTERVAL_DAYS
  }

  // Reset usage counters
  private resetUsage(): UserUsage {
    return {
      premiumCalls: 0,
      specialCalls: 0,
      lastReset: new Date().toISOString(),
      byokEnabled: false,
      apiKeys: {}
    }
  }
}

// Singleton instance
let usageTrackerInstance: UsageTracker | null = null

export function getUsageTracker(): UsageTracker {
  if (!usageTrackerInstance) {
    usageTrackerInstance = new UsageTracker()
  }
  return usageTrackerInstance
}

// React hook for usage tracking
export function useUsageTracking() {
  const { user, isAnonymous } = useAuth()
  const tracker = getUsageTracker()

  return {
    getUsage: () => tracker.getUsage(user?.id),
    incrementPremiumCalls: () => tracker.incrementPremiumCalls(user?.id),
    incrementSpecialCalls: () => tracker.incrementSpecialCalls(user?.id),
    canUseAnonymousModel: (usage: UserUsage, modelId: string) => tracker.canUseAnonymousModel(usage, modelId),
    canUsePremiumModel: (usage: UserUsage) => tracker.canUsePremiumModel(usage),
    canUseSpecialModel: (usage: UserUsage) => tracker.canUseSpecialModel(usage),
    canUseByokModel: (usage: UserUsage) => tracker.canUseByokModel(usage),
    getRemainingAnonymousCalls: (usage: UserUsage) => tracker.getRemainingAnonymousCalls(usage),
    getRemainingPremiumCalls: (usage: UserUsage) => tracker.getRemainingPremiumCalls(usage, isAnonymous),
    getRemainingSpecialCalls: (usage: UserUsage) => tracker.getRemainingSpecialCalls(usage),
    updateByokStatus: (enabled: boolean, apiKeys?: UserUsage['apiKeys']) => 
      tracker.updateByokStatus(user?.id, enabled, apiKeys)
  }
}