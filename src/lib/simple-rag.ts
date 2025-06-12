import { loadPDFJS } from './pdf-loader'

export interface SimpleDocument {
  id: string
  filename: string
  content: string
  chunks: SimpleChunk[]
  uploadedAt: string
}

export interface SimpleChunk {
  id: string
  content: string
  pageNumber?: number
  startIndex: number
  endIndex: number
}

class SimpleRAGProcessor {
  private documents: Map<string, SimpleDocument> = new Map()
  private CHUNK_SIZE = 2000 // Much larger chunks for better performance
  private CHUNK_OVERLAP = 200

  async processDocument(file: File): Promise<SimpleDocument> {
    console.log('📄 Processing document:', file.name)
    
    let content: string
    
    try {
      if (file.type === 'application/pdf') {
        // Extract text from PDF
        try {
          const pdfjs = await loadPDFJS()
          if (pdfjs) {
            const arrayBuffer = await file.arrayBuffer()
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
            const numPages = pdf.numPages
            content = ''
            
            for (let i = 1; i <= numPages; i++) {
              const page = await pdf.getPage(i)
              const textContent = await page.getTextContent()
              const pageText = textContent.items
                .map((item: { str: string }) => item.str)
                .join(' ')
              content += `\n[Page ${i}]\n${pageText}\n`
            }
          } else {
            throw new Error('PDF.js not available in browser')
          }
        } catch (pdfError) {
          console.warn('PDF.js failed, falling back to basic text extraction:', pdfError)
          // Fallback: treat as binary and extract what we can
          const text = await file.text()
          content = `[PDF Content - Basic extraction]\n${text}`
        }
      } else {
        // Plain text files
        content = await file.text()
      }
    } catch (error) {
      console.error('Error processing document:', error)
      throw new Error('Failed to process document')
    }

    // Create simple chunks with overlap
    const chunks = this.createChunks(content)
    
    const doc: SimpleDocument = {
      id: crypto.randomUUID(),
      filename: file.name,
      content,
      chunks,
      uploadedAt: new Date().toISOString()
    }
    
    // Store document
    this.documents.set(doc.id, doc)
    
    console.log(`✅ Document processed: ${chunks.length} chunks created`)
    return doc
  }

  private createChunks(content: string): SimpleChunk[] {
    const chunks: SimpleChunk[] = []
    let startIndex = 0
    let chunkIndex = 0
    
    while (startIndex < content.length) {
      let endIndex = startIndex + this.CHUNK_SIZE
      
      // Try to break at sentence boundary
      if (endIndex < content.length) {
        const nextPeriod = content.indexOf('.', endIndex)
        const nextNewline = content.indexOf('\n', endIndex)
        
        if (nextPeriod !== -1 && nextPeriod < endIndex + 200) {
          endIndex = nextPeriod + 1
        } else if (nextNewline !== -1 && nextNewline < endIndex + 200) {
          endIndex = nextNewline + 1
        }
      }
      
      const chunkContent = content.slice(startIndex, endIndex).trim()
      
      if (chunkContent.length > 0) {
        chunks.push({
          id: `chunk_${chunkIndex++}`,
          content: chunkContent,
          startIndex,
          endIndex: Math.min(endIndex, content.length)
        })
      }
      
      // Move to next chunk with overlap
      startIndex = endIndex - this.CHUNK_OVERLAP
    }
    
    return chunks
  }

  async searchDocuments(query: string, maxResults: number = 5): Promise<Array<{
    document: SimpleDocument
    chunk: SimpleChunk
    relevance: number
  }>> {
    const results: Array<{
      document: SimpleDocument
      chunk: SimpleChunk
      relevance: number
    }> = []
    
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
    
    // Search all documents
    for (const doc of this.documents.values()) {
      for (const chunk of doc.chunks) {
        const chunkLower = chunk.content.toLowerCase()
        let relevance = 0
        
        // Simple keyword matching
        for (const word of queryWords) {
          if (chunkLower.includes(word)) {
            relevance += 1
          }
        }
        
        // Exact phrase match bonus
        if (chunkLower.includes(queryLower)) {
          relevance += 3
        }
        
        if (relevance > 0) {
          results.push({
            document: doc,
            chunk,
            relevance
          })
        }
      }
    }
    
    // Sort by relevance and return top results
    return results
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxResults)
  }

  getDocument(id: string): SimpleDocument | undefined {
    return this.documents.get(id)
  }

  getAllDocuments(): SimpleDocument[] {
    return Array.from(this.documents.values())
  }

  removeDocument(id: string): void {
    this.documents.delete(id)
  }

  clearAllDocuments(): void {
    this.documents.clear()
  }
}

export const simpleRAG = new SimpleRAGProcessor()