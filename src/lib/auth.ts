import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { User } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key'

export interface AuthTokenPayload {
  userId: string
  email: string
  role: string
}

export function generateToken(user: User): string {
  const payload: AuthTokenPayload = {
    userId: user._id!,
    email: user.email,
    role: user.role
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload
  } catch (error) {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  return authHeader.substring(7)
}

// Mock authOptions for compatibility with NextAuth code
export const authOptions = {
  providers: [],
  secret: JWT_SECRET,
  callbacks: {}
}