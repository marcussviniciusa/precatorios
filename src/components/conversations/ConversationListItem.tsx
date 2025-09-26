'use client'

import { Badge } from '@/components/ui/Badge'
import { Clock, User, Trash2, RefreshCw } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ConversationListItemProps {
  conversation: any
  index: number
  currentPage: number
  itemsPerPage: number
  onSelect: (id: string) => void
  onDelete: (id: string, name: string) => void
  isSelected: boolean
  isMobile: boolean
  isDeleting: boolean
}

export function ConversationListItem({
  conversation,
  index,
  currentPage,
  itemsPerPage,
  onSelect,
  onDelete,
  isSelected,
  isMobile,
  isDeleting
}: ConversationListItemProps) {
  const conversationNumber = conversation.sequentialNumber || ((currentPage - 1) * itemsPerPage) + index + 1

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      active: { variant: 'default', label: 'Ativa' },
      paused: { variant: 'secondary', label: 'Pausada' },
      completed: { variant: 'outline', label: 'Finalizada' },
      transferred: { variant: 'destructive', label: 'Transferida' }
    }

    const config = variants[status] || variants.active
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getClassificationBadge = (classification: string) => {
    const variants: Record<string, any> = {
      hot: { variant: 'hot', label: 'Quente' },
      warm: { variant: 'warm', label: 'Morno' },
      cold: { variant: 'cold', label: 'Frio' },
      discard: { variant: 'outline', label: 'Descarte' }
    }

    const config = variants[classification] || variants.cold
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return (
    <div
      className={`relative group p-4 border-b transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-primary' : 'hover:bg-gray-50'
      }`}
    >
      {/* Numeração Visual */}
      {isMobile ? (
        // Mobile: Canto superior direito
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-primary/10 text-primary rounded-full px-2 py-1 text-xs font-semibold min-w-[2rem] text-center">
            #{conversationNumber}
          </div>
        </div>
      ) : (
        // Desktop: Canto superior esquerdo
        <div className="absolute top-2 left-2 z-10">
          <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
            #{conversationNumber}
          </div>
        </div>
      )}

      {/* Botão de excluir */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onDelete(conversation._id, conversation.leadName)
        }}
        disabled={isDeleting}
        className={`absolute ${
          isMobile ? 'top-10 right-2' : 'top-2 right-2 opacity-0 group-hover:opacity-100'
        } transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 text-xs disabled:opacity-50 z-20`}
        title={`Excluir conversa com ${conversation.leadName}`}
      >
        {isDeleting ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          <Trash2 className="w-3 h-3" />
        )}
      </button>

      {/* Conteúdo da conversa */}
      <div
        className={`cursor-pointer ${isMobile ? 'pt-8 pr-12' : 'pl-12 pr-12'}`}
        onClick={() => onSelect(conversation._id)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
              {conversation.leadName?.split(' ').map((n: string) => n[0]).join('') || '?'}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-gray-900">
                {conversation.leadName}
                {!isMobile && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    #{conversationNumber}
                  </span>
                )}
              </h4>
              <p className="text-xs text-gray-500">{conversation.leadPhone}</p>
            </div>
          </div>

          {conversation.unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
              {conversation.unreadCount}
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 mb-2">
          {getStatusBadge(conversation.status)}
          {getClassificationBadge(conversation.classification)}
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-2">
          {conversation.lastMessage}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatDate(conversation.lastMessageTime)}</span>
          </div>
          {conversation.assignedAgent && (
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{conversation.assignedAgent}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}