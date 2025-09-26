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
      <div className="border-t bg-gray-50 p-4">
        <div className="flex items-center justify-center">
          <div className="text-sm text-green-600 font-medium flex items-center text-center">
            <CheckCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>
              {totalCount > 0
                ? `Todas as ${totalCount} conversas carregadas`
                : 'Nenhuma conversa disponível'
              }
            </span>
          </div>
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
    <div className="border-t bg-gray-50 p-4 space-y-3">
      {/* Linha 1: Informações da página */}
      <div className="flex items-center justify-center">
        <div className="text-sm text-gray-600 text-center">
          <span className="font-medium">
            Conversas #{pageInfo.startNumber} - #{pageInfo.endNumber}
          </span>
          <span className="text-gray-400 block sm:inline sm:ml-2">
            Página {currentPage} de {totalPages}
          </span>
        </div>
      </div>

      {/* Linha 2: Controles de navegação */}
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-1">
          {/* Botão Anterior */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1 || loading}
            onClick={() => onPageChange(currentPage - 1)}
            className="h-8 px-2 sm:px-3"
          >
            <span className="hidden sm:inline">← Anterior</span>
            <span className="sm:hidden">←</span>
          </Button>

          {/* Números de página - responsivo */}
          <div className="flex items-center space-x-1">
            {/* Mobile: Select dropdown */}
            <select
              className="sm:hidden text-sm border rounded px-2 py-1 min-w-0"
              value={currentPage}
              onChange={(e) => onPageChange(Number(e.target.value))}
              disabled={loading}
            >
              {Array.from({ length: totalPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>

            {/* Desktop: Números de página */}
            <div className="hidden sm:flex items-center space-x-1">
              {getVisiblePages().map((page, idx) =>
                page === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-1 text-gray-400 text-sm">
                    ...
                  </span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page as number)}
                    disabled={loading}
                    className="w-8 h-8 p-0 text-sm"
                  >
                    {page}
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Botão Próxima */}
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages || loading}
            onClick={() => onPageChange(currentPage + 1)}
            className="h-8 px-2 sm:px-3"
          >
            <span className="hidden sm:inline">Próxima →</span>
            <span className="sm:hidden">→</span>
          </Button>
        </div>
      </div>
    </div>
  )
}