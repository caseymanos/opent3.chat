import { anthropic } from '@ai-sdk/anthropic'
import { generateObject } from 'ai'
import { z } from 'zod'
import { logger } from './logger'

// Schema for extracted tasks
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  category: z.enum(['technical', 'research', 'design', 'business', 'testing', 'documentation', 'other']),
  assignee: z.string().optional(),
  dueDate: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  estimatedHours: z.number().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).default('pending'),
  confidence: z.number().min(0).max(1) // AI confidence in task extraction
})

const TaskExtractionResult = z.object({
  tasks: z.array(TaskSchema),
  summary: z.string(),
  totalTasksFound: z.number(),
  extractionMetadata: z.object({
    conversationLength: z.number(),
    primaryTopics: z.array(z.string()),
    urgencyLevel: z.enum(['low', 'medium', 'high']),
    complexity: z.enum(['simple', 'moderate', 'complex'])
  })
})

type Task = z.infer<typeof TaskSchema>
type TaskExtractionResult = z.infer<typeof TaskExtractionResult>

interface ConversationMessage {
  id: string
  content: { text: string }
  role: 'user' | 'assistant'
  created_at: string
}

export class TaskExtractor {
  private readonly model = anthropic('claude-3-5-sonnet-20241022')
  
  async extractTasks(messages: ConversationMessage[]): Promise<TaskExtractionResult> {
    logger.group('TaskExtractor.extractTasks')
    logger.info('Extracting tasks from conversation', { messageCount: messages.length })
    
    try {
      // Prepare conversation context
      const conversationText = this.formatConversation(messages)
      
      const result = await generateObject({
        model: this.model,
        system: this.getSystemPrompt(),
        prompt: this.buildExtractionPrompt(conversationText),
        schema: TaskExtractionResult,
        temperature: 0.3, // Lower temperature for more consistent extraction
      })

      logger.info('Task extraction completed', { 
        tasksFound: result.object.totalTasksFound,
        urgency: result.object.extractionMetadata.urgencyLevel 
      })

      return result.object
    } catch (error) {
      logger.error('Task extraction failed', error)
      throw new Error(`Failed to extract tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private formatConversation(messages: ConversationMessage[]): string {
    return messages
      .map(msg => `[${msg.role.toUpperCase()}]: ${msg.content.text}`)
      .join('\n\n')
  }

  private getSystemPrompt(): string {
    return `You are an expert AI task extraction specialist. Your role is to analyze conversations and identify actionable tasks, requirements, and to-dos.

TASK IDENTIFICATION RULES:
1. Extract only ACTIONABLE items - things that require specific work to be done
2. Distinguish between:
   - Explicit tasks (directly mentioned: "we need to...", "TODO:", "let's implement...")
   - Implicit tasks (problems that need solutions, gaps that need filling)
   - Discussion points (NOT tasks unless they lead to action items)

3. For each task, determine:
   - Clear, specific title and description
   - Realistic priority based on urgency and impact
   - Appropriate category (technical, business, etc.)
   - Confidence level (how certain you are this is a real task)

4. Avoid:
   - Vague or unclear items
   - Pure discussion topics without clear action
   - Already completed items mentioned in past tense

PRIORITY GUIDELINES:
- urgent: Critical blockers, security issues, production problems
- high: Important features, significant bugs, time-sensitive items
- medium: Standard development tasks, improvements
- low: Nice-to-have features, minor optimizations

CONFIDENCE SCORING:
- 0.9-1.0: Explicitly stated tasks with clear requirements
- 0.7-0.8: Strongly implied tasks with sufficient context
- 0.5-0.6: Possible tasks that may need clarification
- 0.0-0.4: Uncertain or speculative items`
  }

  private buildExtractionPrompt(conversationText: string): string {
    return `Analyze this conversation and extract all actionable tasks and requirements:

CONVERSATION:
${conversationText}

Please identify:
1. All explicit and implicit tasks that need to be completed
2. Any requirements, features, or improvements mentioned
3. Technical work items, research tasks, or design needs
4. Bug fixes, optimizations, or refactoring suggestions

For each task, provide:
- A clear, actionable title
- Detailed description of what needs to be done
- Appropriate priority and category
- Your confidence in this being a real task (0.0-1.0)
- Any mentioned deadlines, assignees, or dependencies

Focus on actionable items that require specific work, not general discussion points.`
  }

  // Helper method to filter tasks by confidence threshold
  filterByConfidence(tasks: Task[], minConfidence: number = 0.6): Task[] {
    return tasks.filter(task => task.confidence >= minConfidence)
  }

  // Helper method to group tasks by category
  groupByCategory(tasks: Task[]): Record<string, Task[]> {
    return tasks.reduce((groups, task) => {
      const category = task.category
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(task)
      return groups
    }, {} as Record<string, Task[]>)
  }

  // Helper method to get high-priority tasks
  getHighPriorityTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => 
      task.priority === 'high' || task.priority === 'urgent'
    )
  }

  // Generate a summary of extracted tasks
  generateTaskSummary(result: TaskExtractionResult): string {
    const { tasks, extractionMetadata } = result
    const highPriority = this.getHighPriorityTasks(tasks)
    const byCategory = this.groupByCategory(tasks)
    
    let summary = `Found ${result.totalTasksFound} tasks from conversation:\n\n`
    
    if (highPriority.length > 0) {
      summary += `🔥 HIGH PRIORITY (${highPriority.length}):\n`
      highPriority.forEach(task => {
        summary += `  • ${task.title}\n`
      })
      summary += '\n'
    }
    
    summary += 'BY CATEGORY:\n'
    Object.entries(byCategory).forEach(([category, categoryTasks]) => {
      summary += `  ${category}: ${categoryTasks.length} tasks\n`
    })
    
    summary += `\nComplexity: ${extractionMetadata.complexity}\n`
    summary += `Primary topics: ${extractionMetadata.primaryTopics.join(', ')}`
    
    return summary
  }
}

// Export singleton instance
export const taskExtractor = new TaskExtractor()

// Export types
export type { Task, TaskExtractionResult }