import mongoose, { Schema, model, models } from 'mongoose'
import bcrypt from 'bcryptjs'
import type { User } from '@/types'

const UserSchema = new Schema<User>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  phone: String,
  avatar: String,
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
})

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  const salt = await bcrypt.genSalt(12)
  this.password = await bcrypt.hash(this.password!, salt)
  next()
})

UserSchema.methods.comparePassword = async function(password: string) {
  return bcrypt.compare(password, this.password)
}

UserSchema.index({ email: 1 })

export default models.User || model<User>('User', UserSchema)