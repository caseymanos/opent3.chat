/**
 * Integration tests for MCP (Model Context Protocol) integrations
 * Tests GitHub, Linear, and other MCP functionality
 */

import { githubIntegration } from '@/lib/github-integration'
import { linearIntegration } from '@/lib/linear-integration'

// Mock fetch for API testing
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('MCP Integrations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  describe('GitHub Integration', () => {
    describe('Repository Search', () => {
      it('should search repositories successfully', async () => {
        const mockResponse = {
          ok: true,
          json: async () => [
            {
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
          ]
        }

        mockFetch.mockResolvedValueOnce(mockResponse as any)

        const result = await githubIntegration.searchRepositories('test query')

        expect(mockFetch).toHaveBeenCalledWith('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'search_repositories', query: 'test query' })
        })

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('test-repo')
        expect(result[0].stargazers_count).toBe(42)
      })

      it('should handle search errors gracefully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500
        } as any)

        await expect(githubIntegration.searchRepositories('test query'))
          .rejects.toThrow('Failed to search repositories')
      })

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        await expect(githubIntegration.searchRepositories('test query'))
          .rejects.toThrow('Network error')
      })
    })

    describe('Issue Management', () => {
      it('should list issues successfully', async () => {
        const mockIssues = [
          {
            id: 1,
            number: 123,
            title: 'Test issue',
            body: 'This is a test issue',
            state: 'open',
            html_url: 'https://github.com/user/test-repo/issues/123',
            user: {
              login: 'testuser',
              avatar_url: 'https://github.com/testuser.png'
            },
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            labels: [
              { name: 'bug', color: 'ff0000' }
            ]
          }
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockIssues
        } as any)

        const result = await githubIntegration.listIssues('user', 'test-repo', 'open')

        expect(mockFetch).toHaveBeenCalledWith('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'list_issues', 
            owner: 'user', 
            repo: 'test-repo', 
            state: 'open' 
          })
        })

        expect(result).toHaveLength(1)
        expect(result[0].number).toBe(123)
        expect(result[0].title).toBe('Test issue')
      })

      it('should create issues successfully', async () => {
        const newIssue = {
          id: 2,
          number: 124,
          title: 'New test issue',
          body: 'This is a new test issue',
          state: 'open',
          html_url: 'https://github.com/user/test-repo/issues/124',
          user: {
            login: 'testuser',
            avatar_url: 'https://github.com/testuser.png'
          },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          labels: []
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => newIssue
        } as any)

        const result = await githubIntegration.createIssue(
          'user', 
          'test-repo', 
          'New test issue', 
          'This is a new test issue',
          ['bug', 'enhancement']
        )

        expect(mockFetch).toHaveBeenCalledWith('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'create_issue',
            owner: 'user',
            repo: 'test-repo',
            title: 'New test issue',
            body: 'This is a new test issue',
            labels: ['bug', 'enhancement']
          })
        })

        expect(result.number).toBe(124)
        expect(result.title).toBe('New test issue')
      })
    })

    describe('Pull Request Management', () => {
      it('should list pull requests successfully', async () => {
        const mockPRs = [
          {
            id: 1,
            number: 456,
            title: 'Test PR',
            body: 'This is a test pull request',
            state: 'open',
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
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockPRs
        } as any)

        const result = await githubIntegration.listPullRequests('user', 'test-repo', 'open')

        expect(result).toHaveLength(1)
        expect(result[0].number).toBe(456)
        expect(result[0].head.ref).toBe('feature-branch')
        expect(result[0].base.ref).toBe('main')
      })

      it('should create pull requests successfully', async () => {
        const newPR = {
          id: 2,
          number: 457,
          title: 'New test PR',
          body: 'This is a new test PR',
          state: 'open',
          html_url: 'https://github.com/user/test-repo/pull/457',
          head: {
            ref: 'new-feature',
            sha: 'def456'
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

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => newPR
        } as any)

        const result = await githubIntegration.createPullRequest(
          'user',
          'test-repo',
          'New test PR',
          'new-feature',
          'main',
          'This is a new test PR'
        )

        expect(result.number).toBe(457)
        expect(result.title).toBe('New test PR')
        expect(result.head.ref).toBe('new-feature')
      })
    })

    describe('File Operations', () => {
      it('should get file contents successfully', async () => {
        const mockFileContent = {
          content: 'VGVzdCBmaWxlIGNvbnRlbnQ=', // Base64 encoded "Test file content"
          encoding: 'base64',
          sha: 'abc123def456'
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockFileContent
        } as any)

        const result = await githubIntegration.getFileContents('user', 'test-repo', 'README.md', 'main')

        expect(mockFetch).toHaveBeenCalledWith('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'get_file_contents',
            owner: 'user',
            repo: 'test-repo',
            path: 'README.md',
            branch: 'main'
          })
        })

        expect(result.content).toBe('VGVzdCBmaWxlIGNvbnRlbnQ=')
        expect(result.encoding).toBe('base64')
      })

      it('should create/update files successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as any)

        await githubIntegration.createOrUpdateFile(
          'user',
          'test-repo',
          'test.txt',
          'Test file content',
          'Add test file',
          'main'
        )

        expect(mockFetch).toHaveBeenCalledWith('/api/github', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'create_or_update_file',
            owner: 'user',
            repo: 'test-repo',
            path: 'test.txt',
            content: 'Test file content',
            message: 'Add test file',
            branch: 'main'
          })
        })
      })
    })
  })

  describe('Linear Integration', () => {
    describe('Issue Management', () => {
      it('should list issues successfully', async () => {
        const mockIssues = [
          {
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
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockIssues
        } as any)

        const result = await linearIntegration.listIssues('team-1', 'user-1')

        expect(mockFetch).toHaveBeenCalledWith('/api/linear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'list_issues',
            teamId: 'team-1',
            assigneeId: 'user-1'
          })
        })

        expect(result).toHaveLength(1)
        expect(result[0].identifier).toBe('TC-001')
        expect(result[0].title).toBe('Test Linear issue')
      })

      it('should create issues successfully', async () => {
        const newIssue = {
          id: 'issue-2',
          identifier: 'TC-002',
          title: 'New Linear issue',
          description: 'This is a new issue',
          priority: 1,
          state: {
            id: 'state-todo',
            name: 'Todo',
            color: '#6b7280'
          },
          team: {
            id: 'team-1',
            name: 'T3 Crusher'
          },
          labels: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          url: 'https://linear.app/t3-crusher/issue/TC-002'
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => newIssue
        } as any)

        const result = await linearIntegration.createIssue(
          'New Linear issue',
          'team-1',
          'This is a new issue',
          1,
          'user-1',
          ['label-1']
        )

        expect(mockFetch).toHaveBeenCalledWith('/api/linear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'create_issue',
            title: 'New Linear issue',
            teamId: 'team-1',
            description: 'This is a new issue',
            priority: 1,
            assigneeId: 'user-1',
            labelIds: ['label-1']
          })
        })

        expect(result.identifier).toBe('TC-002')
        expect(result.title).toBe('New Linear issue')
      })

      it('should update issues successfully', async () => {
        const updatedIssue = {
          id: 'issue-1',
          identifier: 'TC-001',
          title: 'Updated Linear issue',
          priority: 3,
          state: {
            id: 'state-done',
            name: 'Done',
            color: '#10b981'
          },
          team: {
            id: 'team-1',
            name: 'T3 Crusher'
          },
          labels: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T01:00:00Z',
          url: 'https://linear.app/t3-crusher/issue/TC-001'
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => updatedIssue
        } as any)

        const result = await linearIntegration.updateIssue('issue-1', {
          title: 'Updated Linear issue',
          priority: 3,
          stateId: 'state-done'
        })

        expect(result.title).toBe('Updated Linear issue')
        expect(result.priority).toBe(3)
        expect(result.state.name).toBe('Done')
      })
    })

    describe('Project Management', () => {
      it('should list projects successfully', async () => {
        const mockProjects = [
          {
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
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockProjects
        } as any)

        const result = await linearIntegration.listProjects('team-1')

        expect(result).toHaveLength(1)
        expect(result[0].name).toBe('Test Project')
        expect(result[0].progress).toBe(0.75)
      })

      it('should create projects successfully', async () => {
        const newProject = {
          id: 'project-2',
          name: 'New Test Project',
          description: 'A new test project',
          state: 'active',
          progress: 0,
          startDate: '2024-01-01',
          targetDate: '2024-06-30',
          teams: [{ id: 'team-1', name: 'T3 Crusher' }],
          url: 'https://linear.app/t3-crusher/project/new-test-project'
        }

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => newProject
        } as any)

        const result = await linearIntegration.createProject(
          'New Test Project',
          'team-1',
          'A new test project',
          '2024-01-01',
          '2024-06-30'
        )

        expect(result.name).toBe('New Test Project')
        expect(result.description).toBe('A new test project')
      })
    })

    describe('Team Management', () => {
      it('should list teams successfully', async () => {
        const mockTeams = [
          {
            id: 'team-1',
            name: 'T3 Crusher',
            key: 'TC',
            description: 'Core development team',
            timezone: 'America/New_York',
            issueCount: 15
          },
          {
            id: 'team-2',
            name: 'Integrations',
            key: 'INT',
            description: 'Integration team',
            timezone: 'America/New_York',
            issueCount: 8
          }
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockTeams
        } as any)

        const result = await linearIntegration.listTeams()

        expect(result).toHaveLength(2)
        expect(result[0].name).toBe('T3 Crusher')
        expect(result[0].key).toBe('TC')
        expect(result[1].issueCount).toBe(8)
      })
    })

    describe('Search and Filtering', () => {
      it('should search issues successfully', async () => {
        const mockSearchResults = [
          {
            id: 'search-result-1',
            identifier: 'TC-005',
            title: 'Search result issue',
            description: 'This matches the search query',
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
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            url: 'https://linear.app/t3-crusher/issue/TC-005'
          }
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSearchResults
        } as any)

        const result = await linearIntegration.searchIssues('search query')

        expect(mockFetch).toHaveBeenCalledWith('/api/linear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'search_issues',
            query: 'search query'
          })
        })

        expect(result).toHaveLength(1)
        expect(result[0].title).toBe('Search result issue')
      })

      it('should get my issues successfully', async () => {
        const mockMyIssues = [
          {
            id: 'my-issue-1',
            identifier: 'TC-006',
            title: 'My assigned issue',
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
            labels: [],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            url: 'https://linear.app/t3-crusher/issue/TC-006'
          }
        ]

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockMyIssues
        } as any)

        const result = await linearIntegration.getMyIssues()

        expect(result).toHaveLength(1)
        expect(result[0].assignee?.name).toBe('Current User')
      })
    })

    describe('Formatting Utilities', () => {
      it('should format priority labels correctly', () => {
        expect(linearIntegration.getPriorityLabel(1)).toBe('🔥 Urgent')
        expect(linearIntegration.getPriorityLabel(2)).toBe('🔴 High')
        expect(linearIntegration.getPriorityLabel(3)).toBe('🟡 Normal')
        expect(linearIntegration.getPriorityLabel(4)).toBe('🔵 Low')
        expect(linearIntegration.getPriorityLabel(0)).toBe('⚪ No Priority')
      })

      it('should format issues for chat correctly', () => {
        const mockIssue = {
          id: 'issue-1',
          identifier: 'TC-001',
          title: 'Test issue',
          description: 'Test description',
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
          dueDate: '2024-01-15T00:00:00Z',
          url: 'https://linear.app/t3-crusher/issue/TC-001'
        }

        const formatted = linearIntegration.formatIssueForChat(mockIssue)

        expect(formatted).toContain('📋 **[TC-001]**: [Test issue]')
        expect(formatted).toContain('🏢 **Team**: T3 Crusher')
        expect(formatted).toContain('📊 **Status**: In Progress')
        expect(formatted).toContain('🔴 High')
        expect(formatted).toContain('👤 **Assignee**: Test User')
        expect(formatted).toContain('🏷️ **Labels**: `feature`')
        expect(formatted).toContain('⏱️ **Estimate**: 5 points')
      })

      it('should format projects for chat correctly', () => {
        const mockProject = {
          id: 'project-1',
          name: 'Test Project',
          description: 'Test project description',
          state: 'active',
          progress: 0.75,
          startDate: '2024-01-01',
          targetDate: '2024-12-31',
          teams: [
            { id: 'team-1', name: 'T3 Crusher' },
            { id: 'team-2', name: 'Design' }
          ],
          url: 'https://linear.app/t3-crusher/project/test-project'
        }

        const formatted = linearIntegration.formatProjectForChat(mockProject)

        expect(formatted).toContain('🚀 **Project**: [Test Project]')
        expect(formatted).toContain('📈 **Progress**: 75%')
        expect(formatted).toContain('📊 **Status**: active')
        expect(formatted).toContain('🏢 **Teams**: T3 Crusher, Design')
        expect(formatted).toContain('📅 **Start**: 1/1/2024')
        expect(formatted).toContain('🎯 **Target**: 12/31/2024')
      })
    })
  })

  describe('MCP Error Handling', () => {
    it('should handle API timeout errors', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      await expect(githubIntegration.searchRepositories('test'))
        .rejects.toThrow('Request timeout')
    })

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      } as any)

      await expect(githubIntegration.searchRepositories('test'))
        .rejects.toThrow('Invalid JSON')
    })

    it('should handle server errors with proper status codes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable'
      } as any)

      await expect(linearIntegration.listIssues())
        .rejects.toThrow('Failed to list issues')
    })
  })
})