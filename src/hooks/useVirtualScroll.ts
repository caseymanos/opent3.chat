'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVirtualScrollOptions {
  itemHeight: number
  containerHeight: number
  buffer?: number
  overscan?: number
}

export function useVirtualScroll<T>({
  itemHeight,
  containerHeight,
  buffer = 5,
  overscan = 3
}: UseVirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)

  const handleScroll = useCallback(() => {
    if (scrollElementRef.current) {
      setScrollTop(scrollElementRef.current.scrollTop)
    }
  }, [])

  const calculateVisibleRange = useCallback((items: T[]) => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight
    }
  }, [scrollTop, itemHeight, containerHeight, overscan])

  useEffect(() => {
    const scrollElement = scrollElementRef.current
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll, { passive: true })
      return () => scrollElement.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  return {
    scrollElementRef,
    calculateVisibleRange,
    scrollTop
  }
}