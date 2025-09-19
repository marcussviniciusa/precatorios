import mongoose, { Schema, model, models } from 'mongoose'
import type { LeadSummary } from '@/types'

const LeadSummarySchema = new Schema<LeadSummary>({
  leadId: {
    type: String,
    required: true,
    unique: true,
    ref: 'Lead'
  },
  summary: {
    type: String,
    required: true
  },
  keyPoints: [{
    type: String
  }],
  concerns: [{
    type: String
  }],
  opportunities: [{
    type: String
  }],
  nextSteps: [{
    type: String
  }],
  generatedBy: {
    type: String,
    enum: ['ai', 'human'],
    required: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  metadata: {
    totalInteractions: Number,
    avgResponseTime: Number,
    engagementLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }
}, {
  timestamps: true
})

// Índice para busca rápida
LeadSummarySchema.index({ leadId: 1 })

export default models.LeadSummary || model<LeadSummary>('LeadSummary', LeadSummarySchema)