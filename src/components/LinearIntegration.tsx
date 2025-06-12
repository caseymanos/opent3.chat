'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from './ui/Button'
import { Card } from './ui/Card'
import { linearIntegration, LinearIssue, LinearProject, LinearTeam } from '@/lib/linear-integration'

interface LinearIntegrationProps {
  onSelect?: (content: string) => void
}

export function LinearIntegration({ onSelect }: LinearIntegrationProps) {
  const [activeTab, setActiveTab] = useState<'issues' | 'projects' | 'teams' | 'create'>('issues')
  const [issues, setIssues] = useState<LinearIssue[]>([])
  const [projects, setProjects] = useState<LinearProject[]>([])
  const [teams, setTeams] = useState<LinearTeam[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Create issue form state
  const [newIssueTitle, setNewIssueTitle] = useState('')
  const [newIssueDescription, setNewIssueDescription] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [selectedPriority, setSelectedPriority] = useState(3)

  const loadIssues = async () => {
    setLoading(true)
    setError('')
    
    try {
      const results = await linearIntegration.listIssues()
      setIssues(results)
    } catch (err) {
      setError('Failed to load issues')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadMyIssues = async () => {
    setLoading(true)
    setError('')
    
    try {
      const results = await linearIntegration.getMyIssues()
      setIssues(results)
    } catch (err) {
      setError('Failed to load my issues')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    setLoading(true)
    setError('')
    
    try {
      const results = await linearIntegration.listProjects()
      setProjects(results)
    } catch (err) {
      setError('Failed to load projects')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadTeams = async () => {
    setLoading(true)
    setError('')
    
    try {
      const results = await linearIntegration.listTeams()
      setTeams(results)
      if (results.length > 0 && !selectedTeamId) {
        setSelectedTeamId(results[0].id)
      }
    } catch (err) {
      setError('Failed to load teams')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const createIssue = async () => {
    if (!newIssueTitle.trim() || !selectedTeamId) return
    
    setLoading(true)
    setError('')
    
    try {
      const newIssue = await linearIntegration.createIssue(
        newIssueTitle,
        selectedTeamId,
        newIssueDescription || undefined,
        selectedPriority
      )
      
      // Clear form
      setNewIssueTitle('')
      setNewIssueDescription('')
      setSelectedPriority(3)
      
      // Add to issues list and select it
      setIssues(prev => [newIssue, ...prev])
      handleIssueSelect(newIssue)
    } catch (err) {
      setError('Failed to create issue')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleIssueSelect = (issue: LinearIssue) => {
    const content = linearIntegration.formatIssueForChat(issue)
    onSelect?.(content)
  }

  const handleProjectSelect = (project: LinearProject) => {
    const content = linearIntegration.formatProjectForChat(project)
    onSelect?.(content)
  }

  const handleTeamSelect = (team: LinearTeam) => {
    const content = `🏢 **Team**: ${team.name} (${team.key})
📝 **Description**: ${team.description || 'No description'}
📊 **Issues**: ${team.issueCount} open issues
🕐 **Timezone**: ${team.timezone}`

    onSelect?.(content)
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-600 bg-red-50'
      case 2: return 'text-orange-600 bg-orange-50'
      case 3: return 'text-yellow-600 bg-yellow-50'
      case 4: return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold">L</span>
        </div>
        <h3 className="font-semibold">Linear Integration</h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2">
        {[
          { id: 'issues', label: 'Issues', icon: '📋' },
          { id: 'projects', label: 'Projects', icon: '🚀' },
          { id: 'teams', label: 'Teams', icon: '🏢' },
          { id: 'create', label: 'Create', icon: '➕' }
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
        {activeTab === 'issues' && (
          <motion.div
            key="issues"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="flex gap-2">
              <Button onClick={loadIssues} disabled={loading} size="sm">
                {loading ? '⏳' : '📋'} All Issues
              </Button>
              <Button onClick={loadMyIssues} disabled={loading} size="sm" variant="outline">
                {loading ? '⏳' : '👤'} My Issues
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
                  <div className="flex items-center gap-2 mb-2">
                    <span 
                      className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(issue.priority)}`}
                    >
                      {linearIntegration.getPriorityLabel(issue.priority)}
                    </span>
                    <span className="text-sm font-mono text-gray-600">{issue.identifier}</span>
                  </div>
                  
                  <div className="font-medium text-sm mb-1">{issue.title}</div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span 
                      className="px-2 py-1 rounded"
                      style={{ backgroundColor: issue.state.color + '20', color: issue.state.color }}
                    >
                      {issue.state.name}
                    </span>
                    <span>🏢 {issue.team.name}</span>
                    {issue.assignee && <span>👤 {issue.assignee.name}</span>}
                    {issue.estimate && <span>⏱️ {issue.estimate}pt</span>}
                  </div>

                  {issue.labels.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {issue.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.id}
                          className="text-xs px-2 py-1 rounded"
                          style={{ backgroundColor: label.color + '20', color: label.color }}
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

        {activeTab === 'projects' && (
          <motion.div
            key="projects"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <Button onClick={loadProjects} disabled={loading} size="sm">
              {loading ? '⏳' : '🚀'} Load Projects
            </Button>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projects.map((project) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleProjectSelect(project)}
                >
                  <div className="font-medium text-sm mb-2">{project.name}</div>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${project.progress * 100}%` }}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>📈 {Math.round(project.progress * 100)}% complete</span>
                    <span>📊 {project.state}</span>
                  </div>
                  
                  {project.description && (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {project.description}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'teams' && (
          <motion.div
            key="teams"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <Button onClick={loadTeams} disabled={loading} size="sm">
              {loading ? '⏳' : '🏢'} Load Teams
            </Button>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {teams.map((team) => (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleTeamSelect(team)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{team.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{team.key}</span>
                  </div>
                  
                  <div className="text-xs text-gray-600 mb-2">
                    {team.description || 'No description'}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>📊 {team.issueCount} issues</span>
                    <span>🕐 {team.timezone}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'create' && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Issue title..."
                value={newIssueTitle}
                onChange={(e) => setNewIssueTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
              
              <textarea
                placeholder="Issue description (optional)..."
                value={newIssueDescription}
                onChange={(e) => setNewIssueDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded-md text-sm resize-none"
              />
              
              <div className="flex gap-2">
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(Number(e.target.value))}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value={1}>🔥 Urgent</option>
                  <option value={2}>🔴 High</option>
                  <option value={3}>🟡 Normal</option>
                  <option value={4}>🔵 Low</option>
                  <option value={0}>⚪ No Priority</option>
                </select>
                
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                >
                  <option value="">Select team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.key})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={loadTeams}
                  disabled={loading}
                  size="sm"
                  variant="outline"
                >
                  {loading ? '⏳' : '🔄'} Load Teams
                </Button>
                
                <Button
                  onClick={createIssue}
                  disabled={loading || !newIssueTitle.trim() || !selectedTeamId}
                  size="sm"
                  className="flex-1"
                >
                  {loading ? '⏳' : '➕'} Create Issue
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}