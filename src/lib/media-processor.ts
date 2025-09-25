import { ImageAnnotatorClient } from '@google-cloud/vision'
import Groq from 'groq-sdk'

interface MediaProcessorConfig {
  googleVisionEnabled?: boolean
  googleVisionKeyPath?: string
  groqEnabled?: boolean
  groqApiKey?: string
  openRouterEnabled?: boolean
  openRouterApiKey?: string
  imageDescriptionModel?: string
  temperature?: number
  maxTokens?: number
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
    // Primeiro tenta descrever a imagem com OpenRouter/Sonoma Sky Alpha
    if (this.config.openRouterEnabled && this.config.openRouterApiKey) {
      try {
        console.log(`Describing image with ${this.config.imageDescriptionModel || 'openrouter/sonoma-sky-alpha'} (${mimeType})`)
        
        // Converter buffer para base64
        const base64Image = imageBuffer.toString('base64')
        const dataUrl = `data:${mimeType};base64,${base64Image}`
        
        // Fazer requisição para OpenRouter com modelo multimodal
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://precatorios.app',
            'X-Title': 'Precatorios WhatsApp Bot'
          },
          body: JSON.stringify({
            model: this.config.imageDescriptionModel || 'openrouter/sonoma-sky-alpha',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Descreva esta imagem em português brasileiro de forma detalhada. Se houver texto na imagem, transcreva-o também. Seja objetivo e claro.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: dataUrl
                    }
                  }
                ]
              }
            ],
            temperature: this.config.temperature || 0.3,
            max_tokens: this.config.maxTokens || 500
          })
        })

        if (response.ok) {
          const data = await response.json()
          const description = data.choices?.[0]?.message?.content
          if (description) {
            console.log(`Image description generated: ${description.substring(0, 100)}...`)
            return description.trim()
          }
        } else {
          const errorData = await response.json()
          console.error('OpenRouter API error:', errorData)
        }
      } catch (error) {
        console.error('Error describing image with OpenRouter:', error)
      }
    }
    
    // Fallback para OCR com Google Vision se configurado
    if (!this.visionClient || !this.config.googleVisionEnabled) {
      console.log('No image processing method configured')
      return null
    }

    try {
      console.log(`Fallback to Google Vision OCR (${mimeType})`)
      
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
      const extension = mimeType.includes('ogg') ? 'ogg' : 
                       mimeType.includes('mp3') ? 'mp3' :
                       mimeType.includes('wav') ? 'wav' : 'mp3'
      
      // Use Groq SDK with proper file handling for Node.js
      const fs = require('fs')
      const path = require('path')
      const os = require('os')
      
      // Create temporary file
      const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.${extension}`)
      fs.writeFileSync(tempFilePath, audioBuffer)
      
      // Create readable stream for Groq SDK
      const fileStream = fs.createReadStream(tempFilePath)
      
      // Add required properties to make it File-like
      ;(fileStream as any).name = `audio.${extension}`
      ;(fileStream as any).type = mimeType
      
      // Transcribe using Groq SDK
      const transcription = await this.groqClient.audio.transcriptions.create({
        file: fileStream as any,
        model: 'whisper-large-v3',
        response_format: 'text',
        language: 'pt'
      })
      
      // Clean up temp file
      fs.unlinkSync(tempFilePath)

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

  async processVideo(videoBuffer: Buffer, mimeType: string): Promise<string | null> {
    try {
      console.log(`Processing video for content analysis (${mimeType})`)

      // Por enquanto, não retorna nenhum texto extraído para vídeos
      // TODO: Implementar extração de frame + análise de imagem
      // TODO: Extrair áudio + transcrição
      // TODO: Gerar thumbnail

      const videoSizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2)
      console.log(`Vídeo processado - ${videoSizeMB}MB, formato: ${mimeType}`)

      // Retorna null para não mostrar "texto extraído"
      return null

    } catch (error) {
      console.error('Error processing video:', error)
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
        return await this.processVideo(mediaBuffer, mimeType)
      
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