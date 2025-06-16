// Local storage fallback for when Supabase is not working
export class LocalStorageFallback {
  private static CONVERSATIONS_KEY = 't3-crusher-conversations'
  private static MESSAGES_KEY = 't3-crusher-messages'

  static getConversations(userId: string) {
    try {
      const stored = localStorage.getItem(this.CONVERSATIONS_KEY) || '[]'
      const conversations = JSON.parse(stored)
      return conversations.filter((c: any) => c.user_id === userId)
    } catch (e) {
      console.warn('Error reading local conversations:', e)
      return []
    }
  }

  static saveConversation(conversation: any) {
    try {
      const stored = localStorage.getItem(this.CONVERSATIONS_KEY) || '[]'
      const conversations = JSON.parse(stored)
      const exists = conversations.findIndex((c: any) => c.id === conversation.id)
      if (exists >= 0) {
        conversations[exists] = conversation
      } else {
        conversations.push(conversation)
      }
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations))
      return conversation
    } catch (e) {
      console.warn('Error saving conversation locally:', e)
      return null
    }
  }

  static deleteConversation(conversationId: string) {
    try {
      const stored = localStorage.getItem(this.CONVERSATIONS_KEY) || '[]'
      const conversations = JSON.parse(stored)
      const filtered = conversations.filter((c: any) => c.id !== conversationId)
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(filtered))
      
      // Also delete messages
      const messagesStored = localStorage.getItem(this.MESSAGES_KEY) || '[]'
      const messages = JSON.parse(messagesStored)
      const filteredMessages = messages.filter((m: any) => m.conversation_id !== conversationId)
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(filteredMessages))
      
      return true
    } catch (e) {
      console.warn('Error deleting conversation locally:', e)
      return false
    }
  }

  static clearAllConversations(userId: string) {
    try {
      const stored = localStorage.getItem(this.CONVERSATIONS_KEY) || '[]'
      const conversations = JSON.parse(stored)
      const filtered = conversations.filter((c: any) => c.user_id !== userId)
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(filtered))
      
      // Also clear messages for those conversations
      const deletedIds = conversations
        .filter((c: any) => c.user_id === userId)
        .map((c: any) => c.id)
      
      const messagesStored = localStorage.getItem(this.MESSAGES_KEY) || '[]'
      const messages = JSON.parse(messagesStored)
      const filteredMessages = messages.filter(
        (m: any) => !deletedIds.includes(m.conversation_id)
      )
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(filteredMessages))
      
      return true
    } catch (e) {
      console.warn('Error clearing conversations locally:', e)
      return false
    }
  }

  static getMessages(conversationId: string) {
    try {
      const stored = localStorage.getItem(this.MESSAGES_KEY) || '[]'
      const messages = JSON.parse(stored)
      return messages
        .filter((m: any) => m.conversation_id === conversationId)
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    } catch (e) {
      console.warn('Error reading local messages:', e)
      return []
    }
  }

  static saveMessage(message: any) {
    try {
      const stored = localStorage.getItem(this.MESSAGES_KEY) || '[]'
      const messages = JSON.parse(stored)
      messages.push(message)
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages))
      return message
    } catch (e) {
      console.warn('Error saving message locally:', e)
      return null
    }
  }
}