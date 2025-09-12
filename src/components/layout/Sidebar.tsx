'use client'

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
  Webhook
} from 'lucide-react'

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard
  },
  {
    name: 'WhatsApp',
    href: '/whatsapp',
    icon: Smartphone
  },
  {
    name: 'Conversas',
    href: '/conversations',
    icon: MessageSquare
  },
  {
    name: 'Disparo de Mensagens',
    href: '/broadcast',
    icon: Send
  },
  {
    name: 'WhatsApp API Oficial',
    href: '/whatsapp-official',
    icon: Webhook
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users
  },
  {
    name: 'CRM',
    href: '/crm',
    icon: FileText
  },
  {
    name: 'Relatórios',
    href: '/reports',
    icon: BarChart3
  },
  {
    name: 'Bot Config',
    href: '/config',
    icon: Bot
  },
  {
    name: 'IA Config',
    href: '/config/ai',
    icon: Brain
  },
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings
  }
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

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
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Admin User
              </p>
              <p className="text-xs text-gray-500 truncate">
                admin@example.com
              </p>
            </div>
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
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                Admin User
              </p>
              <p className="text-xs text-gray-500 truncate">
                admin@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}