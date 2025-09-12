import { ImageAnnotatorClient } from '@google-cloud/vision'
import Groq from 'groq-sdk'

interface MediaProcessorConfig {
  googleVisionEnabled?: boolean
  googleVisionKeyPath?: string
  groqEnabled?: boolean
  groqApiKey?: string
}

class MediaProcessor {
  private static instance: MediaProcessor | null = null
  private visionClient: ImageAnnotatorClient | null = null
  private groqClient: Groq | null = null
  private config: MediaProcessorConfig = {}

  private constructor() {}

  static getInstance(): MediaProcessor {
    if (!MediaProcessor.instance) {
      MediaProcessor.instance = new MediaProcessor()
    }
    return MediaProcessor.instance
  }

  async initialize(config: MediaProcessorConfig) {
    this.config = config

    // Initialize Google Vision
    if (config.googleVisionEnabled && config.googleVisionKeyPath) {
      try {
        this.visionClient = new ImageAnnotatorClient({
          keyFilename: config.googleVisionKeyPath
        })
        console.log('Google Vision client initialized')
      } catch (error) {
        console.error('Failed to initialize Google Vision:', error)
      }
    }

    // Initialize Groq
    if (config.groqEnabled && config.groqApiKey) {
      try {
        this.groqClient = new Groq({
          apiKey: config.groqApiKey
        })
        console.log('Groq client initialized')
      } catch (error) {
        console.error('Failed to initialize Groq:', error)
      }
    }
  }

  async processImage(imageBuffer: Buffer, mimeType: string): Promise<string | null> {
    if (!this.visionClient || !this.config.googleVisionEnabled) {
      console.log('Google Vision not configured for image processing')
      return null
    }

    try {
      console.log(`Processing image with Google Vision OCR (${mimeType})`)
      
      // Perform text detection
      const [result] = await this.visionClient.textDetection({
        image: {
          content: imageBuffer.toString('base64')
        }
      })

      const detections = result.textAnnotations
      if (detections && detections.length > 0) {
        // First annotation contains the full text
        const fullText = detections[0].description || ''
        console.log(`OCR extracted ${fullText.length} characters`)
        return fullText.trim()
      }

      console.log('No text found in image')
      return null
    } catch (error) {
      console.error('Error processing image with Google Vision:', error)
      return null
    }
  }

  async processDocument(documentBuffer: Buffer, mimeType: string): Promise<string | null> {
    if (!this.visionClient || !this.config.googleVisionEnabled) {
      console.log('Google Vision not configured for document processing')
      return null
    }

    try {
      console.log(`Processing document with Google Vision OCR (${mimeType})`)
      
      // Use document text detection for better results with documents
      const [result] = await this.visionClient.documentTextDetection({
        image: {
          content: documentBuffer.toString('base64')
        }
      })

      const fullText = result.fullTextAnnotation?.text || ''
      if (fullText) {
        console.log(`OCR extracted ${fullText.length} characters from document`)
        return fullText.trim()
      }

      console.log('No text found in document')
      return null
    } catch (error) {
      console.error('Error processing document with Google Vision:', error)
      return null
    }
  }

  async transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string | null> {
    if (!this.groqClient || !this.config.groqEnabled) {
      console.log('Groq not configured for audio transcription')
      return null
    }

    try {
      console.log(`Transcribing audio with Groq Whisper (${mimeType})`)
      
      // Determine file extension from mimeType
      const extension = mimeType.split('/')[1] || 'mp3'
      
      // Create a File object from buffer - convert to Uint8Array for proper typing
      const audioFile = new File([new Uint8Array(audioBuffer)], `audio.${extension}`, { type: mimeType })
      
      // Transcribe using Groq
      const transcription = await this.groqClient.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'text',
        language: 'pt' // Portuguese
      })

      const text = typeof transcription === 'string' ? transcription : transcription.text
      
      if (text) {
        console.log(`Transcription extracted ${text.length} characters`)
        return text.trim()
      }

      console.log('No transcription generated')
      return null
    } catch (error) {
      console.error('Error transcribing audio with Groq:', error)
      return null
    }
  }

  async processMedia(
    mediaBuffer: Buffer, 
    mimeType: string, 
    messageType: 'image' | 'document' | 'audio' | 'video'
  ): Promise<string | null> {
    console.log(`Processing media type: ${messageType}, mimeType: ${mimeType}`)
    
    switch (messageType) {
      case 'image':
        return await this.processImage(mediaBuffer, mimeType)
      
      case 'document':
        // PDFs and documents
        if (mimeType?.includes('pdf') || mimeType?.includes('document')) {
          return await this.processDocument(mediaBuffer, mimeType)
        }
        // Try as image for other document types
        return await this.processImage(mediaBuffer, mimeType)
      
      case 'audio':
        return await this.transcribeAudio(mediaBuffer, mimeType)
      
      case 'video':
        // For now, we don't process video
        console.log('Video processing not yet implemented')
        return null
      
      default:
        console.log(`Unsupported media type: ${messageType}`)
        return null
    }
  }

  isConfigured(): boolean {
    return !!(
      (this.config.googleVisionEnabled && this.visionClient) ||
      (this.config.groqEnabled && this.groqClient)
    )
  }

  getCapabilities(): {
    canProcessImages: boolean
    canProcessDocuments: boolean
    canTranscribeAudio: boolean
  } {
    return {
      canProcessImages: !!(this.config.googleVisionEnabled && this.visionClient),
      canProcessDocuments: !!(this.config.googleVisionEnabled && this.visionClient),
      canTranscribeAudio: !!(this.config.groqEnabled && this.groqClient)
    }
  }
}

export default MediaProcessor