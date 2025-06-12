import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LandingPage from '../LandingPage'
import { createClientComponentClient } from '@/lib/supabase'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  createClientComponentClient: jest.fn(),
}))

// Mock Framer Motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

const mockSupabase = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
  })),
}

describe('LandingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(createClientComponentClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  it('renders the landing page with all key elements', () => {
    render(<LandingPage />)
    
    // Check for main heading
    expect(screen.getByText('The Future of')).toBeInTheDocument()
    expect(screen.getByText('AI Conversations')).toBeInTheDocument()
    
    // Check for start chatting button
    expect(screen.getByRole('button', { name: /start chatting/i })).toBeInTheDocument()
    
    // Check for feature cards
    expect(screen.getByText('Conversation Branching')).toBeInTheDocument()
    expect(screen.getByText('Multi-Model AI')).toBeInTheDocument()
    expect(screen.getByText('Real-time Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Advanced Integrations')).toBeInTheDocument()
  })

  it('displays T3 Crusher branding', () => {
    render(<LandingPage />)
    
    expect(screen.getByText('T3 Crusher')).toBeInTheDocument()
    expect(screen.getByText('🏆 T3 Chat Cloneathon Competition Entry')).toBeInTheDocument()
  })

  it('has navigation links', () => {
    render(<LandingPage />)
    
    expect(screen.getByText('About')).toBeInTheDocument()
    expect(screen.getByText('Features')).toBeInTheDocument()
    expect(screen.getByText('GitHub')).toBeInTheDocument()
  })

  it('handles start chatting button click - success scenario', async () => {
    // Mock successful conversation creation
    const mockConversationData = { id: 'test-conversation-id' }
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: mockConversationData,
      error: null
    })

    render(<LandingPage />)
    
    const startButton = screen.getByRole('button', { name: /start chatting/i })
    fireEvent.click(startButton)

    // Check loading state
    await waitFor(() => {
      expect(screen.getByText('Starting Chat...')).toBeInTheDocument()
    })

    // Wait for navigation
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/chat/test-conversation-id')
    })
  })

  it('handles start chatting button click - fallback scenario', async () => {
    // Mock failed conversation creation
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id' } }
    })
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: null,
      error: new Error('Failed to create conversation')
    })

    render(<LandingPage />)
    
    const startButton = screen.getByRole('button', { name: /start chatting/i })
    fireEvent.click(startButton)

    // Wait for fallback navigation
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/?conversationId=new')
    })
  })

  it('handles start chatting button click - no user scenario', async () => {
    // Mock no user scenario
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null }
    })
    mockSupabase.from().insert().select().single.mockResolvedValue({
      data: { id: 'test-conversation-id' },
      error: null
    })

    render(<LandingPage />)
    
    const startButton = screen.getByRole('button', { name: /start chatting/i })
    fireEvent.click(startButton)

    // Should use fallback user ID
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations')
    })
  })

  it('disables start button while starting', async () => {
    mockSupabase.auth.getUser.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({ data: { user: { id: 'test-user-id' } } }), 100)
    }))

    render(<LandingPage />)
    
    const startButton = screen.getByRole('button', { name: /start chatting/i })
    fireEvent.click(startButton)

    // Button should be disabled while loading
    expect(startButton).toBeDisabled()
  })

  it('opens GitHub link in new tab', () => {
    const originalOpen = window.open
    window.open = jest.fn()

    render(<LandingPage />)
    
    const githubButton = screen.getByRole('button', { name: /view on github/i })
    fireEvent.click(githubButton)

    expect(window.open).toHaveBeenCalledWith('https://github.com/your-repo/t3-crusher', '_blank')
    
    window.open = originalOpen
  })

  it('displays competition badge', () => {
    render(<LandingPage />)
    
    expect(screen.getByText('Built for the T3 Chat Cloneathon')).toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(<LandingPage />)
    
    // Check for proper button roles
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThan(0)
    
    // Check for proper headings
    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toBeInTheDocument()
  })
})