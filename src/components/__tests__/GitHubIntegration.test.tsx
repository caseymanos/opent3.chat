import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { GitHubIntegration } from '../GitHubIntegration'
import { githubIntegration } from '@/lib/github-integration'

// Mock the GitHub integration library
jest.mock('@/lib/github-integration', () => ({
  githubIntegration: {
    searchRepositories: jest.fn(),
    listIssues: jest.fn(),
    listPullRequests: jest.fn(),
  },
}))

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const mockOnSelect = jest.fn()

const mockRepository = {
  id: 1,
  name: 'test-repo',
  full_name: 'user/test-repo',
  description: 'A test repository',
  html_url: 'https://github.com/user/test-repo',
  default_branch: 'main',
  language: 'TypeScript',
  stargazers_count: 42,
  forks_count: 5,
  updated_at: '2024-01-01T00:00:00Z'
}

const mockIssue = {
  id: 1,
  number: 123,
  title: 'Test issue',
  body: 'This is a test issue',
  state: 'open' as const,
  html_url: 'https://github.com/user/test-repo/issues/123',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  labels: [
    { name: 'bug', color: 'ff0000' },
    { name: 'urgent', color: 'ffa500' }
  ]
}

const mockPullRequest = {
  id: 1,
  number: 456,
  title: 'Test PR',
  body: 'This is a test pull request',
  state: 'open' as const,
  html_url: 'https://github.com/user/test-repo/pull/456',
  head: {
    ref: 'feature-branch',
    sha: 'abc123'
  },
  base: {
    ref: 'main'
  },
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png'
  },
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

describe('GitHubIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with default search tab', () => {
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    expect(screen.getByText('GitHub Integration')).toBeInTheDocument()
    expect(screen.getByText('🔍 Search Repos')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search repositories...')).toBeInTheDocument()
  })

  it('switches between tabs correctly', () => {
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    // Switch to Issues tab
    fireEvent.click(screen.getByText('🐛 Issues'))
    expect(screen.getByPlaceholderText('Owner')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Repository')).toBeInTheDocument()
    
    // Switch to Pull Requests tab
    fireEvent.click(screen.getByText('🔀 Pull Requests'))
    expect(screen.getAllByPlaceholderText('Owner')).toHaveLength(1)
    expect(screen.getAllByPlaceholderText('Repository')).toHaveLength(1)
  })

  it('searches repositories successfully', async () => {
    ;(githubIntegration.searchRepositories as jest.Mock).mockResolvedValue([mockRepository])
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    const searchButton = screen.getByText('🔍')
    
    fireEvent.change(searchInput, { target: { value: 'test repo' } })
    fireEvent.click(searchButton)
    
    await waitFor(() => {
      expect(githubIntegration.searchRepositories).toHaveBeenCalledWith('test repo')
    })
    
    await waitFor(() => {
      expect(screen.getByText('user/test-repo')).toBeInTheDocument()
      expect(screen.getByText('A test repository')).toBeInTheDocument()
      expect(screen.getByText('⭐ 42')).toBeInTheDocument()
      expect(screen.getByText('🍴 5')).toBeInTheDocument()
      expect(screen.getByText('💻 TypeScript')).toBeInTheDocument()
    })
  })

  it('handles repository search on Enter key', async () => {
    ;(githubIntegration.searchRepositories as jest.Mock).mockResolvedValue([mockRepository])
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    
    fireEvent.change(searchInput, { target: { value: 'test repo' } })
    fireEvent.keyPress(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 })
    
    await waitFor(() => {
      expect(githubIntegration.searchRepositories).toHaveBeenCalledWith('test repo')
    })
  })

  it('calls onSelect when repository is clicked', async () => {
    ;(githubIntegration.searchRepositories as jest.Mock).mockResolvedValue([mockRepository])
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.keyPress(searchInput, { key: 'Enter' })
    
    await waitFor(() => {
      expect(screen.getByText('user/test-repo')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('user/test-repo'))
    
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.stringContaining('📁 **Repository**: [user/test-repo](https://github.com/user/test-repo)')
    )
  })

  it('loads issues successfully', async () => {
    ;(githubIntegration.listIssues as jest.Mock).mockResolvedValue([mockIssue])
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    // Switch to Issues tab
    fireEvent.click(screen.getByText('🐛 Issues'))
    
    const ownerInput = screen.getByPlaceholderText('Owner')
    const repoInput = screen.getByPlaceholderText('Repository')
    const loadButton = screen.getByText('📋')
    
    fireEvent.change(ownerInput, { target: { value: 'user' } })
    fireEvent.change(repoInput, { target: { value: 'test-repo' } })
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(githubIntegration.listIssues).toHaveBeenCalledWith('user', 'test-repo', 'open')
    })
    
    await waitFor(() => {
      expect(screen.getByText('#123')).toBeInTheDocument()
      expect(screen.getByText('Test issue')).toBeInTheDocument()
      expect(screen.getByText(/by @testuser/)).toBeInTheDocument()
    })
  })

  it('calls onSelect when issue is clicked', async () => {
    ;(githubIntegration.listIssues as jest.Mock).mockResolvedValue([mockIssue])
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('🐛 Issues'))
    
    const ownerInput = screen.getByPlaceholderText('Owner')
    const repoInput = screen.getByPlaceholderText('Repository')
    const loadButton = screen.getByText('📋')
    
    fireEvent.change(ownerInput, { target: { value: 'user' } })
    fireEvent.change(repoInput, { target: { value: 'test-repo' } })
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Test issue')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Test issue'))
    
    expect(mockOnSelect).toHaveBeenCalledWith(
      expect.stringContaining('🐛 **Issue #123**: [Test issue]')
    )
  })

  it('loads pull requests successfully', async () => {
    ;(githubIntegration.listPullRequests as jest.Mock).mockResolvedValue([mockPullRequest])
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    // Switch to Pull Requests tab
    fireEvent.click(screen.getByText('🔀 Pull Requests'))
    
    const ownerInput = screen.getByPlaceholderText('Owner')
    const repoInput = screen.getByPlaceholderText('Repository')
    const loadButton = screen.getByText('🔀')
    
    fireEvent.change(ownerInput, { target: { value: 'user' } })
    fireEvent.change(repoInput, { target: { value: 'test-repo' } })
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(githubIntegration.listPullRequests).toHaveBeenCalledWith('user', 'test-repo', 'open')
    })
    
    await waitFor(() => {
      expect(screen.getByText('#456')).toBeInTheDocument()
      expect(screen.getByText('Test PR')).toBeInTheDocument()
      expect(screen.getByText('feature-branch → main')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(githubIntegration.searchRepositories as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    const searchButton = screen.getByText('🔍')
    
    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.click(searchButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to search repositories')).toBeInTheDocument()
    })
  })

  it('shows loading state during API calls', async () => {
    ;(githubIntegration.searchRepositories as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    )
    
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    const searchInput = screen.getByPlaceholderText('Search repositories...')
    const searchButton = screen.getByText('🔍')
    
    fireEvent.change(searchInput, { target: { value: 'test' } })
    fireEvent.click(searchButton)
    
    // Should show loading indicator
    expect(screen.getByText('⏳')).toBeInTheDocument()
  })

  it('prevents search with empty query', () => {
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    const searchButton = screen.getByText('🔍')
    fireEvent.click(searchButton)
    
    expect(githubIntegration.searchRepositories).not.toHaveBeenCalled()
  })

  it('prevents issue loading without owner and repo', () => {
    render(<GitHubIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('🐛 Issues'))
    
    const loadButton = screen.getByText('📋')
    fireEvent.click(loadButton)
    
    expect(githubIntegration.listIssues).not.toHaveBeenCalled()
  })
})