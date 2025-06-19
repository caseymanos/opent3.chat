import type { Task, TaskExtractionResult } from './task-extractor'

export enum ExportFormat {
  JSON = 'json',
  MARKDOWN = 'markdown',
  CSV = 'csv',
  NOTION_CSV = 'notion_csv',
  LINEAR_CSV = 'linear_csv'
}

export interface ExportOptions {
  format: ExportFormat
  includeMetadata?: boolean
  dateFormat?: 'ISO' | 'US' | 'EU'
  includeConfidence?: boolean
}

export interface ExportResult {
  content: string
  mimeType: string
  fileExtension: string
  filename: string
}

export class TaskExportFormatter {
  static format(result: TaskExtractionResult, options: ExportOptions): ExportResult {
    const timestamp = new Date().toISOString().split('T')[0]
    const baseFilename = `tasks-export-${timestamp}`

    switch (options.format) {
      case ExportFormat.JSON:
        return this.formatJSON(result, baseFilename, options)
      case ExportFormat.MARKDOWN:
        return this.formatMarkdown(result, baseFilename, options)
      case ExportFormat.CSV:
        return this.formatCSV(result, baseFilename, options)
      case ExportFormat.NOTION_CSV:
        return this.formatNotionCSV(result, baseFilename, options)
      case ExportFormat.LINEAR_CSV:
        return this.formatLinearCSV(result, baseFilename, options)
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }
  }

  private static formatJSON(
    result: TaskExtractionResult, 
    baseFilename: string, 
    options: ExportOptions
  ): ExportResult {
    const tasks = options.includeConfidence 
      ? result.tasks 
      : result.tasks.map(task => {
          const { confidence, ...taskWithoutConfidence } = task
          return taskWithoutConfidence
        })

    const exportData: any = {
      tasks,
      summary: result.summary,
      totalTasksFound: result.totalTasksFound,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      exportOptions: options
    }

    if (options.includeMetadata) {
      exportData.extractionMetadata = result.extractionMetadata
    }

    return {
      content: JSON.stringify(exportData, null, 2),
      mimeType: 'application/json',
      fileExtension: 'json',
      filename: `${baseFilename}.json`
    }
  }

  private static formatMarkdown(
    result: TaskExtractionResult, 
    baseFilename: string, 
    options: ExportOptions
  ): ExportResult {
    let markdown = ''

    // Add metadata as frontmatter if requested
    if (options.includeMetadata) {
      markdown += '---\n'
      markdown += `title: Task Export\n`
      markdown += `date: ${new Date().toISOString()}\n`
      markdown += `total_tasks: ${result.totalTasksFound}\n`
      markdown += `urgency: ${result.extractionMetadata.urgencyLevel}\n`
      markdown += `complexity: ${result.extractionMetadata.complexity}\n`
      markdown += `topics: [${result.extractionMetadata.primaryTopics.join(', ')}]\n`
      markdown += '---\n\n'
    }

    // Add summary
    markdown += `# Task Export Summary\n\n`
    markdown += `${result.summary}\n\n`

    // Group tasks by priority
    const tasksByPriority = this.groupTasksByPriority(result.tasks)

    // Add tasks by priority
    const priorityEmojis = {
      urgent: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    }

    const priorities: Array<'urgent' | 'high' | 'medium' | 'low'> = ['urgent', 'high', 'medium', 'low']
    
    priorities.forEach(priority => {
      const tasks = tasksByPriority[priority]
      if (tasks && tasks.length > 0) {
        markdown += `## ${priorityEmojis[priority]} ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`
        
        tasks.forEach(task => {
          markdown += `### ☐ ${task.title}\n\n`
          markdown += `${task.description}\n\n`
          
          // Add metadata
          markdown += `- **Category:** ${task.category}\n`
          markdown += `- **Status:** ${task.status}\n`
          
          if (task.estimatedHours) {
            markdown += `- **Estimated Hours:** ${task.estimatedHours}\n`
          }
          
          if (task.dueDate) {
            markdown += `- **Due Date:** ${this.formatDate(task.dueDate, options.dateFormat)}\n`
          }
          
          if (task.assignee) {
            markdown += `- **Assignee:** ${task.assignee}\n`
          }
          
          if (options.includeConfidence) {
            markdown += `- **Confidence:** ${Math.round(task.confidence * 100)}%\n`
          }
          
          if (task.tags && task.tags.length > 0) {
            markdown += `- **Tags:** ${task.tags.map(tag => `#${tag.replace(/\s+/g, '-')}`).join(' ')}\n`
          }
          
          markdown += '\n'
        })
      }
    })

    // Add metadata footer
    if (options.includeMetadata) {
      markdown += '---\n\n'
      markdown += `*Extracted from ${result.extractionMetadata.conversationLength} messages*\n`
      markdown += `*Export date: ${new Date().toLocaleString()}*\n`
    }

    return {
      content: markdown,
      mimeType: 'text/markdown',
      fileExtension: 'md',
      filename: `${baseFilename}.md`
    }
  }

  private static formatCSV(
    result: TaskExtractionResult, 
    baseFilename: string, 
    options: ExportOptions
  ): ExportResult {
    const headers = [
      'ID',
      'Title',
      'Description',
      'Priority',
      'Category',
      'Status',
      'Assignee',
      'Due Date',
      'Estimated Hours',
      'Tags'
    ]

    if (options.includeConfidence) {
      headers.push('Confidence')
    }

    const rows = [headers]

    result.tasks.forEach(task => {
      const row = [
        task.id,
        this.escapeCSV(task.title),
        this.escapeCSV(task.description),
        task.priority,
        task.category,
        task.status,
        task.assignee || '',
        task.dueDate ? this.formatDate(task.dueDate, options.dateFormat) : '',
        task.estimatedHours?.toString() || '',
        task.tags?.join('; ') || ''
      ]

      if (options.includeConfidence) {
        row.push(Math.round(task.confidence * 100).toString() + '%')
      }

      rows.push(row)
    })

    const csv = rows.map(row => row.join(',')).join('\n')

    return {
      content: csv,
      mimeType: 'text/csv',
      fileExtension: 'csv',
      filename: `${baseFilename}.csv`
    }
  }

  private static formatNotionCSV(
    result: TaskExtractionResult, 
    baseFilename: string, 
    options: ExportOptions
  ): ExportResult {
    // Notion expects specific column names and formats
    const headers = [
      'Name', // Title in Notion
      'Description',
      'Status',
      'Priority',
      'Category',
      'Due Date',
      'Time Estimate',
      'Assigned To',
      'Tags',
      'Created'
    ]

    const rows = [headers]

    // Map priority to Notion-friendly format
    const priorityMap = {
      urgent: '🔴 Urgent',
      high: '🟠 High',
      medium: '🟡 Medium',
      low: '🟢 Low'
    }

    // Map status to Notion-friendly format
    const statusMap = {
      pending: 'Not Started',
      in_progress: 'In Progress',
      completed: 'Completed',
      blocked: 'Blocked'
    }

    result.tasks.forEach(task => {
      const row = [
        this.escapeCSV(task.title),
        this.escapeCSV(task.description),
        statusMap[task.status] || task.status,
        priorityMap[task.priority as keyof typeof priorityMap] || task.priority,
        this.capitalizeFirst(task.category),
        task.dueDate ? this.formatDate(task.dueDate, 'US') : '', // Notion prefers MM/DD/YYYY
        task.estimatedHours ? `${task.estimatedHours} hours` : '',
        task.assignee || '',
        task.tags?.join(', ') || '', // Notion can parse comma-separated tags
        new Date().toLocaleDateString('en-US') // Created date
      ]

      rows.push(row)
    })

    const csv = rows.map(row => row.join(',')).join('\n')

    return {
      content: csv,
      mimeType: 'text/csv',
      fileExtension: 'csv',
      filename: `${baseFilename}-notion.csv`
    }
  }

  private static formatLinearCSV(
    result: TaskExtractionResult, 
    baseFilename: string, 
    options: ExportOptions
  ): ExportResult {
    // Linear expects these specific headers
    const headers = [
      'Title',
      'Description',
      'Status',
      'Priority',
      'Assignee',
      'Labels',
      'Due Date',
      'Estimate',
      'Project',
      'Team'
    ]

    const rows = [headers]

    // Map priority to Linear's numeric scale (0-4)
    const priorityMap = {
      urgent: '1', // Urgent
      high: '2',   // High
      medium: '3', // Normal
      low: '4'     // Low
    }

    // Map status to Linear-friendly format
    const statusMap = {
      pending: 'Backlog',
      in_progress: 'In Progress',
      completed: 'Done',
      blocked: 'Todo'
    }

    result.tasks.forEach(task => {
      // Combine category and tags for Linear labels
      const labels: string[] = [task.category]
      if (task.tags) {
        labels.push(...task.tags)
      }

      const row = [
        this.escapeCSV(task.title),
        this.escapeCSV(task.description),
        statusMap[task.status] || 'Backlog',
        priorityMap[task.priority as keyof typeof priorityMap] || '3',
        task.assignee || '',
        labels.join(', '),
        task.dueDate ? this.formatDate(task.dueDate, 'ISO') : '',
        task.estimatedHours?.toString() || '',
        '', // Project - left empty for user to fill
        ''  // Team - left empty for user to fill
      ]

      rows.push(row)
    })

    const csv = rows.map(row => row.join(',')).join('\n')

    return {
      content: csv,
      mimeType: 'text/csv',
      fileExtension: 'csv',
      filename: `${baseFilename}-linear.csv`
    }
  }

  // Helper methods
  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  private static formatDate(dateString: string, format?: 'ISO' | 'US' | 'EU'): string {
    const date = new Date(dateString)
    
    switch (format) {
      case 'US':
        return date.toLocaleDateString('en-US') // MM/DD/YYYY
      case 'EU':
        return date.toLocaleDateString('en-GB') // DD/MM/YYYY
      case 'ISO':
      default:
        return date.toISOString().split('T')[0] // YYYY-MM-DD
    }
  }

  private static capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  private static groupTasksByPriority(tasks: Task[]): Record<string, Task[]> {
    return tasks.reduce((groups, task) => {
      const priority = task.priority
      if (!groups[priority]) {
        groups[priority] = []
      }
      groups[priority].push(task)
      return groups
    }, {} as Record<string, Task[]>)
  }

  // Generate preview of the export
  static getPreview(result: TaskExtractionResult, format: ExportFormat): string {
    const options: ExportOptions = {
      format,
      includeMetadata: true,
      includeConfidence: false,
      dateFormat: 'ISO'
    }

    const exported = this.format(result, options)
    
    // Limit preview length
    const maxLength = 500
    if (exported.content.length > maxLength) {
      return exported.content.substring(0, maxLength) + '\n...\n(truncated for preview)'
    }
    
    return exported.content
  }
}