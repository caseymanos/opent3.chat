'use client'

import { useCallback, useEffect, useRef } from 'react'

interface ScrollPosition {
  conversationId: string
  scrollTop: number
  timestamp: number
}

const scrollPositions = new Map<string, ScrollPosition>()

export function useScrollPosition(conversationId: string | null, messageListRef: React.RefObject<HTMLDivElement>) {
  const savedPositionRef = useRef<ScrollPosition | null>(null)

  // Save scroll position
  const saveScrollPosition = useCallback(() => {
    if (!conversationId || !messageListRef.current) return
    
    const scrollTop = messageListRef.current.scrollTop
    const position: ScrollPosition = {
      conversationId,
      scrollTop,
      timestamp: Date.now()
    }
    
    scrollPositions.set(conversationId, position)
    savedPositionRef.current = position
  }, [conversationId])

  // Restore scroll position
  const restoreScrollPosition = useCallback(() => {
    if (!conversationId || !messageListRef.current) return
    
    const savedPosition = scrollPositions.get(conversationId)
    if (savedPosition) {
      // Only restore if saved within last 5 minutes
      const fiveMinutes = 5 * 60 * 1000
      if (Date.now() - savedPosition.timestamp < fiveMinutes) {
        messageListRef.current.scrollTop = savedPosition.scrollTop
      }
    }
  }, [conversationId])

  // Save position before conversation changes
  useEffect(() => {
    return () => {
      saveScrollPosition()
    }
  }, [conversationId, saveScrollPosition])

  // Restore position when conversation loads
  useEffect(() => {
    if (conversationId && messageListRef.current) {
      // Wait for DOM to settle
      requestAnimationFrame(() => {
        restoreScrollPosition()
      })
    }
  }, [conversationId, restoreScrollPosition])

  return { saveScrollPosition, restoreScrollPosition }
}