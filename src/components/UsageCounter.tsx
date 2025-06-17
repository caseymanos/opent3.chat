'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUsageTracking } from '@/lib/usage-tracker'
import type { UserUsage } from '@/lib/usage-tracker'

export default function UsageCounter() {
  const { user, isAnonymous } = useAuth()
  const { getUsage, getRemainingPremiumCalls } = useUsageTracking()
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

    if (user) {
      loadUsage()
    } else {
      setLoading(false)
    }
  }, [user, getUsage])

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs">
        <div className="w-3 h-3 animate-spin rounded-full border border-slate-400 border-t-transparent"></div>
        <span className="text-slate-600 dark:text-slate-400">Loading...</span>
      </div>
    )
  }

  if (isAnonymous || !user || !usage) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900 text-xs">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <span className="text-green-700 dark:text-green-300 font-medium">
          Free: Gemini 2.5 Flash
        </span>
      </div>
    )
  }

  const remaining = getRemainingPremiumCalls(usage)
  const total = 10

  const getStatusColor = () => {
    if (usage.byokEnabled) return 'text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900'
    if (remaining > 5) return 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900'
    if (remaining > 2) return 'text-yellow-700 dark:text-yellow-300 bg-yellow-100 dark:bg-yellow-900'
    if (remaining > 0) return 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-900'
    return 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900'
  }

  if (usage.byokEnabled) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${getStatusColor()}`}>
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18,8A2,2 0 0,1 20,10V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V10A2,2 0 0,1 6,8H7V6A5,5 0 0,1 12,1A5,5 0 0,1 17,6V8H18M12,3A3,3 0 0,0 9,6V8H15V6A3,3 0 0,0 12,3Z"/>
        </svg>
        <span className="font-medium">BYOK Enabled</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${getStatusColor()}`}>
      <div className="w-2 h-2 rounded-full bg-current"></div>
      <span className="font-medium">
        Premium: {remaining}/{total} free calls
      </span>
    </div>
  )
}