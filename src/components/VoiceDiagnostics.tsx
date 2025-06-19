'use client'

import { useState, useEffect } from 'react'
import { Button } from './ui/Button'
import { voiceIntegration } from '@/lib/voice-integration'
import { logger } from '@/lib/logger'

export default function VoiceDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<Record<string, any>>({})
  const [isRunning, setIsRunning] = useState(false)

  const runDiagnostics = async () => {
    setIsRunning(true)
    const results: Record<string, any> = {}

    // 1. Check browser support
    results.browserSupport = {
      hasSpeechRecognition: !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition),
      browser: navigator.userAgent.substring(0, 100),
      platform: navigator.platform
    }

    // 2. Check network
    results.network = {
      online: navigator.onLine,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      port: window.location.port || 'default'
    }

    // 3. Check microphone permissions
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(track => track.stop())
      results.microphone = {
        status: 'granted',
        devices: await navigator.mediaDevices.enumerateDevices()
          .then(devices => devices.filter(d => d.kind === 'audioinput').length)
      }
    } catch (error) {
      results.microphone = {
        status: 'denied',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

    // 4. Test speech recognition
    try {
      const testResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          voiceIntegration.stopListening()
          reject(new Error('Timeout - Chrome may be unable to reach Google speech servers'))
        }, 5000)
        
        voiceIntegration.startListening(
          (result) => {
            clearTimeout(timeout)
            voiceIntegration.stopListening()
            resolve({ success: true, result })
          },
          (error) => {
            clearTimeout(timeout)
            reject(new Error(error))
          },
          { continuous: false, interimResults: false }
        ).catch(reject)
      })
      
      results.speechRecognition = testResult
    } catch (error) {
      results.speechRecognition = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        possibleCauses: [
          'Chrome cannot reach Google speech servers',
          'Firewall or network security blocking connection',
          'VPN or proxy interference',
          'macOS network permissions for Chrome'
        ]
      }
    }
    
    // 5. Test Google connectivity
    results.googleConnectivity = {
      canReachGoogle: false,
      canReachSpeechAPI: false
    }
    
    try {
      // Test basic Google connectivity
      const googleTest = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors'
      })
      results.googleConnectivity.canReachGoogle = true
    } catch (e) {
      results.googleConnectivity.canReachGoogle = false
    }
    
    // Test if we can make a test request (this will fail with CORS but that's expected)
    try {
      await fetch('https://speech.googleapis.com/v1/speech:recognize', {
        method: 'POST',
        mode: 'no-cors'
      })
      results.googleConnectivity.canReachSpeechAPI = true
    } catch (e) {
      // Expected to fail with CORS, but if we get here it means we could at least attempt the connection
      results.googleConnectivity.canReachSpeechAPI = true
    }

    // 5. Check for common issues
    results.commonIssues = []
    if (results.network.protocol === 'https:' && results.network.hostname === 'localhost') {
      results.commonIssues.push('Using HTTPS with localhost may cause issues')
    }
    if (!results.network.online) {
      results.commonIssues.push('No internet connection detected')
    }
    if (results.network.protocol === 'file:') {
      results.commonIssues.push('Cannot use file:// protocol')
    }

    setDiagnostics(results)
    setIsRunning(false)
    
    // Log results
    logger.info('Voice diagnostics completed', results)
  }

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-4">
      <h3 className="text-lg font-semibold">Voice Input Diagnostics</h3>
      
      <Button onClick={runDiagnostics} disabled={isRunning}>
        {isRunning ? 'Running diagnostics...' : 'Run Diagnostics'}
      </Button>

      {Object.keys(diagnostics).length > 0 && (
        <div className="space-y-3 text-sm">
          <div className="p-3 bg-white dark:bg-gray-800 rounded">
            <h4 className="font-medium mb-2">Browser Support</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(diagnostics.browserSupport, null, 2)}
            </pre>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded">
            <h4 className="font-medium mb-2">Network</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(diagnostics.network, null, 2)}
            </pre>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded">
            <h4 className="font-medium mb-2">Microphone</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(diagnostics.microphone, null, 2)}
            </pre>
          </div>

          <div className="p-3 bg-white dark:bg-gray-800 rounded">
            <h4 className="font-medium mb-2">Speech Recognition Test</h4>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(diagnostics.speechRecognition, null, 2)}
            </pre>
          </div>

          {diagnostics.googleConnectivity && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded">
              <h4 className="font-medium mb-2">Google Connectivity</h4>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(diagnostics.googleConnectivity, null, 2)}
              </pre>
            </div>
          )}

          {diagnostics.commonIssues?.length > 0 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
              <h4 className="font-medium mb-2 text-yellow-800 dark:text-yellow-200">Common Issues Found</h4>
              <ul className="list-disc list-inside text-yellow-700 dark:text-yellow-300">
                {diagnostics.commonIssues.map((issue: string, i: number) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}