'use client'

import { Button } from '@/components/ui/Button'
import { RefreshCw } from 'lucide-react'

interface ConversationsHeaderProps {
  totalCount: number
  itemsPerPage: number
  pageInfo: { startNumber: number; endNumber: number }
  showingAll: boolean
  loading: boolean
  onItemsPerPageChange: (value: number) => void
  onRefresh: () => void
}

export function ConversationsHeader({
  totalCount,
  itemsPerPage,
  pageInfo,
  showingAll,
  loading,
  onItemsPerPageChange,
  onRefresh
}: ConversationsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 p-4 bg-white border-b gap-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Conversas ({totalCount})
        </h1>
        {showingAll ? (
          <p className="text-sm text-green-600 font-medium">
            ✓ Exibindo todas as {totalCount} conversas {totalCount > 0 && `(#1 - #${totalCount})`}
          </p>
        ) : pageInfo && totalCount > 0 && (
          <p className="text-sm text-gray-600">
            Exibindo conversas #{pageInfo.startNumber} - #{pageInfo.endNumber}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Botão de atualizar */}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>

        {/* Seletor de itens por página */}
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            Mostrar:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            disabled={loading}
            className="border border-gray-300 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent flex-1 sm:flex-initial"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500 (todas)</option>
          </select>
          <span className="text-sm text-gray-600 hidden sm:inline">por página</span>
        </div>
      </div>
    </div>
  )
}