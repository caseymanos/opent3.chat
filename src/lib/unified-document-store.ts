'use client'

import { unifiedRAG, type ProcessedDocument, type RAGResponse } from './unified-rag'
import * as React from 'react'

interface DocumentStoreState {
  documents: ProcessedDocument[]
  isRAGEnabled: boolean
  isProcessing: boolean
  lastError: string | null
  stats: {
    documentCount: number
    totalChunks: number
    totalSize: number
    avgChunksPerDoc: number
  }
}

class UnifiedDocumentStore {
  private listeners: Set<(state: DocumentStoreState) => void> = new Set()
  private state: DocumentStoreState = {
    documents: [],
    isRAGEnabled: true,
    isProcessing: false,
    lastError: null,
    stats: {
      documentCount: 0,
      totalChunks: 0,
      totalSize: 0,
      avgChunksPerDoc: 0
    }
  }

  // Subscribe to state changes
  subscribe(listener: (state: DocumentStoreState) => void): () => void {
    this.listeners.add(listener)
    listener(this.state) // Send initial state
    
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    const currentState = { ...this.state }
    this.listeners.forEach(listener => listener(currentState))
  }

  private updateStats() {
    this.state.stats = unifiedRAG.getStats()
  }

  async addDocument(file: File): Promise<ProcessedDocument> {
    console.log('📁 [DocumentStore] Adding document:', file.name)
    
    this.state.isProcessing = true
    this.state.lastError = null
    this.notify()

    try {
      // Process document locally for immediate UI feedback
      const document = await unifiedRAG.processFile(file)
      
      // Update local state
      this.state.documents = [...this.state.documents, document]
      this.updateStats()
      this.notify()

      // Sync with server for chat API access
      try {
        await this.syncDocumentToServer(file, document)
        console.log('✅ [DocumentStore] Document synced to server')
      } catch (syncError) {
        console.warn('⚠️ [DocumentStore] Failed to sync to server:', syncError)
        // Continue anyway - document is available locally
      }

      this.state.isProcessing = false
      this.notify()

      console.log('✅ [DocumentStore] Document added successfully:', document.filename)
      return document
    } catch (error) {
      console.error('❌ [DocumentStore] Failed to add document:', error)
      this.state.lastError = error instanceof Error ? error.message : 'Unknown error'
      this.state.isProcessing = false
      this.notify()
      throw error
    }
  }

  private async syncDocumentToServer(file: File, document: ProcessedDocument): Promise<void> {
    // For server sync, send the processed document content instead of raw file
    const response = await fetch('/api/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'store_processed',
        document: {
          id: document.id,
          filename: document.filename,
          content: document.content,
          chunks: document.chunks,
          summary: document.summary,
          uploadedAt: document.uploadedAt,
          fileSize: document.fileSize,
          fileType: document.fileType
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Server sync failed: ${response.statusText} - ${errorText}`)
    }
  }

  removeDocument(id: string): boolean {
    console.log('🗑️ [DocumentStore] Removing document:', id)
    
    const success = unifiedRAG.removeDocument(id)
    if (success) {
      this.state.documents = this.state.documents.filter(d => d.id !== id)
      this.updateStats()
      this.notify()
      
      // Sync with server
      fetch('/api/rag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', documentId: id })
      }).catch(error => console.warn('Failed to sync delete to server:', error))
    }
    return success
  }

  clearAllDocuments(): void {
    console.log('🗑️ [DocumentStore] Clearing all documents')
    
    unifiedRAG.clearAllDocuments()
    this.state.documents = []
    this.updateStats()
    this.notify()
    
    // Sync with server
    fetch('/api/rag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear' })
    }).catch(error => console.warn('Failed to sync clear to server:', error))
  }

  toggleRAG(enabled?: boolean): void {
    this.state.isRAGEnabled = enabled ?? !this.state.isRAGEnabled
    console.log('🧠 [DocumentStore] RAG', this.state.isRAGEnabled ? 'enabled' : 'disabled')
    this.notify()
  }

  clearError(): void {
    this.state.lastError = null
    this.notify()
  }

  // Enhanced search with detailed logging
  async searchForContext(query: string): Promise<string> {
    if (!this.state.isRAGEnabled) {
      console.log('🧠 [DocumentStore] RAG disabled, skipping search')
      return ''
    }

    if (this.state.documents.length === 0) {
      console.log('🧠 [DocumentStore] No documents available for search')
      return ''
    }

    console.log(`🔍 [DocumentStore] Searching for: "${query}" across ${this.state.documents.length} documents`)

    try {
      const searchResult = await unifiedRAG.searchDocuments(query, 5)
      
      if (!searchResult.hasResults) {
        console.log('🔍 [DocumentStore] No relevant content found')
        return ''
      }

      console.log(`✅ [DocumentStore] Found ${searchResult.results.length} relevant chunks in ${searchResult.searchTime}ms`)
      
      // Log matched documents for debugging
      const matchedDocs = [...new Set(searchResult.results.map(r => r.document.filename))]
      console.log('📄 [DocumentStore] Matched documents:', matchedDocs.join(', '))

      return unifiedRAG.formatContextForAI(searchResult, query)
    } catch (error) {
      console.error('❌ [DocumentStore] Search failed:', error)
      return ''
    }
  }

  // Get search results for display (without AI formatting)
  async searchDocuments(query: string, maxResults: number = 10): Promise<RAGResponse> {
    if (!this.state.isRAGEnabled || this.state.documents.length === 0) {
      return {
        results: [],
        totalDocuments: this.state.documents.length,
        searchTime: 0,
        hasResults: false
      }
    }

    return await unifiedRAG.searchDocuments(query, maxResults)
  }

  getDocument(id: string): ProcessedDocument | undefined {
    return unifiedRAG.getDocument(id)
  }

  getState(): DocumentStoreState {
    return { ...this.state }
  }

  // Test the system with a sample query
  async testRAGSystem(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('🧪 [DocumentStore] Testing RAG system...')

    if (this.state.documents.length === 0) {
      return { 
        success: false, 
        message: 'No documents available for testing' 
      }
    }

    try {
      // Test with a simple query that should match most documents
      const testQuery = 'test document content'
      const searchResult = await this.searchDocuments(testQuery)
      
      const details = {
        documentsSearched: this.state.documents.length,
        searchTime: searchResult.searchTime,
        resultsFound: searchResult.results.length,
        ragEnabled: this.state.isRAGEnabled
      }

      if (searchResult.hasResults) {
        return {
          success: true,
          message: `RAG system working correctly. Found ${searchResult.results.length} results in ${searchResult.searchTime}ms`,
          details
        }
      } else {
        // Try with content from the first document
        const firstDoc = this.state.documents[0]
        const words = firstDoc.content.split(' ').slice(0, 3).join(' ')
        const secondTest = await this.searchDocuments(words)
        
        if (secondTest.hasResults) {
          return {
            success: true,
            message: `RAG system working. Found results with document-specific query.`,
            details: { ...details, secondTestResults: secondTest.results.length }
          }
        } else {
          return {
            success: false,
            message: 'RAG system may not be working correctly - no results found for document content',
            details
          }
        }
      }
    } catch (error) {
      return {
        success: false,
        message: `RAG test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

export const unifiedDocumentStore = new UnifiedDocumentStore()

// React hook for components
export function useUnifiedDocumentStore() {
  const [state, setState] = React.useState<DocumentStoreState>(
    unifiedDocumentStore.getState()
  )

  React.useEffect(() => {
    return unifiedDocumentStore.subscribe(setState)
  }, [])

  return {
    // State
    documents: state.documents,
    isRAGEnabled: state.isRAGEnabled,
    isProcessing: state.isProcessing,
    lastError: state.lastError,
    stats: state.stats,
    
    // Actions
    addDocument: (file: File) => unifiedDocumentStore.addDocument(file),
    removeDocument: (id: string) => unifiedDocumentStore.removeDocument(id),
    clearAllDocuments: () => unifiedDocumentStore.clearAllDocuments(),
    toggleRAG: (enabled?: boolean) => unifiedDocumentStore.toggleRAG(enabled),
    clearError: () => unifiedDocumentStore.clearError(),
    searchDocuments: (query: string, maxResults?: number) => 
      unifiedDocumentStore.searchDocuments(query, maxResults),
    testRAGSystem: () => unifiedDocumentStore.testRAGSystem(),
    getDocument: (id: string) => unifiedDocumentStore.getDocument(id)
  }
}