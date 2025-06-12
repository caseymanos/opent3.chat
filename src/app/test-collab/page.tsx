'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UsersIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline'

export default function TestCollabPage() {
  const router = useRouter()
  const [conversationId, setConversationId] = useState('')
  const [windows, setWindows] = useState<Window[]>([])

  // Generate a test conversation ID (proper UUID format)
  const generateTestId = () => {
    // Generate a proper UUID v4 for Supabase compatibility
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c == 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
    setConversationId(uuid)
  }

  useEffect(() => {
    generateTestId()
  }, [])

  // Open multiple windows for testing
  const openTestWindows = (count: number) => {
    const newWindows: Window[] = []
    const baseUrl = window.location.origin
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const w = window.open(
          `${baseUrl}/?conversationId=${conversationId}`,
          `collab-test-${i}`,
          'width=800,height=600'
        )
        if (w) newWindows.push(w)
      }, i * 500) // Stagger window opening
    }
    
    setWindows(newWindows)
  }

  // Navigate to shared conversation
  const joinConversation = () => {
    router.push(`/?conversationId=${conversationId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-4xl mx-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
              <UsersIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Test Collaborative Features
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Simulate multiple users to test real-time collaboration
            </p>
          </div>

          {/* Test Conversation ID */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test Conversation ID
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={conversationId}
                readOnly
                className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono"
              />
              <button
                onClick={() => navigator.clipboard.writeText(conversationId)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={generateTestId}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                New ID
              </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openTestWindows(2)}
              className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold">Open 2 Windows</div>
                  <div className="text-sm opacity-90">Basic collaboration test</div>
                </div>
                <ArrowRightIcon className="w-5 h-5" />
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => openTestWindows(3)}
              className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold">Open 3 Windows</div>
                  <div className="text-sm opacity-90">Multi-user simulation</div>
                </div>
                <ArrowRightIcon className="w-5 h-5" />
              </div>
            </motion.button>
          </div>

          {/* Join Current Window */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={joinConversation}
            className="w-full p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
          >
            <div className="flex items-center justify-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              <span className="font-semibold">Join Conversation in This Window</span>
            </div>
          </motion.button>

          {/* Instructions */}
          <div className="mt-8 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Testing Instructions
            </h2>
            
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-medium">
                  1
                </span>
                <p>Click "Open 2 Windows" or "Open 3 Windows" to launch multiple browser windows with the same conversation.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-medium">
                  2
                </span>
                <p>Start typing in one window - you should see typing indicators in the others.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-medium">
                  3
                </span>
                <p>Watch for simulated cursor movements and participant avatars in the header.</p>
              </div>
              
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center font-medium">
                  4
                </span>
                <p>Try sending messages from different windows to test real-time message sync.</p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> The app is currently in demo mode. Some collaborative features like live cursors are simulated to showcase the UI. Enable Supabase Auth for full multi-user functionality.
              </p>
            </div>
          </div>

          {/* Active Windows */}
          {windows.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Active Test Windows: {windows.length}
                </span>
                <button
                  onClick={() => {
                    windows.forEach(w => w.close())
                    setWindows([])
                  }}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Close All
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}