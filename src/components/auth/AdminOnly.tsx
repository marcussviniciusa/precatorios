'use client'

import { useAuth } from '@/contexts/AuthContext'
import { ShieldIcon } from 'lucide-react'
import { Card } from '@/components/ui/Card'

interface AdminOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminOnly({ children, fallback }: AdminOnlyProps) {
  const { isAdmin } = useAuth()

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Card className="p-8 text-center">
        <ShieldIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Acesso Restrito
        </h2>
        <p className="text-gray-600">
          Você não tem permissão para acessar esta funcionalidade.
          <br />
          Entre em contato com um administrador se precisar de acesso.
        </p>
      </Card>
    )
  }

  return <>{children}</>
}