import { NextRequest } from 'next/server'
import { unifiedRAG } from '@/lib/unified-rag'

// Store for server-side document management
const serverDocuments = new Map<string, any>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, document, documentId } = body

    switch (action) {
      case 'store_processed': {
        console.log('📄 [RAG API] Storing pre-processed document:', document?.filename)
        
        if (!document) {
          return Response.json({ error: 'No document provided' }, { status: 400 })
        }

        // Store the already processed document directly
        const processedDoc = {
          id: document.id,
          filename: document.filename,
          content: document.content,
          chunks: document.chunks,
          summary: document.summary,
          uploadedAt: document.uploadedAt,
          fileSize: document.fileSize,
          fileType: document.fileType
        }

        // Add to unified RAG system
        for (const chunk of document.chunks) {
          // The RAG system needs the document object with chunks
          if (!unifiedRAG.getDocument(document.id)) {
            // Add document to RAG system manually
            (unifiedRAG as any).documents.set(document.id, processedDoc)
          }
        }
        
        serverDocuments.set(document.id, processedDoc)
        
        console.log(`✅ [RAG API] Document stored server-side: ${document.chunks.length} chunks`)
        return Response.json({ 
          success: true, 
          document: {
            id: document.id,
            filename: document.filename,
            chunks: document.chunks.length,
            summary: document.summary
          }
        })
      }

      case 'search': {
        const { query, maxResults = 5 } = body
        console.log(`🔍 [RAG API] Searching for: "${query}"`)
        
        const searchResult = await unifiedRAG.searchDocuments(query, maxResults)
        console.log(`✅ [RAG API] Search completed: ${searchResult.results.length} results`)
        
        return Response.json(searchResult)
      }

      case 'list': {
        const documents = Array.from(serverDocuments.values())
        return Response.json({ documents })
      }

      case 'delete': {
        if (!documentId) {
          return Response.json({ error: 'Document ID required' }, { status: 400 })
        }
        
        const success = unifiedRAG.removeDocument(documentId)
        if (success) {
          serverDocuments.delete(documentId)
        }
        
        return Response.json({ success })
      }

      case 'clear': {
        unifiedRAG.clearAllDocuments()
        serverDocuments.clear()
        return Response.json({ success: true })
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('❌ [RAG API] Error:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const stats = unifiedRAG.getStats()
    const documents = Array.from(serverDocuments.values()).map(doc => ({
      id: doc.id,
      filename: doc.filename,
      chunks: doc.chunks.length,
      size: doc.fileSize,
      uploadedAt: doc.uploadedAt
    }))
    
    return Response.json({ 
      stats,
      documents
    })
  } catch (error) {
    console.error('❌ [RAG API] Error getting stats:', error)
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}