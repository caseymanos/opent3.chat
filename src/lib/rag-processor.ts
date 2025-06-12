export interface DocumentChunk {
  id: string
  content: string
  type: 'text' | 'heading' | 'list' | 'code' | 'table' | 'image'
  metadata: {
    page?: number
    position: { x: number; y: number; width: number; height: number }
    fontSize?: number
    fontWeight?: string
    hierarchy?: number // For headings: 1-6
    confidence: number // AI confidence in chunk classification
    keywords: string[]
    summary: string
    embedding?: number[] // Vector embedding for similarity search
  }
  parent?: string // Parent chunk ID for hierarchical structure
  children: string[] // Child chunk IDs
  relationships: {
    before?: string
    after?: string
    contextuallyRelated: string[] // IDs of related chunks
  }
}

export interface DocumentStructure {
  id: string
  filename: string
  totalPages: number
  chunks: DocumentChunk[]
  hierarchy: DocumentHierarchy[]
  metadata: {
    title?: string
    author?: string
    subject?: string
    keywords: string[]
    language: string
    documentType: 'pdf' | 'docx' | 'txt' | 'md' | 'html'
    processingTimestamp: string
    chunkingStrategy: string
    totalTokens: number
  }
}

export interface DocumentHierarchy {
  id: string
  level: number
  title: string
  chunkIds: string[]
  children: DocumentHierarchy[]
}

export interface RAGQuery {
  query: string
  filters?: {
    documentIds?: string[]
    chunkTypes?: DocumentChunk['type'][]
    keywords?: string[]
    dateRange?: { from: Date; to: Date }
  }
  options: {
    maxChunks: number
    similarityThreshold: number
    includeContext: boolean // Include surrounding chunks
    rankingStrategy: 'semantic' | 'keyword' | 'hybrid'
  }
}

export interface RAGResult {
  chunks: (DocumentChunk & { relevanceScore: number })[]
  context: {
    documentTitle: string
    totalMatches: number
    searchStrategy: string
    processingTimeMs: number
  }
}

class VisualRAGProcessor {
  private embeddingCache = new Map<string, number[]>()
  
  constructor(private apiKey?: string) {}

  /**
   * Process a document with visual layout analysis
   */
  async processDocument(
    file: File,
    options: {
      chunkingStrategy: 'semantic' | 'layout' | 'hybrid'
      maxChunkSize: number
      preserveFormatting: boolean
      extractImages: boolean
    } = {
      chunkingStrategy: 'hybrid',
      maxChunkSize: 1000,
      preserveFormatting: true,
      extractImages: true
    }
  ): Promise<DocumentStructure> {
    console.log('🔄 [RAG] Starting document processing:', file.name)
    
    // Step 1: Extract raw content and layout information
    const rawContent = await this.extractContentWithLayout(file)
    
    // Step 2: Perform intelligent chunking based on visual structure
    const chunks = await this.performVisualChunking(rawContent, options)
    
    // Step 3: Build document hierarchy
    const hierarchy = this.buildDocumentHierarchy(chunks)
    
    // Step 4: Generate embeddings for semantic search
    const chunksWithEmbeddings = await this.generateEmbeddings(chunks)
    
    // Step 5: Establish relationships between chunks
    const chunksWithRelationships = this.establishChunkRelationships(chunksWithEmbeddings)
    
    const documentStructure: DocumentStructure = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      filename: file.name,
      totalPages: rawContent.totalPages,
      chunks: chunksWithRelationships,
      hierarchy,
      metadata: {
        title: rawContent.metadata.title,
        author: rawContent.metadata.author,
        keywords: this.extractGlobalKeywords(chunksWithRelationships),
        language: 'en', // TODO: Detect language
        documentType: this.getDocumentType(file.name),
        processingTimestamp: new Date().toISOString(),
        chunkingStrategy: options.chunkingStrategy,
        totalTokens: chunksWithRelationships.reduce((acc, chunk) => acc + this.estimateTokens(chunk.content), 0)
      }
    }
    
    console.log('✅ [RAG] Document processed:', {
      chunks: documentStructure.chunks.length,
      hierarchy: documentStructure.hierarchy.length,
      tokens: documentStructure.metadata.totalTokens
    })
    
    return documentStructure
  }

  /**
   * Extract content with layout information
   */
  private async extractContentWithLayout(file: File): Promise<{
    content: string
    totalPages: number
    layoutElements: Array<{
      type: string
      content: string
      position: { x: number; y: number; width: number; height: number }
      page: number
      style: { fontSize?: number; fontWeight?: string }
    }>
    metadata: { title?: string; author?: string; subject?: string }
  }> {
    // For PDF files, we'd use a library like pdf-parse or pdf2pic
    // For now, we'll simulate the layout extraction
    
    if (file.type === 'application/pdf') {
      return this.extractPDFLayout(file)
    } else if (file.type.includes('text') || file.name.endsWith('.md')) {
      return this.extractTextLayout(file)
    } else {
      throw new Error(`Unsupported file type: ${file.type}`)
    }
  }

  private async extractPDFLayout(file: File): Promise<any> {
    try {
      // Try to load and use PDF.js for real PDF processing
      const { loadPDFJS } = await import('./pdf-loader')
      const pdfjsLib = await loadPDFJS()
      
      if (pdfjsLib) {
        return await this.extractRealPDFLayout(file, pdfjsLib)
      }
      
      // Fallback: simulate PDF layout extraction
      const text = await file.text()
      
      return {
        content: text,
        totalPages: Math.ceil(text.length / 3000), // Estimate pages
        layoutElements: this.simulateLayoutElements(text),
        metadata: {
          title: file.name.replace('.pdf', ''),
          author: 'Unknown',
          subject: 'Document'
        }
      }
    } catch (error) {
      console.warn('[RAG] PDF extraction fallback:', error)
      // Ultimate fallback to text extraction
      const text = await file.text()
      
      return {
        content: text,
        totalPages: 1,
        layoutElements: this.simulateLayoutElements(text),
        metadata: {
          title: file.name.replace('.pdf', ''),
          author: 'Unknown'
        }
      }
    }
  }

  private async extractRealPDFLayout(file: File, pdfjsLib: any): Promise<any> {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    const layoutElements: any[] = []
    let elementIndex = 0
    
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()
      
      textContent.items.forEach((item: any) => {
        if (item.str && item.str.trim()) {
          fullText += item.str + ' '
          
          layoutElements.push({
            type: this.detectContentType(item.str),
            content: item.str,
            position: {
              x: item.transform[4],
              y: item.transform[5],
              width: item.width || 100,
              height: item.height || item.transform[0] || 12
            },
            page: pageNum,
            style: {
              fontSize: item.transform[0] || 12,
              fontWeight: item.fontName?.includes('Bold') ? 'bold' : 'normal'
            }
          })
        }
      })
    }
    
    return {
      content: fullText,
      totalPages: pdf.numPages,
      layoutElements,
      metadata: {
        title: (await pdf.getMetadata()).info?.Title || file.name.replace('.pdf', ''),
        author: (await pdf.getMetadata()).info?.Author || 'Unknown',
        subject: (await pdf.getMetadata()).info?.Subject || 'Document'
      }
    }
  }

  private detectContentType(text: string): string {
    const trimmed = text.trim()
    
    if (trimmed.match(/^#+\s/) || (trimmed.length < 100 && trimmed.match(/^[A-Z][^.]*$/))) {
      return 'heading'
    }
    if (trimmed.match(/^[-*+]\s/) || trimmed.match(/^\d+\.\s/)) {
      return 'list'
    }
    if (trimmed.match(/^```/) || trimmed.includes('function') || trimmed.includes('{') || trimmed.includes('}')) {
      return 'code'
    }
    
    return 'text'
  }

  private async extractTextLayout(file: File): Promise<any> {
    const text = await file.text()
    
    return {
      content: text,
      totalPages: 1,
      layoutElements: this.simulateLayoutElements(text),
      metadata: {
        title: file.name,
        author: 'Unknown'
      }
    }
  }

  private simulateLayoutElements(text: string): any[] {
    const lines = text.split('\n')
    const elements: any[] = []
    let yPosition = 0
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      if (trimmedLine.length === 0) return
      
      let type = 'text'
      let fontSize = 12
      let fontWeight = 'normal'
      
      // Detect headings
      if (trimmedLine.startsWith('#')) {
        type = 'heading'
        const level = (trimmedLine.match(/^#+/) || [''])[0].length
        fontSize = 18 - level * 2
        fontWeight = 'bold'
      } else if (trimmedLine.match(/^[-*+]\s/)) {
        type = 'list'
      } else if (trimmedLine.includes('```') || trimmedLine.includes('`')) {
        type = 'code'
        fontSize = 10
      }
      
      elements.push({
        type,
        content: trimmedLine,
        position: {
          x: 50,
          y: yPosition,
          width: 500,
          height: fontSize + 4
        },
        page: Math.floor(index / 50) + 1, // Estimate page based on line number
        style: { fontSize, fontWeight }
      })
      
      yPosition += fontSize + 8
    })
    
    return elements
  }

  /**
   * Perform intelligent chunking based on visual structure
   */
  private async performVisualChunking(
    rawContent: any,
    options: any
  ): Promise<DocumentChunk[]> {
    const chunks: DocumentChunk[] = []
    const elements = rawContent.layoutElements
    
    let currentChunk: any = null
    let chunkIndex = 0
    
    for (const element of elements) {
      // Start new chunk on headings or when current chunk is too large
      const shouldStartNewChunk = 
        element.type === 'heading' ||
        (currentChunk && this.estimateTokens(currentChunk.content) > options.maxChunkSize)
      
      if (shouldStartNewChunk && currentChunk) {
        chunks.push(await this.finalizeChunk(currentChunk, chunkIndex++))
        currentChunk = null
      }
      
      if (!currentChunk) {
        currentChunk = {
          id: `chunk_${chunkIndex}`,
          content: '',
          type: element.type,
          elements: [],
          position: element.position,
          page: element.page
        }
      }
      
      currentChunk.content += element.content + '\n'
      currentChunk.elements.push(element)
      
      // Update chunk position to encompass all elements
      currentChunk.position = this.expandPosition(currentChunk.position, element.position)
    }
    
    // Add the last chunk
    if (currentChunk) {
      chunks.push(await this.finalizeChunk(currentChunk, chunkIndex))
    }
    
    return chunks
  }

  private async finalizeChunk(chunkData: any, index: number): Promise<DocumentChunk> {
    const keywords = this.extractKeywords(chunkData.content)
    const summary = await this.generateSummary(chunkData.content)
    
    return {
      id: `chunk_${index}_${Date.now()}`,
      content: chunkData.content.trim(),
      type: chunkData.type,
      metadata: {
        page: chunkData.page,
        position: chunkData.position,
        fontSize: chunkData.elements[0]?.style?.fontSize,
        fontWeight: chunkData.elements[0]?.style?.fontWeight,
        hierarchy: chunkData.type === 'heading' ? this.detectHeadingLevel(chunkData.content) : undefined,
        confidence: 0.95, // High confidence for now
        keywords,
        summary
      },
      children: [],
      relationships: {
        contextuallyRelated: []
      }
    }
  }

  private expandPosition(pos1: any, pos2: any) {
    return {
      x: Math.min(pos1.x, pos2.x),
      y: Math.min(pos1.y, pos2.y),
      width: Math.max(pos1.x + pos1.width, pos2.x + pos2.width) - Math.min(pos1.x, pos2.x),
      height: Math.max(pos1.y + pos1.height, pos2.y + pos2.height) - Math.min(pos1.y, pos2.y)
    }
  }

  private detectHeadingLevel(content: string): number {
    const match = content.match(/^#+/)
    return match ? match[0].length : 1
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were'].includes(word))
    
    const wordCounts = new Map<string, number>()
    words.forEach(word => {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1)
    })
    
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0])
  }

  private async generateSummary(content: string): Promise<string> {
    // For now, return first sentence or first 100 characters
    const sentences = content.split(/[.!?]+/)
    if (sentences.length > 0 && sentences[0].trim().length > 10) {
      return sentences[0].trim() + '.'
    }
    return content.substring(0, 100) + '...'
  }

  private buildDocumentHierarchy(chunks: DocumentChunk[]): DocumentHierarchy[] {
    const hierarchy: DocumentHierarchy[] = []
    const stack: DocumentHierarchy[] = []
    
    chunks.forEach(chunk => {
      if (chunk.type === 'heading' && chunk.metadata.hierarchy) {
        const level = chunk.metadata.hierarchy
        
        // Pop stack until we find appropriate parent level
        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop()
        }
        
        const hierarchyNode: DocumentHierarchy = {
          id: `hierarchy_${chunk.id}`,
          level,
          title: chunk.content.replace(/^#+\s*/, ''),
          chunkIds: [chunk.id],
          children: []
        }
        
        if (stack.length === 0) {
          hierarchy.push(hierarchyNode)
        } else {
          stack[stack.length - 1].children.push(hierarchyNode)
        }
        
        stack.push(hierarchyNode)
      } else if (stack.length > 0) {
        // Add non-heading chunks to the current section
        stack[stack.length - 1].chunkIds.push(chunk.id)
      }
    })
    
    return hierarchy
  }

  private async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
    // In a real implementation, this would call an embedding API
    // For now, we'll generate mock embeddings
    
    return chunks.map(chunk => ({
      ...chunk,
      metadata: {
        ...chunk.metadata,
        embedding: this.generateMockEmbedding(chunk.content)
      }
    }))
  }

  private generateMockEmbedding(text: string): number[] {
    // Generate a consistent mock embedding based on text content
    const hash = this.simpleHash(text)
    const embedding: number[] = []
    
    for (let i = 0; i < 384; i++) {
      embedding.push((Math.sin(hash + i) + 1) / 2)
    }
    
    return embedding
  }

  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash
  }

  private establishChunkRelationships(chunks: DocumentChunk[]): DocumentChunk[] {
    return chunks.map((chunk, index) => ({
      ...chunk,
      relationships: {
        before: index > 0 ? chunks[index - 1].id : undefined,
        after: index < chunks.length - 1 ? chunks[index + 1].id : undefined,
        contextuallyRelated: this.findRelatedChunks(chunk, chunks)
      }
    }))
  }

  private findRelatedChunks(targetChunk: DocumentChunk, allChunks: DocumentChunk[]): string[] {
    const related: string[] = []
    const targetKeywords = new Set(targetChunk.metadata.keywords)
    
    allChunks.forEach(chunk => {
      if (chunk.id === targetChunk.id) return
      
      const commonKeywords = chunk.metadata.keywords.filter(keyword => 
        targetKeywords.has(keyword)
      )
      
      if (commonKeywords.length >= 2) {
        related.push(chunk.id)
      }
    })
    
    return related.slice(0, 5) // Limit to top 5 related chunks
  }

  private extractGlobalKeywords(chunks: DocumentChunk[]): string[] {
    const allKeywords = new Map<string, number>()
    
    chunks.forEach(chunk => {
      chunk.metadata.keywords.forEach(keyword => {
        allKeywords.set(keyword, (allKeywords.get(keyword) || 0) + 1)
      })
    })
    
    return Array.from(allKeywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(entry => entry[0])
  }

  private getDocumentType(filename: string): DocumentStructure['metadata']['documentType'] {
    const ext = filename.toLowerCase().split('.').pop()
    switch (ext) {
      case 'pdf': return 'pdf'
      case 'docx': case 'doc': return 'docx'
      case 'md': return 'md'
      case 'html': case 'htm': return 'html'
      default: return 'txt'
    }
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4)
  }

  /**
   * Search through processed documents using RAG
   */
  async search(
    documents: DocumentStructure[],
    query: RAGQuery
  ): Promise<RAGResult> {
    console.log('🔍 [RAG] Searching documents:', query.query)
    
    const startTime = Date.now()
    const allChunks: (DocumentChunk & { documentId: string; documentTitle: string })[] = []
    
    // Collect all chunks from all documents
    documents.forEach(doc => {
      if (!query.filters?.documentIds || query.filters.documentIds.includes(doc.id)) {
        doc.chunks.forEach(chunk => {
          if (!query.filters?.chunkTypes || query.filters.chunkTypes.includes(chunk.type)) {
            allChunks.push({
              ...chunk,
              documentId: doc.id,
              documentTitle: doc.metadata.title || doc.filename
            })
          }
        })
      }
    })
    
    // Score chunks based on relevance
    const scoredChunks = allChunks.map(chunk => ({
      ...chunk,
      relevanceScore: this.calculateRelevanceScore(query.query, chunk, query.options.rankingStrategy)
    }))
    
    // Filter by similarity threshold and sort by relevance
    const relevantChunks = scoredChunks
      .filter(chunk => chunk.relevanceScore >= query.options.similarityThreshold)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.options.maxChunks)
    
    const processingTime = Date.now() - startTime
    
    console.log('✅ [RAG] Search completed:', {
      totalChunks: allChunks.length,
      relevantChunks: relevantChunks.length,
      processingTimeMs: processingTime
    })
    
    return {
      chunks: relevantChunks,
      context: {
        documentTitle: documents.length === 1 ? documents[0].metadata.title || documents[0].filename : `${documents.length} documents`,
        totalMatches: relevantChunks.length,
        searchStrategy: query.options.rankingStrategy,
        processingTimeMs: processingTime
      }
    }
  }

  private calculateRelevanceScore(
    query: string,
    chunk: DocumentChunk & { documentId: string },
    strategy: 'semantic' | 'keyword' | 'hybrid'
  ): number {
    const queryLower = query.toLowerCase()
    const contentLower = chunk.content.toLowerCase()
    
    // Keyword-based scoring
    const keywordScore = this.calculateKeywordScore(queryLower, contentLower, chunk.metadata.keywords)
    
    // Semantic scoring (simplified - would use actual embeddings in production)
    const semanticScore = this.calculateSemanticScore(query, chunk)
    
    // Position-based bonus (earlier chunks get slight boost)
    const positionBonus = Math.max(0, 1 - (chunk.metadata.position.y / 10000)) * 0.1
    
    // Type-based bonus
    const typeBonus = chunk.type === 'heading' ? 0.2 : chunk.type === 'text' ? 0.1 : 0
    
    switch (strategy) {
      case 'keyword':
        return Math.min(1, keywordScore + positionBonus + typeBonus)
      case 'semantic':
        return Math.min(1, semanticScore + positionBonus + typeBonus)
      case 'hybrid':
        return Math.min(1, (keywordScore * 0.6 + semanticScore * 0.4) + positionBonus + typeBonus)
      default:
        return 0
    }
  }

  private calculateKeywordScore(query: string, content: string, keywords: string[]): number {
    const queryWords = query.split(/\s+/).filter(word => word.length > 2)
    let score = 0
    
    queryWords.forEach(word => {
      // Exact match in content
      if (content.includes(word)) {
        score += 0.3
      }
      
      // Match in keywords
      if (keywords.some(keyword => keyword.includes(word) || word.includes(keyword))) {
        score += 0.2
      }
      
      // Fuzzy match
      const fuzzyMatches = content.match(new RegExp(word.substring(0, word.length - 1), 'gi'))
      if (fuzzyMatches) {
        score += fuzzyMatches.length * 0.1
      }
    })
    
    return Math.min(1, score / queryWords.length)
  }

  private calculateSemanticScore(query: string, chunk: DocumentChunk): number {
    // Simplified semantic scoring - in production would use actual vector similarity
    const queryEmbedding = this.generateMockEmbedding(query)
    const chunkEmbedding = chunk.metadata.embedding || this.generateMockEmbedding(chunk.content)
    
    return this.cosineSimilarity(queryEmbedding, chunkEmbedding)
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
  }
}

export const ragProcessor = new VisualRAGProcessor()
export default VisualRAGProcessor