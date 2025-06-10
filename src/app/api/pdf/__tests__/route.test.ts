import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the AI SDK
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mock-model')
}))

jest.mock('ai', () => ({
  generateObject: jest.fn()
}))

// Mock console methods
const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

describe('/api/pdf', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('GET /api/pdf', () => {
    it('returns API status and capabilities', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        status: 'PDF API is running',
        capabilities: [
          'PDF text extraction',
          'Document summarization',
          'Topic identification',
          'Key points extraction',
          'Document type classification',
          'Metadata analysis'
        ],
        models: ['claude-3-5-sonnet-20241022'],
        limitations: [
          'File size limits apply',
          'Complex layouts may affect accuracy',
          'Image extraction not fully implemented'
        ],
        notes: [
          'For production use, integrate with pdf-parse or similar library',
          'Consider implementing OCR for scanned PDFs',
          'Add support for password-protected PDFs'
        ]
      })
    })
  })

  describe('POST /api/pdf', () => {
    const mockGenerateObject = require('ai').generateObject

    beforeEach(() => {
      mockGenerateObject.mockClear()
    })

    it('processes PDF file successfully with AI analysis', async () => {
      const mockAnalysis = {
        text: 'This is the extracted PDF content',
        summary: 'A technical document about software development',
        title: 'Software Development Guide',
        topics: ['programming', 'best practices', 'testing'],
        key_points: [
          'Use version control',
          'Write unit tests',
          'Follow coding standards'
        ],
        document_type: 'Technical Manual',
        pages: 25,
        language: 'English',
        metadata: {
          has_images: true,
          has_tables: false,
          has_links: true,
          estimated_reading_time: '15 minutes'
        }
      }

      mockGenerateObject.mockResolvedValue({
        object: mockAnalysis
      })

      const pdfBuffer = Buffer.from('fake pdf content')
      const pdfFile = new File([pdfBuffer], 'test-document.pdf', { 
        type: 'application/pdf' 
      })

      const formData = new FormData()
      formData.append('file', pdfFile)

      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        ...mockAnalysis,
        filename: 'test-document.pdf',
        size: expect.any(Number)
      })
    })

    it('provides fallback analysis when AI analysis fails', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI analysis failed'))

      const pdfBuffer = Buffer.from('fake pdf content')
      const pdfFile = new File([pdfBuffer], 'fallback-test.pdf', { 
        type: 'application/pdf' 
      })

      const formData = new FormData()
      formData.append('file', pdfFile)

      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        text: 'PDF Document: fallback-test.pdf',
        summary: expect.stringContaining('Uploaded PDF document'),
        title: 'fallback-test',
        topics: ['Document Analysis', 'File Upload'],
        document_type: 'PDF Document',
        language: 'Unknown',
        filename: 'fallback-test.pdf'
      })
    })

    it('returns 400 for missing file', async () => {
      const formData = new FormData()

      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No PDF file provided')
    })

    it('returns 400 for non-PDF file', async () => {
      const textFile = new File(['not a pdf'], 'test.txt', { 
        type: 'text/plain' 
      })

      const formData = new FormData()
      formData.append('file', textFile)

      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('File must be a PDF')
    })

    it('handles processing errors gracefully', async () => {
      // Mock a file that will cause processing to fail
      const formData = new FormData()
      
      // Create a mock file that will cause an error when trying to get arrayBuffer
      const mockFile = {
        name: 'error-test.pdf',
        type: 'application/pdf',
        size: 1000,
        arrayBuffer: jest.fn().mockRejectedValue(new Error('File read error'))
      } as unknown as File

      formData.append('file', mockFile)

      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('PDF processing failed')
      expect(data.details).toBe('File read error')
    })

    it('estimates document properties correctly in fallback mode', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI unavailable'))

      const largePdfBuffer = Buffer.alloc(500000) // 500KB file
      const pdfFile = new File([largePdfBuffer], 'large-document.pdf', { 
        type: 'application/pdf' 
      })

      const formData = new FormData()
      formData.append('file', pdfFile)

      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pages).toBe(Math.ceil(500000 / 50000)) // Rough page estimate
      expect(data.metadata.estimated_reading_time).toContain('minutes')
      expect(data.size).toBe(500000)
    })

    it('handles malformed request data', async () => {
      const request = new NextRequest('http://localhost/api/pdf', {
        method: 'POST',
        body: 'not form data'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('PDF processing failed')
    })
  })
})