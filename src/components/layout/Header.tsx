'use client'

import { Bell, Search, Settings, Menu } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface HeaderProps {
  title?: string
  subtitle?: string
  onMenuClick?: () => void
}

export default function Header({ title = 'Dashboard', subtitle, onMenuClick }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Botão menu mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1 hidden sm:block">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Campo de busca - oculto em mobile muito pequeno */}
          <div className="relative hidden sm:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent w-32 lg:w-64"
            />
          </div>

          {/* Botão de busca para mobile */}
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon">
            <Bell className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  )
}