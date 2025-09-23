'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      // Se não está logado, redirecionar para página inicial (login)
      if (!user) {
        router.push('/')
        return
      }

      // Se requer admin mas usuário não é admin
      if (requireAdmin && !isAdmin) {
        router.push('/dashboard')
        return
      }
    }
  }, [loading, user, isAdmin, requireAdmin, router])

  // Enquanto carrega, mostrar spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  // Se não está autorizado, não renderizar nada (vai redirecionar)
  if (!user || (requireAdmin && !isAdmin)) {
    return null
  }

  // Usuário autorizado, renderizar conteúdo
  return <>{children}</>
}