import { simpleRAG, type SimpleDocument } from './simple-rag'

interface DocumentStoreState {
  documents: SimpleDocument[]
  isRAGEnabled: boolean
}

class DocumentStore {
  private listeners: Set<(state: DocumentStoreState) => void> = new Set()
  private state: DocumentStoreState = {
    documents: [],
    isRAGEnabled: true
  }

  // Subscribe to state changes
  subscribe(listener: (state: DocumentStoreState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state) // Initial state
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const currentState = { ...this.state }
    this.listeners.forEach(listener => listener(currentState))
  }

  async addDocument(file: File): Promise<void> {
    try {
      const doc = await simpleRAG.processDocument(file)
      this.state.documents = [...this.state.documents, doc]
      this.notify()
    } catch (error) {
      console.error('Failed to add document:', error)
      throw error
    }
  }

  removeDocument(id: string): void {
    simpleRAG.removeDocument(id)
    this.state.documents = this.state.documents.filter(d => d.id !== id)
    this.notify()
  }

  clearAllDocuments(): void {
    simpleRAG.clearAllDocuments()
    this.state.documents = []
    this.notify()
  }

  toggleRAG(enabled?: boolean): void {
    this.state.isRAGEnabled = enabled ?? !this.state.isRAGEnabled
    this.notify()
  }

  async searchForContext(query: string): Promise<string> {
    if (!this.state.isRAGEnabled || this.state.documents.length === 0) {
      return ''
    }

    const results = await simpleRAG.searchDocuments(query, 3)
    
    if (results.length === 0) {
      return ''
    }

    // Format context for AI
    const context = results
      .map(result => {
        return `From "${result.document.filename}":\n${result.chunk.content}`
      })
      .join('\n\n---\n\n')

    return `Based on the following context from uploaded documents:\n\n${context}\n\nNow, please answer the following question:`
  }

  getState(): DocumentStoreState {
    return { ...this.state }
  }
}

export const documentStore = new DocumentStore()

// React hook for easy integration
export function useDocumentStore() {
  const [state, setState] = React.useState<DocumentStoreState>(documentStore.getState())

  React.useEffect(() => {
    return documentStore.subscribe(setState)
  }, [])

  return {
    documents: state.documents,
    isRAGEnabled: state.isRAGEnabled,
    addDocument: (file: File) => documentStore.addDocument(file),
    removeDocument: (id: string) => documentStore.removeDocument(id),
    clearAllDocuments: () => documentStore.clearAllDocuments(),
    toggleRAG: (enabled?: boolean) => documentStore.toggleRAG(enabled)
  }
}

// Add React import
import * as React from 'react'