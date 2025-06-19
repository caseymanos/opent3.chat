'use client'

import { useState } from 'react'
import { Button } from './ui/Button'

export default function SpeechWorkaround() {
  const [isOpen, setIsOpen] = useState(true)
  
  if (!isOpen) return null
  
  return (
    <div className="fixed bottom-20 right-4 max-w-md bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/50 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
            {navigator.userAgent.includes('Arc/') 
              ? 'Arc Browser: Speech Recognition Not Supported'
              : 'Speech Recognition Network Issue Detected'
            }
          </h3>
          
          <div className="text-sm text-orange-700 dark:text-orange-300 space-y-2">
            {navigator.userAgent.includes('Arc/') ? (
              <>
                <p>Arc browser, like other Chromium-based browsers (except Google Chrome), doesn't have access to Google's speech recognition servers.</p>
                
                <p className="font-medium mt-2">This is a known limitation because:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Google's speech API is a paid service that only Chrome gets free access to</li>
                  <li>Arc cannot use the same backend infrastructure as Chrome</li>
                  <li>Web Speech API requires specific Google server connections</li>
                </ul>
              </>
            ) : (
              <>
                <p>Chrome cannot establish a speech connection despite reaching Google servers. This is commonly caused by:</p>
                
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>WebRTC being blocked by firewall/security software</li>
                  <li>Corporate network policies</li>
                  <li>Browser security extensions</li>
                </ul>
              </>
            )}
            
            <div className="mt-3 font-medium">Solutions:</div>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              {navigator.userAgent.includes('Arc/') ? (
                <>
                  <li>
                    <strong>Use Google Chrome:</strong> The only Chromium browser with speech recognition
                  </li>
                  <li>
                    <strong>Use Safari:</strong> Works with Apple's on-device speech engine
                  </li>
                  <li>
                    <strong>Use keyboard input:</strong> Type your messages instead
                  </li>
                  <li>
                    <strong>Try Wispr Flow:</strong> Third-party extension for Arc speech-to-text
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <strong>Try Incognito Mode:</strong> Cmd+Shift+N 
                    <span className="text-xs">(bypasses extensions)</span>
                  </li>
                  <li>
                    <strong>Use Safari:</strong> Works offline with Apple's speech engine
                  </li>
                  <li>
                    <strong>Check Little Snitch/Firewall:</strong> Allow Chrome UDP connections
                  </li>
                  <li>
                    <strong>Test with Personal Hotspot:</strong> Rule out network restrictions
                  </li>
                </>
              )}
            </ol>
            
            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <p className="text-xs">
                <strong>Technical:</strong> Chrome uses WebRTC for speech, which requires UDP ports 19302-19309 
                for STUN/TURN servers. These are often blocked on corporate networks.
              </p>
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsOpen(false)}
          className="flex-shrink-0 text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-200"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}