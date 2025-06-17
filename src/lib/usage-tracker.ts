'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClientComponentClient } from '@/lib/supabase'

export interface UserUsage {
  premiumCalls: number
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

const PREMIUM_CALL_LIMIT = 10
const RESET_INTERVAL_DAYS = 30

export class UsageTracker {
  private supabase = createClientComponentClient()
  private storageKey = 't3-crusher-usage'

  // Get usage data for current user
  async getUsage(userId?: string): Promise<UserUsage> {
    if (userId) {
      // Authenticated user - try to get from Supabase
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('premium_calls_used, usage_last_reset, byok_enabled, api_keys')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          return {
            premiumCalls: data.premium_calls_used || 0,
            lastReset: data.usage_last_reset || new Date().toISOString(),
            byokEnabled: data.byok_enabled || false,
            apiKeys: data.api_keys || {}
          }
        } else if (error) {
          console.warn('Profile not found for user, using default usage:', userId)
        }
      } catch (error) {
        console.error('Error fetching usage from Supabase:', error)
      }
    }

    // Fall back to localStorage for anonymous users or when profile doesn't exist
    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      try {
        const usage = JSON.parse(stored) as UserUsage
        // Check if reset is needed
        if (this.shouldReset(usage.lastReset)) {
          return this.resetUsage()
        }
        return usage
      } catch (error) {
        console.error('Error parsing stored usage:', error)
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

  // Check if user can use premium model
  canUsePremiumModel(usage: UserUsage): boolean {
    return usage.byokEnabled || usage.premiumCalls < PREMIUM_CALL_LIMIT
  }

  // Check if user can use BYOK-only model
  canUseByokModel(usage: UserUsage): boolean {
    return usage.byokEnabled
  }

  // Get remaining premium calls
  getRemainingPremiumCalls(usage: UserUsage): number {
    if (usage.byokEnabled) {
      return Infinity
    }
    return Math.max(0, PREMIUM_CALL_LIMIT - usage.premiumCalls)
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

  // Check if usage should be reset (monthly)
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
  const { user } = useAuth()
  const tracker = getUsageTracker()

  return {
    getUsage: () => tracker.getUsage(user?.id),
    incrementPremiumCalls: () => tracker.incrementPremiumCalls(user?.id),
    canUsePremiumModel: (usage: UserUsage) => tracker.canUsePremiumModel(usage),
    canUseByokModel: (usage: UserUsage) => tracker.canUseByokModel(usage),
    getRemainingPremiumCalls: (usage: UserUsage) => tracker.getRemainingPremiumCalls(usage),
    updateByokStatus: (enabled: boolean, apiKeys?: UserUsage['apiKeys']) => 
      tracker.updateByokStatus(user?.id, enabled, apiKeys)
  }
}