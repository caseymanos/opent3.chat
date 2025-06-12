import { NextRequest, NextResponse } from 'next/server'

// This API route serves as a bridge to Linear MCP functions
export async function POST(req: NextRequest) {
  try {
    const { action, ...params } = await req.json()
    
    // Route different Linear actions
    switch (action) {
      case 'list_issues':
        return await handleListIssues(params)
      case 'create_issue':
        return await handleCreateIssue(params)
      case 'update_issue':
        return await handleUpdateIssue(params)
      case 'list_projects':
        return await handleListProjects(params)
      case 'create_project':
        return await handleCreateProject(params)
      case 'list_teams':
        return await handleListTeams()
      case 'my_issues':
        return await handleMyIssues()
      case 'search_issues':
        return await handleSearchIssues(params)
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` }, 
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Linear API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

async function handleListIssues({ teamId, assigneeId }: { teamId?: string, assigneeId?: string }) {
  // Mock Linear issues for demonstration
  const mockIssues = [
    {
      id: 'issue-1',
      identifier: 'TC-001',
      title: 'Implement GitHub integration for chat platform',
      description: 'Add comprehensive GitHub integration including repository browsing, issue management, and pull request creation.',
      priority: 2,
      state: {
        id: 'state-1',
        name: 'In Progress',
        color: '#f59e0b'
      },
      assignee: {
        id: 'user-1',
        name: 'Development Team',
        email: 'dev@example.com'
      },
      team: {
        id: 'team-1',
        name: 'T3 Crusher'
      },
      labels: [
        { id: 'label-1', name: 'feature', color: '#10b981' },
        { id: 'label-2', name: 'integration', color: '#3b82f6' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimate: 8,
      url: 'https://linear.app/t3-crusher/issue/TC-001'
    },
    {
      id: 'issue-2',
      identifier: 'TC-002',
      title: 'Add Linear integration for task management',
      description: 'Integrate Linear for advanced task and project management within the chat interface.',
      priority: 2,
      state: {
        id: 'state-2',
        name: 'Todo',
        color: '#6b7280'
      },
      team: {
        id: 'team-1',
        name: 'T3 Crusher'
      },
      labels: [
        { id: 'label-1', name: 'feature', color: '#10b981' },
        { id: 'label-3', name: 'productivity', color: '#8b5cf6' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimate: 5,
      url: 'https://linear.app/t3-crusher/issue/TC-002'
    }
  ]
  
  return NextResponse.json(mockIssues)
}

async function handleCreateIssue({ 
  title, 
  teamId, 
  description, 
  priority = 3, 
  assigneeId, 
  labelIds 
}: {
  title: string
  teamId: string
  description?: string
  priority?: number
  assigneeId?: string
  labelIds?: string[]
}) {
  const newIssue = {
    id: `issue-${Date.now()}`,
    identifier: `TC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    title,
    description: description || null,
    priority,
    state: {
      id: 'state-todo',
      name: 'Todo',
      color: '#6b7280'
    },
    assignee: assigneeId ? {
      id: assigneeId,
      name: 'Assigned User',
      email: 'user@example.com'
    } : null,
    team: {
      id: teamId,
      name: 'T3 Crusher'
    },
    labels: labelIds?.map((id, index) => ({
      id,
      name: `Label ${index + 1}`,
      color: '#10b981'
    })) || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    url: `https://linear.app/t3-crusher/issue/TC-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  }
  
  return NextResponse.json(newIssue)
}

async function handleUpdateIssue({ 
  issueId, 
  ...updates 
}: { 
  issueId: string 
  [key: string]: any 
}) {
  // Mock update response
  const updatedIssue = {
    id: issueId,
    identifier: 'TC-001',
    title: updates.title || 'Updated Issue Title',
    description: updates.description || 'Updated description',
    priority: updates.priority || 3,
    state: {
      id: updates.stateId || 'state-updated',
      name: 'Updated',
      color: '#10b981'
    },
    assignee: updates.assigneeId ? {
      id: updates.assigneeId,
      name: 'Updated Assignee',
      email: 'updated@example.com'
    } : null,
    team: {
      id: 'team-1',
      name: 'T3 Crusher'
    },
    labels: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    estimate: updates.estimate || null,
    dueDate: updates.dueDate || null,
    url: 'https://linear.app/t3-crusher/issue/TC-001'
  }
  
  return NextResponse.json(updatedIssue)
}

async function handleListProjects({ teamId }: { teamId?: string }) {
  const mockProjects = [
    {
      id: 'project-1',
      name: 'T3 Crusher Competition Submission',
      description: 'Comprehensive AI chat platform with advanced features for the T3 Chat Cloneathon',
      state: 'active',
      progress: 0.85,
      startDate: '2024-01-01',
      targetDate: '2024-02-15',
      teams: [
        { id: 'team-1', name: 'T3 Crusher' }
      ],
      url: 'https://linear.app/t3-crusher/project/competition-submission'
    },
    {
      id: 'project-2',
      name: 'Advanced Integrations',
      description: 'Integration with GitHub, Linear, Stripe, and other productivity tools',
      state: 'active',
      progress: 0.6,
      startDate: '2024-01-15',
      targetDate: '2024-03-01',
      teams: [
        { id: 'team-1', name: 'T3 Crusher' }
      ],
      url: 'https://linear.app/t3-crusher/project/advanced-integrations'
    }
  ]
  
  return NextResponse.json(mockProjects)
}

async function handleCreateProject({
  name,
  teamId,
  description,
  startDate,
  targetDate
}: {
  name: string
  teamId: string
  description?: string
  startDate?: string
  targetDate?: string
}) {
  const newProject = {
    id: `project-${Date.now()}`,
    name,
    description: description || null,
    state: 'active',
    progress: 0,
    startDate: startDate || null,
    targetDate: targetDate || null,
    teams: [
      { id: teamId, name: 'T3 Crusher' }
    ],
    url: `https://linear.app/t3-crusher/project/${name.toLowerCase().replace(/\s+/g, '-')}`
  }
  
  return NextResponse.json(newProject)
}

async function handleListTeams() {
  const mockTeams = [
    {
      id: 'team-1',
      name: 'T3 Crusher',
      key: 'TC',
      description: 'Core development team for T3 Crusher chat platform',
      timezone: 'America/New_York',
      issueCount: 15
    },
    {
      id: 'team-2',
      name: 'Integrations',
      key: 'INT',
      description: 'Team focused on third-party integrations and APIs',
      timezone: 'America/New_York',
      issueCount: 8
    }
  ]
  
  return NextResponse.json(mockTeams)
}

async function handleMyIssues() {
  // Return issues assigned to current user
  const myIssues = [
    {
      id: 'my-issue-1',
      identifier: 'TC-003',
      title: 'Complete MCP integrations for competition submission',
      description: 'Implement GitHub, Linear, and Stripe integrations using available MCPs.',
      priority: 1,
      state: {
        id: 'state-progress',
        name: 'In Progress',
        color: '#f59e0b'
      },
      assignee: {
        id: 'current-user',
        name: 'Current User',
        email: 'user@example.com'
      },
      team: {
        id: 'team-1',
        name: 'T3 Crusher'
      },
      labels: [
        { id: 'label-urgent', name: 'urgent', color: '#ef4444' },
        { id: 'label-competition', name: 'competition', color: '#8b5cf6' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimate: 13,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      url: 'https://linear.app/t3-crusher/issue/TC-003'
    }
  ]
  
  return NextResponse.json(myIssues)
}

async function handleSearchIssues({ query }: { query: string }) {
  // Mock search results
  const searchResults = [
    {
      id: 'search-1',
      identifier: 'TC-004',
      title: `Search result for "${query}"`,
      description: `This issue matches your search query: ${query}`,
      priority: 3,
      state: {
        id: 'state-open',
        name: 'Open',
        color: '#10b981'
      },
      team: {
        id: 'team-1',
        name: 'T3 Crusher'
      },
      labels: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      url: 'https://linear.app/t3-crusher/issue/TC-004'
    }
  ]
  
  return NextResponse.json(searchResults)
}