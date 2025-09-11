import mongoose, { Schema, model, models } from 'mongoose'

export interface WhatsAppInstance {
  _id?: string
  instanceName: string
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
}

const WhatsAppInstanceSchema = new Schema<WhatsAppInstance>({
  instanceName: { 
    type: String, 
    required: true, 
    unique: true,
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
  lastConnectionAt: Date
}, {
  timestamps: true
})

// Índices para performance
WhatsAppInstanceSchema.index({ instanceName: 1 })
WhatsAppInstanceSchema.index({ state: 1 })
WhatsAppInstanceSchema.index({ createdBy: 1 })
WhatsAppInstanceSchema.index({ isActive: 1 })

export default models.WhatsAppInstance || model<WhatsAppInstance>('WhatsAppInstance', WhatsAppInstanceSchema)