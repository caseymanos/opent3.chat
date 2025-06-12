let pdfjsLibPromise: Promise<any> | null = null

export async function loadPDFJS() {
  if (typeof window === 'undefined') {
    return null // No PDF.js on server side
  }

  if ((window as any).pdfjsLib) {
    return (window as any).pdfjsLib // Already loaded
  }

  if (pdfjsLibPromise) {
    return await pdfjsLibPromise // Loading in progress
  }

  pdfjsLibPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('🔄 [PDF.js] Loading PDF.js library...')
      
      // Load PDF.js dynamically
      const pdfjs = await import('pdfjs-dist')
      
      // Set the worker source - use a reliable CDN
      pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`

      // Make it globally available
      ;(window as any).pdfjsLib = pdfjs

      console.log('✅ [PDF.js] PDF.js loaded successfully')
      resolve(pdfjs)
    } catch (error) {
      console.error('❌ [PDF.js] Failed to load PDF.js:', error)
      reject(error)
    }
  })

  return await pdfjsLibPromise
}

export function isPDFJSAvailable(): boolean {
  return typeof window !== 'undefined' && !!(window as any).pdfjsLib
}