import { NextRequest } from 'next/server'
import { unifiedRAG } from '@/lib/unified-rag'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('query')
    const docId = searchParams.get('docId')
    
    const stats = unifiedRAG.getStats()
    const allDocs = unifiedRAG.getAllDocuments()
    
    const debugInfo: any = {
      stats,
      documents: allDocs.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        fileSize: doc.fileSize,
        chunks: doc.chunks.length,
        summary: doc.summary,
        uploadedAt: doc.uploadedAt,
        contentPreview: doc.content.substring(0, 200) + (doc.content.length > 200 ? '...' : ''),
        firstChunkPreview: doc.chunks[0]?.content.substring(0, 150) + '...'
      }))
    }
    
    // If query provided, test search
    if (query) {
      const searchResult = await unifiedRAG.searchDocuments(query, 10)
      debugInfo.searchTest = {
        query,
        hasResults: searchResult.hasResults,
        resultCount: searchResult.results.length,
        searchTime: searchResult.searchTime,
        results: searchResult.results.map(result => ({
          documentId: result.document.id,
          filename: result.document.filename,
          chunkId: result.chunk.id,
          relevanceScore: result.relevanceScore,
          matchedTerms: result.matchedTerms,
          chunkContent: result.chunk.content.substring(0, 200) + '...'
        }))
      }
    }
    
    // If docId provided, show full document details
    if (docId) {
      const doc = unifiedRAG.getDocument(docId)
      if (doc) {
        debugInfo.documentDetails = {
          id: doc.id,
          filename: doc.filename,
          content: doc.content,
          chunks: doc.chunks.map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
            pageNumber: chunk.pageNumber
          }))
        }
      }
    }
    
    return Response.json(debugInfo, { 
      headers: { 'Content-Type': 'application/json' } 
    })
  } catch (error) {
    console.error('❌ [DEBUG RAG] Error:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}