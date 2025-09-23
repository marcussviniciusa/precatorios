'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import {
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  UserPlus,
  Filter,
  RefreshCw,
  Phone,
  MessageSquare,
  TrendingUp
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { getAuthHeaders } from '@/lib/client-auth'

interface QueueItem {
  _id: string
  conversationId: string
  leadId: string
  leadName: string
  leadPhone: string
  score: number
  classification: string
  priority: 'low' | 'medium' | 'high'
  waitingTime: number
  position: number
  transferredAt: Date
  assignedAgent?: string
  metadata?: any
}

interface QueueStats {
  total: number
  waiting: number
  assigned: number
  highPriority: number
  mediumPriority: number
  lowPriority: number
  averageWaitTime: number
  longestWaitTime: number
}

export default function QueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'assigned' | 'mine'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [takingNext, setTakingNext] = useState(false)

  // Fetch queue data
  const fetchQueue = async () => {
    try {
      setRefreshing(true)
      let url = '/api/queue?status=transferred'

      if (filter === 'waiting') url += '&assignedOnly=false'
      else if (filter === 'assigned') url += '&assignedOnly=true'
      else if (filter === 'mine') url += '&myQueue=true'

      const response = await fetch(url, {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setQueue(data.queue)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error fetching queue:', error)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }

  // Take next conversation
  const handleTakeNext = async () => {
    try {
      setTakingNext(true)
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'take_next' })
      })

      const data = await response.json()
      if (data.success) {
        alert(`Conversa atribuída: ${data.conversation?.leadId?.name || 'Lead'}`)
        fetchQueue() // Refresh queue
        // Redirect to conversation
        if (data.conversation?._id) {
          window.location.href = `/conversations?selected=${data.conversation._id}`
        }
      } else {
        alert(data.message || 'Nenhuma conversa disponível')
      }
    } catch (error) {
      console.error('Error taking next conversation:', error)
      alert('Erro ao pegar próxima conversa')
    } finally {
      setTakingNext(false)
    }
  }

  // Change priority
  const handleChangePriority = async (conversationId: string, newPriority: string) => {
    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'change_priority',
          conversationId,
          priority: newPriority
        })
      })

      if (response.ok) {
        fetchQueue() // Refresh queue
      }
    } catch (error) {
      console.error('Error changing priority:', error)
    }
  }

  // Remove from queue
  const handleRemoveFromQueue = async (conversationId: string) => {
    if (!confirm('Remover conversa da fila?')) return

    try {
      const response = await fetch('/api/queue', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: 'remove_from_queue',
          conversationId
        })
      })

      if (response.ok) {
        fetchQueue() // Refresh queue
      }
    } catch (error) {
      console.error('Error removing from queue:', error)
    }
  }

  useEffect(() => {
    fetchQueue()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000)
    return () => clearInterval(interval)
  }, [filter])

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

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      high: { variant: 'destructive', label: 'Alta', icon: ArrowUp },
      medium: { variant: 'default', label: 'Média' },
      low: { variant: 'secondary', label: 'Baixa', icon: ArrowDown }
    }

    const config = variants[priority] || variants.medium
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        {Icon && <Icon className="w-3 h-3" />}
        <span>{config.label}</span>
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando fila...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Fila de Atendimento</h1>
          <p className="text-gray-600">Gerencie conversas transferidas para atendimento humano</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={fetchQueue}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            onClick={handleTakeNext}
            disabled={takingNext}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {takingNext ? 'Pegando...' : 'Pegar Próxima'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total na Fila</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.waiting} aguardando | {stats.assigned} atribuídas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Por Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-red-500 font-medium">{stats.highPriority} Alta</span>
                <span className="text-gray-400">|</span>
                <span className="text-yellow-500 font-medium">{stats.mediumPriority} Média</span>
                <span className="text-gray-400">|</span>
                <span className="text-blue-500 font-medium">{stats.lowPriority} Baixa</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageWaitTime}m</div>
              <p className="text-xs text-gray-600 mt-1">Espera média</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maior Espera</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.longestWaitTime}m</div>
              <p className="text-xs text-gray-600 mt-1">Tempo máximo</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex space-x-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          Todas ({stats?.total || 0})
        </Button>
        <Button
          variant={filter === 'waiting' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('waiting')}
        >
          Aguardando ({stats?.waiting || 0})
        </Button>
        <Button
          variant={filter === 'assigned' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('assigned')}
        >
          Atribuídas ({stats?.assigned || 0})
        </Button>
        <Button
          variant={filter === 'mine' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('mine')}
        >
          Minhas
        </Button>
      </div>

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Conversas na Fila</CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Nenhuma conversa na fila</p>
            </div>
          ) : (
            <div className="space-y-4">
              {queue.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    {/* Position */}
                    {item.position > 0 && (
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-700">
                        {item.position}
                      </div>
                    )}

                    {/* Lead Info */}
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-semibold">{item.leadName}</h4>
                        <span className="text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{item.leadPhone}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(item.priority)}
                        {getClassificationBadge(item.classification)}
                        <Badge variant="outline">Score: {item.score}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Wait Time */}
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{item.waitingTime}m aguardando</span>
                      </div>
                      {item.assignedAgent && (
                        <div className="text-xs text-green-600 mt-1">
                          Atribuído: {item.assignedAgent}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/conversations?selected=${item.conversationId}`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>

                      {/* Priority Change */}
                      <select
                        value={item.priority}
                        onChange={(e) => handleChangePriority(item.conversationId, e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="high">Alta</option>
                        <option value="medium">Média</option>
                        <option value="low">Baixa</option>
                      </select>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromQueue(item.conversationId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}