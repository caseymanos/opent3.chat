/**
 * GitHub Integration for T3 Crusher
 * Enables code collaboration directly within chat conversations
 */

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  default_branch: string
  language: string | null
  stargazers_count: number
  forks_count: number
  updated_at: string
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
  labels: Array<{
    name: string
    color: string
  }>
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed' | 'merged'
  html_url: string
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
  }
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
}

export class GitHubIntegration {
  private baseUrl = '/api/github'

  async searchRepositories(query: string): Promise<GitHubRepository[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/repositories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) throw new Error('Failed to search repositories')
      return await response.json()
    } catch (error) {
      console.error('GitHub repository search error:', error)
      throw error
    }
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await fetch(`${this.baseUrl}/repository`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo })
      })
      
      if (!response.ok) throw new Error('Failed to get repository')
      return await response.json()
    } catch (error) {
      console.error('GitHub repository fetch error:', error)
      throw error
    }
  }

  async listIssues(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<GitHubIssue[]> {
    try {
      const response = await fetch(`${this.baseUrl}/issues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, state })
      })
      
      if (!response.ok) throw new Error('Failed to list issues')
      return await response.json()
    } catch (error) {
      console.error('GitHub issues fetch error:', error)
      throw error
    }
  }

  async createIssue(
    owner: string, 
    repo: string, 
    title: string, 
    body?: string,
    labels?: string[]
  ): Promise<GitHubIssue> {
    try {
      const response = await fetch(`${this.baseUrl}/create-issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, title, body, labels })
      })
      
      if (!response.ok) throw new Error('Failed to create issue')
      return await response.json()
    } catch (error) {
      console.error('GitHub issue creation error:', error)
      throw error
    }
  }

  async listPullRequests(owner: string, repo: string, state?: 'open' | 'closed' | 'all'): Promise<GitHubPullRequest[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pull-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, state })
      })
      
      if (!response.ok) throw new Error('Failed to list pull requests')
      return await response.json()
    } catch (error) {
      console.error('GitHub pull requests fetch error:', error)
      throw error
    }
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<GitHubPullRequest> {
    try {
      const response = await fetch(`${this.baseUrl}/create-pull-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, title, head, base, body })
      })
      
      if (!response.ok) throw new Error('Failed to create pull request')
      return await response.json()
    } catch (error) {
      console.error('GitHub pull request creation error:', error)
      throw error
    }
  }

  async getFileContents(owner: string, repo: string, path: string, branch?: string): Promise<{
    content: string
    encoding: string
    sha: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/file-contents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, path, branch })
      })
      
      if (!response.ok) throw new Error('Failed to get file contents')
      return await response.json()
    } catch (error) {
      console.error('GitHub file contents fetch error:', error)
      throw error
    }
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string,
    sha?: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/create-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner, repo, path, content, message, branch, sha })
      })
      
      if (!response.ok) throw new Error('Failed to create/update file')
    } catch (error) {
      console.error('GitHub file update error:', error)
      throw error
    }
  }
}

export const githubIntegration = new GitHubIntegration()