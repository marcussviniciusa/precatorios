'use client'

import { Button } from '@/components/ui/Button'
import { CheckCircle } from 'lucide-react'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  pageInfo: { startNumber: number; endNumber: number }
  itemsPerPage: number
  totalCount: number
  showingAll: boolean
  loading: boolean
  onPageChange: (page: number) => void
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageInfo,
  itemsPerPage,
  totalCount,
  showingAll,
  loading,
  onPageChange
}: PaginationControlsProps) {
  // Se está mostrando todas as conversas ou só tem uma página
  if (showingAll || totalPages <= 1) {
    return (
      <div className="flex items-center justify-center py-4 border-t bg-gray-50">
        <div className="text-sm text-green-600 font-medium flex items-center">
          <CheckCircle className="w-4 h-4 mr-2" />
          {totalCount > 0
            ? `Todas as ${totalCount} conversas carregadas`
            : 'Nenhuma conversa disponível'
          }
        </div>
      </div>
    )
  }

  // Função para gerar números de página visíveis
  const getVisiblePages = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages]
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages]
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between py-4 px-4 border-t bg-gray-50 gap-4">
      {/* Informações da página */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">
          Conversas #{pageInfo.startNumber} - #{pageInfo.endNumber}
        </span>
        <span className="text-gray-400 ml-2">
          (Página {currentPage} de {totalPages})
        </span>
      </div>

      {/* Controles de navegação */}
      <div className="flex items-center space-x-1">
        {/* Botão Anterior */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === 1 || loading}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-8 px-3"
        >
          ← Anterior
        </Button>

        {/* Números de página - ocultar em mobile */}
        <div className="hidden sm:flex items-center space-x-1">
          {getVisiblePages().map((page, idx) =>
            page === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                disabled={loading}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Select para mobile */}
        <select
          className="sm:hidden text-sm border rounded px-2 py-1"
          value={currentPage}
          onChange={(e) => onPageChange(Number(e.target.value))}
          disabled={loading}
        >
          {Array.from({ length: totalPages }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Página {i + 1}
            </option>
          ))}
        </select>

        {/* Botão Próxima */}
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage === totalPages || loading}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-8 px-3"
        >
          Próxima →
        </Button>
      </div>
    </div>
  )
}