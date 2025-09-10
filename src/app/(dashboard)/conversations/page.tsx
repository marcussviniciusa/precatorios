'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  MessageSquare, 
  User, 
  Clock, 
  Send,
  Phone,
  MoreVertical
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

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

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<ConversationListItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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

    // Mock data é removido - dados vêm da API agora

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Conversas</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[800px]">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Conversas ({conversations.length})</span>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {conversations.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conversa</h3>
                <p className="text-gray-600">
                  Configure a Evolution API para começar a receber conversas do WhatsApp.
                </p>
              </div>
            ) : (
              <div className="max-h-[700px] overflow-y-auto">
                {conversations.map((conversation) => (
                <div
                  key={conversation._id}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conversation._id ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                  }`}
                  onClick={() => setSelectedConversation(conversation._id)}
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
                      <span>{formatDate(conversation.lastMessageTime)}</span>
                    </div>
                    {conversation.assignedAgent && (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{conversation.assignedAgent}</span>
                      </div>
                    )}
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {selectedConversation ? (
                <span>
                  Conversa com {conversations.find(c => c._id === selectedConversation)?.leadName}
                </span>
              ) : (
                <span>Selecione uma conversa</span>
              )}
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
          <CardContent>
            {selectedConversation ? (
              <div className="flex flex-col h-[600px]">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg mb-4">
                  <div className="flex justify-start">
                    <div className="max-w-xs bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-sm">Olá! Tenho um precatório de R$ 85.000, como vocês podem me ajudar?</p>
                      <p className="text-xs text-gray-500 mt-1">10:30</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="max-w-xs bg-primary text-white p-3 rounded-lg">
                      <p className="text-sm">Olá! Ficamos felizes em ajudá-lo. Podemos acelerar o recebimento do seu precatório. Qual é o estado emissor?</p>
                      <p className="text-xs opacity-80 mt-1">10:32</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-start">
                    <div className="max-w-xs bg-white p-3 rounded-lg shadow-sm">
                      <p className="text-sm">É do Estado de São Paulo</p>
                      <p className="text-xs text-gray-500 mt-1">10:33</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end">
                    <div className="max-w-xs bg-primary text-white p-3 rounded-lg">
                      <p className="text-sm">Perfeito! São Paulo está na nossa lista de estados atendidos. Vou transferir você para um especialista que vai explicar todo o processo.</p>
                      <p className="text-xs opacity-80 mt-1">10:35</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Digite sua mensagem..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <Button size="sm">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] text-gray-500">
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