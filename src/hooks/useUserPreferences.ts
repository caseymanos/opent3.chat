'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClientComponentClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/lib/supabase'

type UserPreferences = Database['public']['Tables']['user_preferences']['Row']
type UserPreferencesInsert = Database['public']['Tables']['user_preferences']['Insert']
type UserPreferencesUpdate = Database['public']['Tables']['user_preferences']['Update']

export function useUserPreferences() {
  const supabase = createClientComponentClient()
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load user preferences
  useEffect(() => {
    if (!user) {
      setPreferences(null)
      setLoading(false)
      return
    }

    const loadPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error
        }

        setPreferences(data)
      } catch (err) {
        console.error('Failed to load preferences:', err)
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user, supabase])

  // Update preferences
  const updatePreferences = useCallback(async (updates: Partial<UserPreferencesUpdate>) => {
    if (!user) {
      throw new Error('User not authenticated')
    }

    try {
      let result

      if (preferences) {
        // Update existing preferences
        const { data, error } = await supabase
          .from('user_preferences')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select()
          .single()

        if (error) throw error
        result = data
      } else {
        // Create new preferences
        const { data, error } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            ...updates
          } as UserPreferencesInsert)
          .select()
          .single()

        if (error) throw error
        result = data
      }

      setPreferences(result)
      return result
    } catch (err) {
      console.error('Failed to update preferences:', err)
      throw err
    }
  }, [user, preferences, supabase])

  // Get formatted traits for system prompt
  const getFormattedTraits = useCallback(() => {
    if (!preferences || !preferences.display_name && !preferences.occupation && !preferences.personality_traits?.length && !preferences.additional_context) {
      return null
    }

    let traits = []
    
    if (preferences.display_name) {
      traits.push(`Name: ${preferences.display_name}`)
    }
    
    if (preferences.occupation) {
      traits.push(`Role: ${preferences.occupation}`)
    }
    
    if (preferences.personality_traits && preferences.personality_traits.length > 0) {
      traits.push(`Traits: ${preferences.personality_traits.join(', ')}`)
    }
    
    if (preferences.additional_context) {
      traits.push(`Additional Context: ${preferences.additional_context}`)
    }

    return traits.length > 0 ? `User Context:\n${traits.map(t => `- ${t}`).join('\n')}\n\nPlease tailor your responses considering these user characteristics.` : null
  }, [preferences])

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    getFormattedTraits,
    isTraitsEnabled: preferences?.traits_enabled ?? true
  }
}