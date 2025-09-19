import mongoose, { Schema, model, models } from 'mongoose'
import type { AILog } from '@/types'

const AILogSchema = new Schema<AILog>({
  leadId: {
    type: String,
    required: true,
    ref: 'Lead'
  },
  type: {
    type: String,
    enum: ['extraction', 'scoring', 'transfer_decision', 'response_generation', 'escavador_query'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  input: {
    type: Schema.Types.Mixed,
    required: true
  },
  output: {
    type: Schema.Types.Mixed,
    required: true
  },
  reasoning: String,
  confidence: Number,
  model: String,
  timestamp: {
    type: Date,
    default: Date.now
  },
  executionTime: Number,
  metadata: {
    conversationId: String,
    messageId: String,
    extractedFields: [String],
    previousScore: Number,
    newScore: Number,
    transferReason: String
  }
})

// Índices para performance
AILogSchema.index({ leadId: 1, timestamp: -1 })
AILogSchema.index({ type: 1 })
AILogSchema.index({ timestamp: -1 })

export default models.AILog || model<AILog>('AILog', AILogSchema)