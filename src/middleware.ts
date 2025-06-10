import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Log all API requests in development
  if (process.env.NODE_ENV === 'development' && request.nextUrl.pathname.startsWith('/api/')) {
    console.log(`[Middleware] ${request.method} ${request.nextUrl.pathname}`)
  }

  // Add CORS headers for development
  const response = NextResponse.next()
  
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}