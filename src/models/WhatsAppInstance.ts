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
  integration: string
  token?: string
  webhookUrl?: string
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
    default: 'WHATSAPP-BAILEYS'
  },
  token: String,
  webhookUrl: String,
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
WhatsAppInstanceSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true })
WhatsAppInstanceSchema.index({ instanceName: 1 })
WhatsAppInstanceSchema.index({ state: 1 })
WhatsAppInstanceSchema.index({ createdBy: 1 })
WhatsAppInstanceSchema.index({ isActive: 1 })
WhatsAppInstanceSchema.index({ phoneNumber: 1, isActive: 1 })

export default models.WhatsAppInstance || model<WhatsAppInstance>('WhatsAppInstance', WhatsAppInstanceSchema)