'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  MessageSquare, 
  User, 
  Clock, 
  Send,
  Phone,
  MoreVertical,
  RefreshCw,
  Paperclip,
  Image,
  File,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Trash2
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { useWebSocket } from '@/hooks/useWebSocket'

interface ConversationListItem {
  _id: string
  leadName: string
  leadPhone: string
  status: 'active' | 'paused' | 'completed' | 'transferred'
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  classification: 'hot' | 'warm' | 'cold' | 'descarte'
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
  }
}

interface ConversationDetails {
  _id: string
  leadId: any
  status: string
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
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [conversationDetails, setConversationDetails] = useState<ConversationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [instanceInfo, setInstanceInfo] = useState<InstanceInfo | null>(null)
  const [instanceError, setInstanceError] = useState<string | null>(null)
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

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
    // Update the conversation in the list
    setConversations(prev => prev.map(conv => {
      if (conv._id === data.conversationId) {
        // Only increment unread count if:
        // 1. It's a user message (not bot/agent)
        // 2. The conversation is not currently selected
        const shouldIncrementUnread = data.isUserMessage && selectedConversation !== data.conversationId
        
        return {
          ...conv,
          lastMessage: data.lastMessage || conv.lastMessage,
          lastMessageTime: data.lastMessageTime ? new Date(data.lastMessageTime) : conv.lastMessageTime,
          unreadCount: selectedConversation === data.conversationId 
            ? 0 // Reset to 0 if conversation is selected
            : shouldIncrementUnread 
            ? conv.unreadCount + 1 
            : conv.unreadCount // Keep existing count for bot/agent messages
        }
      }
      return conv
    }))
  }, [selectedConversation])

  const handleConversationDeleted = useCallback((data: { conversationId: string }) => {
    // Remove conversation from list
    setConversations(prev => prev.filter(conv => conv._id !== data.conversationId))
    
    // Clear selection if it was the deleted conversation
    if (selectedConversation === data.conversationId) {
      setSelectedConversation(null)
      setConversationDetails(null)
      setInstanceInfo(null)
      setInstanceError(null)
    }
  }, [selectedConversation])

  // WebSocket hook for real-time updates
  const { isConnected, joinConversation, leaveConversation } = useWebSocket({
    onNewMessage: handleNewMessage,
    onConversationUpdated: handleConversationUpdated,
    onConversationDeleted: handleConversationDeleted
  })

  // Refresh conversations when WebSocket reconnects to ensure data consistency
  useEffect(() => {
    if (isConnected && conversations.length > 0) {
      // Refresh conversations data after reconnection
      const refreshConversations = async () => {
        try {
          const response = await fetch('/api/conversations')
          if (response.ok) {
            const conversationsData = await response.json()
            setConversations(conversationsData)
          }
        } catch (error) {
          console.error('Error refreshing conversations after reconnection:', error)
        }
      }
      
      // Add a small delay to ensure WebSocket is fully ready
      const timeoutId = setTimeout(refreshConversations, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, conversations.length])

  useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch('/api/conversations')
        if (response.ok) {
          const conversationsData = await response.json()
          setConversations(conversationsData)
        }
      } catch (error) {
        console.error('Erro ao carregar conversas:', error)
        setConversations([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (conversationDetails?.messages?.length) {
      scrollToBottom()
    }
  }, [conversationDetails?.messages])

  // Refresh unread count from database for a specific conversation
  const refreshUnreadCount = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/unread-count`)
      if (response.ok) {
        const { unreadCount } = await response.json()
        
        setConversations(prev => prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount }
            : conv
        ))
      }
    } catch (error) {
      console.error('Error refreshing unread count:', error)
    }
  }

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
        
        // Atualizar contador de não lidas na lista
        setConversations(prev => prev.map(conv => 
          conv._id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        ))
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
          const data = await response.json()
          
          // Adicionar nova mensagem à lista
          if (conversationDetails) {
            setConversationDetails(prev => prev ? {
              ...prev,
              messages: [...prev.messages, data.message]
            } : null)
          }
          
          setNewMessage('')
          setSelectedFile(null)
          
          // Atualizar lista de conversas
          const conversationsResponse = await fetch('/api/conversations')
          if (conversationsResponse.ok) {
            const conversationsData = await conversationsResponse.json()
            setConversations(conversationsData)
          }
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
          const data = await response.json()
          
          // Adicionar nova mensagem à lista
          if (conversationDetails) {
            setConversationDetails(prev => prev ? {
              ...prev,
              messages: [...prev.messages, data.message]
            } : null)
          }
          
          setNewMessage('')
          
          // Atualizar lista de conversas
          const conversationsResponse2 = await fetch('/api/conversations')
          if (conversationsResponse2.ok) {
            const conversationsData = await conversationsResponse2.json()
            setConversations(conversationsData)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  // Lidar com seleção de conversa
  const handleConversationSelect = (conversationId: string) => {
    // Leave previous conversation room
    if (selectedConversation) {
      leaveConversation(selectedConversation)
    }
    
    setSelectedConversation(conversationId)
    fetchConversationMessages(conversationId)
    
    // Join new conversation room for real-time updates
    joinConversation(conversationId)
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
        // Remover da lista de conversas
        setConversations(prev => prev.filter(conv => conv._id !== conversationId))
        
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
      descarte: { variant: 'outline', label: 'Descarte' }
    }
    
    const config = variants[classification] || variants.cold
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando conversas...</div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex-shrink-0 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center space-x-2">
            <span>Conversas</span>
            {isConnected ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Conectado em tempo real" />
            ) : (
              <div className="w-2 h-2 bg-red-500 rounded-full" title="Desconectado do tempo real" />
            )}
          </h1>
          <p className="text-gray-600">Gerencie todas as conversas do WhatsApp</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Phone className="w-4 h-4 mr-2" />
            Ligar
          </Button>
          <Button>
            <MessageSquare className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center justify-between">
              <span>Conversas ({conversations.length})</span>
              <Button variant="ghost" size="icon">
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
                  <p className="text-gray-600">
                    Configure a Evolution API para começar a receber conversas do WhatsApp.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                {conversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={`relative group p-4 border-b transition-colors ${
                    selectedConversation === conversation._id ? 'bg-blue-50 border-l-4 border-l-primary' : 'hover:bg-gray-50'
                  }`}
                >
                  {/* Botão de excluir (visível no hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteConversation(conversation._id, conversation.leadName)
                    }}
                    disabled={deletingConversation === conversation._id}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full p-1 text-xs disabled:opacity-50"
                    title={`Excluir conversa com ${conversation.leadName}`}
                  >
                    {deletingConversation === conversation._id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Trash2 className="w-3 h-3" />
                    )}
                  </button>
                  
                  {/* Conteúdo da conversa (clicável para selecionar) */}
                  <div 
                    className="cursor-pointer"
                    onClick={() => handleConversationSelect(conversation._id)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {conversation.leadName.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{conversation.leadName}</h4>
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
                        <span>{formatDate(new Date(conversation.lastMessageTime))}</span>
                      </div>
                      {conversation.assignedAgent && (
                        <div className="flex items-center space-x-1">
                          <User className="w-3 h-3" />
                          <span>{conversation.assignedAgent}</span>
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

        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
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
              
              {selectedConversation && (
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    Transferir
                  </Button>
                  <Button variant="outline" size="sm">
                    Pausar Bot
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg mb-4">
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
                    conversationDetails?.messages?.map((message, index) => (
                      <div key={message._id || index} className={`flex ${message.sender === 'user' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-xs p-3 rounded-lg ${
                          message.sender === 'user' 
                            ? 'bg-white shadow-sm' 
                            : message.sender === 'bot'
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-primary text-white'
                        }`}>
                          {/* Renderizar conteúdo baseado no tipo de mensagem */}
                          {message.type === 'image' && message.metadata?.mediaUrl ? (
                            <div className="space-y-2">
                              <img 
                                src={message.metadata.mediaUrl} 
                                alt="Imagem enviada" 
                                className="rounded-lg max-w-full h-auto cursor-pointer"
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
                              <div className="flex items-center space-x-2 p-2 bg-gray-100 rounded">
                                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                                  <span className="text-white text-xs">🎵</span>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    Áudio enviado
                                  </p>
                                </div>
                                {message.metadata && message.metadata.mediaUrl && (
                                  <audio controls className="h-8">
                                    <source src={message.metadata.mediaUrl} type="audio/ogg" />
                                    <source src={message.metadata.mediaUrl} type="audio/mpeg" />
                                    Seu navegador não suporta áudio.
                                  </audio>
                                )}
                              </div>
                            </div>
                          ) : message.type === 'video' ? (
                            <div className="space-y-2">
                              {message.metadata?.mediaUrl ? (
                                <video 
                                  controls 
                                  className="rounded-lg max-w-full h-auto"
                                  style={{ maxHeight: '200px' }}
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
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="flex-shrink-0 space-y-2">
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
    </div>
  )
}