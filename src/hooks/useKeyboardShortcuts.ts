import { useEffect, useCallback, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  handler: () => void
  description?: string
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const shortcutRefs = useRef(shortcuts)
  shortcutRefs.current = shortcuts

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in an input, textarea, or contenteditable
    const target = event.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return
    }

    for (const shortcut of shortcutRefs.current) {
      // Check if all modifier keys match
      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey
      const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey

      // Check if the key matches (case-insensitive)
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase()

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        event.preventDefault()
        event.stopPropagation()
        shortcut.handler()
        break
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}

// Common keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  SEARCH: {
    key: 'k',
    metaKey: true,
    description: 'Open search'
  },
  NEW_CHAT: {
    key: 'o',
    metaKey: true,
    shiftKey: true,
    description: 'Create new chat'
  },
  TOGGLE_SIDEBAR: {
    key: 'b',
    metaKey: true,
    description: 'Toggle sidebar'
  },
  FOCUS_INPUT: {
    key: '/',
    description: 'Focus message input'
  },
  ESCAPE: {
    key: 'Escape',
    description: 'Close modals/dialogs'
  }
}

// Hook for global keyboard shortcuts
export function useGlobalKeyboardShortcuts() {
  const shortcuts: KeyboardShortcut[] = []
  
  return {
    shortcuts,
    registerShortcut: (shortcut: KeyboardShortcut) => {
      shortcuts.push(shortcut)
    },
    unregisterShortcut: (key: string) => {
      const index = shortcuts.findIndex(s => s.key === key)
      if (index !== -1) {
        shortcuts.splice(index, 1)
      }
    }
  }
}