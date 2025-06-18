'use client'

import { useEffect } from 'react'
import { warmAPIRoutes } from '@/lib/api-warmer'

export default function APIWarmer() {
  useEffect(() => {
    // Warm API routes after a short delay to not block initial render
    const timer = setTimeout(() => {
      warmAPIRoutes()
    }, 100)
    
    return () => clearTimeout(timer)
  }, [])
  
  // This component renders nothing
  return null
}