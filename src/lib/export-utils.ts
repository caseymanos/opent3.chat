export interface DownloadOptions {
  filename: string
  content: string
  mimeType: string
}

export interface ClipboardResult {
  success: boolean
  message?: string
}

export class ExportUtils {
  /**
   * Downloads a file to the user's device
   */
  static downloadFile(options: DownloadOptions): void {
    const { filename, content, mimeType } = options
    
    // Create blob from content
    const blob = new Blob([content], { type: mimeType })
    
    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Copies text to clipboard with fallback for older browsers
   */
  static async copyToClipboard(text: string): Promise<ClipboardResult> {
    try {
      // Modern clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
        return {
          success: true,
          message: 'Copied to clipboard!'
        }
      }
      
      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        return {
          success: true,
          message: 'Copied to clipboard!'
        }
      } else {
        throw new Error('Copy command failed')
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      return {
        success: false,
        message: 'Failed to copy to clipboard. Please try again.'
      }
    }
  }

  /**
   * Generates a descriptive filename with timestamp
   */
  static generateFilename(prefix: string, extension: string): string {
    const now = new Date()
    const timestamp = now.toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, -5) // Remove milliseconds and Z
    
    return `${prefix}_${timestamp}.${extension}`
  }

  /**
   * Shows a temporary success/error notification
   */
  static showNotification(
    message: string, 
    type: 'success' | 'error' = 'success',
    duration: number = 3000
  ): void {
    // Create notification element
    const notification = document.createElement('div')
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transform transition-all duration-300 ${
      type === 'success' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`
    notification.textContent = message
    notification.style.transform = 'translateY(100px)'
    
    // Add to DOM
    document.body.appendChild(notification)
    
    // Animate in
    requestAnimationFrame(() => {
      notification.style.transform = 'translateY(0)'
    })
    
    // Remove after duration
    setTimeout(() => {
      notification.style.transform = 'translateY(100px)'
      setTimeout(() => {
        document.body.removeChild(notification)
      }, 300)
    }, duration)
  }

  /**
   * Formats file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Gets export format instructions
   */
  static getFormatInstructions(format: string): string {
    const instructions: Record<string, string> = {
      json: 'JSON format preserves all task data and metadata. Ideal for backup and programmatic use.',
      markdown: 'Markdown format creates a readable task list. Perfect for GitHub, documentation, or note-taking apps.',
      csv: 'Universal CSV format works with Excel, Google Sheets, and most task management tools.',
      notion_csv: 'Optimized for Notion import. Use "Import → CSV" in Notion to create a tasks database.',
      linear_csv: 'Formatted for Linear import. Use Linear\'s CSV import feature to create issues.'
    }
    
    return instructions[format] || 'Export your tasks in the selected format.'
  }

  /**
   * Validates export data before processing
   */
  static validateExportData(data: any): boolean {
    if (!data || typeof data !== 'object') return false
    if (!Array.isArray(data.tasks)) return false
    if (data.tasks.length === 0) return false
    
    // Check if tasks have required fields
    return data.tasks.every((task: any) => 
      task.title && 
      task.description && 
      task.priority && 
      task.category
    )
  }

  /**
   * Gets a summary of export content
   */
  static getExportSummary(taskCount: number, format: string): string {
    const formatName = {
      json: 'JSON',
      markdown: 'Markdown',
      csv: 'CSV',
      notion_csv: 'Notion CSV',
      linear_csv: 'Linear CSV'
    }[format] || format

    return `Exporting ${taskCount} task${taskCount !== 1 ? 's' : ''} as ${formatName}`
  }

  /**
   * Checks if the browser supports clipboard API
   */
  static hasClipboardSupport(): boolean {
    return !!(navigator.clipboard && window.isSecureContext)
  }

  /**
   * Sanitizes filename to remove invalid characters
   */
  static sanitizeFilename(filename: string): string {
    // Remove or replace invalid filename characters
    return filename
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '_')
      .substring(0, 255) // Limit length
  }
}