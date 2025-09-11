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
  Brain
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

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col fixed h-screen">
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
  )
}