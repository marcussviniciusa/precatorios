import mongoose, { Schema, model, models } from 'mongoose'
import type { ScoreLog } from '@/types'

const ScoreLogSchema = new Schema<ScoreLog>({
  leadId: {
    type: String,
    required: true,
    ref: 'Lead'
  },
  previousScore: {
    type: Number,
    required: true
  },
  newScore: {
    type: Number,
    required: true
  },
  previousClassification: {
    type: String,
    required: true
  },
  newClassification: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  factors: [{
    factor: {
      type: String,
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    description: String
  }],
  triggeredBy: {
    type: String,
    enum: ['ai', 'manual', 'escavador'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  metadata: {
    conversationId: String,
    escavadorData: Boolean
  }
})

// Índices para performance
ScoreLogSchema.index({ leadId: 1, timestamp: -1 })
ScoreLogSchema.index({ timestamp: -1 })
ScoreLogSchema.index({ triggeredBy: 1 })

export default models.ScoreLog || model<ScoreLog>('ScoreLog', ScoreLogSchema)