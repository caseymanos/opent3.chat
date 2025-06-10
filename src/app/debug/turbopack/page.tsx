'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

export default function TurbopackDebugPage() {
  const [buildInfo, setBuildInfo] = useState<any>(null)
  const [hmrStatus, setHmrStatus] = useState('Unknown')

  useEffect(() => {
    // Check if we're running with Turbopack
    const isTurbopack = process.env.NODE_ENV === 'development' && 
                       typeof window !== 'undefined' && 
                       (window as any).__TURBOPACK__

    setBuildInfo({
      isTurbopack: !!isTurbopack,
      nodeEnv: process.env.NODE_ENV,
      nextVersion: process.env.NEXT_RUNTIME || 'unknown',
      timestamp: new Date().toISOString()
    })

    // Monitor HMR status
    if (typeof window !== 'undefined' && (window as any).webpackHotUpdate) {
      setHmrStatus('Webpack HMR Active')
    } else if (isTurbopack) {
      setHmrStatus('Turbopack HMR Active')
    } else {
      setHmrStatus('No HMR detected')
    }
  }, [])

  const testHotReload = () => {
    console.log('Testing hot reload at:', new Date().toISOString())
    // This should trigger a hot reload if working correctly
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('turbopack-test', { 
        detail: { timestamp: Date.now() } 
      })
      window.dispatchEvent(event)
    }
  }

  const checkBundleInfo = async () => {
    try {
      const response = await fetch('/_next/static/chunks/webpack.js')
      console.log('Bundle check response:', response.status)
    } catch (error) {
      console.error('Bundle check failed:', error)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Turbopack Debug Info</h1>
      
      <div className="grid gap-6">
        {/* Build Information */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Build Information</h2>
          <pre className="text-sm bg-slate-100 dark:bg-slate-900 p-4 rounded overflow-auto">
            {JSON.stringify(buildInfo, null, 2)}
          </pre>
        </div>

        {/* HMR Status */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Hot Module Replacement</h2>
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-sm ${
              hmrStatus.includes('Active') 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {hmrStatus}
            </span>
            <Button onClick={testHotReload} size="sm">
              Test HMR
            </Button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-4">Performance</h2>
          <div className="space-y-2">
            <div>Build Tool: {buildInfo?.isTurbopack ? 'Turbopack ⚡' : 'Webpack'}</div>
            <div>Environment: {buildInfo?.nodeEnv}</div>
            <div>Last Updated: {buildInfo?.timestamp}</div>
          </div>
          <Button onClick={checkBundleInfo} size="sm" className="mt-4">
            Check Bundle Info
          </Button>
        </div>

        {/* Debugging Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
          <h2 className="text-lg font-semibold mb-4 text-blue-900 dark:text-blue-100">
            Turbopack Debugging Tips
          </h2>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>• Use <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">npm run dev:verbose</code> for detailed logs</li>
            <li>• Check Network tab for faster asset loading</li>
            <li>• Turbopack provides better error overlays</li>
            <li>• Source maps are more accurate with Turbopack</li>
            <li>• HMR should be faster than Webpack</li>
          </ul>
        </div>
      </div>
    </div>
  )
}