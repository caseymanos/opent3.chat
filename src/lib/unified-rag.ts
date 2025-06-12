import { loadPDFJS } from './pdf-loader'

export interface DocumentChunk {
  id: string
  content: string
  startIndex: number
  endIndex: number
  pageNumber?: number
}

export interface ProcessedDocument {
  id: string
  filename: string
  content: string
  chunks: DocumentChunk[]
  summary: string
  uploadedAt: string
  fileSize: number
  fileType: string
}

export interface SearchResult {
  document: ProcessedDocument
  chunk: DocumentChunk
  relevanceScore: number
  matchedTerms: string[]
}

export interface RAGResponse {
  results: SearchResult[]
  totalDocuments: number
  searchTime: number
  hasResults: boolean
}

class UnifiedRAGSystem {
  private documents: Map<string, ProcessedDocument> = new Map()
  private readonly CHUNK_SIZE = 1500
  private readonly CHUNK_OVERLAP = 150
  private readonly MIN_RELEVANCE_SCORE = 0.1

  // Process different file types
  async processFile(file: File): Promise<ProcessedDocument> {
    console.log('📄 [UnifiedRAG] Processing file:', file.name, file.type, `${Math.round(file.size / 1024)}KB`)
    
    let content: string
    
    try {
      if (file.type === 'application/pdf') {
        content = await this.extractPDFContent(file)
      } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        content = await file.text()
      } else {
        throw new Error(`Unsupported file type: ${file.type}`)
      }
      
      if (!content || content.trim().length === 0) {
        throw new Error('No content could be extracted from the file')
      }
      
      // Create chunks
      const chunks = this.createIntelligentChunks(content)
      
      // Generate summary
      const summary = this.generateSummary(content, file.name)
      
      const document: ProcessedDocument = {
        id: crypto.randomUUID(),
        filename: file.name,
        content,
        chunks,
        summary,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        fileType: file.type
      }
      
      // Store the document
      this.documents.set(document.id, document)
      
      console.log(`✅ [UnifiedRAG] Document processed: ${chunks.length} chunks, ${Math.round(content.length / 1024)}KB content`)
      
      return document
    } catch (error) {
      console.error('❌ [UnifiedRAG] Error processing file:', error)
      throw new Error(`Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async extractPDFContent(file: File): Promise<string> {
    try {
      const pdfjs = await loadPDFJS()
      if (!pdfjs) {
        throw new Error('PDF.js not available in this environment')
      }
      
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
      const numPages = pdf.numPages
      let fullContent = ''
      
      console.log(`📑 [UnifiedRAG] Extracting text from ${numPages} PDF pages`)
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: { str: string }) => item.str)
          .join(' ')
          .trim()
        
        if (pageText) {
          fullContent += `\n\n[Page ${pageNum}]\n${pageText}`
        }
      }
      
      if (!fullContent.trim()) {
        throw new Error('No text content found in PDF')
      }
      
      return fullContent
    } catch (error) {
      console.error('❌ [UnifiedRAG] PDF extraction failed:', error)
      // Fallback: try to read as text (might work for simple PDFs)
      try {
        const text = await file.text()
        if (text && text.trim().length > 0) {
          console.warn('⚠️ [UnifiedRAG] Using fallback text extraction')
          return `[PDF Content - Basic extraction]\n${text}`
        }
      } catch (fallbackError) {
        console.error('❌ [UnifiedRAG] Fallback extraction also failed:', fallbackError)
      }
      throw new Error('Could not extract text from PDF')
    }
  }

  private createIntelligentChunks(content: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0
    
    // Split by pages first if we have page markers
    const pageRegex = /\[Page (\d+)\]/g
    const pages = content.split(pageRegex)
    
    let currentIndex = 0
    
    for (let i = 0; i < pages.length; i++) {
      const pageContent = pages[i]
      if (!pageContent || pageContent.trim().length === 0) continue
      
      // Extract page number if this is a page content
      const pageNumber = i > 0 && /^\d+$/.test(pages[i - 1]) ? parseInt(pages[i - 1]) : undefined
      
      // Create chunks for this page
      const pageChunks = this.chunkText(pageContent, currentIndex, pageNumber, chunkIndex)
      chunks.push(...pageChunks)
      chunkIndex += pageChunks.length
      currentIndex += pageContent.length
    }
    
    // If no page markers, chunk the entire content
    if (chunks.length === 0) {
      return this.chunkText(content, 0, undefined, 0)
    }
    
    return chunks
  }

  private chunkText(text: string, startOffset: number, pageNumber: number | undefined, chunkStartIndex: number): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    let startIndex = 0
    let chunkIndex = chunkStartIndex
    
    while (startIndex < text.length) {
      let endIndex = Math.min(startIndex + this.CHUNK_SIZE, text.length)
      
      // Try to break at sentence boundaries
      if (endIndex < text.length) {
        const sentenceEnd = text.lastIndexOf('.', endIndex)
        const paragraphEnd = text.lastIndexOf('\n\n', endIndex)
        
        if (sentenceEnd > startIndex + this.CHUNK_SIZE * 0.7) {
          endIndex = sentenceEnd + 1
        } else if (paragraphEnd > startIndex + this.CHUNK_SIZE * 0.5) {
          endIndex = paragraphEnd + 2
        }
      }
      
      const chunkContent = text.slice(startIndex, endIndex).trim()
      
      if (chunkContent.length > 50) { // Only keep meaningful chunks
        chunks.push({
          id: `chunk_${chunkIndex}`,
          content: chunkContent,
          startIndex: startOffset + startIndex,
          endIndex: startOffset + endIndex,
          pageNumber
        })
        chunkIndex++
      }
      
      // Move to next chunk with overlap
      startIndex = Math.max(endIndex - this.CHUNK_OVERLAP, startIndex + 1)
    }
    
    return chunks
  }

  private generateSummary(content: string, filename: string): string {
    // Extract first few sentences or paragraphs for summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10)
    let summary = ''
    
    // Get first meaningful sentences up to 300 characters
    for (const sentence of sentences.slice(0, 10)) {
      if (summary.length + sentence.length > 300) break
      summary += sentence.trim() + '. '
    }
    
    if (!summary) {
      summary = content.substring(0, 200) + '...'
    }
    
    return `Document: ${filename}\n\n${summary.trim()}`
  }

  // Advanced search with multiple strategies
  async searchDocuments(query: string, maxResults: number = 5): Promise<RAGResponse> {
    const startTime = Date.now()
    
    console.log(`🔍 [UnifiedRAG] Searching ${this.documents.size} documents for: "${query}"`)
    
    if (this.documents.size === 0) {
      return {
        results: [],
        totalDocuments: 0,
        searchTime: Date.now() - startTime,
        hasResults: false
      }
    }
    
    const queryLower = query.toLowerCase()
    const queryWords = this.extractSearchTerms(queryLower)
    const results: SearchResult[] = []
    
    // Search all documents
    for (const document of this.documents.values()) {
      for (const chunk of document.chunks) {
        const score = this.calculateRelevanceScore(chunk.content, queryWords, queryLower)
        
        if (score >= this.MIN_RELEVANCE_SCORE) {
          const matchedTerms = this.findMatchedTerms(chunk.content, queryWords)
          
          results.push({
            document,
            chunk,
            relevanceScore: score,
            matchedTerms
          })
        }
      }
    }
    
    // Sort by relevance and take top results
    const sortedResults = results
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxResults)
    
    const searchTime = Date.now() - startTime
    
    console.log(`✅ [UnifiedRAG] Search completed: ${sortedResults.length} results in ${searchTime}ms`)
    
    return {
      results: sortedResults,
      totalDocuments: this.documents.size,
      searchTime,
      hasResults: sortedResults.length > 0
    }
  }

  private extractSearchTerms(query: string): string[] {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'].includes(word))
  }

  private calculateRelevanceScore(content: string, queryWords: string[], fullQuery: string): number {
    const contentLower = content.toLowerCase()
    let score = 0
    
    // Exact phrase match (highest weight)
    if (contentLower.includes(fullQuery)) {
      score += 2.0
    }
    
    // Individual word matches
    let wordMatches = 0
    for (const word of queryWords) {
      if (contentLower.includes(word)) {
        wordMatches++
        score += 0.5
        
        // Bonus for word at start of sentence
        if (new RegExp(`\\b${word}\\b`).test(contentLower)) {
          score += 0.2
        }
      }
    }
    
    // Coverage bonus (percentage of query words found)
    const coverage = wordMatches / Math.max(queryWords.length, 1)
    score += coverage * 0.5
    
    // Length penalty for very short chunks
    if (content.length < 100) {
      score *= 0.8
    }
    
    return Math.min(score, 5.0) // Cap at 5.0
  }

  private findMatchedTerms(content: string, queryWords: string[]): string[] {
    const contentLower = content.toLowerCase()
    return queryWords.filter(word => contentLower.includes(word))
  }

  // Format search results for AI context
  formatContextForAI(searchResponse: RAGResponse, originalQuery: string): string {
    if (!searchResponse.hasResults) {
      return ''
    }
    
    const contextParts: string[] = [
      `DOCUMENT CONTEXT (${searchResponse.results.length} relevant sections found in ${searchResponse.searchTime}ms):`
    ]
    
    searchResponse.results.forEach((result, index) => {
      const source = result.chunk.pageNumber 
        ? `${result.document.filename} (Page ${result.chunk.pageNumber})`
        : result.document.filename
      
      contextParts.push(
        `\n[SOURCE ${index + 1}: ${source}]`,
        `${result.chunk.content}`,
        `[Relevance: ${(result.relevanceScore * 100).toFixed(0)}% | Matched: ${result.matchedTerms.join(', ')}]`
      )
    })
    
    contextParts.push(
      `\nINSTRUCTIONS: Use the above document context to answer the following question. Always cite your sources using the [SOURCE #] format when referencing information from the documents.`,
      `\nQUESTION: ${originalQuery}`
    )
    
    return contextParts.join('\n')
  }

  // Get all documents with summaries
  getAllDocuments(): ProcessedDocument[] {
    return Array.from(this.documents.values())
  }

  getDocument(id: string): ProcessedDocument | undefined {
    return this.documents.get(id)
  }

  removeDocument(id: string): boolean {
    return this.documents.delete(id)
  }

  clearAllDocuments(): void {
    this.documents.clear()
  }

  getStats() {
    const docs = Array.from(this.documents.values())
    return {
      documentCount: docs.length,
      totalChunks: docs.reduce((sum, doc) => sum + doc.chunks.length, 0),
      totalSize: docs.reduce((sum, doc) => sum + doc.fileSize, 0),
      avgChunksPerDoc: docs.length > 0 ? Math.round(docs.reduce((sum, doc) => sum + doc.chunks.length, 0) / docs.length) : 0
    }
  }
}

export const unifiedRAG = new UnifiedRAGSystem()