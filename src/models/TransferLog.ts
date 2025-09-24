import mongoose, { Schema, model, models } from 'mongoose'
import type { TransferLog } from '@/types'

const TransferLogSchema = new Schema<TransferLog>({
  leadId: {
    type: String,
    required: true,
    ref: 'Lead'
  },
  fromStatus: {
    type: String,
    required: true
  },
  toStatus: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  triggeredBy: {
    type: String,
    enum: ['ai', 'human', 'system'],
    required: true
  },
  agent: String,
  notes: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    score: Number,
    classification: String,
    conversationId: String,
    isFirstAITransfer: Boolean,
    bitrixSent: Boolean,
    bitrixDealId: String,
    bitrixSentAt: Date,
    bitrixSentBy: String,
    bitrixError: String
  }
})

// Índices para performance
TransferLogSchema.index({ leadId: 1, timestamp: -1 })
TransferLogSchema.index({ timestamp: -1 })
TransferLogSchema.index({ triggeredBy: 1 })

export default models.TransferLog || model<TransferLog>('TransferLog', TransferLogSchema)