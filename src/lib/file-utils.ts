// Utility functions for handling file attachments with AI SDK

export interface FileAttachment {
  name: string
  type: string
  data: ArrayBuffer | string
}

export async function processFileForAI(file: File): Promise<FileAttachment> {
  if (file.type.startsWith('image/')) {
    // For images, convert to base64
    const arrayBuffer = await file.arrayBuffer()
    return {
      name: file.name,
      type: file.type,
      data: arrayBuffer
    }
  } else if (file.type === 'application/pdf' || file.type.startsWith('text/') || file.name.endsWith('.md')) {
    // For text-based files, convert to text
    try {
      const text = await file.text()
      return {
        name: file.name,
        type: file.type,
        data: text
      }
    } catch (error) {
      console.error('Error reading text file:', error)
      throw new Error(`Could not read file: ${file.name}`)
    }
  } else {
    throw new Error(`Unsupported file type: ${file.type}`)
  }
}

export function createAIMessage(content: string, fileAttachments: FileAttachment[] = []) {
  const message: any = {
    role: 'user',
    content: [
      {
        type: 'text',
        text: content
      }
    ]
  }

  // Add file attachments
  for (const attachment of fileAttachments) {
    if (attachment.type.startsWith('image/')) {
      // Image attachment
      message.content.push({
        type: 'image',
        image: attachment.data // ArrayBuffer for images
      })
    } else {
      // Text-based file attachment
      message.content.push({
        type: 'text',
        text: `\n\n[File: ${attachment.name}]\n${attachment.data}`
      })
    }
  }

  // If only text content, simplify the message
  if (message.content.length === 1 && message.content[0].type === 'text') {
    message.content = message.content[0].text
  }

  return message
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}