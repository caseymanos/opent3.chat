'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { githubIntegration, GitHubRepository, GitHubIssue, GitHubPullRequest } from '@/lib/github-integration'

interface GitHubIntegrationProps {
  onSelect?: (content: string) => void
}

export function GitHubIntegration({ onSelect }: GitHubIntegrationProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'issues' | 'prs'>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [repositories, setRepositories] = useState<GitHubRepository[]>([])
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const searchRepositories = async () => {
    if (!searchQuery.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const results = await githubIntegration.searchRepositories(searchQuery)
      setRepositories(results)
    } catch (err) {
      setError('Failed to search repositories')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadIssues = async () => {
    if (!repoOwner.trim() || !repoName.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const results = await githubIntegration.listIssues(repoOwner, repoName, 'open')
      setIssues(results)
    } catch (err) {
      setError('Failed to load issues')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadPullRequests = async () => {
    if (!repoOwner.trim() || !repoName.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const results = await githubIntegration.listPullRequests(repoOwner, repoName, 'open')
      setPullRequests(results)
    } catch (err) {
      setError('Failed to load pull requests')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRepositorySelect = (repo: GitHubRepository) => {
    const content = `📁 **Repository**: [${repo.full_name}](${repo.html_url})
📝 **Description**: ${repo.description || 'No description'}
⭐ **Stars**: ${repo.stargazers_count} | 🍴 **Forks**: ${repo.forks_count}
💻 **Language**: ${repo.language || 'Not specified'}
🌿 **Default Branch**: ${repo.default_branch}
📅 **Last Updated**: ${new Date(repo.updated_at).toLocaleDateString()}`

    onSelect?.(content)
  }

  const handleIssueSelect = (issue: GitHubIssue) => {
    const content = `🐛 **Issue #${issue.number}**: [${issue.title}](${issue.html_url})
👤 **Author**: @${issue.user.login}
📅 **Created**: ${new Date(issue.created_at).toLocaleDateString()}
🏷️ **Labels**: ${issue.labels.map(label => `\`${label.name}\``).join(', ') || 'None'}
📋 **Status**: ${issue.state}

${issue.body ? `**Description**:\n${issue.body}` : '*No description provided*'}`

    onSelect?.(content)
  }

  const handlePullRequestSelect = (pr: GitHubPullRequest) => {
    const content = `🔀 **Pull Request #${pr.number}**: [${pr.title}](${pr.html_url})
👤 **Author**: @${pr.user.login}
📅 **Created**: ${new Date(pr.created_at).toLocaleDateString()}
🌿 **Branch**: ${pr.head.ref} → ${pr.base.ref}
📋 **Status**: ${pr.state}

${pr.body ? `**Description**:\n${pr.body}` : '*No description provided*'}`

    onSelect?.(content)
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-gray-900 flex items-center justify-center">
          <span className="text-white text-xs font-bold">GH</span>
        </div>
        <h3 className="font-semibold">GitHub Integration</h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2">
        {[
          { id: 'search', label: 'Search Repos', icon: '🔍' },
          { id: 'issues', label: 'Issues', icon: '🐛' },
          { id: 'prs', label: 'Pull Requests', icon: '🔀' }
        ].map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className="text-xs"
          >
            {tab.icon} {tab.label}
          </Button>
        ))}
      </div>

      {error && (
        <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {activeTab === 'search' && (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchRepositories()}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button onClick={searchRepositories} disabled={loading}>
                {loading ? '⏳' : '🔍'}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {repositories.map((repo) => (
                <motion.div
                  key={repo.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleRepositorySelect(repo)}
                >
                  <div className="font-medium text-sm">{repo.full_name}</div>
                  <div className="text-xs text-gray-600 mt-1">{repo.description}</div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>⭐ {repo.stargazers_count}</span>
                    <span>🍴 {repo.forks_count}</span>
                    {repo.language && <span>💻 {repo.language}</span>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'issues' && (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Owner"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Repository"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button onClick={loadIssues} disabled={loading}>
                {loading ? '⏳' : '📋'}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {issues.map((issue) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleIssueSelect(issue)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">●</span>
                    <span className="font-medium text-sm">#{issue.number}</span>
                    <span className="text-sm">{issue.title}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    by @{issue.user.login} • {new Date(issue.created_at).toLocaleDateString()}
                  </div>
                  {issue.labels.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {issue.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.name}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: `#${label.color}20`, color: `#${label.color}` }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'prs' && (
          <motion.div
            key="prs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Owner"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <input
                type="text"
                placeholder="Repository"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button onClick={loadPullRequests} disabled={loading}>
                {loading ? '⏳' : '🔀'}
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {pullRequests.map((pr) => (
                <motion.div
                  key={pr.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handlePullRequestSelect(pr)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-green-600">🔀</span>
                    <span className="font-medium text-sm">#{pr.number}</span>
                    <span className="text-sm">{pr.title}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    by @{pr.user.login} • {new Date(pr.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pr.head.ref} → {pr.base.ref}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}