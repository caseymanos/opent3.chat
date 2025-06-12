# RAG Integration Documentation

This document describes the functional RAG (Retrieval-Augmented Generation) integration implemented in the T3 Crusher chat application.

## Overview

The RAG system allows users to upload documents, process them into semantic chunks, search through the content, and add relevant context to their AI conversations. This provides the AI with additional knowledge to answer questions more accurately.

## Architecture

### Core Components

1. **RAG Context Manager** (`src/lib/rag-context.ts`)
   - Manages active context chunks
   - Tracks context state and statistics
   - Provides React hooks for UI integration

2. **RAG Processor** (`src/lib/rag-processor.ts`)
   - Processes documents with visual layout analysis
   - Performs intelligent chunking based on document structure
   - Implements semantic search with relevance scoring

3. **Visual RAG Interface** (`src/components/VisualRAGInterface.tsx`)
   - Document upload and processing UI
   - Chunk visualization and management
   - Search interface with advanced options

4. **RAG Context Viewer** (`src/components/RAGContextViewer.tsx`)
   - Shows active context chunks
   - Allows toggling and removing context
   - Displays context statistics

5. **Quick RAG Search** (`src/components/QuickRAGSearch.tsx`)
   - Inline search functionality (Ctrl+/)
   - Quick context addition from search results
   - Modal interface for document search

### AI Integration

The RAG context is automatically injected into AI conversations through:

1. **API Route Enhancement** (`src/app/api/chat/route.ts`)
   - Receives RAG context in request body
   - Inserts context as system message before user queries
   - Supports both OpenAI and Anthropic models

2. **AI Hook Integration** (`src/lib/ai.ts`)
   - Enhanced useAIChat hook with RAG context support
   - Automatic context forwarding to API

## Features

### Document Processing

- **Supported Formats**: PDF, TXT, Markdown, DOCX
- **Visual Layout Analysis**: Extracts text position, font size, hierarchy
- **Intelligent Chunking**: Groups content by semantic structure
- **Real PDF Processing**: Uses PDF.js for accurate text extraction

### Search & Retrieval

- **Hybrid Search**: Combines semantic and keyword-based matching
- **Relevance Scoring**: Multiple factors including position, type, and content similarity
- **Configurable Options**: Similarity threshold, max results, ranking strategy
- **Context-Aware**: Considers document hierarchy and relationships

### Context Management

- **Active Context Tracking**: Shows which chunks are currently active
- **Token Estimation**: Calculates approximate token usage
- **Context Toggling**: Enable/disable individual context items
- **Batch Operations**: Add multiple chunks or clear all context

### User Experience

- **Real-time Updates**: Context state updates across components
- **Visual Indicators**: Shows active context and chunk counts
- **Keyboard Shortcuts**: Ctrl+/ for quick search
- **Responsive Design**: Works across different screen sizes

## Usage Guide

### 1. Upload Documents

1. Click the "🧠 RAG" tab in the chat interface
2. Upload documents using the file picker
3. Wait for processing to complete
4. View chunks and document structure

### 2. Add Context to Chat

**Method 1: From RAG Interface**
1. Browse processed chunks
2. Select relevant chunks
3. Click "Add to Context"

**Method 2: Quick Search**
1. Press Ctrl+/ or click "Search docs" button
2. Enter search query
3. Add individual chunks or all results

**Method 3: Search Interface**
1. Use the search tab in RAG interface
2. Configure search options
3. Add results to context

### 3. Manage Active Context

1. View active context in the input area
2. Toggle individual context items on/off
3. Remove unwanted context
4. Clear all context when needed

### 4. Chat with Context

1. Context is automatically included in AI requests
2. AI responses consider the provided context
3. No additional user action required

## Configuration

### Search Configuration

```typescript
const searchConfig = {
  maxChunks: 5,                    // Max results to return
  similarityThreshold: 0.3,        // Minimum relevance score
  rankingStrategy: 'hybrid',       // 'semantic' | 'keyword' | 'hybrid'
  includeContext: true             // Include surrounding chunks
}
```

### Chunking Options

```typescript
const options = {
  chunkingStrategy: 'hybrid',      // 'semantic' | 'layout' | 'hybrid'
  maxChunkSize: 1000,              // Maximum tokens per chunk
  preserveFormatting: true,        // Maintain document structure
  extractImages: true              // Process image content
}
```

## API Integration

### Environment Variables

Set up your AI provider API keys:

```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### Request Format

The enhanced chat API accepts RAG context:

```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [...],
    conversationId: 'uuid',
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    ragContext: 'Document context here...' // RAG context
  })
})
```

## Technical Details

### Context Injection

RAG context is injected as a system message before the user's query:

```typescript
const contextMessage = {
  role: 'system',
  content: `## Document Context

The following information is provided as additional context:

### Context 1: document.pdf
Added: 12/10/2024, 3:45:12 PM
Summary: Technical documentation about...

#### Chunk 1 (heading)
*Page 1*
# Introduction to RAG Systems

#### Chunk 2 (text)
*Page 1*
RAG systems combine retrieval and generation...

Please consider this context when responding.`
}
```

### Chunk Metadata

Each processed chunk includes rich metadata:

```typescript
interface DocumentChunk {
  id: string
  content: string
  type: 'text' | 'heading' | 'list' | 'code' | 'table' | 'image'
  metadata: {
    page?: number
    position: { x: number; y: number; width: number; height: number }
    fontSize?: number
    hierarchy?: number
    confidence: number
    keywords: string[]
    summary: string
    embedding?: number[]
  }
  relationships: {
    before?: string
    after?: string
    contextuallyRelated: string[]
  }
}
```

## Performance Considerations

### Token Usage

- Context is automatically included in token count
- Monitor total tokens in context viewer
- Consider token limits for your chosen model

### Memory Management

- Documents are stored in browser memory
- Large documents may impact performance
- Consider chunking strategy for optimal size

### Search Performance

- Semantic search uses mock embeddings (can be enhanced)
- Keyword search is optimized for real-time use
- Results are cached for repeated queries

## Extension Points

### Custom Embeddings

Replace mock embeddings with real embedding API:

```typescript
private async generateEmbeddings(chunks: DocumentChunk[]): Promise<DocumentChunk[]> {
  // Call actual embedding API (OpenAI, Cohere, etc.)
  const embeddings = await getEmbeddings(chunks.map(c => c.content))
  // Apply embeddings to chunks
}
```

### Additional File Types

Add support for more document types:

```typescript
private async extractContentWithLayout(file: File): Promise<any> {
  if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return this.extractDocxLayout(file)
  }
  // Add more file type handlers
}
```

### Enhanced Search

Implement vector database integration:

```typescript
// Use Pinecone, Weaviate, or similar
const vectorDB = new VectorDatabase()
await vectorDB.upsert(chunks)
const results = await vectorDB.query(query, { topK: 10 })
```

## Troubleshooting

### Common Issues

1. **PDF Processing Fails**
   - Ensure PDF.js is properly loaded
   - Check browser console for errors
   - Fallback to text extraction

2. **Context Not Applied**
   - Verify RAG context is enabled
   - Check context viewer for active chunks
   - Ensure API key is configured

3. **Search Returns No Results**
   - Lower similarity threshold
   - Try different keywords
   - Check document processing status

4. **High Token Usage**
   - Reduce number of active chunks
   - Use smaller chunk sizes
   - Clear unnecessary context

### Debug Information

Use the context manager debug info:

```typescript
const { getDebugInfo } = useRAGContext()
console.log('RAG Debug:', getDebugInfo())
```

## Future Enhancements

1. **Vector Database Integration**: Replace in-memory search with persistent vector storage
2. **Real Embedding APIs**: Integrate with OpenAI, Cohere, or HuggingFace embeddings
3. **Advanced Chunking**: Implement more sophisticated document parsing
4. **Multi-modal Support**: Process images and tables with vision models
5. **Collaboration**: Share processed documents across team members
6. **Analytics**: Track context usage and effectiveness metrics

## Contributing

To extend the RAG system:

1. Follow the existing component structure
2. Add proper TypeScript types
3. Include error handling and logging
4. Update this documentation
5. Add tests for new functionality

The RAG integration is designed to be modular and extensible, allowing for easy enhancement and customization based on specific use cases.