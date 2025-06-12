/**
 * Linear Integration for T3 Crusher
 * Enables advanced task and project management within chat conversations
 */

export interface LinearIssue {
  id: string
  identifier: string
  title: string
  description?: string
  priority: number
  state: {
    id: string
    name: string
    color: string
  }
  assignee?: {
    id: string
    name: string
    email: string
  }
  team: {
    id: string
    name: string
  }
  labels: Array<{
    id: string
    name: string
    color: string
  }>
  createdAt: string
  updatedAt: string
  dueDate?: string
  estimate?: number
  url: string
}

export interface LinearProject {
  id: string
  name: string
  description?: string
  state: string
  progress: number
  startDate?: string
  targetDate?: string
  teams: Array<{
    id: string
    name: string
  }>
  url: string
}

export interface LinearTeam {
  id: string
  name: string
  key: string
  description?: string
  timezone: string
  issueCount: number
}

export class LinearIntegration {
  private baseUrl = '/api/linear'

  async listIssues(teamId?: string, assigneeId?: string): Promise<LinearIssue[]> {
    try {
      const response = await fetch(`${this.baseUrl}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, assigneeId })
      })
      
      if (!response.ok) throw new Error('Failed to list issues')
      return await response.json()
    } catch (error) {
      console.error('Linear issues fetch error:', error)
      throw error
    }
  }

  async createIssue(
    title: string,
    teamId: string,
    description?: string,
    priority?: number,
    assigneeId?: string,
    labelIds?: string[]
  ): Promise<LinearIssue> {
    try {
      const response = await fetch(`${this.baseUrl}/create-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title, 
          teamId, 
          description, 
          priority, 
          assigneeId, 
          labelIds 
        })
      })
      
      if (!response.ok) throw new Error('Failed to create issue')
      return await response.json()
    } catch (error) {
      console.error('Linear issue creation error:', error)
      throw error
    }
  }

  async updateIssue(
    issueId: string,
    updates: {
      title?: string
      description?: string
      priority?: number
      stateId?: string
      assigneeId?: string
      labelIds?: string[]
      estimate?: number
      dueDate?: string
    }
  ): Promise<LinearIssue> {
    try {
      const response = await fetch(`${this.baseUrl}/update-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId, ...updates })
      })
      
      if (!response.ok) throw new Error('Failed to update issue')
      return await response.json()
    } catch (error) {
      console.error('Linear issue update error:', error)
      throw error
    }
  }

  async listProjects(teamId?: string): Promise<LinearProject[]> {
    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId })
      })
      
      if (!response.ok) throw new Error('Failed to list projects')
      return await response.json()
    } catch (error) {
      console.error('Linear projects fetch error:', error)
      throw error
    }
  }

  async createProject(
    name: string,
    teamId: string,
    description?: string,
    startDate?: string,
    targetDate?: string
  ): Promise<LinearProject> {
    try {
      const response = await fetch(`${this.baseUrl}/create-project`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name, 
          teamId, 
          description, 
          startDate, 
          targetDate 
        })
      })
      
      if (!response.ok) throw new Error('Failed to create project')
      return await response.json()
    } catch (error) {
      console.error('Linear project creation error:', error)
      throw error
    }
  }

  async listTeams(): Promise<LinearTeam[]> {
    try {
      const response = await fetch(`${this.baseUrl}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Failed to list teams')
      return await response.json()
    } catch (error) {
      console.error('Linear teams fetch error:', error)
      throw error
    }
  }

  async getMyIssues(): Promise<LinearIssue[]> {
    try {
      const response = await fetch(`${this.baseUrl}/my-issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Failed to get my issues')
      return await response.json()
    } catch (error) {
      console.error('Linear my issues fetch error:', error)
      throw error
    }
  }

  async searchIssues(query: string): Promise<LinearIssue[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) throw new Error('Failed to search issues')
      return await response.json()
    } catch (error) {
      console.error('Linear search error:', error)
      throw error
    }
  }

  // Helper methods for formatting
  getPriorityLabel(priority: number): string {
    switch (priority) {
      case 1: return '🔥 Urgent'
      case 2: return '🔴 High'
      case 3: return '🟡 Normal'
      case 4: return '🔵 Low'
      default: return '⚪ No Priority'
    }
  }

  formatIssueForChat(issue: LinearIssue): string {
    const priority = this.getPriorityLabel(issue.priority)
    const assignee = issue.assignee ? `👤 **Assignee**: ${issue.assignee.name}` : '👤 **Assignee**: Unassigned'
    const labels = issue.labels.length > 0 ? 
      `🏷️ **Labels**: ${issue.labels.map(l => `\`${l.name}\``).join(', ')}` : 
      ''
    const estimate = issue.estimate ? `⏱️ **Estimate**: ${issue.estimate} points` : ''
    const dueDate = issue.dueDate ? `📅 **Due Date**: ${new Date(issue.dueDate).toLocaleDateString()}` : ''

    return `📋 **[${issue.identifier}]**: [${issue.title}](${issue.url})
🏢 **Team**: ${issue.team.name}
📊 **Status**: ${issue.state.name}
${priority}
${assignee}
${labels}
${estimate}
${dueDate}

${issue.description ? `**Description**:\n${issue.description}` : '*No description provided*'}`
  }

  formatProjectForChat(project: LinearProject): string {
    const teams = project.teams.map(t => t.name).join(', ')
    const startDate = project.startDate ? `📅 **Start**: ${new Date(project.startDate).toLocaleDateString()}` : ''
    const targetDate = project.targetDate ? `🎯 **Target**: ${new Date(project.targetDate).toLocaleDateString()}` : ''

    return `🚀 **Project**: [${project.name}](${project.url})
📈 **Progress**: ${Math.round(project.progress * 100)}%
📊 **Status**: ${project.state}
🏢 **Teams**: ${teams}
${startDate}
${targetDate}

${project.description ? `**Description**:\n${project.description}` : '*No description provided*'}`
  }
}

export const linearIntegration = new LinearIntegration()