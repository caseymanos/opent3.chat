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

  pdfjsLibPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
    
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib
      if (pdfjs) {
        // Set the worker source
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js'
        console.log('✅ [PDF.js] PDF.js loaded successfully from CDN')
        resolve(pdfjs)
      } else {
        reject(new Error('PDF.js failed to load'))
      }
    }
    
    script.onerror = () => {
      console.error('❌ [PDF.js] Failed to load PDF.js from CDN')
      reject(new Error('Failed to load PDF.js'))
    }
    
    document.head.appendChild(script)
  })

  return pdfjsLibPromise
}

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await loadPDFJS()
  
  if (!pdfjsLib) {
    throw new Error('PDF.js not available')
  }

  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ')
      fullText += pageText + '\n\n'
    }
    
    return fullText.trim()
  } catch (error) {
    console.error('Error extracting text from PDF:', error)
    throw error
  }
}