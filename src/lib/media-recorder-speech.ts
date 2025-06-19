/**
 * Alternative speech recognition using MediaRecorder API
 * This is a fallback when Chrome's Web Speech API fails
 */

import { logger } from './logger'

export class MediaRecorderSpeech {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  
  async startRecording(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      // Create MediaRecorder with appropriate mime type
      const mimeType = this.getSupportedMimeType()
      if (!mimeType) {
        throw new Error('No supported audio format found')
      }
      
      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType })
      this.audioChunks = []
      
      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }
      
      // Start recording
      this.mediaRecorder.start(1000) // Collect data every second
      logger.info('MediaRecorder started', { mimeType })
      
    } catch (error) {
      logger.error('Failed to start MediaRecorder', error)
      throw error
    }
  }
  
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'))
        return
      }
      
      this.mediaRecorder.onstop = () => {
        // Create blob from chunks
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.mediaRecorder!.mimeType 
        })
        
        // Clean up
        this.stream?.getTracks().forEach(track => track.stop())
        this.stream = null
        this.mediaRecorder = null
        this.audioChunks = []
        
        logger.info('Recording stopped', { 
          size: audioBlob.size,
          type: audioBlob.type 
        })
        
        resolve(audioBlob)
      }
      
      this.mediaRecorder.stop()
    })
  }
  
  private getSupportedMimeType(): string | null {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg'
    ]
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    
    return null
  }
  
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }
  
  // Convert audio blob to base64 for sending to transcription service
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        resolve(base64.split(',')[1]) // Remove data URL prefix
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }
}

// Alternative approach: Use a transcription service
export async function transcribeAudioWithService(audioBlob: Blob): Promise<string> {
  // This is a placeholder for integrating with a transcription service
  // Options include:
  // 1. OpenAI Whisper API
  // 2. Google Cloud Speech-to-Text
  // 3. Azure Speech Services
  // 4. AssemblyAI
  
  logger.info('Transcription service placeholder', {
    size: audioBlob.size,
    type: audioBlob.type
  })
  
  // For now, return a message indicating the fallback
  return 'Speech recognition unavailable. Chrome cannot connect to Google speech servers. Consider using text input or checking network/firewall settings.'
}

export const mediaRecorderSpeech = new MediaRecorderSpeech()