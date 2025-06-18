'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/badge'
import { OPENROUTER_FEE_PERCENTAGE } from '@/lib/openrouter'
import { AI_MODELS } from '@/lib/ai'
import { useUsageTracking } from '@/lib/usage-tracker'
import { useAuth } from '@/contexts/AuthContext'

interface OpenRouterSettingsProps {
  isOpen: boolean
  onClose: () => void
  onConfigChange: (config: { enabled: boolean; apiKey: string }) => void
  currentConfig: { enabled: boolean; apiKey: string }
}

export default function OpenRouterSettings({
  isOpen,
  onClose,
  onConfigChange,
  currentConfig
}: OpenRouterSettingsProps) {
  const [enabled, setEnabled] = useState(currentConfig.enabled)
  const [apiKey, setApiKey] = useState(currentConfig.apiKey)
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null)
  const { updateByokStatus, getUsage } = useUsageTracking()
  const { user } = useAuth()

  useEffect(() => {
    setEnabled(currentConfig.enabled)
    setApiKey(currentConfig.apiKey)
  }, [currentConfig])

  // Load config from user profile on mount
  useEffect(() => {
    const loadFromProfile = async () => {
      if (user) {
        const usage = await getUsage()
        if (usage?.apiKeys?.openRouter) {
          const profileConfig = {
            enabled: true,
            apiKey: usage.apiKeys.openRouter
          }
          setEnabled(true)
          setApiKey(usage.apiKeys.openRouter)
          // Also update localStorage for consistency
          localStorage.setItem('openrouter-config', JSON.stringify(profileConfig))
          // Notify parent component
          onConfigChange(profileConfig)
        }
      }
    }
    loadFromProfile()
  }, [user, getUsage, onConfigChange])

  const validateApiKey = async () => {
    if (!apiKey || apiKey.length < 10) {
      setValidationResult('invalid')
      return
    }

    setIsValidating(true)
    try {
      // Simple validation - just check if the key looks valid
      const isValid = apiKey.startsWith('sk-or-') && apiKey.length > 20
      setValidationResult(isValid ? 'valid' : 'invalid')
    } catch (error) {
      setValidationResult('invalid')
    } finally {
      setIsValidating(false)
    }
  }

  const handleSave = async () => {
    const config = {
      enabled: enabled && !!apiKey,
      apiKey: apiKey
    }
    
    // Store in localStorage
    localStorage.setItem('openrouter-config', JSON.stringify(config))
    
    // Update BYOK status in usage tracker
    if (config.enabled && config.apiKey) {
      await updateByokStatus(true, { openRouter: config.apiKey })
    } else {
      await updateByokStatus(false, {})
    }
    
    onConfigChange(config)
    onClose()
  }

  // OpenRouter doesn't provide savings - it charges a fee
  const openRouterFee = OPENROUTER_FEE_PERCENTAGE

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                🌐 OpenRouter Integration
                <Badge variant="outline" className="text-blue-600">
                  Unified API
                </Badge>
              </CardTitle>
              <CardDescription>
                Access hundreds of AI models through one unified API with transparent pricing
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="enable-openrouter">Enable OpenRouter</Label>
              <p className="text-sm text-slate-500">
                Route AI requests through OpenRouter for unified API access
              </p>
            </div>
            <Switch
              id="enable-openrouter"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="openrouter-key">OpenRouter API Key</Label>
            <div className="flex gap-2">
              <Input
                id="openrouter-key"
                type="password"
                placeholder="sk-or-v1-..."
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setValidationResult(null)
                }}
                disabled={!enabled}
              />
              <Button
                variant="outline"
                onClick={validateApiKey}
                disabled={!enabled || !apiKey || isValidating}
                size="sm"
              >
                {isValidating ? '⏳' : '🔍'}
              </Button>
            </div>
            
            {validationResult && (
              <p className={`text-sm ${validationResult === 'valid' ? 'text-green-600' : 'text-red-600'}`}>
                {validationResult === 'valid' 
                  ? '✅ API key format looks valid' 
                  : '❌ Invalid API key format'
                }
              </p>
            )}
            
            <p className="text-xs text-slate-500">
              Get your free API key at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {/* Pricing Notice */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-amber-800 dark:text-amber-300">
              📊 Transparent Pricing
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              OpenRouter charges the same prices as the underlying model providers, plus a small {openRouterFee}% fee for the service.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              The main benefits are convenience, unified API access, and automatic failover - not cost savings.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="font-semibold">✨ OpenRouter Features</h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Access to 200+ AI models from one API</li>
              <li>• Automatic failover and load balancing</li>
              <li>• Real-time cost tracking and analytics</li>
              <li>• No rate limits on most models</li>
              <li>• Transparent pricing with {openRouterFee}% service fee</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              {enabled ? '💾 Save Configuration' : '💾 Save (Disabled)'}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}