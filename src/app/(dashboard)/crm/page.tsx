'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  FileText, 
  Plus, 
  Calendar,
  Phone,
  Mail,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Target
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

interface CRMPipeline {
  stage: string
  leads: number
  value: number
  color: string
}

interface Activity {
  _id: string
  leadName: string
  type: 'call' | 'email' | 'whatsapp' | 'meeting' | 'task' | 'note'
  title: string
  description: string
  status: 'pending' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  dueDate?: Date
  assignedTo: string
  createdAt: Date
}

export default function CRMPage() {
  const [pipeline, setPipeline] = useState<CRMPipeline[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [selectedStage, setSelectedStage] = useState<string>('all')

  useEffect(() => {
    const mockPipeline: CRMPipeline[] = [
      {
        stage: 'Qualificado',
        leads: 45,
        value: 2850000,
        color: 'bg-blue-500'
      },
      {
        stage: 'Em Análise',
        leads: 23,
        value: 1670000,
        color: 'bg-yellow-500'
      },
      {
        stage: 'Proposta Enviada',
        leads: 12,
        value: 890000,
        color: 'bg-orange-500'
      },
      {
        stage: 'Negociação',
        leads: 8,
        value: 540000,
        color: 'bg-purple-500'
      },
      {
        stage: 'Fechado',
        leads: 156,
        value: 8940000,
        color: 'bg-green-500'
      }
    ]

    const mockActivities: Activity[] = [
      {
        _id: '1',
        leadName: 'João Silva',
        type: 'call',
        title: 'Ligação de follow-up',
        description: 'Acompanhar status da análise documental',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000),
        assignedTo: 'Ana Costa',
        createdAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        _id: '2',
        leadName: 'Maria Santos',
        type: 'meeting',
        title: 'Reunião de apresentação',
        description: 'Apresentar proposta de antecipação',
        status: 'completed',
        priority: 'medium',
        dueDate: new Date(Date.now() - 1 * 60 * 60 * 1000),
        assignedTo: 'Carlos Silva',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        _id: '3',
        leadName: 'Pedro Costa',
        type: 'email',
        title: 'Enviar documentos',
        description: 'Enviar contrato e termos de cessão',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000),
        assignedTo: 'Ana Costa',
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      },
      {
        _id: '4',
        leadName: 'Ana Lima',
        type: 'task',
        title: 'Análise jurídica',
        description: 'Revisar documentação do precatório',
        status: 'pending',
        priority: 'medium',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
        assignedTo: 'Roberto Santos',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        _id: '5',
        leadName: 'Carlos Ferreira',
        type: 'whatsapp',
        title: 'Confirmar assinatura',
        description: 'Confirmar agendamento para assinatura do contrato',
        status: 'completed',
        priority: 'low',
        assignedTo: 'Carlos Silva',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ]

    setPipeline(mockPipeline)
    setActivities(mockActivities)
  }, [])

  const getActivityIcon = (type: string) => {
    const icons = {
      call: Phone,
      email: Mail,
      whatsapp: User,
      meeting: Calendar,
      task: FileText,
      note: FileText
    }
    return icons[type as keyof typeof icons] || FileText
  }

  const getPriorityBadge = (priority: string) => {
    const configs = {
      high: { color: 'bg-red-100 text-red-800', label: 'Alta' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Média' },
      low: { color: 'bg-green-100 text-green-800', label: 'Baixa' }
    }
    
    const config = configs[priority as keyof typeof configs] || configs.medium
    return <Badge className={config.color}>{config.label}</Badge>
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />
    }
  }

  const totalPipelineValue = pipeline.reduce((acc, stage) => acc + stage.value, 0)
  const totalLeadsInPipeline = pipeline.reduce((acc, stage) => acc + stage.leads, 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">CRM Pipeline</h1>
          <p className="text-gray-600">Gerencie o funil de vendas e atividades</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Calendar className="w-4 h-4 mr-2" />
            Agendar
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Nova Atividade
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pipeline Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(totalPipelineValue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {totalLeadsInPipeline} leads ativos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Taxa de Conversão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">24.3%</div>
            <p className="text-xs text-green-600 mt-1">+3.2% vs mês anterior</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(67500)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Por lead fechado</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">18 dias</div>
            <p className="text-xs text-gray-500 mt-1">Qualificado → Fechado</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Funil de Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {pipeline.map((stage, index) => (
              <div 
                key={stage.stage}
                className="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => setSelectedStage(stage.stage)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{stage.stage}</h3>
                  <div 
                    className={`w-3 h-3 rounded-full ${stage.color}`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-gray-900">{stage.leads}</p>
                  <p className="text-xs text-gray-600">leads</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatCurrency(stage.value)}
                  </p>
                </div>
                {index < pipeline.length - 1 && (
                  <div className="mt-3 flex justify-center">
                    <div className="w-6 h-1 bg-gray-300 rounded" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Atividades Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities
                .filter(activity => activity.status === 'pending')
                .slice(0, 5)
                .map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  const isOverdue = activity.dueDate && activity.dueDate < new Date()
                  
                  return (
                    <div key={activity._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
                        <Icon className={`w-4 h-4 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{activity.title}</h4>
                          {getPriorityBadge(activity.priority)}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {activity.leadName} • {activity.assignedTo}
                          </span>
                          {activity.dueDate && (
                            <span className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                              {formatDate(activity.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Atividades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
                .slice(0, 8)
                .map((activity) => {
                  const Icon = getActivityIcon(activity.type)
                  
                  return (
                    <div key={activity._id} className="flex items-start space-x-3">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(activity.status)}
                        <div className="p-1 rounded">
                          <Icon className="w-3 h-3 text-gray-500" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.leadName} • {activity.assignedTo} • {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}