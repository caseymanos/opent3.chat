'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import { useCollaborativeChat } from '@/hooks/useCollaborativeChat'
import {
  UserPlusIcon,
  XMarkIcon,
  ShareIcon,
  CheckIcon,
  ClipboardIcon
} from '@heroicons/react/24/outline'

interface CollaborativeInviteProps {
  conversationId: string
  isOpen: boolean
  onClose: () => void
}

export default function CollaborativeInvite({ 
  conversationId, 
  isOpen, 
  onClose 
}: CollaborativeInviteProps) {
  const { inviteUser } = useCollaborativeChat(conversationId)
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState({
    read: true,
    write: true,
    share: false
  })
  const [isInviting, setIsInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [shareableLink, setShareableLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  const handleInvite = async () => {
    if (!email.trim()) return

    setIsInviting(true)
    try {
      const invite = await inviteUser(email.trim(), permissions)
      if (invite) {
        setInviteSuccess(true)
        setEmail('')
        
        // Generate shareable link
        const link = `${window.location.origin}/chat/invite/${invite.token}`
        setShareableLink(link)
        
        setTimeout(() => {
          setInviteSuccess(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Failed to send invite:', error)
    } finally {
      setIsInviting(false)
    }
  }

  const copyShareableLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
    }
  }

  const generateShareableLink = async () => {
    // Create a general invite link
    try {
      const invite = await inviteUser('', permissions) // Empty email for public link
      if (invite) {
        const link = `${window.location.origin}/chat/invite/${invite.token}`
        setShareableLink(link)
      }
    } catch (error) {
      console.error('Failed to generate link:', error)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <UserPlusIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Invite to Conversation
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Collaborate in real-time with AI
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Email Invite */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Invite by Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  <Button
                    onClick={handleInvite}
                    disabled={!email.trim() || isInviting}
                    className="px-4"
                  >
                    {isInviting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                      />
                    ) : inviteSuccess ? (
                      <CheckIcon className="w-4 h-4" />
                    ) : (
                      'Send'
                    )}
                  </Button>
                </div>
                
                <AnimatePresence>
                  {inviteSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mt-2 p-3 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckIcon className="w-4 h-4" />
                        <span className="text-sm">Invite sent successfully!</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Permissions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                  Permissions
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={permissions.read}
                      onChange={(e) => setPermissions(prev => ({ ...prev, read: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Can view messages
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={permissions.write}
                      onChange={(e) => setPermissions(prev => ({ ...prev, write: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Can send messages
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={permissions.share}
                      onChange={(e) => setPermissions(prev => ({ ...prev, share: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      Can invite others
                    </span>
                  </label>
                </div>
              </div>

              {/* Shareable Link */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Shareable Link
                  </label>
                  {!shareableLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={generateShareableLink}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ShareIcon className="w-4 h-4 mr-1" />
                      Generate
                    </Button>
                  )}
                </div>
                
                {shareableLink && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={shareableLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyShareableLink}
                      className="px-3"
                    >
                      {linkCopied ? (
                        <CheckIcon className="w-4 h-4 text-green-600" />
                      ) : (
                        <ClipboardIcon className="w-4 h-4" />
                      )}
                    </Button>
                  </motion.div>
                )}
                
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Anyone with this link can join the conversation with the selected permissions.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}