export interface ThoughtStep {
  type: 'analysis' | 'reasoning' | 'conclusion' | 'verification' | 'reflection' | 'hypothesis' | 'evaluation'
  thought: string
  confidence?: number
  evidence?: string[]
  duration?: number
  emotion?: 'curious' | 'confident' | 'uncertain' | 'excited' | 'concerned' | 'satisfied'
  keywords?: string[]
  relatedConcepts?: string[]
  complexity?: number // 1-5 scale
  timestamp?: number
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

  // Skip synthetic reasoning generation to improve performance
  // if (reasoning.length === 0) {
  //   reasoning.push(...generateSyntheticReasoning(message))
  // }

  return {
    mainResponse: cleanMessage.trim(),
    reasoning
  }
}

// Generate synthetic reasoning steps for responses that don't have explicit reasoning
function generateSyntheticReasoning(message: string): ThoughtStep[] {
  const steps: ThoughtStep[] = []
  const timestamp = Date.now()
  
  // Analyze message characteristics
  const isQuestion = message.includes('?')
  const isCodeRelated = message.includes('```') || /\b(function|class|import|export)\b/.test(message)
  const isExplanation = message.length > 200
  const hasSteps = /\d+\.\s/.test(message) || message.includes('First,') || message.includes('Next,')
  const isMathematical = /\b(calculate|equation|formula|solve|algorithm)\b/i.test(message)
  const isCreative = /\b(design|create|build|innovative|idea)\b/i.test(message)

  // Extract keywords from message
  const keywords = extractKeywords(message)
  const relatedConcepts = generateRelatedConcepts(message)

  // Determine complexity
  let complexity = 1
  if (isCodeRelated) complexity += 1
  if (isExplanation) complexity += 1
  if (isMathematical) complexity += 1
  if (hasSteps) complexity += 1
  complexity = Math.min(complexity, 5)

  // Analysis step
  let analysisThought = 'Analyzing the user\'s request and identifying key requirements'
  let emotion: ThoughtStep['emotion'] = 'curious'
  
  if (isQuestion) {
    analysisThought = 'The user is asking a direct question that requires a clear, informative response'
    emotion = 'confident'
  } else if (isCodeRelated) {
    analysisThought = 'This is a technical programming question that needs code examples and explanations'
    emotion = 'confident'
  } else if (isExplanation) {
    analysisThought = 'This requires a comprehensive explanation with multiple aspects to cover'
    emotion = 'curious'
  } else if (isCreative) {
    analysisThought = 'This is a creative request that needs innovative thinking and multiple solution approaches'
    emotion = 'excited'
  }

  steps.push({
    type: 'analysis',
    thought: analysisThought,
    confidence: 0.8 + Math.random() * 0.1,
    duration: 100 + Math.random() * 100,
    emotion,
    keywords: keywords.slice(0, 3),
    complexity,
    timestamp: timestamp
  })

  // Reasoning step
  let reasoningThought = 'Processing the information and determining the best approach'
  emotion = 'confident'
  
  if (hasSteps) {
    reasoningThought = 'Breaking down the response into clear, sequential steps for better understanding'
  } else if (isCodeRelated) {
    reasoningThought = 'Considering best practices, readability, and practical implementation details'
    emotion = 'confident'
  } else if (isMathematical) {
    reasoningThought = 'Applying mathematical principles and checking for accuracy'
    emotion = 'confident'
  } else if (isCreative) {
    reasoningThought = 'Exploring creative possibilities while maintaining practical constraints'
    emotion = 'excited'
  }

  steps.push({
    type: 'reasoning',
    thought: reasoningThought,
    confidence: 0.75 + Math.random() * 0.15,
    duration: 200 + Math.random() * 200,
    emotion,
    keywords: keywords.slice(1, 4),
    relatedConcepts: relatedConcepts.slice(0, 3),
    complexity,
    timestamp: timestamp + 300
  })

  // Add hypothesis for complex topics
  if (complexity >= 3) {
    steps.push({
      type: 'hypothesis',
      thought: 'Forming hypotheses about the most effective solution approach',
      confidence: 0.7 + Math.random() * 0.15,
      duration: 150 + Math.random() * 100,
      emotion: 'curious',
      complexity,
      timestamp: timestamp + 500
    })
  }

  // Conclusion step
  steps.push({
    type: 'conclusion',
    thought: 'Formulating a comprehensive response that addresses the user\'s needs effectively',
    confidence: 0.85 + Math.random() * 0.1,
    duration: 80 + Math.random() * 80,
    emotion: 'satisfied',
    relatedConcepts: relatedConcepts.slice(-2),
    complexity,
    timestamp: timestamp + 700
  })

  // Add verification for high complexity
  if (complexity >= 4) {
    steps.push({
      type: 'verification',
      thought: 'Double-checking the solution for accuracy and completeness',
      confidence: 0.9 + Math.random() * 0.05,
      duration: 120 + Math.random() * 80,
      emotion: 'confident',
      complexity,
      timestamp: timestamp + 850
    })
  }

  return steps
}

// Extract keywords from message content
function extractKeywords(message: string): string[] {
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'])
  
  const words = message.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
  
  // Get unique words and sort by frequency
  const wordCount = new Map<string, number>()
  words.forEach(word => {
    wordCount.set(word, (wordCount.get(word) || 0) + 1)
  })
  
  return Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

// Generate related concepts based on message content
function generateRelatedConcepts(message: string): string[] {
  const concepts: string[] = []
  
  if (/\b(react|vue|angular|javascript|typescript)\b/i.test(message)) {
    concepts.push('Frontend Development', 'Component Architecture', 'State Management')
  }
  
  if (/\b(node|express|api|server|backend)\b/i.test(message)) {
    concepts.push('Server Architecture', 'API Design', 'Database Integration')
  }
  
  if (/\b(database|sql|mongodb|data)\b/i.test(message)) {
    concepts.push('Data Modeling', 'Query Optimization', 'Database Design')
  }
  
  if (/\b(ai|machine learning|neural|algorithm)\b/i.test(message)) {
    concepts.push('Artificial Intelligence', 'Machine Learning', 'Data Science')
  }
  
  if (/\b(design|ui|ux|interface)\b/i.test(message)) {
    concepts.push('User Experience', 'Interface Design', 'Design Systems')
  }
  
  if (/\b(security|auth|encryption|privacy)\b/i.test(message)) {
    concepts.push('Cybersecurity', 'Authentication', 'Data Protection')
  }
  
  // Add generic concepts if no specific ones found
  if (concepts.length === 0) {
    concepts.push('Problem Solving', 'Best Practices', 'Software Development')
  }
  
  return concepts
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