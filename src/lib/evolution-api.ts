import axios from 'axios'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080'
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || ''
const EVOLUTION_INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || 'precatorios-bot'

interface EvolutionConfig {
  baseURL: string
  apiKey: string
  instanceName: string
}

class EvolutionAPI {
  private config: EvolutionConfig
  private axios: any

  constructor() {
    this.config = {
      baseURL: EVOLUTION_API_URL,
      apiKey: EVOLUTION_API_KEY,
      instanceName: EVOLUTION_INSTANCE_NAME
    }

    this.axios = axios.create({
      baseURL: this.config.baseURL,
      headers: {
        'apikey': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    })
  }

  async createInstance(): Promise<any> {
    try {
      const response = await this.axios.post('/instance/create', {
        instanceName: this.config.instanceName,
        token: this.config.apiKey,
        qrcode: true,
        webhook: `${process.env.NEXTAUTH_URL}/api/webhook/evolution`,
        webhook_by_events: true,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED',
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ]
      })
      return response.data
    } catch (error) {
      console.error('Error creating Evolution API instance:', error)
      throw error
    }
  }

  async getInstanceStatus(): Promise<any> {
    try {
      const response = await this.axios.get(`/instance/connectionState/${this.config.instanceName}`)
      return response.data
    } catch (error) {
      console.error('Error getting instance status:', error)
      throw error
    }
  }

  async sendTextMessage(to: string, message: string): Promise<any> {
    try {
      const response = await this.axios.post(`/message/sendText/${this.config.instanceName}`, {
        number: to,
        text: message
      })
      return response.data
    } catch (error) {
      console.error('Error sending text message:', error)
      throw error
    }
  }

  async sendMediaMessage(to: string, mediaUrl: string, caption?: string): Promise<any> {
    try {
      const response = await this.axios.post(`/message/sendMedia/${this.config.instanceName}`, {
        number: to,
        mediatype: 'image',
        media: mediaUrl,
        caption
      })
      return response.data
    } catch (error) {
      console.error('Error sending media message:', error)
      throw error
    }
  }

  async getQRCode(): Promise<any> {
    try {
      const response = await this.axios.get(`/instance/connect/${this.config.instanceName}`)
      return response.data
    } catch (error) {
      console.error('Error getting QR code:', error)
      throw error
    }
  }

  async getContactInfo(phone: string): Promise<any> {
    try {
      const response = await this.axios.get(`/chat/findContact/${this.config.instanceName}`, {
        params: { phone }
      })
      return response.data
    } catch (error) {
      console.error('Error getting contact info:', error)
      throw error
    }
  }

  async getChatMessages(phone: string, limit = 20): Promise<any> {
    try {
      const response = await this.axios.get(`/chat/findMessages/${this.config.instanceName}`, {
        params: {
          phone,
          limit
        }
      })
      return response.data
    } catch (error) {
      console.error('Error getting chat messages:', error)
      throw error
    }
  }

  async markAsRead(phone: string): Promise<any> {
    try {
      const response = await this.axios.post(`/chat/markMessageAsRead/${this.config.instanceName}`, {
        phone
      })
      return response.data
    } catch (error) {
      console.error('Error marking as read:', error)
      throw error
    }
  }
}

const evolutionAPI = new EvolutionAPI()
export default evolutionAPI