import mongoose, { Schema, model, models } from 'mongoose'
import type { Conversation, Message } from '@/types'

const MessageSchema = new Schema<Message>({
  conversationId: { type: String, ref: 'Conversation', required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'document', 'audio', 'video'],
    default: 'text'
  },
  content: { type: String, required: true },
  sender: {
    type: String,
    enum: ['user', 'bot', 'agent'],
    required: true
  },
  senderName: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
  metadata: {
    messageId: String,
    quotedMessage: String,
    mediaUrl: String,
    fileName: String,
    mimetype: String,
    transcription: String // Para áudios transcritos
  }
}, {
  _id: true
})

const ConversationSchema = new Schema<Conversation>({
  leadId: { type: String, ref: 'Lead', required: true },
  whatsappId: { type: String, required: true },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'transferred'],
    default: 'active'
  },
  messages: [MessageSchema],
  botActive: { type: Boolean, default: true },
  assignedAgent: { type: String, ref: 'User' },
  metadata: {
    lastBotResponse: Date,
    transferReason: String,
    qualificationData: Schema.Types.Mixed,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    transferredAt: Date,
    transferredBy: String,
    assignedAgentId: String,
    assignedAt: Date,
    assignedBy: String,
    pausedAt: Date,
    pausedBy: String,
    pauseReason: String,
    resumedAt: Date,
    resumedBy: String,
    removedFromQueueBy: String,
    removedFromQueueAt: Date,
    priorityChangedBy: String,
    priorityChangedAt: Date
  }
}, {
  timestamps: true
})

ConversationSchema.index({ leadId: 1 })
ConversationSchema.index({ whatsappId: 1 })
ConversationSchema.index({ status: 1 })
ConversationSchema.index({ 'messages.timestamp': -1 })

export default models.Conversation || model<Conversation>('Conversation', ConversationSchema)