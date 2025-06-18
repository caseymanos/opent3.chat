// Code detection utilities for identifying programming languages in text

export interface CodeBlock {
  language: string
  code: string
  startIndex: number
  endIndex: number
}

// Common Prisma schema patterns
const prismaPatterns = [
  /datasource\s+\w+\s*{/,
  /generator\s+\w+\s*{/,
  /model\s+\w+\s*{/,
  /enum\s+\w+\s*{/,
  /@id\b/,
  /@unique\b/,
  /@relation\b/,
  /@default\b/,
  /@updatedAt\b/,
  /@map\b/,
  /provider\s*=\s*["'](?:postgresql|mysql|sqlite|sqlserver|mongodb|cockroachdb)["']/,
  /String\s*(@|$)/,
  /Int\s*(@|$)/,
  /Boolean\s*(@|$)/,
  /DateTime\s*(@|$)/,
  /Json\s*(@|$)/,
  /\?\s*(@|$)/, // Optional fields
  /\[\]\s*(@|$)/, // Array fields
]

// SQL patterns
const sqlPatterns = [
  /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|JOIN|GROUP BY|ORDER BY|HAVING)\b/i,
  /\b(CREATE|DROP|ALTER|TABLE|DATABASE|INDEX|VIEW)\b/i,
  /\b(PRIMARY KEY|FOREIGN KEY|REFERENCES|CONSTRAINT)\b/i,
  /\b(BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b/i,
]

// TypeScript/JavaScript patterns
const tsPatterns = [
  /\b(interface|type|enum|class|function|const|let|var|import|export|from)\b/,
  /\b(async|await|Promise|return|if|else|for|while|try|catch)\b/,
  /=>|===|!==|\?\.|::/,
  /\b(string|number|boolean|void|any|unknown|never)\b/,
]

// Python patterns
const pythonPatterns = [
  /\b(def|class|import|from|if|elif|else|for|while|try|except|finally)\b/,
  /\b(return|yield|pass|break|continue|raise|assert)\b/,
  /\b(True|False|None|and|or|not|in|is)\b/,
  /^\s*@\w+/, // Decorators
  /:\s*$/, // Colon at end of line
]

// Detect Prisma schema code
export function detectPrismaSchema(text: string): boolean {
  const lines = text.split('\n')
  let matchCount = 0
  
  for (const line of lines) {
    for (const pattern of prismaPatterns) {
      if (pattern.test(line)) {
        matchCount++
        if (matchCount >= 3) {
          return true
        }
      }
    }
  }
  
  return false
}

// Detect SQL code
export function detectSQL(text: string): boolean {
  const upperText = text.toUpperCase()
  let matchCount = 0
  
  for (const pattern of sqlPatterns) {
    if (pattern.test(text)) {
      matchCount++
      if (matchCount >= 2) {
        return true
      }
    }
  }
  
  return false
}

// Detect TypeScript/JavaScript code
export function detectTypeScript(text: string): boolean {
  let matchCount = 0
  
  for (const pattern of tsPatterns) {
    if (pattern.test(text)) {
      matchCount++
      if (matchCount >= 3) {
        return true
      }
    }
  }
  
  return false
}

// Detect Python code
export function detectPython(text: string): boolean {
  let matchCount = 0
  
  for (const pattern of pythonPatterns) {
    if (pattern.test(text)) {
      matchCount++
      if (matchCount >= 3) {
        return true
      }
    }
  }
  
  return false
}

// Main detection function
export function detectCodeLanguage(text: string): string | null {
  // Remove leading/trailing whitespace
  const trimmedText = text.trim()
  
  // Check for explicit language markers
  if (trimmedText.startsWith('```')) {
    const firstLine = trimmedText.split('\n')[0]
    const match = firstLine.match(/```(\w+)/)
    if (match) {
      return match[1].toLowerCase()
    }
  }
  
  // Auto-detect based on patterns
  if (detectPrismaSchema(trimmedText)) {
    return 'prisma'
  }
  
  if (detectSQL(trimmedText)) {
    return 'sql'
  }
  
  if (detectTypeScript(trimmedText)) {
    return 'typescript'
  }
  
  if (detectPython(trimmedText)) {
    return 'python'
  }
  
  return null
}

// Extract code blocks from text
export function extractCodeBlocks(text: string): CodeBlock[] {
  const codeBlocks: CodeBlock[] = []
  
  // Find fenced code blocks
  const fencedRegex = /```(\w*)\n([\s\S]*?)```/g
  let match
  
  while ((match = fencedRegex.exec(text)) !== null) {
    const language = match[1] || detectCodeLanguage(match[2]) || 'plaintext'
    codeBlocks.push({
      language,
      code: match[2].trim(),
      startIndex: match.index,
      endIndex: match.index + match[0].length
    })
  }
  
  // Find inline code blocks that might be Prisma schemas
  const inlineRegex = /(?:^|\n)((?:model|enum|datasource|generator)\s+\w+\s*{[\s\S]*?})/gm
  
  while ((match = inlineRegex.exec(text)) !== null) {
    // Skip if already part of a fenced block
    const isInFenced = codeBlocks.some(
      block => match.index >= block.startIndex && match.index <= block.endIndex
    )
    
    if (!isInFenced) {
      codeBlocks.push({
        language: 'prisma',
        code: match[1].trim(),
        startIndex: match.index,
        endIndex: match.index + match[0].length
      })
    }
  }
  
  return codeBlocks
}

// Format code block for display
export function formatCodeBlock(code: string, language: string): string {
  // Add language-specific formatting hints
  if (language === 'prisma') {
    return `\`\`\`prisma\n${code}\n\`\`\``
  }
  
  return `\`\`\`${language}\n${code}\n\`\`\``
}

// Get syntax highlighting class for a language
export function getHighlightClass(language: string): string {
  const languageMap: Record<string, string> = {
    prisma: 'language-prisma',
    sql: 'language-sql',
    typescript: 'language-typescript',
    javascript: 'language-javascript',
    python: 'language-python',
    ts: 'language-typescript',
    js: 'language-javascript',
    py: 'language-python'
  }
  
  return languageMap[language.toLowerCase()] || `language-${language}`
}