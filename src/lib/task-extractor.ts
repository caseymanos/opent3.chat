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
  content: any // JSONB field from database
  role: 'user' | 'assistant'
  created_at: string
}

export class TaskExtractor {
  private readonly model = anthropic('claude-3-5-sonnet-20241022')
  
  async extractTasks(messages: ConversationMessage[]): Promise<TaskExtractionResult> {
    logger.group('TaskExtractor.extractTasks')
    logger.info('Extracting tasks from conversation', { messageCount: messages.length })
    
    // Check if API key is available
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    
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
      
      // Check if this is a schema validation error with a malformed response
      if (error instanceof Error && error.message.includes('response did not match schema')) {
        // Try to parse the malformed response
        const parsedResult = this.tryParseMalformedResponse(error)
        if (parsedResult) {
          logger.info('Successfully parsed malformed response', { 
            tasksFound: parsedResult.totalTasksFound 
          })
          return parsedResult
        }
      }
      
      throw new Error(`Failed to extract tasks: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  private tryParseMalformedResponse(error: any): TaskExtractionResult | null {
    try {
      logger.info('Attempting to parse malformed response')
      
      // Check if error has the expected structure from AI SDK
      if (error.cause && error.cause.value) {
        const errorValue = error.cause.value
        
        // Case 1: The AI put the entire response as a string in the tasks field
        if (errorValue.tasks && typeof errorValue.tasks === 'string') {
          logger.info('Found stringified response in tasks field')
          
          // The string contains the full JSON response
          const tasksString = errorValue.tasks
          
          // Look for the actual JSON structure within the string
          // It might have the format: "[{...tasks...}],\n\"summary\": ..., \"totalTasksFound\": ..."
          // We need to reconstruct the proper object
          
          try {
            // First, try to parse it as a complete JSON object
            const actualResponse = JSON.parse(tasksString)
            const validated = TaskExtractionResult.parse(actualResponse)
            return validated
          } catch {
            // If that fails, try to extract the components manually
            logger.info('Trying manual extraction from malformed string')
            
            // Extract tasks array
            const tasksMatch = tasksString.match(/^\[([\s\S]*?)\]/)
            if (!tasksMatch) {
              logger.warn('Could not extract tasks array from string')
              return null
            }
            
            // Extract other fields
            const summaryMatch = tasksString.match(/"summary":\s*"([^"]+)"/)
            const totalMatch = tasksString.match(/"totalTasksFound":\s*(\d+)/)
            
            // For metadata, we need to capture the full nested object
            const metadataMatch = tasksString.match(/"extractionMetadata":\s*({[\s\S]*?"complexity":\s*"[^"]+"\s*})/m)
            
            if (!summaryMatch || !totalMatch) {
              logger.warn('Could not extract required fields')
              return null
            }
            
            // Parse the tasks array
            const tasksArray = JSON.parse(`[${tasksMatch[1]}]`)
            
            // Parse metadata if found
            let metadata = {
              conversationLength: 1,
              primaryTopics: [],
              urgencyLevel: 'medium' as const,
              complexity: 'moderate' as const
            }
            
            if (metadataMatch) {
              try {
                metadata = JSON.parse(metadataMatch[1])
              } catch (e) {
                logger.warn('Could not parse metadata, using defaults', e)
              }
            }
            
            const reconstructed = {
              tasks: tasksArray,
              summary: summaryMatch[1],
              totalTasksFound: parseInt(totalMatch[1]),
              extractionMetadata: metadata
            }
            
            const validated = TaskExtractionResult.parse(reconstructed)
            return validated
          }
        }
        
        // Case 2: Try direct validation of the error value
        try {
          const validated = TaskExtractionResult.parse(errorValue)
          return validated
        } catch {
          // Continue to other methods
        }
      }
      
      // Fallback: Try to extract from error string
      const errorText = error.toString()
      const responseMatch = errorText.match(/text:\s*'({.*})'/s)
      
      if (responseMatch) {
        const responseText = responseMatch[1]
        const parsed = JSON.parse(responseText)
        
        if (parsed.tasks && typeof parsed.tasks === 'string') {
          // Recursive call with the parsed object
          return this.tryParseMalformedResponse({ cause: { value: parsed } })
        }
        
        const validated = TaskExtractionResult.parse(parsed)
        return validated
      }
      
      logger.warn('Could not extract response from error')
      return null
      
    } catch (parseError) {
      logger.error('Failed to parse malformed response', parseError)
      return null
    }
  }

  private formatConversation(messages: ConversationMessage[]): string {
    return messages
      .map(msg => {
        // Extract text content from the JSONB content field
        let text = ''
        if (typeof msg.content === 'string') {
          text = msg.content
        } else if (msg.content && typeof msg.content === 'object') {
          // Handle different possible structures
          if (msg.content.text) {
            text = msg.content.text
          } else if (msg.content.content) {
            text = msg.content.content
          } else if (Array.isArray(msg.content)) {
            // Handle array of content blocks
            text = msg.content
              .map(block => block.text || block.content || JSON.stringify(block))
              .join(' ')
          } else {
            text = JSON.stringify(msg.content)
          }
        } else {
          text = String(msg.content || '')
        }
        
        return `[${msg.role.toUpperCase()}]: ${text}`
      })
      .join('\n\n')
  }

  private getSystemPrompt(): string {
    return `You are an expert AI task extraction specialist. Your role is to analyze conversations and identify actionable tasks, requirements, and to-dos.

IMPORTANT: You must return a properly structured JSON object with the following format:
{
  "tasks": [array of task objects],
  "summary": "string summary",
  "totalTasksFound": number,
  "extractionMetadata": {
    "conversationLength": number,
    "primaryTopics": [array of strings],
    "urgencyLevel": "low" | "medium" | "high",
    "complexity": "simple" | "moderate" | "complex"
  }
}

The "tasks" field MUST be an actual array, NOT a string containing an array.

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
    return `Analyze this conversation and extract all actionable tasks and requirements.

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
- Appropriate priority (low/medium/high/urgent) and category
- Your confidence in this being a real task (0.0-1.0)
- Any mentioned deadlines, assignees, or dependencies

Return a JSON object with this EXACT structure:
{
  "tasks": [
    {
      "id": "TASK-001",
      "title": "Task title",
      "description": "Task description",
      "priority": "high",
      "category": "technical",
      "confidence": 0.9,
      "estimatedHours": 2,
      "tags": ["tag1", "tag2"],
      "status": "pending"
    }
  ],
  "summary": "Summary of extracted tasks",
  "totalTasksFound": 1,
  "extractionMetadata": {
    "conversationLength": 1,
    "primaryTopics": ["topic1", "topic2"],
    "urgencyLevel": "medium",
    "complexity": "moderate"
  }
}

CRITICAL: The "tasks" field must be an actual JSON array, NOT a string.
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