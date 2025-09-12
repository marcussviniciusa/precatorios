import mongoose from 'mongoose'

const whatsappOfficialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  phoneNumberId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  accessToken: {
    type: String,
    required: true,
    trim: true
  },
  businessAccountId: {
    type: String,
    trim: true
  },
  webhookUrl: {
    type: String,
    required: true,
    trim: true
  },
  webhookToken: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastUsed: {
    type: Date
  },
  // Estatísticas de uso
  stats: {
    totalMessagesSent: {
      type: Number,
      default: 0
    },
    totalMessagesReceived: {
      type: Number,
      default: 0
    },
    lastMessageSentAt: Date,
    lastMessageReceivedAt: Date
  }
}, {
  timestamps: true
})

// Índices para performance
whatsappOfficialSchema.index({ phoneNumberId: 1 })
whatsappOfficialSchema.index({ isActive: 1 })
whatsappOfficialSchema.index({ createdAt: -1 })

// Middleware para atualizar lastUsed
whatsappOfficialSchema.methods.updateLastUsed = function() {
  this.lastUsed = new Date()
  return this.save()
}

// Middleware para incrementar estatísticas
whatsappOfficialSchema.methods.incrementMessagesSent = function() {
  this.stats.totalMessagesSent += 1
  this.stats.lastMessageSentAt = new Date()
  this.lastUsed = new Date()
  return this.save()
}

whatsappOfficialSchema.methods.incrementMessagesReceived = function() {
  this.stats.totalMessagesReceived += 1
  this.stats.lastMessageReceivedAt = new Date()
  this.lastUsed = new Date()
  return this.save()
}

const WhatsAppOfficial = mongoose.models.WhatsAppOfficial || mongoose.model('WhatsAppOfficial', whatsappOfficialSchema)

export default WhatsAppOfficial