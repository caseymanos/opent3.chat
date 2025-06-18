'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from './ui/Button'

export default function LandingPage() {
  const router = useRouter()

  const handleStartChatting = () => {
    console.log('🚀 [LandingPage] Navigating to chat...')
    router.push('/chat')
  }

  return (
    <div className="h-screen overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-indigo-100 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 bg-[size:20px_20px] opacity-20" />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">T3</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            T3 Crusher
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm">
            About
          </Button>
          <Button variant="ghost" size="sm">
            Features
          </Button>
          <Button variant="outline" size="sm">
            GitHub
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-8 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            🏆 T3 Chat Cloneathon Competition Entry
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent leading-tight"
          >
            The Future of
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AI Conversations
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Experience advanced AI chat capabilities with multiple models, 
            conversation branching, file attachments, and seamless authentication.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Button
              onClick={handleStartChatting}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              🚀 Start Chatting
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.open('https://github.com/your-repo/t3-crusher', '_blank')}
              className="px-8 py-4 text-lg font-semibold rounded-xl border-2"
            >
              <span className="mr-2">⭐</span>
              View on GitHub
            </Button>
          </motion.div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl w-full"
        >
          {[
            {
              icon: '🤖',
              title: 'Chat with Various LLMs',
              description: 'Support for multiple language models and providers',
              category: 'required'
            },
            {
              icon: '🔐',
              title: 'Authentication & Sync',
              description: 'User authentication with chat history synchronization',
              category: 'required'
            },
            {
              icon: '🌍',
              title: 'Browser Friendly',
              description: 'Optimized web experience accessible from any browser',
              category: 'required'
            },
            {
              icon: '⚡',
              title: 'Easy to Try',
              description: 'Get started quickly with our streamlined interface',
              category: 'required'
            },
            {
              icon: '📎',
              title: 'Attachment Support',
              description: 'Upload and analyze files including images and PDFs',
              category: 'bonus'
            },
            {
              icon: '🎨',
              title: 'Syntax Highlighting',
              description: 'Beautiful code formatting and syntax highlighting',
              category: 'bonus'
            },
            {
              icon: '🌳',
              title: 'Chat Branching',
              description: 'Create alternative conversation paths from any message',
              category: 'bonus'
            },
            {
              icon: '⏸️',
              title: 'Resumable Streams',
              description: 'Continue AI generation after page refresh',
              category: 'bonus'
            },
            {
              icon: '🔗',
              title: 'Chat Sharing',
              description: 'Share conversations with others easily',
              category: 'bonus'
            },
            {
              icon: '🔑',
              title: 'Bring Your Own Key',
              description: 'Use your own API keys for full control',
              category: 'bonus'
            },
            {
              icon: '🎆',
              title: 'Anything Else',
              description: 'Get creative - we love unique ideas and feedback!',
              category: 'bonus'
            }
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 + index * 0.1, duration: 0.6 }}
              className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border ${
                feature.category === 'required' 
                  ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                  : 'border-gray-100 dark:border-gray-700'
              }`}
            >
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Competition Badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 rounded-full border border-yellow-200 dark:border-yellow-800">
            <span className="text-2xl">🏆</span>
            <span className="font-semibold text-yellow-800 dark:text-yellow-200">
              Built for the T3 Chat Cloneathon
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}