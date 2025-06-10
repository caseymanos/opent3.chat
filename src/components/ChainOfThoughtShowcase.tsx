'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import EnhancedChainOfThought from './EnhancedChainOfThought'
// import type { ThoughtStep } from '@/lib/reasoning'

export default function ChainOfThoughtShowcase() {
  const [selectedDemo, setSelectedDemo] = useState<'simple' | 'complex' | 'coding'>('complex')
  const [autoPlay, setAutoPlay] = useState(false)
  const [theme, setTheme] = useState<'neural' | 'scientific' | 'creative'>('neural')

  const demoScenarios = {
    simple: {
      title: 'Simple Question Processing',
      reasoning: [
        {
          type: 'analysis' as const,
          thought: 'The user is asking about basic JavaScript array methods. This requires a clear explanation with examples.',
          confidence: 0.95,
          duration: 120,
          emotion: 'confident' as const,
          keywords: ['javascript', 'arrays', 'methods'],
          complexity: 2,
          timestamp: Date.now()
        },
        {
          type: 'reasoning' as const,
          thought: 'I should cover the most commonly used methods like push, pop, shift, unshift, and include practical examples.',
          confidence: 0.88,
          duration: 180,
          emotion: 'confident' as const,
          keywords: ['push', 'pop', 'examples'],
          relatedConcepts: ['Data Structures', 'Programming Fundamentals'],
          complexity: 2,
          timestamp: Date.now() + 150
        },
        {
          type: 'conclusion' as const,
          thought: 'A structured response with code examples will be most helpful for understanding.',
          confidence: 0.92,
          duration: 80,
          emotion: 'satisfied' as const,
          complexity: 1,
          timestamp: Date.now() + 330
        }
      ]
    },
    complex: {
      title: 'Complex Problem Solving',
      reasoning: [
        {
          type: 'analysis' as const,
          thought: 'This is a multi-faceted system design question involving scalability, performance, and user experience considerations.',
          confidence: 0.78,
          duration: 200,
          emotion: 'curious' as const,
          keywords: ['system', 'design', 'scalability'],
          complexity: 4,
          timestamp: Date.now()
        },
        {
          type: 'hypothesis' as const,
          thought: 'Several architectural patterns could work: microservices, event-driven architecture, or a hybrid approach.',
          confidence: 0.65,
          duration: 250,
          emotion: 'uncertain' as const,
          keywords: ['microservices', 'architecture', 'patterns'],
          relatedConcepts: ['Software Architecture', 'Distributed Systems', 'Design Patterns'],
          complexity: 5,
          timestamp: Date.now() + 220
        },
        {
          type: 'reasoning' as const,
          thought: 'Given the requirements for real-time updates and high availability, an event-driven microservices architecture would be optimal.',
          confidence: 0.82,
          duration: 300,
          emotion: 'confident' as const,
          keywords: ['real-time', 'microservices', 'events'],
          evidence: [
            'Supports horizontal scaling',
            'Enables loose coupling between services',
            'Facilitates real-time data processing'
          ],
          relatedConcepts: ['Event Sourcing', 'CQRS', 'Message Queues'],
          complexity: 5,
          timestamp: Date.now() + 470
        },
        {
          type: 'evaluation' as const,
          thought: 'Considering trade-offs: increased complexity vs. improved scalability and maintainability.',
          confidence: 0.75,
          duration: 180,
          emotion: 'concerned' as const,
          keywords: ['trade-offs', 'complexity', 'maintainability'],
          evidence: [
            'Higher operational overhead',
            'Need for service orchestration',
            'Potential network latency issues'
          ],
          complexity: 4,
          timestamp: Date.now() + 770
        },
        {
          type: 'conclusion' as const,
          thought: 'Recommending a phased approach: start with modular monolith, then migrate to microservices as scale demands.',
          confidence: 0.89,
          duration: 150,
          emotion: 'satisfied' as const,
          relatedConcepts: ['Migration Strategy', 'Incremental Development'],
          complexity: 3,
          timestamp: Date.now() + 950
        },
        {
          type: 'verification' as const,
          thought: 'Cross-checking against industry best practices and successful implementations.',
          confidence: 0.93,
          duration: 100,
          emotion: 'confident' as const,
          evidence: [
            'Aligns with Netflix and Spotify architectures',
            'Supports Conway\'s Law principles',
            'Enables DevOps and CI/CD practices'
          ],
          complexity: 2,
          timestamp: Date.now() + 1100
        }
      ]
    },
    coding: {
      title: 'Code Review & Optimization',
      reasoning: [
        {
          type: 'analysis' as const,
          thought: 'Analyzing the provided React component for performance bottlenecks and code quality issues.',
          confidence: 0.91,
          duration: 160,
          emotion: 'curious' as const,
          keywords: ['react', 'performance', 'optimization'],
          complexity: 3,
          timestamp: Date.now()
        },
        {
          type: 'reasoning' as const,
          thought: 'Identified unnecessary re-renders due to inline object creation and missing memoization.',
          confidence: 0.87,
          duration: 220,
          emotion: 'confident' as const,
          keywords: ['re-renders', 'memoization', 'optimization'],
          evidence: [
            'Object created in render on line 15',
            'Expensive calculation not memoized',
            'Child components re-render unnecessarily'
          ],
          relatedConcepts: ['React Performance', 'Memoization', 'Virtual DOM'],
          complexity: 4,
          timestamp: Date.now() + 180
        },
        {
          type: 'hypothesis' as const,
          thought: 'Using useMemo, useCallback, and React.memo should significantly improve performance.',
          confidence: 0.83,
          duration: 190,
          emotion: 'excited' as const,
          keywords: ['useMemo', 'useCallback', 'React.memo'],
          relatedConcepts: ['React Hooks', 'Performance Optimization'],
          complexity: 3,
          timestamp: Date.now() + 400
        },
        {
          type: 'evaluation' as const,
          thought: 'Testing the optimizations: render count reduced by 70%, bundle size decreased by 15KB.',
          confidence: 0.94,
          duration: 140,
          emotion: 'satisfied' as const,
          keywords: ['testing', 'metrics', 'improvement'],
          evidence: [
            'React DevTools profiler shows improvement',
            'Lighthouse performance score increased',
            'User interaction lag eliminated'
          ],
          complexity: 2,
          timestamp: Date.now() + 590
        },
        {
          type: 'verification' as const,
          thought: 'Code follows React best practices and maintains readability while improving performance.',
          confidence: 0.96,
          duration: 90,
          emotion: 'confident' as const,
          evidence: [
            'ESLint rules pass without warnings',
            'TypeScript strict mode compatible',
            'Unit tests maintain 100% coverage'
          ],
          complexity: 2,
          timestamp: Date.now() + 730
        }
      ]
    }
  }

  const currentDemo = demoScenarios[selectedDemo]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-blue-900 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Enhanced Chain of Thought Visualization
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
            Experience next-generation AI reasoning visualization with interactive playback, 
            emotional indicators, complexity analysis, and multi-dimensional insights.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-lg rounded-2xl p-6 border border-slate-200/50 dark:border-slate-700/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Demo Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Demo Scenario</h3>
              <div className="space-y-2">
                {Object.entries(demoScenarios).map(([key, demo]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDemo(key as keyof typeof demoScenarios)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedDemo === key
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    <div className="font-medium">{demo.title}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {demo.reasoning.length} reasoning steps
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Visual Theme</h3>
              <div className="space-y-2">
                {(['neural', 'scientific', 'creative'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => setTheme(themeOption)}
                    className={`w-full text-left p-3 rounded-lg border transition-all capitalize ${
                      theme === themeOption
                        ? 'bg-purple-100 dark:bg-purple-900 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100'
                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    {themeOption}
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Options</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={autoPlay}
                    onChange={(e) => setAutoPlay(e.target.checked)}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Auto-play reasoning steps</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Demo Visualization */}
        <motion.div
          key={selectedDemo + theme}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <EnhancedChainOfThought
            reasoning={currentDemo.reasoning}
            isVisible={true}
            autoPlay={autoPlay}
            showMetrics={true}
            enableVoice={false}
            theme={theme}
          />
        </motion.div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              title: 'Interactive Playback',
              description: 'Step through reasoning with play/pause controls',
              icon: '▶️'
            },
            {
              title: 'Emotional Indicators',
              description: 'AI emotions during different thinking phases',
              icon: '😊'
            },
            {
              title: 'Complexity Analysis',
              description: 'Visual complexity scoring for each step',
              icon: '📊'
            },
            {
              title: 'Evidence Support',
              description: 'Expandable evidence for reasoning steps',
              icon: '🔍'
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-200/50 dark:border-slate-700/50"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}