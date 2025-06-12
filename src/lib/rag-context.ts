'use client'

import { DocumentChunk } from './rag-processor'

export interface RAGContextItem {
  id: string
  chunks: DocumentChunk[]
  source: string
  addedAt: Date
  isActive: boolean
  summary: string
}

export interface RAGContextState {
  items: RAGContextItem[]
  totalChunks: number
  totalTokens: number
  isEnabled: boolean
}

class RAGContextManager {
  private listeners: ((state: RAGContextState) => void)[] = []
  private state: RAGContextState = {
    items: [],
    totalChunks: 0,
    totalTokens: 0,
    isEnabled: true
  }

  subscribe(listener: (state: RAGContextState) => void) {
    this.listeners.push(listener)
    listener(this.state) // Send current state immediately
    
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notify() {
    this.listeners.forEach(listener => listener(this.state))
  }

  private updateStats() {
    this.state.totalChunks = this.state.items
      .filter(item => item.isActive)
      .reduce((acc, item) => acc + item.chunks.length, 0)
    
    this.state.totalTokens = this.state.items
      .filter(item => item.isActive)
      .reduce((acc, item) => 
        acc + item.chunks.reduce((chunkAcc, chunk) => 
          chunkAcc + this.estimateTokens(chunk.content), 0), 0)
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  addContext(chunks: DocumentChunk[], source: string): string {
    const contextId = `context_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const summary = this.generateContextSummary(chunks, source)
    
    const contextItem: RAGContextItem = {
      id: contextId,
      chunks,
      source,
      addedAt: new Date(),
      isActive: true,
      summary
    }

    this.state.items.push(contextItem)
    this.updateStats()
    this.notify()

    console.log('🧠 [RAG Context] Added context:', {
      id: contextId,
      chunks: chunks.length,
      source,
      summary: summary.substring(0, 100) + '...'
    })

    return contextId
  }

  removeContext(contextId: string) {
    this.state.items = this.state.items.filter(item => item.id !== contextId)
    this.updateStats()
    this.notify()

    console.log('🧠 [RAG Context] Removed context:', contextId)
  }

  toggleContext(contextId: string) {
    const item = this.state.items.find(item => item.id === contextId)
    if (item) {
      item.isActive = !item.isActive
      this.updateStats()
      this.notify()

      console.log('🧠 [RAG Context] Toggled context:', {
        id: contextId,
        isActive: item.isActive
      })
    }
  }

  clearAllContext() {
    this.state.items = []
    this.updateStats()
    this.notify()

    console.log('🧠 [RAG Context] Cleared all context')
  }

  toggleEnabled() {
    this.state.isEnabled = !this.state.isEnabled
    this.notify()

    console.log('🧠 [RAG Context] Toggled enabled:', this.state.isEnabled)
  }

  getActiveContext(): RAGContextItem[] {
    return this.state.items.filter(item => item.isActive && this.state.isEnabled)
  }

  getContextForPrompt(): string {
    if (!this.state.isEnabled) return ''

    const activeItems = this.getActiveContext()
    if (activeItems.length === 0) return ''

    let contextText = '## Document Context\n\n'
    contextText += 'The following information is provided as additional context for your response:\n\n'

    activeItems.forEach((item, index) => {
      contextText += `### Context ${index + 1}: ${item.source}\n`
      contextText += `Added: ${item.addedAt.toLocaleString()}\n`
      contextText += `Summary: ${item.summary}\n\n`

      item.chunks.forEach((chunk, chunkIndex) => {
        contextText += `#### Chunk ${chunkIndex + 1} (${chunk.type})\n`
        if (chunk.metadata.page) {
          contextText += `*Page ${chunk.metadata.page}*\n`
        }
        contextText += `${chunk.content}\n\n`
      })

      contextText += '---\n\n'
    })

    contextText += 'Please consider this context when responding, but focus primarily on the user\'s question. Reference the context when relevant.\n\n'

    return contextText
  }

  private generateContextSummary(chunks: DocumentChunk[], source: string): string {
    if (chunks.length === 0) return 'Empty context'

    const chunkTypes = [...new Set(chunks.map(c => c.type))]
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.content.length, 0)
    
    // Generate a brief summary from first chunk
    const firstChunk = chunks[0]
    const preview = firstChunk.content.substring(0, 150).trim()
    
    return `${chunks.length} chunk${chunks.length !== 1 ? 's' : ''} (${chunkTypes.join(', ')}) from ${source}. ${preview}${totalLength > 150 ? '...' : ''}`
  }

  getState(): RAGContextState {
    return { ...this.state }
  }

  // For debugging
  getDebugInfo() {
    return {
      totalItems: this.state.items.length,
      activeItems: this.state.items.filter(item => item.isActive).length,
      totalChunks: this.state.totalChunks,
      totalTokens: this.state.totalTokens,
      isEnabled: this.state.isEnabled,
      contextLength: this.getContextForPrompt().length
    }
  }
}

export const ragContextManager = new RAGContextManager()

// Hook for React components
export function useRAGContext() {
  const [state, setState] = React.useState<RAGContextState>(() => ragContextManager.getState())

  React.useEffect(() => {
    return ragContextManager.subscribe(setState)
  }, [])

  return {
    state,
    addContext: ragContextManager.addContext.bind(ragContextManager),
    removeContext: ragContextManager.removeContext.bind(ragContextManager),
    toggleContext: ragContextManager.toggleContext.bind(ragContextManager),
    clearAllContext: ragContextManager.clearAllContext.bind(ragContextManager),
    toggleEnabled: ragContextManager.toggleEnabled.bind(ragContextManager),
    getActiveContext: ragContextManager.getActiveContext.bind(ragContextManager),
    getContextForPrompt: ragContextManager.getContextForPrompt.bind(ragContextManager)
  }
}

// Import React for the hook
import React from 'react'