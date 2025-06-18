import crypto from 'crypto'

interface CachedResponse {
  response: string
  timestamp: number
  model: string
  provider: string
}

class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map()
  private readonly CACHE_TTL = 3600000 // 1 hour cache
  private readonly MAX_CACHE_SIZE = 1000
  
  // Generate cache key from query + model
  private generateKey(query: string, model: string, provider: string): string {
    const normalized = query.toLowerCase().trim()
    return crypto.createHash('md5').update(`${normalized}-${model}-${provider}`).digest('hex')
  }
  
  // Check if response is cached
  get(query: string, model: string, provider: string): string | null {
    const key = this.generateKey(query, model, provider)
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key)
      return null
    }
    
    console.log('💾 [CACHE] Cache hit for query:', query.substring(0, 50) + '...')
    return cached.response
  }
  
  // Store response in cache
  set(query: string, model: string, provider: string, response: string): void {
    // Only cache if response is substantial and successful
    if (response.length < 50 || response.includes('error') || response.includes('Error')) {
      return
    }
    
    const key = this.generateKey(query, model, provider)
    
    // Evict oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value as string
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
      model,
      provider
    })
    
    console.log('💾 [CACHE] Cached response for query:', query.substring(0, 50) + '...')
  }
  
  // Clear expired entries
  cleanExpired(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key)
      }
    }
  }
  
  // Get cache stats
  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      ttl: this.CACHE_TTL
    }
  }
  
  // Check if query should be cached (common patterns)
  shouldCache(query: string): boolean {
    const commonPatterns = [
      'what is',
      'explain',
      'how to',
      'tell me about',
      'define',
      'what are',
      'who is',
      'when was',
      'where is',
      'why does',
      'dubai chocolate',
      'hello',
      'hi',
      'help'
    ]
    
    const normalizedQuery = query.toLowerCase().trim()
    
    // Cache simple greetings and common questions
    if (normalizedQuery.length < 200) {
      return commonPatterns.some(pattern => normalizedQuery.includes(pattern))
    }
    
    return false
  }
}

// Singleton instance
const responseCache = new ResponseCache()

// Clean expired entries every 30 minutes
setInterval(() => {
  responseCache.cleanExpired()
}, 1800000)

export { responseCache }