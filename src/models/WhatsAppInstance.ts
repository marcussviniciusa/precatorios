import mongoose, { Schema, model, models } from 'mongoose'

export interface WhatsAppInstance {
  _id?: string
  phoneNumber?: string // Número do telefone conectado (chave única)
  instanceName: string // Nome visual da instância
  state: 'close' | 'connecting' | 'open'
  evolutionInstanceId?: string
  ownerJid?: string
  profileName?: string
  profilePicUrl?: string
  integration: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  token?: string
  webhookUrl?: string
  // Campos específicos para WHATSAPP-BUSINESS (Meta Official API)
  businessConfig?: {
    accessToken?: string
    phoneNumberId?: string
    businessAccountId?: string
    verifyToken?: string
  }
  isActive: boolean
  createdBy: string
  createdAt?: Date
  updatedAt?: Date
  lastConnectionAt?: Date
  connectionHistory?: {
    instanceName: string
    connectedAt: Date
  }[] // Histórico de nomes de instâncias que usaram este número
}

const WhatsAppInstanceSchema = new Schema<WhatsAppInstance>({
  phoneNumber: {
    type: String,
    sparse: true, // Permite null/undefined, mas deve ser único quando existe
    trim: true
  },
  instanceName: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  state: {
    type: String,
    enum: ['close', 'connecting', 'open'],
    default: 'close'
  },
  evolutionInstanceId: String,
  ownerJid: String,
  profileName: String,
  profilePicUrl: String,
  integration: {
    type: String,
    enum: ['WHATSAPP-BAILEYS', 'WHATSAPP-BUSINESS'],
    default: 'WHATSAPP-BAILEYS'
  },
  token: String,
  webhookUrl: String,
  // Campos específicos para WHATSAPP-BUSINESS (Meta Official API)
  businessConfig: {
    accessToken: String,
    phoneNumberId: String,
    businessAccountId: String,
    verifyToken: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    ref: 'User',
    required: true
  },
  lastConnectionAt: Date,
  connectionHistory: [{
    instanceName: String,
    connectedAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
})

// Índices para performance
WhatsAppInstanceSchema.index({ instanceName: 1 })
WhatsAppInstanceSchema.index({ state: 1 })
WhatsAppInstanceSchema.index({ createdBy: 1 })
WhatsAppInstanceSchema.index({ isActive: 1 })
// Índice único para números ativos, mas permite múltiplas instâncias BUSINESS sem phoneNumber
WhatsAppInstanceSchema.index(
  { phoneNumber: 1, integration: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: {
      isActive: true,
      phoneNumber: { $ne: null }
    }
  }
)

export default models.WhatsAppInstance || model<WhatsAppInstance>('WhatsAppInstance', WhatsAppInstanceSchema)