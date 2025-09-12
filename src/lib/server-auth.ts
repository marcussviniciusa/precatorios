import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'

export interface AuthResult {
  success: boolean
  user?: any
  error?: string
}

export function getAuthHeaders(request: NextRequest): AuthResult {
  try {
    // Verificar token no header Authorization
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Tentar cookie como fallback
      const tokenCookie = request.cookies.get('token')
      if (!tokenCookie) {
        return { success: false, error: 'Token de autenticação não encontrado' }
      }
      
      const decoded = jwt.verify(tokenCookie.value, process.env.JWT_SECRET!)
      return { success: true, user: decoded }
    }

    const token = authHeader.substring(7) // Remove 'Bearer '
    const decoded = jwt.verify(token, process.env.JWT_SECRET!)
    
    return { success: true, user: decoded }
  } catch (error) {
    return { success: false, error: 'Token inválido' }
  }
}