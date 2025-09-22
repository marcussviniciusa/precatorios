import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export interface AuthUser {
  userId: string
  email: string
  role: 'admin' | 'user'
}

/**
 * Verifica se o usuário está autenticado
 * Retorna o usuário se autenticado, ou null se não
 */
export function getAuthUser(request: NextRequest): AuthUser | null {
  const token = getTokenFromRequest(request)

  if (!token) {
    return null
  }

  const payload = verifyToken(token)

  if (!payload) {
    return null
  }

  // Mapear roles antigos para novos se necessário
  let role: 'admin' | 'user' = 'user'
  if (payload.role === 'admin') {
    role = 'admin'
  } else if (payload.role === 'manager') {
    // Manager vira admin para manter acesso total
    role = 'admin'
  } else {
    // analyst e outros viram user
    role = 'user'
  }

  return {
    userId: payload.userId,
    email: payload.email,
    role
  }
}

/**
 * Middleware que requer autenticação
 * Retorna erro 401 se não autenticado
 */
export function requireAuth(request: NextRequest): AuthUser | NextResponse {
  const user = getAuthUser(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Autenticação requerida' },
      { status: 401 }
    )
  }

  return user
}

/**
 * Middleware que requer nível admin
 * Retorna erro 403 se não for admin
 */
export function requireAdmin(request: NextRequest): AuthUser | NextResponse {
  const authResult = requireAuth(request)

  // Se já é um erro, retornar
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const user = authResult as AuthUser

  if (user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Acesso negado. Privilégios de administrador requeridos.' },
      { status: 403 }
    )
  }

  return user
}

/**
 * Verifica se usuário tem permissão para acessar recurso
 */
export function checkPermission(user: AuthUser, resource: string): boolean {
  const adminOnlyResources = [
    'config',
    'bot-config',
    'ai-config',
    'user-management',
    'system-settings',
    'escavador-config',
    'google-vision-config'
  ]

  // Admin tem acesso a tudo
  if (user.role === 'admin') {
    return true
  }

  // User não tem acesso a recursos admin-only
  if (adminOnlyResources.includes(resource)) {
    return false
  }

  // User tem acesso aos demais recursos
  return true
}