'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Settings,
  BarChart3,
  Phone,
  FileText,
  Bot,
  Smartphone,
  Brain,
  X,
  Send,
  UserCog,
  LogOut,
  Clock,
  GitMerge,
} from 'lucide-react'

// Todas as rotas do sistema
const allNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    requireAdmin: false
  },
  {
    name: 'WhatsApp',
    href: '/whatsapp',
    icon: Smartphone,
    requireAdmin: false
  },
  {
    name: 'Conversas',
    href: '/conversations',
    icon: MessageSquare,
    requireAdmin: false
  },
  {
    name: 'Fila de Atendimento',
    href: '/queue',
    icon: Clock,
    requireAdmin: false
  },
  {
    name: 'Disparo de Mensagens',
    href: '/broadcast',
    icon: Send,
    requireAdmin: false
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
    requireAdmin: false
  },
  {
    name: 'CRM',
    href: '/crm',
    icon: FileText,
    requireAdmin: false
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
    requireAdmin: false
  },
  {
    name: 'Usuários',
    href: '/users',
    icon: UserCog,
    requireAdmin: true
  },
  {
    name: 'Bot Config',
    href: '/config',
    icon: Bot,
    requireAdmin: true
  },
  {
    name: 'IA Config',
    href: '/config/ai',
    icon: Brain,
    requireAdmin: true
  },
  {
    name: 'Bitrix CRM',
    href: '/config/bitrix',
    icon: GitMerge,
    requireAdmin: true
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    requireAdmin: false
  }
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Carregar dados do usuário do localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      const parsedUser = JSON.parse(userData)
      setUser(parsedUser)
      setIsAdmin(parsedUser.role === 'admin')
    }
  }, [])

  // Filtrar navegação baseada no role do usuário
  const navigation = allNavigation.filter(item => {
    if (item.requireAdmin) {
      return isAdmin
    }
    return true
  })

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Remover cookie
    document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
    window.location.href = '/'
  }

  return (
    <>
      {/* Sidebar para desktop */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col fixed h-screen z-30">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900">
            Precatórios Bot
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Sistema de Gestão
          </p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'email@example.com'}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  {isAdmin ? 'Admin' : 'Usuário'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar mobile */}
      <div className={cn(
        "lg:hidden fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-50 transform transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header com botão fechar */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              Precatórios Bot
            </h1>
            <p className="text-xs text-gray-500">
              Sistema de Gestão
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose} // Fechar sidebar ao clicar em um item
                className={cn(
                  'flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.name || 'Usuário'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email || 'email@example.com'}
                </p>
                <p className="text-xs text-green-600 font-medium">
                  {isAdmin ? 'Admin' : 'Usuário'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}