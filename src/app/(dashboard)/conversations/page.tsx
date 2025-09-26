'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  MessageSquare,
  User,
  Clock,
  Send,
  MoreVertical,
  RefreshCw,
  Paperclip,
  Image,
  File,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  ArrowLeft
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'
import { getAuthHeaders } from '@/lib/client-auth'
import { usePaginatedConversations } from '@/hooks/usePaginatedConversations'
import { PaginationControls } from '@/components/conversations/PaginationControls'
import { ConversationsHeader } from '@/components/conversations/ConversationsHeader'
import { ConversationListItem } from '@/components/conversations/ConversationListItem'

// Component for WhatsApp-style audio messages
interface AudioMessageProps {
  audioUrl: string
  mimetype?: string
  isFromUser: boolean
  transcription?: string
  conversationId: string
  messageId: string
  onTranscriptionUpdate?: (transcription: string) => void
}

const AudioMessage = ({ audioUrl, mimetype, isFromUser, transcription, conversationId, messageId, onTranscriptionUpdate }: AudioMessageProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState<number | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [hasError, setHasError] = useState(false)
  const [showTranscription, setShowTranscription] = useState(false)
  const [currentTranscription, setCurrentTranscription] = useState(transcription)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoadedMetadata = () => {
      console.log('Audio loaded successfully:', audioUrl)
      setDuration(audio.duration)
    }

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    const handleError = (e: Event) => {
      console.error('Audio loading error:', e, audioUrl)
      setHasError(true)
    }

    const handleCanPlay = () => {
      console.log('Audio can play:', audioUrl)
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)
    audio.addEventListener('canplay', handleCanPlay)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audio.removeEventListener('canplay', handleCanPlay)
    }
  }, [audioUrl])

  const togglePlayPause = () => {
    const audio = audioRef.current
    if (!audio || hasError) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch(() => setHasError(true))
    }
  }

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const progressPercentage = duration ? (currentTime / duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    const newTime = percentage * duration

    audio.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleTranscribe = async () => {
    setIsTranscribing(true)
    setTranscriptionError(null)

    try {
      const response = await fetch(`/api/conversations/${conversationId}/transcribe-audio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setCurrentTranscription(data.transcription)
        setShowTranscription(true)
        onTranscriptionUpdate?.(data.transcription)
      } else {
        setTranscriptionError(data.error || 'Erro ao transcrever áudio')
      }
    } catch (error) {
      setTranscriptionError('Erro de conexão ao transcrever áudio')
    } finally {
      setIsTranscribing(false)
    }
  }

  if (hasError) {
    return (
      <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg max-w-[280px]">
        <div className="w-10 h-10 bg-red-400 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700">Erro no áudio</p>
          <p className="text-xs text-gray-500">Não foi possível carregar o áudio</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-3 p-3 rounded-lg w-full max-w-full sm:max-w-[280px] ${
      isFromUser ? 'bg-white shadow-sm border border-gray-100' : 'bg-gray-100'
    }`}>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous">
        <source src={audioUrl} type={mimetype || "audio/ogg"} />
        <source src={audioUrl} type="audio/ogg; codecs=opus" />
        <source src={audioUrl} type="audio/mpeg" />
        <source src={audioUrl} type="audio/wav" />
        <source src={audioUrl} type="audio/webm" />
        Seu navegador não suporta áudio.
      </audio>

      <button
        onClick={togglePlayPause}
        disabled={false}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          false
            ? 'bg-gray-300 cursor-not-allowed'
            : isFromUser
            ? 'bg-green-500 hover:bg-green-600 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {false ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-700">Áudio</p>
          <div className="flex items-center space-x-2">
            {currentTranscription ? (
              <button
                onClick={() => setShowTranscription(!showTranscription)}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title={showTranscription ? "Ocultar transcrição" : "Ver transcrição"}
              >
                {showTranscription ? (
                  <EyeOff className="w-3 h-3 text-gray-600" />
                ) : (
                  <Eye className="w-3 h-3 text-gray-600" />
                )}
              </button>
            ) : (
              <button
                onClick={handleTranscribe}
                disabled={isTranscribing}
                className="p-1 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
                title={isTranscribing ? "Transcrevendo..." : "Transcrever áudio"}
              >
                {isTranscribing ? (
                  <Loader2 className="w-3 h-3 text-gray-600 animate-spin" />
                ) : (
                  <FileText className="w-3 h-3 text-gray-600" />
                )}
              </button>
            )}
            <span className="text-xs text-gray-500">
              {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
            </span>
          </div>
        </div>

        <div
          className="w-full h-2 bg-gray-200 rounded-full overflow-hidden cursor-pointer hover:h-2.5 transition-all duration-200"
          onClick={handleProgressClick}
          title={`Clique para pular para ${formatTime((duration || 0) * (0.5))}`}
        >
          <div
            className={`h-full transition-all duration-200 ${
              isFromUser ? 'bg-green-500' : 'bg-green-500'
            }`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {showTranscription && currentTranscription && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-700 border-l-2 border-blue-400">
            <div className="font-medium text-blue-600 mb-1">Transcrição:</div>
            <div className="whitespace-pre-wrap">{currentTranscription}</div>
          </div>
        )}

        {transcriptionError && (
          <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-700 border-l-2 border-red-400">
            <div className="font-medium text-red-600 mb-1">Erro:</div>
            <div>{transcriptionError}</div>
          </div>
        )}

        {mimetype && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {mimetype.replace('audio/', '').toUpperCase()}
            {currentTranscription && <span className="ml-1">• Transcrição disponível</span>}
          </p>
        )}
      </div>
    </div>
  )
}

interface ConversationListItem {
  _id: string
  leadName: string
  leadPhone: string
  status: 'active' | 'paused' | 'completed' | 'transferred'
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  classification: 'hot' | 'warm' | 'cold' | 'discard'
  assignedAgent?: string
}

interface ConversationMessage {
  _id: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video'
  content: string
  sender: 'user' | 'bot' | 'agent'
  senderName?: string
  timestamp: Date
  read?: boolean
  metadata?: {
    messageId?: string
    mediaUrl?: string
    fileName?: string
    mimetype?: string
    transcription?: string
  }
}

interface ConversationDetails {
  _id: string
  leadId: any
  status: string
  assignedAgent?: string
  metadata?: {
    transferredAt?: string
    pausedAt?: string
    assignedAt?: string
    transferReason?: string
    pauseReason?: string
    [key: string]: any
  }
  messages: ConversationMessage[]
}

interface InstanceInfo {
  instanceName: string
  phoneNumber?: string
  profileName?: string
  profilePicUrl?: string
  state: string
  isMatched: boolean
}

export default function ConversationsPage() {
  // Hook de paginação
  const {
    conversations,
    loading: conversationsLoading,
    error: conversationsError,
    currentPage,
    totalPages,
    totalCount,
    itemsPerPage,
    pageInfo,
    showingAll,
    fetchPage,
    setItemsPerPage,
    refresh
  } = usePaginatedConversations(25)

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null)
  const [instanceError, setInstanceError] = useState<string | null>(null)
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [showConversationList, setShowConversationList] = useState(true)
  const [transferring, setTransferring] = useState(false)
  const [pausingBot, setPausingBot] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [transferReason, setTransferReason] = useState('')
  const [transferPriority, setTransferPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [agents, setAgents] = useState<any[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Next.js 14 hooks para URL parameters
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Função para atualizar URL sem recarregar página
  const updateURLWithConversation = useCallback((conversationId: string | null) => {
    const params = new URLSearchParams(searchParams?.toString() || '')

    if (conversationId) {
      params.set('selected', conversationId)
    } else {
      params.delete('selected')
    }

    const newURL = pathname + (params.toString() ? '?' + params.toString() : '')
    router.replace(newURL, { scroll: false })
  }, [searchParams, router, pathname])

  // Stable callback functions
  const handleNewMessage = useCallback((data: { conversationId: string; message: any }) => {
    // Update conversation details if it's the currently selected conversation
    if (selectedConversation === data.conversationId && conversationDetails) {
      setConversationDetails(prev => prev ? {
        ...prev,
        messages: [...prev.messages, data.message]
      } : null)
    }
  }, [selectedConversation, conversationDetails])

  const handleConversationUpdated = useCallback((data: { conversationId: string; lastMessage?: string; lastMessageTime?: Date; isUserMessage?: boolean }) => {
    // Refresh the conversations list to get updated data
    refresh()
  }, [refresh])

  const handleConversationDeleted = useCallback((data: { conversationId: string }) => {
    // Clear selection if it was the deleted conversation
    if (selectedConversation === data.conversationId) {
      setSelectedConversation(null)
      setConversationDetails(null)
      setInstanceInfo(null)
      setInstanceError(null)
    }
    // Refresh list to remove deleted conversation
    refresh()
  }, [selectedConversation, refresh])

  // WebSocket hook for real-time updates
  const { isConnected, joinConversation, leaveConversation } = useWebSocket({
    onNewMessage: handleNewMessage,
    onConversationUpdated: handleConversationUpdated,
    onConversationDeleted: handleConversationDeleted
  })

  // Refresh conversations when WebSocket reconnects to ensure data consistency
  useEffect(() => {
    if (isConnected && conversations.length > 0) {
      // Add a small delay to ensure WebSocket is fully ready
      const timeoutId = setTimeout(refresh, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, conversations.length])

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280) // xl breakpoint
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Initial load is handled by usePaginatedConversations hook

  // 🔥 NOVA LÓGICA: Auto-seleção baseada na URL
  useEffect(() => {
    const selectedParam = searchParams?.get('selected')

    // Só processa se há parâmetro e conversas carregadas
    if (selectedParam && conversations.length > 0 && !conversationsLoading) {
      // Verifica se a conversa existe
      const conversationExists = conversations.some(conv => conv._id === selectedParam)

      if (conversationExists) {
        // Se não está selecionada ou é diferente da atual
        if (selectedConversation !== selectedParam) {
          console.log('Auto-selecting conversation from URL:', selectedParam)
          handleConversationSelect(selectedParam, false) // false = não atualizar URL
        }
      } else {
        // Conversa não existe, limpar parâmetro
        console.log('Conversation not found, clearing URL parameter')
        updateURLWithConversation(null)
      }
    }
    // Se não há parâmetro mas há seleção, limpar seleção
    else if (!selectedParam && selectedConversation) {
      console.log('No URL parameter, clearing selection')
      setSelectedConversation(null)
      setConversationDetails(null)
      setInstanceInfo(null)
      setInstanceError(null)
      if (isMobile) {
        setShowConversationList(true)
      }
    }
  }, [searchParams, conversations, conversationsLoading, selectedConversation])

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (conversationDetails?.messages?.length) {
      scrollToBottom()
    }
  }, [conversationDetails?.messages])

  // Buscar informações da instância para uma conversa
  const fetchInstanceInfo = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/instance`)
      if (response.ok) {
        const data = await response.json()
        setInstanceInfo(data.instance)
        if (data.warning) {
          setInstanceError(data.warning)
        } else {
          setInstanceError(null)
        }
      } else {
        setInstanceInfo(null)
        setInstanceError('Erro ao carregar informações da instância')
      }
    } catch (error) {
      console.error('Erro ao buscar instância:', error)
      setInstanceInfo(null)
      setInstanceError('Erro ao conectar com a instância')
    }
  }

  // Carregar mensagens de uma conversa específica
  const fetchConversationMessages = async (conversationId: string) => {
    try {
      setMessagesLoading(true)
      const response = await fetch(`/api/conversations/${conversationId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setConversationDetails(data.conversation)

        // Buscar informações da instância
        await fetchInstanceInfo(conversationId)

        // Marcar mensagens como lidas
        await fetch(`/api/conversations/${conversationId}/read`, {
          method: 'POST'
        })

        // Refresh conversations to update unread count
        refresh()
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error)
    } finally {
      setMessagesLoading(false)
    }
  }

  // Selecionar arquivo
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setShowFileMenu(false)
    }
  }

  // Remover arquivo selecionado
  const removeSelectedFile = () => {
    setSelectedFile(null)
  }

  // Enviar nova mensagem
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedConversation || sendingMessage) return

    // Verificar se temos informações da instância
    if (!instanceInfo) {
      setInstanceError('Nenhuma instância ativa encontrada para esta conversa')
      return
    }

    try {
      setSendingMessage(true)

      // Se há arquivo, enviar como FormData
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('message', newMessage || '')
        formData.append('instanceName', instanceInfo.instanceName)

        const response = await fetch(`/api/conversations/${selectedConversation}/send-media`, {
          method: 'POST',
          body: formData
        })

        if (response.ok) {
          // Não adicionar mensagem aqui - WebSocket já vai fazer isso via handleNewMessage

          setNewMessage('')
          setSelectedFile(null)

          // Atualizar lista de conversas
          await refresh()
        }
      } else {
        // Enviar mensagem de texto normal
        const response = await fetch(`/api/conversations/${selectedConversation}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: newMessage,
            instanceName: instanceInfo.instanceName
          })
        })

        if (response.ok) {
          // Não adicionar mensagem aqui - WebSocket já vai fazer isso via handleNewMessage
          setNewMessage('')

          // Atualizar lista de conversas
          await refresh()
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  // 🔥 FUNÇÃO ATUALIZADA: Lidar com seleção de conversa
  const handleConversationSelect = (conversationId: string, updateURL: boolean = true) => {
    // Leave previous conversation room
    if (selectedConversation && selectedConversation !== conversationId) {
      leaveConversation(selectedConversation)
    }

    setSelectedConversation(conversationId)
    fetchConversationMessages(conversationId)

    // Join new conversation room for real-time updates
    joinConversation(conversationId)

    // Atualizar URL apenas se solicitado (evita loop)
    if (updateURL) {
      updateURLWithConversation(conversationId)
    }

    // Em mobile, esconder lista de conversas quando selecionar uma
    if (isMobile) {
      setShowConversationList(false)
    }
  }

  // 🔥 FUNÇÃO ATUALIZADA: Voltar para lista de conversas (mobile)
  const handleBackToConversations = () => {
    if (selectedConversation) {
      leaveConversation(selectedConversation)
    }
    setSelectedConversation(null)
    setConversationDetails(null)
    setInstanceInfo(null)
    setInstanceError(null)
    setShowConversationList(true)

    // Limpar parâmetro da URL
    updateURLWithConversation(null)
  }

  // Função para buscar agentes disponíveis
  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      const response = await fetch('/api/agents', {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setAgents(data)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  // Função para abrir modal de transferência
  const openTransferModal = () => {
    setTransferReason('')
    setTransferPriority('medium')
    setSelectedAgent('')
    setShowTransferModal(true)
    fetchAgents()
  }

  // Função para transferir conversa (com modal)
  const handleTransferConversation = async () => {
    if (!selectedConversation) return

    try {
      setTransferring(true)

      const payload: any = {
        action: 'transfer',
        reason: transferReason.trim() || 'Transferência via interface',
        priority: transferPriority
      }


      // Se um agente foi selecionado, incluir na transferência
      if (selectedAgent) {
        payload.assignToAgent = selectedAgent
      }

      const response = await fetch(`/api/conversations/${selectedConversation}/transfer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        // Atualizar conversa na lista
        await refresh()

        // Atualizar detalhes se necessário
        if (conversationDetails) {
          setConversationDetails(prev => prev ? {
            ...prev,
            status: 'transferred'
          } : null)
        }

        // Fechar modal e limpar estado
        setShowTransferModal(false)
        setTransferReason('')
        setSelectedAgent('')

        // Transferência realizada com sucesso - modal será fechado automaticamente
      } else {
        const error = await response.json()
        alert('Erro ao transferir: ' + error.error)
      }
    } catch (error) {
      console.error('Error transferring conversation:', error)
      alert('Erro ao transferir conversa')
    } finally {
      setTransferring(false)
    }
  }

  // Função para pausar/retomar bot
  const handlePauseBotToggle = async () => {
    if (!selectedConversation || !conversationDetails) return

    const action = conversationDetails.status === 'paused' ? 'resume' : 'pause'
    const confirmMsg = action === 'pause'
      ? 'Pausar o bot nesta conversa?'
      : 'Retomar o atendimento automático?'

    if (!confirm(confirmMsg)) return

    try {
      setPausingBot(true)
      const response = await fetch(`/api/conversations/${selectedConversation}/transfer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action,
          reason: action === 'pause' ? 'Bot pausado manualmente' : 'Bot retomado'
        })
      })

      if (response.ok) {
        // Atualizar conversa na lista
        await refresh()

        // Atualizar detalhes
        const newStatus = action === 'pause' ? 'paused' : 'active'
        if (conversationDetails) {
          setConversationDetails(prev => prev ? {
            ...prev,
            status: newStatus
          } : null)
        }

        alert(action === 'pause' ? 'Bot pausado!' : 'Bot retomado!')
      } else {
        const error = await response.json()
        alert('Erro: ' + error.error)
      }
    } catch (error) {
      console.error('Error toggling bot:', error)
      alert('Erro ao alterar status do bot')
    } finally {
      setPausingBot(false)
    }
  }

  // Função para excluir conversa
  const handleDeleteConversation = async (conversationId: string, leadName: string) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a conversa com ${leadName}?\n\nEsta ação não pode ser desfeita e todas as mensagens serão perdidas.`
    )

    if (!confirmed) return

    try {
      setDeletingConversation(conversationId)

      const response = await fetch(`/api/conversations/${conversationId}/delete`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Atualizar lista de conversas
        await refresh()

        // Se era a conversa selecionada, limpar seleção
        if (selectedConversation === conversationId) {
          setSelectedConversation(null)
          setConversationDetails(null)
          setInstanceInfo(null)
          setInstanceError(null)
        }

        // Opcional: mostrar toast de sucesso
        console.log('Conversa excluída com sucesso')
      } else {
        const errorData = await response.json()
        alert(`Erro ao excluir conversa: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Erro ao excluir conversa:', error)
      alert('Erro ao excluir conversa. Tente novamente.')
    } finally {
      setDeletingConversation(null)
    }
  }

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

  if (conversationsLoading && conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando conversas...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header Mobile com botão voltar */}
      {isMobile && !showConversationList ? (
        <div className="flex-shrink-0 flex items-center gap-3 mb-4 p-2 bg-white border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToConversations}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <span>{conversationDetails?.leadId?.name || 'Carregando...'}</span>
              {isConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Conectado em tempo real" />
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full" title="Desconectado do tempo real" />
              )}
            </h1>
            {instanceInfo?.phoneNumber && (
              <p className="text-sm text-gray-600">
                {instanceInfo.phoneNumber.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Layout responsivo principal */}
      {isMobile ? (
        /* Layout Mobile: Lista OU Chat */
        <div className="flex-1 overflow-hidden">
          {showConversationList ? (
            /* Lista de Conversas Mobile */
            <Card className="flex flex-col h-full overflow-hidden">
              <CardHeader className="flex-shrink-0 pb-3">
                <CardTitle className="flex items-center justify-between text-lg">
                  <span>Conversas ({conversations.length})</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 overflow-hidden">
                {conversations.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-12">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conversa</h3>
                      <p className="text-gray-600 px-4">
                        Configure a Evolution API para começar a receber conversas do WhatsApp.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full overflow-y-auto">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation._id}
                        className={`relative group p-4 border-b transition-colors active:bg-blue-50 ${
                          selectedConversation === conversation._id ? 'bg-blue-50 border-l-4 border-l-primary' : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Botão de excluir (mobile touch) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteConversation(conversation._id, conversation.leadName)
                          }}
                          disabled={deletingConversation === conversation._id}
                          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white rounded-full p-2 text-xs disabled:opacity-50 touch-manipulation"
                          title={`Excluir conversa com ${conversation.leadName}`}
                        >
                          {deletingConversation === conversation._id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>

                        {/* Conteúdo da conversa (clicável para selecionar) */}
                        <div
                          className="cursor-pointer pr-12 touch-manipulation"
                          onClick={() => handleConversationSelect(conversation._id)}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                                {conversation.leadName.split(' ').map(n => n[0]).join('')}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-gray-900 text-base truncate">{conversation.leadName}</h4>
                                <p className="text-sm text-gray-500">{conversation.leadPhone}</p>
                              </div>
                            </div>
                            {conversation.unreadCount > 0 && (
                              <span className="bg-red-500 text-white text-xs rounded-full px-2.5 py-1 min-w-[24px] text-center font-medium">
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 mb-3">
                            {getStatusBadge(conversation.status)}
                            {getClassificationBadge(conversation.classification)}
                          </div>

                          <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-5">
                            {conversation.lastMessage}
                          </p>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatDate(new Date(conversation.lastMessageTime))}</span>
                            </div>
                            {conversation.assignedAgent && (
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span className="truncate max-w-20">{conversation.assignedAgent}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Chat View Mobile */
            <Card className="flex flex-col h-full overflow-hidden">
              <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
                {selectedConversation ? (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                      {messagesLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-sm text-gray-500">Carregando mensagens...</div>
                        </div>
                      ) : conversationDetails?.messages?.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                          </div>
                        </div>
                      ) : (
                        conversationDetails?.messages?.map((message, index) => {
                          const prevMessage = conversationDetails?.messages?.[index - 1]
                          const isNewSender = !prevMessage || prevMessage.sender !== message.sender

                          return (
                          <div key={message._id || index} className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'} ${isNewSender ? 'mt-4' : ''}`}>
                            <div className={`max-w-[85%] p-3 rounded-lg ${
                              message.sender === 'user'
                                ? 'bg-white shadow-sm'
                                : message.sender === 'bot'
                                ? 'bg-blue-100 text-blue-900'
                                : 'bg-primary text-white'
                            }`}>
                              {/* Renderizar conteúdo da mensagem (resumido para mobile) */}
                              {message.type === 'text' ? (
                                <p className="text-sm leading-5">{message.content}</p>
                              ) : message.type === 'image' && message.metadata?.mediaUrl ? (
                                <div className="space-y-2">
                                  <img
                                    src={message.metadata.mediaUrl}
                                    alt="Imagem"
                                    className="rounded-lg max-w-full h-auto cursor-pointer"
                                    style={{ maxHeight: '300px' }}
                                    onClick={() => window.open(message.metadata?.mediaUrl, '_blank')}
                                  />
                                  {message.content !== '[Imagem enviada]' && (
                                    <p className="text-sm">{message.content}</p>
                                  )}
                                </div>
                              ) : message.type === 'audio' && message.metadata?.mediaUrl ? (
                                <AudioMessage
                                  audioUrl={message.metadata.mediaUrl}
                                  mimetype={message.metadata?.mimetype}
                                  isFromUser={message.sender === 'user'}
                                  transcription={message.metadata?.transcription}
                                  conversationId={selectedConversation}
                                  messageId={message._id}
                                  onTranscriptionUpdate={(transcription) => {
                                    setConversationDetails(prev => {
                                      if (!prev) return prev
                                      const updatedMessages = prev.messages.map(msg =>
                                        msg._id === message._id
                                          ? { ...msg, metadata: { ...msg.metadata, transcription } }
                                          : msg
                                      )
                                      return { ...prev, messages: updatedMessages }
                                    })
                                  }}
                                />
                              ) : (
                                <p className="text-sm">{message.content}</p>
                              )}

                              <div className="flex items-center justify-between mt-2">
                                <p className={`text-xs ${
                                  message.sender === 'user'
                                    ? 'text-gray-500'
                                    : message.sender === 'bot'
                                    ? 'text-blue-600'
                                    : 'opacity-80'
                                }`}>
                                  {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  }) : 'Agora'}
                                </p>
                                {message.sender === 'user' && (
                                  <span className={`text-xs ${message.read ? 'text-blue-500' : 'text-gray-400'}`}>
                                    {message.read ? '✓✓' : '✓'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          )
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Input de mensagem mobile */}
                    <div className="flex-shrink-0 p-3 bg-white border-t space-y-2">
                      {/* Preview do arquivo selecionado */}
                      {selectedFile && (
                        <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={removeSelectedFile}
                            className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      )}

                      {/* Input principal */}
                      <div className="flex items-center space-x-2">
                        {/* Botão de anexo */}
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowFileMenu(!showFileMenu)}
                            className="p-3 h-12 w-12 touch-manipulation"
                          >
                            <Paperclip className="w-5 h-5" />
                          </Button>

                          {/* Menu de anexos mobile */}
                          {showFileMenu && (
                            <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg py-1 min-w-[140px] z-10">
                              <label className="flex items-center space-x-2 px-3 py-3 active:bg-gray-100 cursor-pointer touch-manipulation">
                                <Image className="w-4 h-4" />
                                <span className="text-sm">Imagem</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileSelect}
                                  className="hidden"
                                />
                              </label>
                              <label className="flex items-center space-x-2 px-3 py-3 active:bg-gray-100 cursor-pointer touch-manipulation">
                                <File className="w-4 h-4" />
                                <span className="text-sm">Documento</span>
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                                  onChange={handleFileSelect}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Digite sua mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                          disabled={sendingMessage}
                          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 touch-manipulation"
                        />
                        <Button
                          size="sm"
                          onClick={sendMessage}
                          disabled={(!newMessage.trim() && !selectedFile) || sendingMessage || !instanceInfo}
                          className="h-12 w-12 p-0 touch-manipulation"
                          title={!instanceInfo ? 'Nenhuma instância ativa encontrada' : ''}
                        >
                          {sendingMessage ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                          ) : (
                            <Send className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Erro ao carregar conversa</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Layout Desktop - mantém o original */
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 overflow-hidden">
          {/* Lista de conversas desktop */}
          <Card className="xl:col-span-1 flex flex-col overflow-hidden">
            {/* Header com seletor de itens por página */}
            <ConversationsHeader
              totalCount={totalCount}
              itemsPerPage={itemsPerPage}
              pageInfo={pageInfo}
              showingAll={showingAll}
              loading={conversationsLoading}
              onItemsPerPageChange={setItemsPerPage}
              onRefresh={refresh}
            />
            <CardContent className="p-0 flex-1 overflow-hidden">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center py-12">
                    <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conversa</h3>
                    <p className="text-gray-600">
                      Configure a Evolution API para começar a receber conversas do WhatsApp.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto">
                  {conversations.map((conversation, index) => (
                    <ConversationListItem
                      key={conversation._id}
                      conversation={conversation}
                      index={index}
                      currentPage={currentPage}
                      itemsPerPage={itemsPerPage}
                      onSelect={handleConversationSelect}
                      onDelete={handleDeleteConversation}
                      isSelected={selectedConversation === conversation._id}
                      isMobile={false}
                      isDeleting={deletingConversation === conversation._id}
                    />
                  ))}
                </div>
              )}
            </CardContent>

            {/* Componente de paginação */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageInfo={pageInfo}
              itemsPerPage={itemsPerPage}
              totalCount={totalCount}
              showingAll={showingAll}
              loading={conversationsLoading}
              onPageChange={fetchPage}
            />
          </Card>

          {/* Chat desktop - mantém o original completo */}
          <Card className="xl:col-span-2 flex flex-col overflow-hidden">
            <CardHeader className="flex-shrink-0 p-0 pt-2 px-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex flex-col">
                  {selectedConversation ? (
                    <div>
                      <span className="text-lg font-semibold">
                        Conversa com {conversationDetails?.leadId?.name || 'Carregando...'}
                      </span>

                      {/* Informações da instância */}
                      <div className="flex items-center space-x-2 mt-1">
                        {instanceInfo ? (
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            {instanceInfo.profilePicUrl ? (
                              <img
                                src={instanceInfo.profilePicUrl}
                                alt="WhatsApp"
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <Smartphone className="w-4 h-4" />
                            )}
                            <span>
                              {instanceInfo.profileName || instanceInfo.instanceName}
                              {instanceInfo.phoneNumber && (
                                <span className="text-gray-500 ml-1">
                                  ({instanceInfo.phoneNumber.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')})
                                </span>
                              )}
                            </span>
                            {instanceInfo.isMatched ? (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-yellow-500" />
                            )}
                          </div>
                        ) : instanceError ? (
                          <div className="flex items-center space-x-1 text-sm text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{instanceError}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-sm text-gray-500">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Carregando instância...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span>Selecione uma conversa</span>
                  )}
                </div>

                {/* Informações de atribuição */}
                {selectedConversation && conversationDetails && (
                  <div className="mb-2">
                    {conversationDetails.status === 'transferred' && (
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            Transferida
                          </Badge>
                          {conversationDetails.assignedAgent && (
                            <div className="flex items-center space-x-1 text-gray-600">
                              <User className="w-3 h-3" />
                              <span>Atribuída para: <strong>{conversationDetails.assignedAgent}</strong></span>
                            </div>
                          )}
                        </div>
                        {conversationDetails.metadata?.transferredAt && (
                          <div className="text-xs text-gray-500">
                            {formatDate(conversationDetails.metadata.transferredAt)}
                          </div>
                        )}
                      </div>
                    )}
                    {conversationDetails.status === 'paused' && (
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Bot Pausado
                        </Badge>
                        {conversationDetails.metadata?.pausedAt && (
                          <div className="text-xs text-gray-500">
                            Pausado em: {formatDate(conversationDetails.metadata.pausedAt)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {selectedConversation && (
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openTransferModal}
                      disabled={transferring || conversationDetails?.status === 'transferred'}
                    >
                      {transferring ? 'Transferindo...' : 'Transferir'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseBotToggle}
                      disabled={pausingBot || conversationDetails?.status === 'transferred'}
                    >
                      {pausingBot ? 'Processando...' :
                        conversationDetails?.status === 'paused' ? 'Retomar Bot' : 'Pausar Bot'}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden p-0 px-3">
              {selectedConversation ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 rounded-lg mb-2">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-gray-500">Carregando mensagens...</div>
                      </div>
                    ) : conversationDetails?.messages?.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                          <p className="text-sm text-gray-500">Nenhuma mensagem ainda</p>
                        </div>
                      </div>
                    ) : (
                      conversationDetails?.messages?.map((message, index) => {
                        const prevMessage = conversationDetails?.messages?.[index - 1]
                        const isNewSender = !prevMessage || prevMessage.sender !== message.sender

                        return (
                        <div key={message._id || index} className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'} ${isNewSender ? 'mt-4' : ''}`}>
                          <div className={`max-w-xs p-3 rounded-lg ${
                            message.sender === 'user'
                              ? 'bg-white shadow-sm'
                              : message.sender === 'bot'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-primary text-white'
                          }`}>
                            {/* Renderizar conteúdo baseado no tipo de mensagem - versão completa desktop */}
                            {message.type === 'image' && message.metadata?.mediaUrl ? (
                              <div className="space-y-2">
                                <img
                                  src={message.metadata.mediaUrl}
                                  alt="Imagem enviada"
                                  className="rounded-lg max-w-full h-auto cursor-pointer"
                                  style={{ maxHeight: '300px' }}
                                  onClick={() => message.metadata?.mediaUrl && window.open(message.metadata.mediaUrl, '_blank')}
                                />
                                {message.content !== '[Imagem enviada]' && (
                                  <p className="text-sm">{message.content}</p>
                                )}
                              </div>
                            ) : message.type === 'document' ? (
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                                  <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">
                                      {message.metadata?.fileName?.split('.').pop()?.toUpperCase() || 'DOC'}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {message.metadata?.fileName || 'Documento'}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      Documento PDF
                                    </p>
                                  </div>
                                  {message.metadata && message.metadata.mediaUrl && (
                                    <button
                                      onClick={() => message.metadata?.mediaUrl && window.open(message.metadata.mediaUrl, '_blank')}
                                      className="text-blue-500 hover:text-blue-700 text-xs"
                                    >
                                      Abrir
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : message.type === 'audio' ? (
                              <div className="space-y-2">
                                {message.metadata?.mediaUrl ? (
                                  <AudioMessage
                                    audioUrl={message.metadata.mediaUrl}
                                    mimetype={message.metadata?.mimetype}
                                    isFromUser={message.sender === 'user'}
                                    transcription={message.metadata?.transcription}
                                    conversationId={selectedConversation}
                                    messageId={message._id}
                                    onTranscriptionUpdate={(transcription) => {
                                      // Atualizar o estado local da mensagem
                                      setConversationDetails(prev => {
                                        if (!prev) return prev
                                        const updatedMessages = prev.messages.map(msg =>
                                          msg._id === message._id
                                            ? { ...msg, metadata: { ...msg.metadata, transcription } }
                                            : msg
                                        )
                                        return { ...prev, messages: updatedMessages }
                                      })
                                    }}
                                  />
                                ) : (
                                  <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg max-w-[280px]">
                                    <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
                                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-700">Mensagem de áudio</p>
                                      <p className="text-xs text-gray-500">Áudio não disponível para reprodução</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : message.type === 'video' ? (
                              <div className="space-y-2">
                                {message.metadata?.mediaUrl ? (
                                  <video
                                    controls
                                    className="rounded-lg max-w-full h-auto"
                                    style={{ maxHeight: '300px' }}
                                  >
                                    <source src={message.metadata.mediaUrl} type="video/mp4" />
                                    Seu navegador não suporta vídeo.
                                  </video>
                                ) : (
                                  <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                                    <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
                                      <span className="text-white text-xs">📹</span>
                                    </div>
                                    <p className="text-sm">Vídeo enviado</p>
                                  </div>
                                )}
                                {message.content !== '[Vídeo enviado]' && (
                                  <p className="text-sm">{message.content}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm">{message.content}</p>
                            )}
                            <div className="flex items-center justify-between mt-1">
                              <p className={`text-xs ${
                                message.sender === 'user'
                                  ? 'text-gray-500'
                                  : message.sender === 'bot'
                                  ? 'text-blue-600'
                                  : 'opacity-80'
                              }`}>
                                {message.timestamp ? new Date(message.timestamp).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : 'Agora'}
                              </p>
                              {message.sender === 'user' && (
                                <span className={`text-xs ${message.read ? 'text-blue-500' : 'text-gray-400'}`}>
                                  {message.read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                            {message.senderName && message.sender !== 'user' && (
                              <p className={`text-xs mt-1 ${
                                message.sender === 'bot' ? 'text-blue-600' : 'opacity-70'
                              }`}>
                                {message.sender === 'bot' ? 'Bot' : message.senderName}
                              </p>
                            )}
                          </div>
                        </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="flex-shrink-0 space-y-2 pb-3">
                    {/* Aviso de erro de instância */}
                    {instanceError && !instanceInfo && (
                      <div className="flex items-center space-x-2 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">{instanceError}</span>
                      </div>
                    )}

                    {/* Preview do arquivo selecionado */}
                    {selectedFile && (
                      <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={removeSelectedFile}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      {/* Botão de anexo */}
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFileMenu(!showFileMenu)}
                          className="p-2"
                        >
                          <Paperclip className="w-4 h-4" />
                        </Button>

                        {/* Menu de anexos */}
                        {showFileMenu && (
                          <div className="absolute bottom-full left-0 mb-2 bg-white border rounded-lg shadow-lg py-1 min-w-[120px]">
                            <label className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                              <Image className="w-4 h-4" />
                              <span className="text-sm">Imagem</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </label>
                            <label className="flex items-center space-x-2 px-3 py-2 hover:bg-gray-100 cursor-pointer">
                              <File className="w-4 h-4" />
                              <span className="text-sm">Documento</span>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
                                onChange={handleFileSelect}
                                className="hidden"
                              />
                            </label>
                          </div>
                        )}
                      </div>

                      <input
                        type="text"
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        disabled={sendingMessage}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                      />
                      <Button
                        size="sm"
                        onClick={sendMessage}
                        disabled={(!newMessage.trim() && !selectedFile) || sendingMessage || !instanceInfo}
                        title={!instanceInfo ? 'Nenhuma instância ativa encontrada' : ''}
                      >
                        {sendingMessage ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Selecione uma conversa para visualizar as mensagens</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Transferência */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Transferir Conversa
              </h3>

              <div className="space-y-4">
                {/* Motivo da transferência */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo da transferência (opcional)
                  </label>
                  <textarea
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    placeholder="Ex: Cliente solicitou falar com humano, dúvida complexa..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se não informado, será usado o motivo padrão
                  </p>
                </div>

                {/* Prioridade */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridade
                  </label>
                  <select
                    value={transferPriority}
                    onChange={(e) => setTransferPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                {/* Seleção de agente */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Atribuir para agente (opcional)
                  </label>
                  {loadingAgents ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      <span className="text-sm text-gray-600">Carregando agentes...</span>
                    </div>
                  ) : (
                    <select
                      value={selectedAgent}
                      onChange={(e) => setSelectedAgent(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">-- Fila de atendimento --</option>
                      {agents.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name || agent.email} ({agent.role})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Se não selecionar um agente, a conversa ficará na fila geral
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowTransferModal(false)}
                  disabled={transferring}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleTransferConversation}
                  disabled={transferring}
                  className="flex-1"
                >
                  {transferring ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      Transferindo...
                    </>
                  ) : (
                    'Transferir'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}