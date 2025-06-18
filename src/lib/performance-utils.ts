import { useCallback, useRef, useEffect } from 'react'

// Enable hardware acceleration for smoother animations
export const performanceClasses = {
  // Use GPU acceleration for transforms
  gpuAccelerated: 'transform-gpu will-change-transform',
  
  // Optimize for smooth scrolling
  smoothScroll: 'scroll-smooth overflow-y-auto overscroll-contain',
  
  // Reduce paint areas
  containPaint: 'contain-paint',
  
  // Optimize text rendering
  optimizeText: 'text-rendering-optimizeLegibility font-smoothing-antialiased',
  
  // Optimize animations
  smoothAnimation: 'transition-transform duration-200 ease-out',
  
  // Prevent layout thrashing
  fixedDimensions: 'flex-shrink-0',
  
  // Optimize backdrop filters
  optimizedBackdrop: 'backdrop-blur-sm backdrop-saturate-150'
}

// Hook to track render performance
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(performance.now())
  
  useEffect(() => {
    renderCount.current++
    const currentTime = performance.now()
    const timeSinceLastRender = currentTime - lastRenderTime.current
    
    // Log slow renders (targeting 120fps = 8.33ms per frame)
    if (timeSinceLastRender > 8.33) {
      console.warn(`[Performance] ${componentName} slow render: ${timeSinceLastRender.toFixed(2)}ms`)
    }
    
    lastRenderTime.current = currentTime
  })
  
  return renderCount.current
}

// Debounce hook optimized for high-frequency updates
export function useOptimizedDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)
  
  // Update callback ref without causing re-renders
  callbackRef.current = callback
  
  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args)
    }, delay)
  }, [delay]) as T
}

// RAF throttle for smooth animations
export function useRAFThrottle<T extends (...args: any[]) => any>(
  callback: T
): T {
  const frameRef = useRef<number | null>(null)
  const callbackRef = useRef(callback)
  
  callbackRef.current = callback
  
  return useCallback((...args: Parameters<T>) => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
    
    frameRef.current = requestAnimationFrame(() => {
      callbackRef.current(...args)
    })
  }, []) as T
}

// Intersection Observer for lazy loading
export function useLazyLoad(
  ref: React.RefObject<HTMLElement>,
  onIntersect: () => void,
  options?: IntersectionObserverInit
) {
  useEffect(() => {
    if (!ref.current) return
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        onIntersect()
        observer.disconnect()
      }
    }, {
      rootMargin: '50px',
      ...options
    })
    
    observer.observe(ref.current)
    
    return () => observer.disconnect()
  }, [ref, onIntersect, options])
}

// Virtual scrolling helper
export function calculateVisibleItems<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  buffer = 3
): { visibleItems: T[], startIndex: number, endIndex: number } {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer)
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
  )
  
  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex
  }
}

// Performance monitoring context
export const performanceConfig = {
  // Target 120fps
  targetFrameTime: 8.33,
  
  // Enable performance marks
  enableMarks: process.env.NODE_ENV === 'development',
  
  // Log slow operations
  logSlowOps: process.env.NODE_ENV === 'development'
}

// Mark performance checkpoints
export function perfMark(name: string) {
  if (performanceConfig.enableMarks) {
    performance.mark(name)
  }
}

export function perfMeasure(name: string, startMark: string, endMark?: string) {
  if (performanceConfig.enableMarks) {
    const end = endMark || `${startMark}-end`
    performance.mark(end)
    performance.measure(name, startMark, end)
    
    if (performanceConfig.logSlowOps) {
      const measure = performance.getEntriesByName(name)[0]
      if (measure && measure.duration > performanceConfig.targetFrameTime) {
        console.warn(`[Performance] Slow operation "${name}": ${measure.duration.toFixed(2)}ms`)
      }
    }
  }
}