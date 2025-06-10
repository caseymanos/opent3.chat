'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCollaborativeChat } from '@/hooks/useCollaborativeChat'

interface CollaborativeCursorsProps {
  conversationId: string
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

function getColorForUser(userId: string): string {
  // Generate consistent color for user
  const hash = userId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0)
    return a & a
  }, 0)
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length]
}

function UserCursor({ cursor, color }: { cursor: any, color: string }) {
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    // In a real implementation, you would calculate position based on cursor_position
    // For now, we'll show floating cursors
    const randomX = Math.random() * (window.innerWidth - 200)
    const randomY = Math.random() * (window.innerHeight - 100) + 100
    setPosition({ x: randomX, y: randomY })
  }, [cursor.cursor_position])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 1000,
        pointerEvents: 'none'
      }}
      className="flex items-center gap-2"
    >
      {/* Cursor Icon */}
      <motion.div
        animate={{ rotate: [0, -10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative"
      >
        <svg
          width="20"
          height="24"
          viewBox="0 0 20 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0L0 18L5.5 13.5L8 18L11 16L8.5 11.5L14 11.5L0 0Z"
            fill={color}
            stroke="white"
            strokeWidth="1"
          />
        </svg>
      </motion.div>

      {/* User Label */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        style={{ backgroundColor: color }}
        className="px-2 py-1 rounded-md text-white text-xs font-medium whitespace-nowrap shadow-lg"
      >
        {cursor.profiles?.username || 'Anonymous'}
        {cursor.is_typing && (
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-1"
          >
            typing...
          </motion.span>
        )}
      </motion.div>
    </motion.div>
  )
}

function ParticipantsList({ participants }: { participants: any[] }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        <AnimatePresence>
          {participants.slice(0, 5).map((participant, index) => (
            <motion.div
              key={participant.id}
              initial={{ opacity: 0, scale: 0.8, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -20 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-medium text-white shadow-lg"
                style={{ backgroundColor: getColorForUser(participant.user_id) }}
                title={participant.profiles?.username || 'Anonymous'}
              >
                {participant.profiles?.username?.charAt(0).toUpperCase() || '?'}
              </div>
              
              {/* Online indicator */}
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border border-white dark:border-slate-800"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {participants.length > 5 && (
        <div className="w-8 h-8 rounded-full bg-gray-400 dark:bg-gray-600 border-2 border-white dark:border-slate-800 flex items-center justify-center text-xs font-medium text-white">
          +{participants.length - 5}
        </div>
      )}
      
      <span className="text-sm text-slate-600 dark:text-slate-400 ml-2">
        {participants.length} {participants.length === 1 ? 'participant' : 'participants'}
      </span>
    </div>
  )
}

function TypingIndicator({ typingParticipants }: { typingParticipants: any[] }) {
  if (typingParticipants.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 px-4 py-2"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"
      />
      
      <span>
        {typingParticipants.length === 1
          ? `${typingParticipants[0].profiles?.username || 'Someone'} is typing...`
          : typingParticipants.length === 2
          ? `${typingParticipants[0].profiles?.username || 'Someone'} and ${typingParticipants[1].profiles?.username || 'someone else'} are typing...`
          : `${typingParticipants.length} people are typing...`
        }
      </span>
    </motion.div>
  )
}

export default function CollaborativeCursors({ conversationId }: CollaborativeCursorsProps) {
  const {
    participants,
    liveCursors,
    typingParticipants,
    isCollaborative
  } = useCollaborativeChat(conversationId)

  if (!isCollaborative) {
    return null
  }

  return (
    <>
      {/* Live Cursors Overlay */}
      <AnimatePresence>
        {liveCursors.map((cursor) => (
          <UserCursor
            key={cursor.id}
            cursor={cursor}
            color={getColorForUser(cursor.user_id)}
          />
        ))}
      </AnimatePresence>

      {/* Participants List in Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
        <ParticipantsList participants={participants} />
        
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-green-400 rounded-full"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Live collaboration
          </span>
        </div>
      </div>

      {/* Typing Indicator */}
      <AnimatePresence>
        {typingParticipants.length > 0 && (
          <TypingIndicator typingParticipants={typingParticipants} />
        )}
      </AnimatePresence>
    </>
  )
}

export { useCollaborativeChat }