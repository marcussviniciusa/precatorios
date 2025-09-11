import mongoose, { Schema, model, models } from 'mongoose'
import type { Lead } from '@/types'

const LeadSchema = new Schema<Lead>({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: String,
  whatsappId: { type: String, required: true, unique: true },
  status: {
    type: String,
    enum: ['new', 'qualified', 'in_analysis', 'proposal', 'closed_won', 'closed_lost'],
    default: 'new'
  },
  classification: {
    type: String,
    enum: ['hot', 'warm', 'cold', 'discard'],
    required: true
  },
  score: { type: Number, default: 0, min: 0, max: 100 },
  hasPrecatorio: Boolean,
  precatorioValue: Number,
  precatorioType: String,
  state: String,
  city: String,
  isEligible: Boolean,
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  documentsUploaded: { type: Boolean, default: false },
  assignedTo: { type: String, ref: 'User' },
  source: { type: String, required: true, default: 'whatsapp' },
  notes: String,
  tags: [String],
  lastInteraction: { type: Date, default: Date.now }
}, {
  timestamps: true
})

// phone e whatsappId já têm unique: true no schema, não precisam de índices explícitos
LeadSchema.index({ classification: 1 })
LeadSchema.index({ status: 1 })
LeadSchema.index({ createdAt: -1 })
LeadSchema.index({ score: -1 })

export default models.Lead || model<Lead>('Lead', LeadSchema)