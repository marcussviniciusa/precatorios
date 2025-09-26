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
    <div className="p-4 bg-white border-b space-y-4">
      {/* Primeira linha: Título e botão atualizar */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
            Conversas ({totalCount})
          </h1>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="ml-4 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} sm:mr-2`} />
          <span className="hidden sm:inline">Atualizar</span>
        </Button>
      </div>

      {/* Segunda linha: Status e seletor */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Status das conversas */}
        <div className="min-w-0 flex-1">
          {showingAll ? (
            <p className="text-sm text-green-600 font-medium">
              ✓ Exibindo todas as {totalCount} conversas
              {totalCount > 0 && (
                <span className="hidden sm:inline"> (#1 - #{totalCount})</span>
              )}
            </p>
          ) : pageInfo && totalCount > 0 && (
            <p className="text-sm text-gray-600">
              Conversas #{pageInfo.startNumber} - #{pageInfo.endNumber}
            </p>
          )}
        </div>

        {/* Seletor de itens por página */}
        <div className="flex items-center gap-2 shrink-0">
          <label className="text-sm text-gray-600 whitespace-nowrap">
            Mostrar:
          </label>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            disabled={loading}
            className="border border-gray-300 rounded px-2 sm:px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent min-w-0"
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span className="text-sm text-gray-600 whitespace-nowrap">
            por página
          </span>
        </div>
      </div>
    </div>
  )
}