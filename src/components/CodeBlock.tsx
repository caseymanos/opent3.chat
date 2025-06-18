'use client'

import React, { memo, useState, useCallback } from 'react'
import { Highlight, themes } from 'prism-react-renderer'
import { detectCodeLanguage, getHighlightClass } from '@/lib/code-detection'

// Extend Prism to support Prisma syntax
if (typeof window !== 'undefined' && (window as any).Prism) {
  (window as any).Prism.languages.prisma = {
    comment: {
      pattern: /\/\/.*|\/\*[\s\S]*?\*\//,
      greedy: true
    },
    string: {
      pattern: /"(?:[^"\\]|\\.)*"/,
      greedy: true
    },
    keyword: /\b(?:datasource|generator|model|enum|type)\b/,
    'type-class-name': /\b[A-Z]\w*\b/,
    'builtin': /\b(?:String|Boolean|Int|BigInt|Float|Decimal|DateTime|Json|Bytes)\b/,
    'annotation': {
      pattern: /@\w+/,
      alias: 'decorator'
    },
    'property': /\b\w+(?=\s*:)/,
    'punctuation': /[{}[\];(),.:]/,
    'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
    'boolean': /\b(?:true|false)\b/,
    'number': /\b\d+(?:\.\d+)?\b/,
    'function': /\b(?:uuid|cuid|now|autoincrement|dbgenerated)\b/
  }
}

interface CodeBlockProps {
  code: string
  language?: string
  className?: string
  showLineNumbers?: boolean
}

const CodeBlock = memo(({ 
  code, 
  language: providedLanguage, 
  className = '',
  showLineNumbers = true 
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false)
  
  // Auto-detect language if not provided
  const language = providedLanguage || detectCodeLanguage(code) || 'plaintext'
  
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])
  
  // Map language names to Prism language keys
  const languageMap: Record<string, string> = {
    typescript: 'tsx',
    javascript: 'jsx',
    prisma: 'prisma',
    sql: 'sql',
    python: 'python',
    json: 'json',
    bash: 'bash',
    shell: 'bash'
  }
  
  const prismLanguage = languageMap[language.toLowerCase()] || language

  return (
    <div className={`relative group ${className}`}>
      <div className="flex items-center justify-between bg-slate-800 dark:bg-slate-900 px-4 py-2 rounded-t-lg">
        <span className="text-xs text-slate-400 font-mono">{language}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-all px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100 rounded flex items-center gap-1"
        >
          {copied ? (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      
      <Highlight
        theme={themes.nightOwl}
        code={code.trim()}
        language={prismLanguage}
      >
        {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre 
            className={`${highlightClassName} !bg-slate-900 !text-slate-100 overflow-x-auto rounded-b-lg p-4 text-sm`}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {showLineNumbers && (
                  <span className="inline-block w-8 text-slate-500 select-none pr-4">
                    {i + 1}
                  </span>
                )}
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      
      {/* Language badge for Prisma */}
      {language === 'prisma' && (
        <div className="absolute top-2 right-16 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded">
            Prisma Schema
          </span>
        </div>
      )}
    </div>
  )
})

CodeBlock.displayName = 'CodeBlock'

export default CodeBlock