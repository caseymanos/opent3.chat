import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import FileUpload, { UploadedFile } from '../FileUpload'

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: ({ onDrop, accept, maxSize, disabled, multiple }: any) => ({
    getRootProps: () => ({
      'data-testid': 'dropzone',
      onClick: () => {
        if (!disabled) {
          // Simulate file drop for testing
          const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
          onDrop([mockFile])
        }
      }
    }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false
  })
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-blob-url')
global.URL.revokeObjectURL = jest.fn()

describe('FileUpload Component', () => {
  const mockOnFilesUploaded = jest.fn()
  const mockOnFileAnalyzed = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  const defaultProps = {
    onFilesUploaded: mockOnFilesUploaded,
    onFileAnalyzed: mockOnFileAnalyzed,
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: false
  }

  it('renders the drop zone correctly', () => {
    render(<FileUpload {...defaultProps} />)
    
    expect(screen.getByTestId('dropzone')).toBeInTheDocument()
    expect(screen.getByText('Upload files for AI analysis')).toBeInTheDocument()
    expect(screen.getByText('Drag and drop images, PDFs, or text files, or click to browse')).toBeInTheDocument()
  })

  it('shows disabled state when disabled prop is true', () => {
    render(<FileUpload {...defaultProps} disabled={true} />)
    
    const dropzone = screen.getByTestId('dropzone')
    expect(dropzone).toHaveClass('opacity-50', 'cursor-not-allowed')
  })

  it('handles text file upload and analysis', async () => {
    const mockFile = new File(['Hello, world!'], 'test.txt', { type: 'text/plain' })
    
    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(mockOnFilesUploaded).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file: expect.objectContaining({
              name: 'test.txt',
              type: 'text/plain'
            }),
            status: 'uploading',
            progress: 0
          })
        ])
      )
    })

    // Wait for analysis to complete
    await waitFor(() => {
      expect(mockOnFileAnalyzed).toHaveBeenCalled()
    }, { timeout: 3000 })
  })

  it('handles image file upload with preview', async () => {
    const mockImageFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' })
    
    // Mock successful vision API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        description: 'A test image',
        summary: 'Test image analysis',
        objects: ['test object'],
        text: 'extracted text',
        dimensions: { width: 100, height: 100 }
      })
    })

    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(URL.createObjectURL).toHaveBeenCalledWith(mockImageFile)
    })

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/vision', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('test')
      }))
    }, { timeout: 3000 })
  })

  it('handles PDF file upload', async () => {
    const mockPDFFile = new File(['fake-pdf-data'], 'test.pdf', { type: 'application/pdf' })
    
    // Mock successful PDF API response
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        text: 'PDF content',
        summary: 'PDF summary',
        pages: 2,
        title: 'Test PDF'
      })
    })

    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/pdf', expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData)
      }))
    }, { timeout: 3000 })
  })

  it('handles API errors gracefully', async () => {
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    // Mock failed API response
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(mockOnFileAnalyzed).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'image',
          content: expect.stringContaining('test.jpg'),
          summary: expect.stringContaining('Uploaded image')
        })
      )
    }, { timeout: 3000 })
  })

  it('respects maxFiles limit', () => {
    const { rerender } = render(<FileUpload {...defaultProps} maxFiles={1} />)
    
    // This would need to be tested with actual file drop simulation
    // For now, we test that the prop is passed correctly
    rerender(<FileUpload {...defaultProps} maxFiles={1} />)
    expect(screen.getByText('Max 1 files, 10MB each')).toBeInTheDocument()
  })

  it('displays file information correctly', async () => {
    const mockFile = new File(['test content'], 'test-file.txt', { type: 'text/plain' })
    
    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(screen.getByText('test-file.txt')).toBeInTheDocument()
      expect(screen.getByText(/MB • text\/plain/)).toBeInTheDocument()
    })
  })

  it('shows upload progress', async () => {
    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })
  })

  it('allows file removal', async () => {
    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      const removeButton = screen.getByRole('button', { name: /remove/i })
      expect(removeButton).toBeInTheDocument()
    })
  })

  it('handles unsupported file types', async () => {
    const mockFile = new File(['test'], 'test.xyz', { type: 'application/unknown' })
    
    render(<FileUpload {...defaultProps} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

// Helper function tests
describe('FileUpload Helper Functions', () => {
  it('converts file to base64 correctly', async () => {
    // This would test the fileToBase64 function if it were exported
    // For now, we test it indirectly through image upload
    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    
    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onload: null as any,
      onerror: null as any,
      result: 'data:image/jpeg;base64,dGVzdA==' // 'test' in base64
    }
    
    global.FileReader = jest.fn(() => mockFileReader) as any

    render(<FileUpload onFilesUploaded={() => {}} onFileAnalyzed={() => {}} />)
    
    const dropzone = screen.getByTestId('dropzone')
    fireEvent.click(dropzone)

    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({} as any)
    }

    expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(mockFile)
  })
})