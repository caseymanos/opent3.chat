'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsageTracking } from '@/lib/usage-tracker'
import type { UserUsage } from '@/lib/usage-tracker'

export default function UsageCounter() {
  const { user, isAnonymous } = useAuth()
  const { getUsage, getRemainingPremiumCalls, getRemainingAnonymousCalls, getRemainingSpecialCalls } = useUsageTracking()
  const [usage, setUsage] = useState<UserUsage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUsage = async () => {
      try {
        const data = await getUsage()
        setUsage(data)
      } catch (error) {
        console.error('Failed to load usage data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUsage()
  }, [user, getUsage])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
        <div className="w-3 h-3 animate-spin rounded-full border border-slate-400 border-t-transparent"></div>
        <span className="text-slate-600 dark:text-slate-400">Loading...</span>
      </div>
    )
  }

  if (!usage) {
    return null
  }

  // Anonymous users - show X/10 for Vertex AI models only
  if (isAnonymous) {
    // Hide counter for guest users (those with generated usernames like "User 8da871fd")
    if (user?.user_metadata?.username?.startsWith('User ')) {
      return null
    }
    
    const used = usage.premiumCalls
    const total = 10
    
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900 text-xs">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span className="text-blue-700 dark:text-blue-300 font-medium">
          {used}/{total} requests
        </span>
      </div>
    )
  }

  // BYOK users - show unlimited
  if (usage.byokEnabled) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-100 dark:bg-purple-900 text-xs">
        <svg className="w-3 h-3 text-purple-700 dark:text-purple-300" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10A2,2 0 0,1 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
        </svg>
        <span className="text-purple-700 dark:text-purple-300 font-medium">Unlimited (BYOK)</span>
      </div>
    )
  }

  // Logged-in users - show X/20 with separate Claude counter
  if (user) {
    const usedPremium = usage.premiumCalls
    const usedSpecial = usage.specialCalls
    const totalPremium = 18
    const totalSpecial = 2
    const totalCombined = 20
    const totalUsed = usedPremium + usedSpecial

    const getStatusColor = () => {
      const remaining = totalCombined - totalUsed
      if (remaining > 10) return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900'
      if (remaining > 5) return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900'
      if (remaining > 0) return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900'
      return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900'
    }

    return (
      <div className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-xs ${getStatusColor()}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-current"></div>
          <span className="font-medium">
            {totalUsed}/{totalCombined} requests
          </span>
        </div>
        {usedSpecial > 0 && (
          <div className="flex items-center gap-1 text-[10px] opacity-75">
            <span>Claude: {usedSpecial}/{totalSpecial}</span>
          </div>
        )}
      </div>
    )
  }

  // Fallback - should not reach here
  return null
}