import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import EnhancedMessageInput from '../EnhancedMessageInput'
import { UploadedFile } from '../FileUpload'

// Mock FileUpload component
jest.mock('../FileUpload', () => {
  return function MockFileUpload({ onFilesUploaded, onFileAnalyzed }: any) {
    return (
      <div data-testid="file-upload">
        <button
          data-testid="mock-upload-file"
          onClick={() => {
            const mockFile: UploadedFile = {
              id: 'test-file-1',
              file: new File(['test content'], 'test.txt', { type: 'text/plain' }),
              status: 'completed',
              progress: 100,
              analysis: {
                type: 'text',
                content: 'Test file content',
                summary: 'A test file'
              }
            }
            onFilesUploaded([mockFile])
            onFileAnalyzed('test-file-1', mockFile.analysis)
          }}
        >
          Upload File
        </button>
      </div>
    )
  }
})

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}))

// Mock Button component
jest.mock('../ui/Button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

describe('EnhancedMessageInput Component', () => {
  const mockOnChange = jest.fn()
  const mockOnSend = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  const defaultProps = {
    value: '',
    onChange: mockOnChange,
    onSend: mockOnSend,
    disabled: false,
    placeholder: 'Type your message...'
  }

  it('renders the basic message input correctly', () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('handles text input changes', () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    fireEvent.change(textarea, { target: { value: 'Hello world' } })
    
    expect(mockOnChange).toHaveBeenCalledWith('Hello world')
  })

  it('sends message when send button is clicked', () => {
    render(<EnhancedMessageInput {...defaultProps} value="Test message" />)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)
    
    expect(mockOnSend).toHaveBeenCalledWith('Test message', [])
  })

  it('sends message when Enter is pressed', () => {
    render(<EnhancedMessageInput {...defaultProps} value="Test message" />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false })
    
    expect(mockOnSend).toHaveBeenCalledWith('Test message', [])
  })

  it('does not send message when Shift+Enter is pressed', () => {
    render(<EnhancedMessageInput {...defaultProps} value="Test message" />)
    
    const textarea = screen.getByPlaceholderText('Type your message...')
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true })
    
    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('shows file upload component when clip button is clicked', () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    expect(screen.getByTestId('file-upload')).toBeInTheDocument()
    expect(screen.getByText('Upload Files for AI Analysis')).toBeInTheDocument()
  })

  it('handles file uploads and displays attached files', async () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    // Open file upload
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    // Upload a file
    const uploadButton = screen.getByTestId('mock-upload-file')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Attached Files (1)')).toBeInTheDocument()
      expect(screen.getByText('test.txt')).toBeInTheDocument()
      expect(screen.getByText('✓ Analyzed')).toBeInTheDocument()
    })
  })

  it('removes attached files when remove button is clicked', async () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    // Open file upload and upload a file
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    const uploadButton = screen.getByTestId('mock-upload-file')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    // Remove the file
    const removeButton = screen.getByRole('button', { name: /remove/i })
    fireEvent.click(removeButton)
    
    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument()
    })
  })

  it('sends files with message content', async () => {
    render(<EnhancedMessageInput {...defaultProps} value="Here's my file:" />)
    
    // Upload a file
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    const uploadButton = screen.getByTestId('mock-upload-file')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    // Send message
    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)
    
    expect(mockOnSend).toHaveBeenCalledWith(
      expect.stringContaining('Here\'s my file:'),
      expect.arrayContaining([
        expect.objectContaining({
          file: expect.objectContaining({ name: 'test.txt' })
        })
      ])
    )
  })

  it('sends files without message content', async () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    // Upload a file
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    const uploadButton = screen.getByTestId('mock-upload-file')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument()
    })
    
    // Send without typing anything
    const sendButton = screen.getByRole('button', { name: /send/i })
    fireEvent.click(sendButton)
    
    expect(mockOnSend).toHaveBeenCalledWith(
      expect.stringContaining('I\'ve uploaded 1 file(s)'),
      expect.arrayContaining([
        expect.objectContaining({
          file: expect.objectContaining({ name: 'test.txt' })
        })
      ])
    )
  })

  it('disables send button when disabled prop is true', () => {
    render(<EnhancedMessageInput {...defaultProps} disabled={true} />)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
  })

  it('disables send button when no content and no files', () => {
    render(<EnhancedMessageInput {...defaultProps} value="" />)
    
    const sendButton = screen.getByRole('button', { name: /send/i })
    expect(sendButton).toBeDisabled()
  })

  it('shows processing status for files being analyzed', async () => {
    // Mock a file that's still processing
    const MockFileUploadProcessing = ({ onFilesUploaded }: any) => (
      <div data-testid="file-upload">
        <button
          data-testid="mock-upload-processing-file"
          onClick={() => {
            const mockFile: UploadedFile = {
              id: 'processing-file-1',
              file: new File(['test'], 'processing.jpg', { type: 'image/jpeg' }),
              status: 'processing',
              progress: 50
            }
            onFilesUploaded([mockFile])
          }}
        >
          Upload Processing File
        </button>
      </div>
    )

    // Re-mock FileUpload for this test
    jest.doMock('../FileUpload', () => MockFileUploadProcessing)

    render(<EnhancedMessageInput {...defaultProps} />)
    
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    const uploadButton = screen.getByTestId('mock-upload-processing-file')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByText('🔄 Processing...')).toBeInTheDocument()
      expect(screen.getByText(/Processing 1 file\(s\) with AI/)).toBeInTheDocument()
    })
  })

  it('updates placeholder text when files are attached', async () => {
    render(<EnhancedMessageInput {...defaultProps} />)
    
    // Upload a file
    const clipButton = screen.getByRole('button', { name: /attach/i })
    fireEvent.click(clipButton)
    
    const uploadButton = screen.getByTestId('mock-upload-file')
    fireEvent.click(uploadButton)
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Add a message \(optional\) or press Enter to send files/)).toBeInTheDocument()
    })
  })

  it('handles send button click', async () => {
    render(<EnhancedMessageInput {...defaultProps} value="Test message" />)
    
    // Find send button (second button in the component)
    const buttons = screen.getAllByRole('button')
    const sendButton = buttons[1] // Send button is the second one
    
    fireEvent.click(sendButton)
    
    expect(defaultProps.onSend).toHaveBeenCalled()
  })
})