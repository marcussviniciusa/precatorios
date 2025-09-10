import mongoose, { Schema, model, models } from 'mongoose'
import type { Activity } from '@/types'

const ActivitySchema = new Schema<Activity>({
  leadId: { type: String, ref: 'Lead', required: true },
  type: {
    type: String,
    enum: ['call', 'email', 'whatsapp', 'meeting', 'task', 'note'],
    required: true
  },
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: Date,
  assignedTo: { type: String, ref: 'User', required: true },
  createdBy: { type: String, ref: 'User', required: true },
  completedAt: Date
}, {
  timestamps: true
})

ActivitySchema.pre('save', function(next) {
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date()
  }
  next()
})

ActivitySchema.index({ leadId: 1 })
ActivitySchema.index({ assignedTo: 1 })
ActivitySchema.index({ status: 1 })
ActivitySchema.index({ dueDate: 1 })
ActivitySchema.index({ createdAt: -1 })

export default models.Activity || model<Activity>('Activity', ActivitySchema)