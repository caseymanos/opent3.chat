'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { GitHubIntegration } from './GitHubIntegration'
import { LinearIntegration } from './LinearIntegration'

interface IntegrationsPanelProps {
  onContentSelect?: (content: string) => void
  className?: string
}

type IntegrationType = 'github' | 'linear' | 'stripe' | 'supabase'

export function IntegrationsPanel({ onContentSelect, className = '' }: IntegrationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIntegration, setActiveIntegration] = useState<IntegrationType>('github')

  const integrations = [
    {
      id: 'github' as IntegrationType,
      name: 'GitHub',
      icon: '🐙',
      description: 'Code collaboration and repository management',
      color: 'bg-gray-900'
    },
    {
      id: 'linear' as IntegrationType,
      name: 'Linear',
      icon: '📋',
      description: 'Advanced task and project management',
      color: 'bg-indigo-600'
    },
    {
      id: 'stripe' as IntegrationType,
      name: 'Stripe',
      icon: '💳',
      description: 'Payment processing and monetization',
      color: 'bg-blue-600'
    },
    {
      id: 'supabase' as IntegrationType,
      name: 'Supabase',
      icon: '🗄️',
      description: 'Database and real-time features',
      color: 'bg-green-600'
    }
  ]

  const handleContentSelect = (content: string) => {
    onContentSelect?.(content)
    setIsOpen(false) // Close panel after selection
  }

  return (
    <div className={`relative ${className}`}>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        size="sm"
        className="relative"
      >
        🔗 Integrations
        {isOpen && (
          <motion.div
            className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </Button>

      {/* Integrations Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full mt-2 right-0 w-96 z-50 bg-white border border-gray-200 rounded-lg shadow-xl"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">🔗 Integrations</h3>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2 py-1"
                >
                  ✕
                </Button>
              </div>

              {/* Integration Selector */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {integrations.map((integration) => (
                  <Button
                    key={integration.id}
                    onClick={() => setActiveIntegration(integration.id)}
                    variant={activeIntegration === integration.id ? 'default' : 'outline'}
                    size="sm"
                    className="text-xs p-2 h-auto flex flex-col items-center gap-1"
                  >
                    <span className="text-lg">{integration.icon}</span>
                    <span className="font-medium">{integration.name}</span>
                  </Button>
                ))}
              </div>

              {/* Active Integration Component */}
              <div className="border-t pt-4">
                <AnimatePresence mode="wait">
                  {activeIntegration === 'github' && (
                    <motion.div
                      key="github"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <GitHubIntegration onSelect={handleContentSelect} />
                    </motion.div>
                  )}

                  {activeIntegration === 'linear' && (
                    <motion.div
                      key="linear"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <LinearIntegration onSelect={handleContentSelect} />
                    </motion.div>
                  )}

                  {activeIntegration === 'stripe' && (
                    <motion.div
                      key="stripe"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card className="p-4 text-center">
                        <div className="text-4xl mb-2">💳</div>
                        <h4 className="font-medium mb-2">Stripe Integration</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Payment processing and monetization features coming soon
                        </p>
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">Features planned:</div>
                          <div className="text-xs">
                            • Subscription management<br />
                            • Usage-based billing<br />
                            • Payment links<br />
                            • Customer analytics
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {activeIntegration === 'supabase' && (
                    <motion.div
                      key="supabase"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                    >
                      <Card className="p-4 text-center">
                        <div className="text-4xl mb-2">🗄️</div>
                        <h4 className="font-medium mb-2">Supabase Integration</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Advanced database operations and analytics
                        </p>
                        <div className="space-y-2">
                          <div className="text-xs text-gray-500">Current features:</div>
                          <div className="text-xs">
                            • Real-time subscriptions ✅<br />
                            • User authentication ✅<br />
                            • File storage ✅<br />
                            • Edge functions ✅
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-xs text-gray-500">
                  🚀 Powered by Model Context Protocol (MCP)
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}