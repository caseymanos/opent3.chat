import { unifiedRAG } from '../unified-rag'

// Mock PDF.js
jest.mock('../pdf-loader', () => ({
  loadPDFJS: jest.fn(() => Promise.resolve(null))
}))

// Polyfills for Node.js environment
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder
}
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder
}

// Mock File API for Node.js environment
class MockFile {
  name: string
  lastModified: number
  webkitRelativePath: string
  size: number
  type: string
  private content: string

  constructor(fileBits: BlobPart[], fileName: string, options?: FilePropertyBag) {
    this.name = fileName
    this.lastModified = options?.lastModified ?? Date.now()
    this.webkitRelativePath = ''
    this.type = options?.type ?? ''
    
    // Convert fileBits to string
    this.content = fileBits.map(bit => {
      if (typeof bit === 'string') return bit
      if (bit instanceof ArrayBuffer) return new TextDecoder().decode(bit)
      return String(bit)
    }).join('')
    
    this.size = this.content.length
  }

  // Add the text() method that's available in browsers
  async text(): Promise<string> {
    return this.content
  }

  // Add arrayBuffer method for completeness
  async arrayBuffer(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(this.content).buffer as ArrayBuffer
  }
}

// Replace global File with our mock
global.File = MockFile as any

describe('UnifiedRAG System', () => {
  beforeEach(() => {
    // Clear all documents before each test
    unifiedRAG.clearAllDocuments()
  })

  describe('Text File Processing', () => {
    it('should process a simple text file', async () => {
      const textContent = 'This is a test document about artificial intelligence. AI systems can learn from data and make predictions. Machine learning is a subset of AI that focuses on algorithms.'
      const mockFile = new File([textContent], 'test.txt', { type: 'text/plain' })

      const document = await unifiedRAG.processFile(mockFile)

      expect(document.filename).toBe('test.txt')
      expect(document.content).toBe(textContent)
      expect(document.chunks.length).toBeGreaterThan(0)
      expect(document.summary).toContain('test.txt')
      expect(document.fileType).toBe('text/plain')
    })

    it('should create appropriate chunks with overlap', async () => {
      // Create a long text that will be split into multiple chunks
      const longText = 'A'.repeat(3000) + ' This is the end marker.'
      const mockFile = new File([longText], 'long.txt', { type: 'text/plain' })

      const document = await unifiedRAG.processFile(mockFile)

      expect(document.chunks.length).toBeGreaterThan(1)
      
      // Check that chunks have reasonable sizes
      document.chunks.forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(1500 + 200) // CHUNK_SIZE + some flexibility
        expect(chunk.content.length).toBeGreaterThan(50) // Minimum meaningful size
      })
    })

    it('should handle empty files gracefully', async () => {
      const mockFile = new File([''], 'empty.txt', { type: 'text/plain' })

      await expect(unifiedRAG.processFile(mockFile)).rejects.toThrow('No content could be extracted')
    })
  })

  describe('Document Search', () => {
    beforeEach(async () => {
      // Add test documents
      const doc1 = 'Artificial intelligence is transforming healthcare. Machine learning algorithms can analyze medical images and detect diseases early. Deep learning models are particularly effective for radiology.'
      const doc2 = 'Climate change affects global weather patterns. Rising temperatures cause ice caps to melt. Renewable energy sources like solar and wind power can help reduce carbon emissions.'
      const doc3 = 'Software development requires careful planning. Agile methodologies emphasize iterative development and continuous feedback. Testing is crucial for maintaining code quality.'

      await unifiedRAG.processFile(new File([doc1], 'ai-healthcare.txt', { type: 'text/plain' }))
      await unifiedRAG.processFile(new File([doc2], 'climate.txt', { type: 'text/plain' }))
      await unifiedRAG.processFile(new File([doc3], 'software.txt', { type: 'text/plain' }))
    })

    it('should find relevant documents for AI-related queries', async () => {
      const result = await unifiedRAG.searchDocuments('artificial intelligence machine learning')

      expect(result.hasResults).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
      expect(result.totalDocuments).toBe(3)
      expect(result.searchTime).toBeGreaterThan(0)

      // Should find AI document with high relevance
      const topResult = result.results[0]
      expect(topResult.document.filename).toBe('ai-healthcare.txt')
      expect(topResult.relevanceScore).toBeGreaterThan(0.5)
      expect(topResult.matchedTerms).toContain('artificial')
    })

    it('should find climate-related content', async () => {
      const result = await unifiedRAG.searchDocuments('climate change renewable energy')

      expect(result.hasResults).toBe(true)
      const topResult = result.results[0]
      expect(topResult.document.filename).toBe('climate.txt')
      expect(topResult.matchedTerms).toEqual(expect.arrayContaining(['climate', 'renewable', 'energy']))
    })

    it('should handle queries with no matches', async () => {
      const result = await unifiedRAG.searchDocuments('quantum physics nuclear fusion')

      expect(result.hasResults).toBe(false)
      expect(result.results.length).toBe(0)
    })

    it('should rank results by relevance', async () => {
      const result = await unifiedRAG.searchDocuments('development software', 5)

      expect(result.hasResults).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)

      // Results should be sorted by relevance (highest first)
      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].relevanceScore).toBeGreaterThanOrEqual(result.results[i].relevanceScore)
      }
    })

    it('should limit results to maxResults parameter', async () => {
      const result = await unifiedRAG.searchDocuments('the', 2) // Common word that should match multiple chunks

      if (result.hasResults) {
        expect(result.results.length).toBeLessThanOrEqual(2)
      }
    })
  })

  describe('AI Context Formatting', () => {
    beforeEach(async () => {
      const testDoc = 'JavaScript is a programming language. It runs in browsers and servers. Node.js is a JavaScript runtime for backend development.'
      await unifiedRAG.processFile(new File([testDoc], 'javascript.txt', { type: 'text/plain' }))
    })

    it('should format search results for AI context', async () => {
      const searchResult = await unifiedRAG.searchDocuments('JavaScript programming')
      const context = unifiedRAG.formatContextForAI(searchResult, 'What is JavaScript?')

      expect(context).toContain('DOCUMENT CONTEXT')
      expect(context).toContain('[SOURCE 1: javascript.txt]')
      expect(context).toContain('JavaScript is a programming language')
      expect(context).toContain('INSTRUCTIONS:')
      expect(context).toContain('QUESTION: What is JavaScript?')
      expect(context).toContain('cite your sources')
    })

    it('should return empty string for no results', async () => {
      const searchResult = await unifiedRAG.searchDocuments('quantum mechanics')
      const context = unifiedRAG.formatContextForAI(searchResult, 'What is quantum mechanics?')

      expect(context).toBe('')
    })
  })

  describe('Document Management', () => {
    it('should track document statistics', async () => {
      expect(unifiedRAG.getStats().documentCount).toBe(0)

      const doc1 = new File(['Test content 1'], 'test1.txt', { type: 'text/plain' })
      const doc2 = new File(['Test content 2 with more text'], 'test2.txt', { type: 'text/plain' })

      await unifiedRAG.processFile(doc1)
      await unifiedRAG.processFile(doc2)

      const stats = unifiedRAG.getStats()
      expect(stats.documentCount).toBe(2)
      expect(stats.totalChunks).toBeGreaterThan(0)
      expect(stats.totalSize).toBe(doc1.size + doc2.size)
    })

    it('should remove documents correctly', async () => {
      const doc = await unifiedRAG.processFile(new File(['Test'], 'test.txt', { type: 'text/plain' }))
      
      expect(unifiedRAG.getDocument(doc.id)).toBeDefined()
      
      const removed = unifiedRAG.removeDocument(doc.id)
      expect(removed).toBe(true)
      expect(unifiedRAG.getDocument(doc.id)).toBeUndefined()
    })

    it('should clear all documents', async () => {
      await unifiedRAG.processFile(new File(['Test 1'], 'test1.txt', { type: 'text/plain' }))
      await unifiedRAG.processFile(new File(['Test 2'], 'test2.txt', { type: 'text/plain' }))

      expect(unifiedRAG.getStats().documentCount).toBe(2)

      unifiedRAG.clearAllDocuments()
      expect(unifiedRAG.getStats().documentCount).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle unsupported file types', async () => {
      const mockFile = new File(['test'], 'test.xyz', { type: 'application/unknown' })

      await expect(unifiedRAG.processFile(mockFile)).rejects.toThrow('Unsupported file type')
    })

    it('should handle file processing errors gracefully', async () => {
      // Create a file that might cause processing issues
      const invalidFile = new File([new ArrayBuffer(0)], 'invalid.txt', { type: 'text/plain' })

      await expect(unifiedRAG.processFile(invalidFile)).rejects.toThrow()
    })
  })

  describe('Performance Tests', () => {
    it('should handle large documents efficiently', async () => {
      // Create a large document (about 50KB of text)
      const largeText = 'This is a performance test document. '.repeat(1500)
      const mockFile = new File([largeText], 'large.txt', { type: 'text/plain' })

      const startTime = Date.now()
      const document = await unifiedRAG.processFile(mockFile)
      const processingTime = Date.now() - startTime

      expect(processingTime).toBeLessThan(5000) // Should process within 5 seconds
      expect(document.chunks.length).toBeGreaterThan(10) // Should create multiple chunks
    })

    it('should search large document sets quickly', async () => {
      // Add multiple documents
      for (let i = 0; i < 10; i++) {
        const content = `Document ${i} contains information about topic ${i % 3}. This is test content for performance evaluation.`
        await unifiedRAG.processFile(new File([content], `doc${i}.txt`, { type: 'text/plain' }))
      }

      const startTime = Date.now()
      const result = await unifiedRAG.searchDocuments('topic information test')
      const searchTime = Date.now() - startTime

      expect(searchTime).toBeLessThan(1000) // Should search within 1 second
      expect(result.hasResults).toBe(true)
    })
  })
})

// Integration test for the complete RAG workflow
describe('RAG Integration Workflow', () => {
  beforeEach(() => {
    unifiedRAG.clearAllDocuments()
  })

  it('should complete a full RAG workflow: upload -> search -> format', async () => {
    // 1. Upload a document
    const content = 'React is a JavaScript library for building user interfaces. It uses a virtual DOM for efficient updates. Components are the building blocks of React applications. State management can be handled with hooks like useState and useEffect.'
    const file = new File([content], 'react-guide.txt', { type: 'text/plain' })
    
    const document = await unifiedRAG.processFile(file)
    expect(document).toBeDefined()
    expect(document.filename).toBe('react-guide.txt')

    // 2. Search for relevant content
    const searchResult = await unifiedRAG.searchDocuments('React components virtual DOM')
    expect(searchResult.hasResults).toBe(true)
    expect(searchResult.results[0].document.filename).toBe('react-guide.txt')

    // 3. Format for AI
    const aiContext = unifiedRAG.formatContextForAI(searchResult, 'What is React?')
    expect(aiContext).toContain('React is a JavaScript library')
    expect(aiContext).toContain('[SOURCE 1: react-guide.txt]')
    expect(aiContext).toContain('QUESTION: What is React?')

    // 4. Verify the context is comprehensive
    expect(aiContext.length).toBeGreaterThan(200) // Should be substantial
    expect(aiContext).toContain('cite your sources')
  })
})