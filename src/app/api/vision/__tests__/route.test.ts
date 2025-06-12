/**
 * @jest-environment node
 */

// Mock the AI SDK before importing anything
jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn(() => 'mock-model')
}))

jest.mock('ai', () => ({
  generateObject: jest.fn()
}))

// Import after mocks are set up
import { POST, GET } from '../route'

// Mock console methods to avoid test output clutter
const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

describe('/api/vision', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('GET /api/vision', () => {
    it('returns API status and capabilities', async () => {
      const response = await GET()
      
      // Check response properties
      expect(response).toBeDefined()
      expect(response.status).toBe(200)
      
      // Parse the response body
      const body = await response.json()
      
      expect(body).toEqual({
        status: 'Vision API is running',
        capabilities: [
          'Image analysis and description',
          'Object and entity detection',
          'OCR (text extraction)',
          'Mood and atmosphere analysis',
          'Color analysis',
          'Technical assessment'
        ],
        models: ['claude-3-5-sonnet-20241022'],
        formats: ['JPEG', 'PNG', 'GIF', 'WebP', 'BMP']
      })
    })
  })

  describe('POST /api/vision', () => {
    const mockGenerateObject = require('ai').generateObject

    beforeEach(() => {
      mockGenerateObject.mockClear()
    })

    it('analyzes image successfully', async () => {
      const mockAnalysis = {
        description: 'A beautiful landscape photo',
        summary: 'Mountain landscape at sunset',
        objects: ['mountain', 'sky', 'trees'],
        text: 'Welcome to the park',
        mood: 'peaceful',
        colors: ['blue', 'orange', 'green'],
        dimensions: {
          estimated_width: 1920,
          estimated_height: 1080,
          aspect_ratio: '16:9'
        },
        technical_details: {
          lighting: 'golden hour',
          composition: 'rule of thirds',
          quality: 'high'
        }
      }

      mockGenerateObject.mockResolvedValue({
        object: mockAnalysis
      })

      // Create a mock request
      const mockRequest = {
        json: async () => ({
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          task: 'analyze'
        })
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAnalysis)
      expect(mockGenerateObject).toHaveBeenCalledWith({
        model: 'mock-model',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Analyze this image in detail')
              }),
              expect.objectContaining({
                type: 'image',
                image: expect.stringContaining('data:image/jpeg;base64,')
              })
            ])
          })
        ]),
        schema: expect.any(Object),
        temperature: 0.3
      })
    })

    it('handles OCR task specifically', async () => {
      const mockOCRAnalysis = {
        description: 'Document with text',
        summary: 'Text extraction from document',
        objects: ['text', 'document'],
        text: 'This is the extracted text from the image',
        colors: ['black', 'white']
      }

      mockGenerateObject.mockResolvedValue({
        object: mockOCRAnalysis
      })

      const mockRequest = {
        json: async () => ({
          image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
          task: 'ocr'
        })
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockOCRAnalysis)
      expect(mockGenerateObject).toHaveBeenCalledWith({
        model: 'mock-model',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.arrayContaining([
              expect.objectContaining({
                type: 'text',
                text: expect.stringContaining('Extract and transcribe all text')
              })
            ])
          })
        ]),
        schema: expect.any(Object),
        temperature: 0.3
      })
    })

    it('returns 400 for missing image', async () => {
      const mockRequest = {
        json: async () => ({})
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('No image provided')
    })

    it('returns 400 for invalid image format', async () => {
      const mockRequest = {
        json: async () => ({
          image: 123 // Should be string
        })
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Image must be a base64 string')
    })

    it('handles AI analysis errors gracefully', async () => {
      mockGenerateObject.mockRejectedValue(new Error('AI service unavailable'))

      const mockRequest = {
        json: async () => ({
          image: 'validbase64data'
        })
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Vision analysis failed')
      expect(data.details).toBe('AI service unavailable')
    })

    it('handles malformed JSON gracefully', async () => {
      const mockRequest = {
        json: async () => {
          throw new Error('Invalid JSON')
        }
      }

      const response = await POST(mockRequest as any)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Vision analysis failed')
    })
  })
})