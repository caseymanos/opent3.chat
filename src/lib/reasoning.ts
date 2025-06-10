export interface ThoughtStep {
  type: 'analysis' | 'reasoning' | 'conclusion' | 'verification'
  thought: string
  confidence?: number
  evidence?: string[]
  duration?: number
}

export interface ReasoningExtraction {
  mainResponse: string
  reasoning: ThoughtStep[]
}

// Extract reasoning from AI response using patterns
export function extractReasoning(message: string): ReasoningExtraction {
  const reasoning: ThoughtStep[] = []
  let cleanMessage = message

  // Extract analysis steps
  const analysisMatch = message.match(/\*\*Analysis:\*\*\s*([\s\S]*?)(?=\*\*|$)/)
  if (analysisMatch) {
    reasoning.push({
      type: 'analysis',
      thought: analysisMatch[1].trim(),
      confidence: 0.85 + Math.random() * 0.1
    })
    cleanMessage = cleanMessage.replace(analysisMatch[0], '')
  }

  // Extract reasoning steps
  const reasoningMatch = message.match(/\*\*Reasoning:\*\*\s*([\s\S]*?)(?=\*\*|$)/)
  if (reasoningMatch) {
    reasoning.push({
      type: 'reasoning',
      thought: reasoningMatch[1].trim(),
      confidence: 0.8 + Math.random() * 0.15
    })
    cleanMessage = cleanMessage.replace(reasoningMatch[0], '')
  }

  // Extract conclusions
  const conclusionMatch = message.match(/\*\*Conclusion:\*\*\s*([\s\S]*?)(?=\*\*|$)/)
  if (conclusionMatch) {
    reasoning.push({
      type: 'conclusion',
      thought: conclusionMatch[1].trim(),
      confidence: 0.9 + Math.random() * 0.1
    })
    cleanMessage = cleanMessage.replace(conclusionMatch[0], '')
  }

  // If no structured reasoning found, create synthetic reasoning based on content analysis
  if (reasoning.length === 0) {
    reasoning.push(...generateSyntheticReasoning(message))
  }

  return {
    mainResponse: cleanMessage.trim(),
    reasoning
  }
}

// Generate synthetic reasoning steps for responses that don't have explicit reasoning
function generateSyntheticReasoning(message: string): ThoughtStep[] {
  const steps: ThoughtStep[] = []
  
  // Analyze message characteristics
  const isQuestion = message.includes('?')
  const isCodeRelated = message.includes('```') || /\b(function|class|import|export)\b/.test(message)
  const isExplanation = message.length > 200
  const hasSteps = /\d+\.\s/.test(message) || message.includes('First,') || message.includes('Next,')

  // Analysis step
  let analysisThought = 'Analyzing the user\'s request'
  if (isQuestion) {
    analysisThought = 'The user is asking a direct question that requires a clear, informative response'
  } else if (isCodeRelated) {
    analysisThought = 'This is a technical programming question that needs code examples and explanations'
  } else if (isExplanation) {
    analysisThought = 'This requires a comprehensive explanation with multiple aspects to cover'
  }

  steps.push({
    type: 'analysis',
    thought: analysisThought,
    confidence: 0.8 + Math.random() * 0.1,
    duration: 100 + Math.random() * 100
  })

  // Reasoning step
  let reasoningThought = 'Processing the information and determining the best approach'
  if (hasSteps) {
    reasoningThought = 'Breaking down the response into clear, sequential steps for better understanding'
  } else if (isCodeRelated) {
    reasoningThought = 'Considering best practices, readability, and practical implementation details'
  }

  steps.push({
    type: 'reasoning',
    thought: reasoningThought,
    confidence: 0.75 + Math.random() * 0.15,
    duration: 200 + Math.random() * 200
  })

  // Conclusion step
  steps.push({
    type: 'conclusion',
    thought: 'Formulating a comprehensive response that addresses the user\'s needs effectively',
    confidence: 0.85 + Math.random() * 0.1,
    duration: 80 + Math.random() * 80
  })

  return steps
}

// Enhanced system prompt to encourage reasoning
export const REASONING_SYSTEM_PROMPT = `You are an advanced AI assistant that thinks step by step. When responding to users, occasionally include your reasoning process using this format:

**Analysis:** [Your analysis of the user's question/request]
**Reasoning:** [Your step-by-step thinking process]  
**Conclusion:** [Your final thoughts before providing the answer]

Then provide your main response. This helps users understand your thought process and builds trust. Only include reasoning for complex questions or when it would be educational.`

// Function to enhance prompts with reasoning requests
export function enhancePromptForReasoning(originalPrompt: string, shouldShowReasoning: boolean = false): string {
  if (!shouldShowReasoning) {
    return originalPrompt
  }

  return `${originalPrompt}

Please think through this step by step and show your reasoning using the format:
**Analysis:** [Your analysis]
**Reasoning:** [Your reasoning process]
**Conclusion:** [Your conclusion]

Then provide your main response.`
}