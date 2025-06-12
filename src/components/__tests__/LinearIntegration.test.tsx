import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LinearIntegration } from '../LinearIntegration'
import { linearIntegration } from '@/lib/linear-integration'

// Mock the Linear integration library
jest.mock('@/lib/linear-integration', () => ({
  linearIntegration: {
    listIssues: jest.fn(),
    getMyIssues: jest.fn(),
    listProjects: jest.fn(),
    listTeams: jest.fn(),
    createIssue: jest.fn(),
    getPriorityLabel: jest.fn(),
    formatIssueForChat: jest.fn(),
    formatProjectForChat: jest.fn(),
  },
}))

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock UI components
jest.mock('../ui/Button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}))

jest.mock('../ui/Card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}))

const mockOnSelect = jest.fn()

const mockIssue = {
  id: 'issue-1',
  identifier: 'TC-001',
  title: 'Test Linear issue',
  description: 'This is a test issue',
  priority: 2,
  state: {
    id: 'state-1',
    name: 'In Progress',
    color: '#f59e0b'
  },
  assignee: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  },
  team: {
    id: 'team-1',
    name: 'T3 Crusher'
  },
  labels: [
    { id: 'label-1', name: 'feature', color: '#10b981' }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  estimate: 5,
  url: 'https://linear.app/t3-crusher/issue/TC-001'
}

const mockProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  state: 'active',
  progress: 0.75,
  startDate: '2024-01-01',
  targetDate: '2024-12-31',
  teams: [{ id: 'team-1', name: 'T3 Crusher' }],
  url: 'https://linear.app/t3-crusher/project/test-project'
}

const mockTeam = {
  id: 'team-1',
  name: 'T3 Crusher',
  key: 'TC',
  description: 'Core development team',
  timezone: 'America/New_York',
  issueCount: 15
}

describe('LinearIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(linearIntegration.getPriorityLabel as jest.Mock).mockImplementation((priority: number) => {
      switch (priority) {
        case 1: return '🔥 Urgent'
        case 2: return '🔴 High'
        case 3: return '🟡 Normal'
        case 4: return '🔵 Low'
        default: return '⚪ No Priority'
      }
    })
    ;(linearIntegration.formatIssueForChat as jest.Mock).mockReturnValue('Formatted issue content')
    ;(linearIntegration.formatProjectForChat as jest.Mock).mockReturnValue('Formatted project content')
  })

  it('renders with default issues tab', () => {
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    expect(screen.getByText('Linear Integration')).toBeInTheDocument()
    expect(screen.getByText('📋 Issues')).toBeInTheDocument()
    expect(screen.getByText('📋 All Issues')).toBeInTheDocument()
    expect(screen.getByText('👤 My Issues')).toBeInTheDocument()
  })

  it('switches between tabs correctly', () => {
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    // Switch to Projects tab
    fireEvent.click(screen.getByText('🚀 Projects'))
    expect(screen.getByText('🚀 Load Projects')).toBeInTheDocument()
    
    // Switch to Teams tab
    fireEvent.click(screen.getByText('🏢 Teams'))
    expect(screen.getByText('🏢 Load Teams')).toBeInTheDocument()
    
    // Switch to Create tab
    fireEvent.click(screen.getByText('➕ Create'))
    expect(screen.getByPlaceholderText('Issue title...')).toBeInTheDocument()
  })

  it('loads all issues successfully', async () => {
    ;(linearIntegration.listIssues as jest.Mock).mockResolvedValue([mockIssue])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    const loadButton = screen.getByText('📋 All Issues')
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(linearIntegration.listIssues).toHaveBeenCalledWith()
    })
    
    await waitFor(() => {
      expect(screen.getByText('🔴 High')).toBeInTheDocument()
      expect(screen.getByText('TC-001')).toBeInTheDocument()
      expect(screen.getByText('Test Linear issue')).toBeInTheDocument()
      expect(screen.getByText('🏢 T3 Crusher')).toBeInTheDocument()
      expect(screen.getByText('👤 Test User')).toBeInTheDocument()
    })
  })

  it('loads my issues successfully', async () => {
    ;(linearIntegration.getMyIssues as jest.Mock).mockResolvedValue([mockIssue])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    const myIssuesButton = screen.getByText('👤 My Issues')
    fireEvent.click(myIssuesButton)
    
    await waitFor(() => {
      expect(linearIntegration.getMyIssues).toHaveBeenCalled()
    })
    
    await waitFor(() => {
      expect(screen.getByText('Test Linear issue')).toBeInTheDocument()
    })
  })

  it('calls onSelect when issue is clicked', async () => {
    ;(linearIntegration.listIssues as jest.Mock).mockResolvedValue([mockIssue])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    const loadButton = screen.getByText('📋 All Issues')
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Test Linear issue')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Test Linear issue'))
    
    expect(linearIntegration.formatIssueForChat).toHaveBeenCalledWith(mockIssue)
    expect(mockOnSelect).toHaveBeenCalledWith('Formatted issue content')
  })

  it('loads projects successfully', async () => {
    ;(linearIntegration.listProjects as jest.Mock).mockResolvedValue([mockProject])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('🚀 Projects'))
    
    const loadButton = screen.getByText('🚀 Load Projects')
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(linearIntegration.listProjects).toHaveBeenCalled()
    })
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByText('📈 75% complete')).toBeInTheDocument()
      expect(screen.getByText('📊 active')).toBeInTheDocument()
    })
  })

  it('calls onSelect when project is clicked', async () => {
    ;(linearIntegration.listProjects as jest.Mock).mockResolvedValue([mockProject])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('🚀 Projects'))
    fireEvent.click(screen.getByText('🚀 Load Projects'))
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument()
    })
    
    fireEvent.click(screen.getByText('Test Project'))
    
    expect(linearIntegration.formatProjectForChat).toHaveBeenCalledWith(mockProject)
    expect(mockOnSelect).toHaveBeenCalledWith('Formatted project content')
  })

  it('loads teams successfully', async () => {
    ;(linearIntegration.listTeams as jest.Mock).mockResolvedValue([mockTeam])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('🏢 Teams'))
    
    const loadButton = screen.getByText('🏢 Load Teams')
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(linearIntegration.listTeams).toHaveBeenCalled()
    })
    
    await waitFor(() => {
      expect(screen.getByText('T3 Crusher')).toBeInTheDocument()
      expect(screen.getByText('TC')).toBeInTheDocument()
      expect(screen.getByText('📊 15 issues')).toBeInTheDocument()
      expect(screen.getByText('🕐 America/New_York')).toBeInTheDocument()
    })
  })

  it('creates new issue successfully', async () => {
    const newIssue = { ...mockIssue, id: 'new-issue', title: 'New Test Issue' }
    ;(linearIntegration.listTeams as jest.Mock).mockResolvedValue([mockTeam])
    ;(linearIntegration.createIssue as jest.Mock).mockResolvedValue(newIssue)
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    // Switch to Create tab
    fireEvent.click(screen.getByText('➕ Create'))
    
    // Load teams first
    const loadTeamsButton = screen.getByText('🔄 Load Teams')
    fireEvent.click(loadTeamsButton)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('T3 Crusher (TC)')).toBeInTheDocument()
    })
    
    // Fill out the form
    const titleInput = screen.getByPlaceholderText('Issue title...')
    const descriptionInput = screen.getByPlaceholderText('Issue description (optional)...')
    const prioritySelect = screen.getByDisplayValue('🔴 High')
    
    fireEvent.change(titleInput, { target: { value: 'New Test Issue' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } })
    fireEvent.change(prioritySelect, { target: { value: '1' } })
    
    // Submit the form
    const createButton = screen.getByText('➕ Create Issue')
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(linearIntegration.createIssue).toHaveBeenCalledWith(
        'New Test Issue',
        'team-1',
        'Test description',
        1
      )
    })
    
    await waitFor(() => {
      expect(linearIntegration.formatIssueForChat).toHaveBeenCalledWith(newIssue)
      expect(mockOnSelect).toHaveBeenCalledWith('Formatted issue content')
    })
  })

  it('prevents creating issue without title', () => {
    ;(linearIntegration.listTeams as jest.Mock).mockResolvedValue([mockTeam])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('➕ Create'))
    fireEvent.click(screen.getByText('🔄 Load Teams'))
    
    // Try to create without title
    const createButton = screen.getByText('➕ Create Issue')
    expect(createButton).toBeDisabled()
  })

  it('prevents creating issue without team selection', async () => {
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('➕ Create'))
    
    const titleInput = screen.getByPlaceholderText('Issue title...')
    fireEvent.change(titleInput, { target: { value: 'Test Issue' } })
    
    const createButton = screen.getByText('➕ Create Issue')
    expect(createButton).toBeDisabled()
  })

  it('handles API errors gracefully', async () => {
    ;(linearIntegration.listIssues as jest.Mock).mockRejectedValue(new Error('API Error'))
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    const loadButton = screen.getByText('📋 All Issues')
    fireEvent.click(loadButton)
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load issues')).toBeInTheDocument()
    })
  })

  it('shows loading state during API calls', async () => {
    ;(linearIntegration.listIssues as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve([]), 100))
    )
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    const loadButton = screen.getByText('📋 All Issues')
    fireEvent.click(loadButton)
    
    // Should show loading indicator
    expect(screen.getByText('⏳ All Issues')).toBeInTheDocument()
  })

  it('displays priority indicators correctly', async () => {
    const urgentIssue = { ...mockIssue, priority: 1 }
    const lowIssue = { ...mockIssue, priority: 4, id: 'issue-2' }
    
    ;(linearIntegration.listIssues as jest.Mock).mockResolvedValue([urgentIssue, lowIssue])
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('📋 All Issues'))
    
    await waitFor(() => {
      expect(screen.getByText('🔥 Urgent')).toBeInTheDocument()
      expect(screen.getByText('🔵 Low')).toBeInTheDocument()
    })
  })

  it('clears form after successful issue creation', async () => {
    const newIssue = { ...mockIssue, id: 'new-issue', title: 'New Test Issue' }
    ;(linearIntegration.listTeams as jest.Mock).mockResolvedValue([mockTeam])
    ;(linearIntegration.createIssue as jest.Mock).mockResolvedValue(newIssue)
    
    render(<LinearIntegration onSelect={mockOnSelect} />)
    
    fireEvent.click(screen.getByText('➕ Create'))
    fireEvent.click(screen.getByText('🔄 Load Teams'))
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('T3 Crusher (TC)')).toBeInTheDocument()
    })
    
    const titleInput = screen.getByPlaceholderText('Issue title...')
    const descriptionInput = screen.getByPlaceholderText('Issue description (optional)...')
    
    fireEvent.change(titleInput, { target: { value: 'New Test Issue' } })
    fireEvent.change(descriptionInput, { target: { value: 'Test description' } })
    
    fireEvent.click(screen.getByText('➕ Create Issue'))
    
    await waitFor(() => {
      expect(titleInput).toHaveValue('')
      expect(descriptionInput).toHaveValue('')
    })
  })
})