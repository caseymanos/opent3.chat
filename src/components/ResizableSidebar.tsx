'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface ResizableSidebarProps {
  children: React.ReactNode
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  isOpen: boolean
  onToggle: () => void
  storageKey?: string
}

export default function ResizableSidebar({
  children,
  defaultWidth = 320,
  minWidth = 240,
  maxWidth = 480,
  isOpen,
  onToggle,
  storageKey = 'sidebar-width'
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem(storageKey)
    if (savedWidth) {
      const parsedWidth = parseInt(savedWidth, 10)
      if (!isNaN(parsedWidth) && parsedWidth >= minWidth && parsedWidth <= maxWidth) {
        setWidth(parsedWidth)
      }
    }
  }, [storageKey, minWidth, maxWidth])

  // Save width to localStorage when it changes
  useEffect(() => {
    if (!isResizing) {
      localStorage.setItem(storageKey, width.toString())
    }
  }, [width, isResizing, storageKey])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }, [width])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current
      const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidthRef.current + deltaX))
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, minWidth, maxWidth])

  return (
    <>
      {/* Mobile Sidebar Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Toggle Button - Positioned above New Conversation button */}
      <button
        onClick={onToggle}
        className={cn(
          "fixed z-40",
          "w-8 h-8 rounded-full",
          "bg-white dark:bg-gray-800",
          "border-2 border-gray-200 dark:border-gray-700",
          "ring-0 hover:ring-2",
          "hover:ring-green-400/70 dark:hover:ring-green-500/70",
          "flex items-center justify-center",
          "hover:bg-gray-50 dark:hover:bg-gray-700",
          "hover:shadow-green-400/25 hover:shadow-lg",
          "transition-all duration-500 ease-in-out",
          "shadow-md",
          "transform hover:scale-105"
        )}
        style={{
          left: '16px',
          top: '10px'
        }}
        title={isOpen ? "Hide sidebar" : "Show sidebar"}
      >
        {isOpen ? (
          <ChevronLeftIcon className="w-4 h-4 text-gray-700 dark:text-gray-300 stroke-2 transition-transform duration-500" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-gray-700 dark:text-gray-300 stroke-2 transition-transform duration-500" />
        )}
      </button>

      {/* Sidebar Container */}
      <div
        ref={sidebarRef}
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-30",
          "transition-all duration-500 ease-in-out lg:transition-none",
          "border-r border-gray-200/50 dark:border-gray-700/50",
          "bg-white/80 dark:bg-gray-900/80",
          "backdrop-blur-2xl",
          "flex-shrink-0",
          "shadow-lg lg:shadow-sm",
          "flex",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{
          width: isOpen ? (isMobile ? '320px' : `${width}px`) : '0',
          minWidth: isOpen ? (isMobile ? '320px' : `${minWidth}px`) : '0'
        }}
      >
        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Resize Handle - only on desktop when open */}
        {isOpen && (
          <div
            className={cn(
              "hidden lg:block",
              "absolute top-0 right-0 w-1 h-full",
              "cursor-ew-resize",
              "group",
              "hover:bg-blue-500/20",
              "transition-colors",
              isResizing && "bg-blue-500/20"
            )}
            onMouseDown={handleMouseDown}
          >
            <div
              className={cn(
                "absolute inset-y-0 -left-1 -right-1",
                "group-hover:bg-blue-500/10",
                isResizing && "bg-blue-500/10"
              )}
            />
          </div>
        )}
      </div>
    </>
  )
}