import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Use the GitHub MCP to search repositories
    const searchResults = await fetch('http://localhost:3000/mcp/github/search-repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })

    if (!searchResults.ok) {
      return NextResponse.json(
        { error: 'Failed to search repositories' }, 
        { status: searchResults.status }
      )
    }

    const repositories = await searchResults.json()
    return NextResponse.json(repositories)
  } catch (error) {
    console.error('GitHub repository search error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}