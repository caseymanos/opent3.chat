import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/supabase'

const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
const logError = console.error // Always log errors

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
          special_calls_used: 0,
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
          .select('premium_calls_used, special_calls_used, usage_last_reset, byok_enabled, api_keys')
          .eq('id', userId)
          .maybeSingle()

        if (!error && data) {
          // Check if we need to reset usage (daily)
          const lastReset = new Date(data.usage_last_reset || new Date())
          const daysSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
          
          if (daysSinceReset >= RESET_INTERVAL_DAYS) {
            // Reset usage
            await this.supabase
              .from('profiles')
              .update({ 
                premium_calls_used: 0,
                special_calls_used: 0, 
                usage_last_reset: new Date().toISOString() 
              })
              .eq('id', userId)
            
            const resetUsage = {
              premiumCalls: 0,
              specialCalls: 0,
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
            specialCalls: data.special_calls_used || 0,
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
      specialCalls: 0,
      lastReset: new Date().toISOString(),
      byokEnabled: false,
      apiKeys: {}
    }
    
    // For anonymous users, check if we have usage data in cache
    if (!userId) {
      const cachedAnonymous = this.usageCache.get('anonymous')
      if (cachedAnonymous) {
        // Check if we need to reset anonymous usage (daily)
        const lastReset = new Date(cachedAnonymous.data.lastReset || new Date())
        const daysSinceReset = (Date.now() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
        
        if (daysSinceReset >= RESET_INTERVAL_DAYS) {
          // Reset anonymous usage
          log('📊 [USAGE] Resetting anonymous user usage (daily reset)')
          const resetUsage = { ...defaultUsage, lastReset: new Date().toISOString() }
          this.usageCache.set('anonymous', { data: resetUsage, timestamp: Date.now() })
          return resetUsage
        }
        
        log('📊 [USAGE] Returning cached anonymous usage:', cachedAnonymous.data.premiumCalls)
        return cachedAnonymous.data
      }
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
  async incrementUsageWithData(userId: string, modelId: string, usage: UserUsage, modelTier?: 'premium' | 'special'): Promise<boolean> {
    try {
      // Handle anonymous users - track in cache only
      if (userId === 'anonymous' || !userId) {
        log('📊 [USAGE] Tracking anonymous user usage in server cache')
        const cacheKey = 'anonymous'
        const currentUsage = this.usageCache.get(cacheKey)?.data || usage
        
        // Increment the usage count
        const updatedUsage = {
          ...currentUsage,
          premiumCalls: currentUsage.premiumCalls + 1
        }
        
        // Store in cache
        this.usageCache.set(cacheKey, { data: updatedUsage, timestamp: Date.now() })
        log(`📊 [USAGE] Anonymous usage incremented: ${currentUsage.premiumCalls} → ${updatedUsage.premiumCalls}`)
        return true
      }
      // Determine which counter to increment based on model tier
      const modelInfo = await import('./models').then(m => m.getModelById(modelId))
      const tier = modelTier || modelInfo?.tier
      
      let updateData: any = {}
      let newCallCount: number
      
      if (tier === 'special') {
        newCallCount = usage.specialCalls + 1
        updateData = { special_calls_used: newCallCount }
        log(`📊 [USAGE] Incrementing special tier usage for ${modelId}`)
      } else {
        newCallCount = usage.premiumCalls + 1
        updateData = { premium_calls_used: newCallCount }
        log(`📊 [USAGE] Incrementing premium tier usage for ${modelId}`)
      }
      
      // First try to update, if it fails because profile doesn't exist, create it
      log('🔍 [PROFILE UPDATE] Updating usage count for user:', userId)
      const { error } = await this.supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId)

      if (error && error.code === 'PGRST116') {
        // No rows returned - profile doesn't exist yet
        log('Profile does not exist, creating it now')
        await this.ensureProfileExists(userId)
        
        // Try update again
        const { error: retryError } = await this.supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          
        if (retryError) {
          logError('Error incrementing usage after profile creation:', retryError)
          return false
        }
      } else if (error) {
        logError('Error incrementing usage:', error)
        return false
      }

      const previousCount = tier === 'special' ? usage.specialCalls : usage.premiumCalls
      log(`📊 [USAGE] Incremented ${modelId} usage for user ${userId}: ${previousCount} → ${newCallCount}`)
      
      // Invalidate cache for this user
      this.usageCache.delete(userId)
      
      return true
    } catch (error) {
      logError('Error updating usage:', error)
      return false
    }
  }

  // Check if user can use a model
  async canUseModel(userId: string | undefined, modelTier: 'free' | 'premium' | 'special' | 'byok' | 'vertex-ai', modelId?: string): Promise<boolean> {
    log('🔍 [ServerUsageTracker] Checking model access:', {
      userId,
      modelTier,
      modelId,
      isAnonymous: !userId
    })

    // Free models are always available
    if (modelTier === 'free') {
      log('✅ [ServerUsageTracker] Free model - access granted')
      return true
    }

    // Handle Vertex AI models (available for anonymous users)
    if (modelTier === 'vertex-ai') {
      const usage = await this.getUsage(userId)
      if (!userId) {
        // Anonymous users get 10 calls/day for Vertex AI models
        const canUse = usage.premiumCalls < ANONYMOUS_CALL_LIMIT
        log(`${canUse ? '✅' : '🚫'} [ServerUsageTracker] Anonymous Vertex AI model - ${usage.premiumCalls}/${ANONYMOUS_CALL_LIMIT} used`)
        return canUse
      } else {
        // Logged-in users can use Vertex AI models as part of their premium quota
        const canUse = usage.premiumCalls < PREMIUM_CALL_LIMIT
        log(`${canUse ? '✅' : '🚫'} [ServerUsageTracker] Vertex AI model for logged-in user - ${usage.premiumCalls}/${PREMIUM_CALL_LIMIT} used`)
        return canUse
      }
    }

    // No user ID means anonymous - only free and vertex-ai models allowed
    if (!userId) {
      log('🚫 [ServerUsageTracker] Anonymous user - only free and Vertex AI models allowed')
      return false
    }

    const usage = await this.getUsage(userId)
    return this.canUseModelWithUsage(userId, modelTier, usage)
  }

  // Check if user can use a model with provided usage data (avoids extra query)
  async canUseModelWithUsage(
    userId: string | undefined, 
    modelTier: 'free' | 'premium' | 'special' | 'byok' | 'vertex-ai',
    usage: UserUsage
  ): Promise<boolean> {
    log('📊 [ServerUsageTracker] Usage data:', {
      premiumCalls: usage.premiumCalls,
      specialCalls: usage.specialCalls,
      byokEnabled: usage.byokEnabled,
      premiumLimit: PREMIUM_CALL_LIMIT,
      specialLimit: SPECIAL_CALL_LIMIT
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

    // Special tier models - check special usage limit
    if (modelTier === 'special') {
      const canUse = usage.specialCalls < SPECIAL_CALL_LIMIT
      log(`${canUse ? '✅' : '🚫'} [ServerUsageTracker] Special tier model - ${usage.specialCalls}/${SPECIAL_CALL_LIMIT} used`)
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