import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rotas que requerem autenticação
  const protectedRoutes = [
    '/dashboard',
    '/leads',
    '/conversations',
    '/whatsapp',
    '/broadcast',
    '/crm',
    '/reports',
    '/users',
    '/config',
    '/settings'
  ]

  // APIs que requerem autenticação
  const protectedApiRoutes = [
    '/api/leads',
    '/api/conversations',
    '/api/dashboard',
    '/api/users',
    '/api/config',
    '/api/evolution',
    '/api/broadcast',
    '/api/whatsapp-official'
  ]

  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Verificar se é uma API protegida
  const isProtectedApi = protectedApiRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isProtectedRoute || isProtectedApi) {
    // Tentar obter token dos cookies ou headers
    const token = request.cookies.get('token')?.value ||
                 request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      if (isProtectedApi) {
        // Para APIs, retornar 401 Unauthorized
        return NextResponse.json(
          { error: 'Token de acesso requerido' },
          { status: 401 }
        )
      } else {
        // Para rotas de página, redirecionar para login
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // Verificar se o token é válido
    try {
      const payload = verifyToken(token)
      if (!payload) {
        if (isProtectedApi) {
          return NextResponse.json(
            { error: 'Token inválido' },
            { status: 401 }
          )
        } else {
          return NextResponse.redirect(new URL('/', request.url))
        }
      }

      // Token válido, continuar com a requisição
      return NextResponse.next()
    } catch (error) {
      console.error('Middleware auth error:', error)

      if (isProtectedApi) {
        return NextResponse.json(
          { error: 'Token inválido' },
          { status: 401 }
        )
      } else {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
  }

  // Rota não protegida, continuar normalmente
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Proteger todas as rotas dashboard
    '/dashboard/:path*',
    '/leads/:path*',
    '/conversations/:path*',
    '/whatsapp/:path*',
    '/broadcast/:path*',
    '/crm/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/config/:path*',
    '/settings/:path*',
    // Proteger APIs críticas
    '/api/leads/:path*',
    '/api/conversations/:path*',
    '/api/dashboard/:path*',
    '/api/users/:path*',
    '/api/config/:path*',
    '/api/evolution/:path*',
    '/api/broadcast/:path*',
    '/api/whatsapp-official/:path*'
  ]
}