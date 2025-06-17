import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'

const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // Always log errors

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

export class ServerUsageTracker {
  private supabase: ReturnType<typeof createServerComponentClient<Database>>
  private usageCache: Map<string, { data: UserUsage; timestamp: number }> = new Map()
  private readonly CACHE_TTL = 300000 // 5 minute cache for better performance

  constructor() {
    this.supabase = createServerComponentClient<Database>({ cookies })
  }

  // Ensure profile exists for user - only create if absolutely necessary
  private async ensureProfileExists(userId: string): Promise<void> {
    try {
      // Try to create profile using upsert (insert or ignore if exists)
      log('🔍 [PROFILE UPSERT] Creating profile for user:', userId)
      const { error } = await this.supabase
        .from('profiles')
        .upsert({
          id: userId,
          premium_calls_used: 0,
          usage_last_reset: new Date().toISOString(),
          byok_enabled: false,
          api_keys: {}
        }, {
          onConflict: 'id',
          ignoreDuplicates: true
        })

      if (error) {
        if (isDev) console.warn('Profile creation/upsert warning (this is usually safe):', error.message)
      }
    } catch (error) {
      logError('Error ensuring profile exists:', error)
    }
  }

  // Get usage data for current user
  async getUsage(userId?: string): Promise<UserUsage> {
    // Create a cache key - use 'anonymous' for non-authenticated users
    const cacheKey = userId || 'anonymous'
    
    // Check cache first
    const cached = this.usageCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      log('📊 [USAGE] Returning cached usage data for:', cacheKey)
      return cached.data
    }
    
    if (userId) {
      // Authenticated user - try to get from Supabase
      try {
        log('🔍 [PROFILE QUERY] Fetching profile for user:', userId)
        const { data, error } = await this.supabase
          .from('profiles')
          .select('premium_calls_used, usage_last_reset, byok_enabled, api_keys')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          // Check if we need to reset usage (30 days)
          const lastReset = new Date(data.usage_last_reset || new Date())
          const daysSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysSinceReset >= RESET_INTERVAL_DAYS) {
            // Reset usage
            await this.supabase
              .from('profiles')
              .update({ 
                premium_calls_used: 0, 
                usage_last_reset: new Date().toISOString() 
              })
              .eq('id', userId)
            
            const resetUsage = {
              premiumCalls: 0,
              lastReset: new Date().toISOString(),
              byokEnabled: data.byok_enabled || false,
              apiKeys: data.api_keys || {}
            }
            
            // Cache the reset usage
            this.usageCache.set(userId, { data: resetUsage, timestamp: Date.now() })
            return resetUsage
          }

          const usage = {
            premiumCalls: data.premium_calls_used || 0,
            lastReset: data.usage_last_reset || new Date().toISOString(),
            byokEnabled: data.byok_enabled || false,
            apiKeys: data.api_keys || {}
          }
          
          // Cache the usage data
          this.usageCache.set(userId, { data: usage, timestamp: Date.now() })
          return usage
        } else if (error) {
          if (isDev) console.warn('Profile not found for user (this is normal for new users):', userId)
          // Create profile only when we actually need to track usage
        }
      } catch (error) {
        logError('Error fetching usage from Supabase:', error)
      }
    }

    // Default for anonymous users or when profile doesn't exist yet
    const defaultUsage = {
      premiumCalls: 0,
      lastReset: new Date().toISOString(),
      byokEnabled: false,
      apiKeys: {}
    }
    
    // Cache even the default usage to avoid repeated calls
    this.usageCache.set(cacheKey, { data: defaultUsage, timestamp: Date.now() })
    
    return defaultUsage
  }

  // Increment premium calls used
  async incrementUsage(userId: string, modelId: string): Promise<boolean> {
    try {
      // Get current usage and increment
      const usage = await this.getUsage(userId)
      return this.incrementUsageWithData(userId, modelId, usage)
    } catch (error) {
      logError('Error updating usage:', error)
      return false
    }
  }

  // Increment premium calls used with provided usage data (avoids extra query)
  async incrementUsageWithData(userId: string, modelId: string, usage: UserUsage): Promise<boolean> {
    try {
      const newCallCount = usage.premiumCalls + 1
      
      // First try to update, if it fails because profile doesn't exist, create it
      log('🔍 [PROFILE UPDATE] Updating usage count for user:', userId)
      const { error } = await this.supabase
        .from('profiles')
        .update({ 
          premium_calls_used: newCallCount
        })
        .eq('id', userId)

      if (error && error.code === 'PGRST116') {
        // No rows returned - profile doesn't exist yet
        log('Profile does not exist, creating it now')
        await this.ensureProfileExists(userId)
        
        // Try update again
        const { error: retryError } = await this.supabase
          .from('profiles')
          .update({ 
            premium_calls_used: newCallCount
          })
          .eq('id', userId)
          
        if (retryError) {
          logError('Error incrementing usage after profile creation:', retryError)
          return false
        }
      } else if (error) {
        logError('Error incrementing usage:', error)
        return false
      }

      log(`📊 [USAGE] Incremented ${modelId} usage for user ${userId}: ${usage.premiumCalls} → ${newCallCount}`)
      
      // Invalidate cache for this user
      this.usageCache.delete(userId)
      
      return true
    } catch (error) {
      logError('Error updating usage:', error)
      return false
    }
  }

  // Check if user can use a model
  async canUseModel(userId: string | undefined, modelTier: 'free' | 'premium' | 'byok'): Promise<boolean> {
    log('🔍 [ServerUsageTracker] Checking model access:', {
      userId,
      modelTier,
      isAnonymous: !userId
    })

    // Free models are always available
    if (modelTier === 'free') {
      log('✅ [ServerUsageTracker] Free model - access granted')
      return true
    }

    // No user ID means anonymous - only free models
    if (!userId) {
      log('🚫 [ServerUsageTracker] Anonymous user - only free models allowed')
      return false
    }

    const usage = await this.getUsage(userId)
    return this.canUseModelWithUsage(userId, modelTier, usage)
  }

  // Check if user can use a model with provided usage data (avoids extra query)
  async canUseModelWithUsage(
    userId: string | undefined, 
    modelTier: 'free' | 'premium' | 'byok',
    usage: UserUsage
  ): Promise<boolean> {
    log('📊 [ServerUsageTracker] Usage data:', {
      premiumCalls: usage.premiumCalls,
      byokEnabled: usage.byokEnabled,
      limit: PREMIUM_CALL_LIMIT
    })

    // Free models are always available
    if (modelTier === 'free') {
      log('✅ [ServerUsageTracker] Free model - access granted')
      return true
    }

    // No user ID means anonymous - only free models
    if (!userId) {
      log('🚫 [ServerUsageTracker] Anonymous user - only free models allowed')
      return false
    }

    // BYOK models require BYOK enabled
    if (modelTier === 'byok') {
      const canUse = usage.byokEnabled
      log(`${canUse ? '✅' : '🚫'} [ServerUsageTracker] BYOK model - BYOK enabled: ${canUse}`)
      return canUse
    }

    // Premium models - check usage limit
    if (modelTier === 'premium') {
      const canUse = usage.premiumCalls < PREMIUM_CALL_LIMIT
      log(`${canUse ? '✅' : '🚫'} [ServerUsageTracker] Premium model - ${usage.premiumCalls}/${PREMIUM_CALL_LIMIT} used`)
      return canUse
    }

    log('🚫 [ServerUsageTracker] Unknown model tier')
    return false
  }
}

// Singleton instance for server-side usage
let serverTracker: ServerUsageTracker | null = null

export function getServerUsageTracker(): ServerUsageTracker {
  if (!serverTracker) {
    serverTracker = new ServerUsageTracker()
  }
  return serverTracker
}