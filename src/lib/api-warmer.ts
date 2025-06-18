'use client'

let hasWarmed = false

export async function warmAPIRoutes() {
  // Only warm once per session
  if (hasWarmed) return
  
  try {
    // Warm the API in the background
    fetch('/api/warm', {
      method: 'GET',
      // Don't wait for response, just trigger the warming
      keepalive: true
    }).catch(() => {
      // Ignore errors - this is just optimization
    })
    
    hasWarmed = true
  } catch (error) {
    // Silently fail - warming is just an optimization
    console.debug('API warming failed:', error)
  }
}

// Reset warming state if needed (e.g., after long inactivity)
export function resetWarming() {
  hasWarmed = false
}