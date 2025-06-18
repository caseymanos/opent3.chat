'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { Badge } from '@/components/ui/badge'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

const SUGGESTED_TRAITS = [
  'friendly', 'witty', 'concise', 'curious', 'empathetic', 
  'creative', 'patient', 'analytical', 'detail-oriented', 'pragmatic'
]

export default function UserTraitsForm() {
  const { preferences, loading, updatePreferences } = useUserPreferences()
  const [formData, setFormData] = useState({
    display_name: '',
    occupation: '',
    personality_traits: [] as string[],
    additional_context: ''
  })
  const [newTrait, setNewTrait] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (preferences) {
      setFormData({
        display_name: preferences.display_name || '',
        occupation: preferences.occupation || '',
        personality_traits: preferences.personality_traits || [],
        additional_context: preferences.additional_context || ''
      })
    }
  }, [preferences])

  const handleAddTrait = (trait: string) => {
    const trimmedTrait = trait.trim().toLowerCase()
    if (trimmedTrait && !formData.personality_traits.includes(trimmedTrait)) {
      setFormData(prev => ({
        ...prev,
        personality_traits: [...prev.personality_traits, trimmedTrait]
      }))
      setNewTrait('')
    }
  }

  const handleRemoveTrait = (trait: string) => {
    setFormData(prev => ({
      ...prev,
      personality_traits: prev.personality_traits.filter(t => t !== trait)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)

    try {
      await updatePreferences(formData)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div className="space-y-2">
        <Label htmlFor="display_name">
          What should T3 Chat call you?
        </Label>
        <Input
          id="display_name"
          type="text"
          placeholder="Enter your name"
          value={formData.display_name}
          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
          className="w-full"
        />
        <p className="text-xs text-slate-500">0/50</p>
      </div>

      {/* Occupation Field */}
      <div className="space-y-2">
        <Label htmlFor="occupation">
          What do you do?
        </Label>
        <Input
          id="occupation"
          type="text"
          placeholder="Engineer, student, etc."
          value={formData.occupation}
          onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
          className="w-full"
        />
        <p className="text-xs text-slate-500">0/100</p>
      </div>

      {/* Personality Traits */}
      <div className="space-y-2">
        <Label>
          What traits should T3 Chat have? <span className="text-xs text-slate-500">(up to 50, max 100 chars each)</span>
        </Label>
        
        {/* Current Traits */}
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.personality_traits.map((trait) => (
            <Badge 
              key={trait} 
              variant="secondary"
              className="flex items-center gap-1 px-3 py-1"
            >
              {trait}
              <button
                type="button"
                onClick={() => handleRemoveTrait(trait)}
                className="ml-1 hover:text-red-600 transition-colors"
              >
                <XMarkIcon className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>

        {/* Add New Trait */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a trait and press Enter or Tab..."
            value={newTrait}
            onChange={(e) => setNewTrait(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                handleAddTrait(newTrait)
              }
            }}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddTrait(newTrait)}
            disabled={!newTrait.trim()}
          >
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Suggested Traits */}
        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-2">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TRAITS.filter(t => !formData.personality_traits.includes(t)).map((trait) => (
              <Badge
                key={trait}
                variant="outline"
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                onClick={() => handleAddTrait(trait)}
              >
                + {trait}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Context */}
      <div className="space-y-2">
        <Label htmlFor="additional_context">
          Anything else T3 Chat should know about you?
        </Label>
        <textarea
          id="additional_context"
          placeholder="Interests, values, or preferences to keep in mind"
          value={formData.additional_context}
          onChange={(e) => setFormData(prev => ({ ...prev, additional_context: e.target.value }))}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md 
                     bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     resize-none"
          maxLength={3000}
        />
        <p className="text-xs text-slate-500">0/3000</p>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={saving}
          className="min-w-[150px]"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">
            ✓ Preferences saved successfully
          </span>
        )}
      </div>
    </form>
  )
}