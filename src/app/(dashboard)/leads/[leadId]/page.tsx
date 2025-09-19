'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Brain,
  FileSearch,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Lead, LeadSummary, AILog, TransferLog, ScoreLog } from '@/types'

interface LeadDetails {
  lead: Lead
  conversation: any
  activities: any[]
  summary: LeadSummary | null
  logs: {
    ai: AILog[]
    transfer: TransferLog[]
    score: ScoreLog[]
  }
  stats: {
    totalMessages: number
    totalActivities: number
    totalAILogs: number
    totalTransferLogs: number
    totalScoreLogs: number
    hasEscavadorData: boolean
    lastInteraction: Date
  }
}

export default function LeadDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.leadId as string

  const [details, setDetails] = useState<LeadDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

  useEffect(() => {
    fetchLeadDetails()
  }, [leadId])

  const fetchLeadDetails = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/details`)
      if (response.ok) {
        const data = await response.json()
        setDetails(data)

        // Se não tem resumo, gerar automaticamente
        if (!data.summary) {
          generateSummary()
        }
      } else {
        console.error('Erro ao buscar detalhes')
        router.push('/leads')
      }
    } catch (error) {
      console.error('Erro:', error)
      router.push('/leads')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSummary = async () => {
    setIsGeneratingSummary(true)
    try {
      const response = await fetch(`/api/leads/${leadId}/summary`, {
        method: 'POST'
      })
      if (response.ok) {
        const summary = await response.json()
        setDetails(prev => prev ? { ...prev, summary } : prev)
      }
    } catch (error) {
      console.error('Erro ao gerar resumo:', error)
    } finally {
      setIsGeneratingSummary(false)
    }
  }

  const getClassificationColor = (classification: string) => {
    const colors: Record<string, string> = {
      hot: 'bg-red-500',
      warm: 'bg-yellow-500',
      cold: 'bg-blue-500',
      discard: 'bg-gray-500'
    }
    return colors[classification] || 'bg-gray-500'
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      new: { color: 'bg-blue-100 text-blue-800', label: 'Novo' },
      qualified: { color: 'bg-green-100 text-green-800', label: 'Qualificado' },
      in_analysis: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Análise' },
      proposal: { color: 'bg-purple-100 text-purple-800', label: 'Proposta' },
      closed_won: { color: 'bg-green-100 text-green-800', label: 'Fechado' },
      closed_lost: { color: 'bg-red-100 text-red-800', label: 'Perdido' }
    }

    const config = configs[status] || configs.new
    return <Badge className={config.color}>{config.label}</Badge>
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Carregando detalhes do lead...</div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-gray-600">Lead não encontrado</div>
      </div>
    )
  }

  const { lead, summary, logs, stats } = details

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/leads')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>

      {/* Lead Info Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold">{lead.name}</h1>
                {getStatusBadge(lead.status)}
                <Badge className={`${getClassificationColor(lead.classification)} text-white`}>
                  {lead.classification.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-1" />
                  {lead.phone}
                </div>
                {lead.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-1" />
                    {lead.email}
                  </div>
                )}
                {lead.city && lead.state && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {lead.city}, {lead.state}
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  Última interação: {formatDate(stats.lastInteraction)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{lead.score}</div>
              <div className="text-sm text-gray-600">Pontuação</div>
              <div className="mt-2">
                {lead.precatorioValue && (
                  <div className="text-lg font-semibold">
                    {formatCurrency(lead.precatorioValue)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="escavador">Escavador</TabsTrigger>
          <TabsTrigger value="ai">Histórico IA</TabsTrigger>
          <TabsTrigger value="transfers">Transferências</TabsTrigger>
          <TabsTrigger value="scores">Pontuação</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dados do Lead */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Informações do Lead
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Nome:</span>
                  <span className="font-medium">{lead.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telefone:</span>
                  <span className="font-medium">{lead.phone}</span>
                </div>
                {lead.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{lead.email}</span>
                  </div>
                )}
                {lead.cpf && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">CPF:</span>
                    <span className="font-medium">{lead.cpf}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Fonte:</span>
                  <span className="font-medium">{lead.source}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Criado em:</span>
                  <span className="font-medium">{formatDate(lead.createdAt!)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dados do Precatório */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileSearch className="w-4 h-4 mr-2" />
                  Dados do Precatório
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Possui Precatório:</span>
                  <span className="font-medium">
                    {lead.hasPrecatorio ? (
                      <Badge className="bg-green-100 text-green-800">Sim</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800">Não confirmado</Badge>
                    )}
                  </span>
                </div>
                {lead.precatorioValue && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-medium">{formatCurrency(lead.precatorioValue)}</span>
                  </div>
                )}
                {lead.precatorioType && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium capitalize">{lead.precatorioType}</span>
                  </div>
                )}
                {lead.state && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="font-medium">{lead.state}</span>
                  </div>
                )}
                {lead.city && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cidade:</span>
                    <span className="font-medium">{lead.city}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Elegível:</span>
                  <span className="font-medium">
                    {lead.isEligible ? (
                      <Badge className="bg-green-100 text-green-800">Sim</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Não</Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Urgência:</span>
                  <span className="font-medium">
                    <Badge className={
                      lead.urgency === 'high' ? 'bg-red-100 text-red-800' :
                      lead.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }>
                      {lead.urgency === 'high' ? 'Alta' :
                       lead.urgency === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Resumo Gerado pela IA */}
          {summary && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center">
                    <Brain className="w-4 h-4 mr-2" />
                    Resumo Inteligente
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateSummary}
                    disabled={isGeneratingSummary}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                    Regenerar
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Resumo</h3>
                  <p className="text-gray-700">{summary.summary}</p>
                </div>

                {summary.keyPoints.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                      Pontos Principais
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {summary.keyPoints.map((point, idx) => (
                        <li key={idx} className="text-gray-700">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.concerns.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-2 text-yellow-500" />
                      Preocupações
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {summary.concerns.map((concern, idx) => (
                        <li key={idx} className="text-gray-700">{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.opportunities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-2 text-blue-500" />
                      Oportunidades
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {summary.opportunities.map((opp, idx) => (
                        <li key={idx} className="text-gray-700">{opp}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.nextSteps.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-purple-500" />
                      Próximos Passos
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {summary.nextSteps.map((step, idx) => (
                        <li key={idx} className="text-gray-700">{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="text-sm text-gray-500 mt-4">
                  Gerado por {summary.generatedBy === 'ai' ? 'IA' : 'Sistema'} em {formatDate(summary.lastUpdated)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
                <p className="text-xs text-gray-600">Mensagens</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalAILogs}</div>
                <p className="text-xs text-gray-600">Interações IA</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalTransferLogs}</div>
                <p className="text-xs text-gray-600">Transferências</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalScoreLogs}</div>
                <p className="text-xs text-gray-600">Atualizações Score</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Escavador Tab */}
        <TabsContent value="escavador" className="space-y-4">
          {lead.escavadorData ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <FileSearch className="w-4 h-4 mr-2" />
                    Dados do Escavador
                  </span>
                  <Badge className="bg-green-100 text-green-800">
                    {lead.escavadorData.processosEncontrados} processos encontrados
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Total de Processos</p>
                    <p className="text-xl font-bold">{lead.escavadorData.processosEncontrados}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Valor Total</p>
                    <p className="text-xl font-bold">
                      {lead.escavadorData.totalValue ? formatCurrency(lead.escavadorData.totalValue) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Processos Elegíveis</p>
                    <p className="text-xl font-bold">
                      {lead.escavadorData.hasEligibleProcessos ? 'Sim' : 'Não'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Última Consulta</p>
                    <p className="text-xl font-bold">
                      {formatDate(lead.escavadorData.ultimaConsulta)}
                    </p>
                  </div>
                </div>

                {lead.escavadorData.processos && lead.escavadorData.processos.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-semibold mb-3">Processos Detalhados</h3>
                    <div className="space-y-3">
                      {lead.escavadorData.processos.map((processo, idx) => (
                        <Card key={idx} className="border">
                          <CardContent className="pt-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Número:</span>
                              <span className="text-sm font-medium">{processo.numeroProcesso}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Tribunal:</span>
                              <span className="text-sm font-medium">{processo.tribunal}</span>
                            </div>
                            {processo.valor && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Valor:</span>
                                <span className="text-sm font-medium">{formatCurrency(processo.valor)}</span>
                              </div>
                            )}
                            {processo.assunto && (
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Assunto:</span>
                                <span className="text-sm font-medium">{processo.assunto}</span>
                              </div>
                            )}
                            {processo.partes && (
                              <div className="space-y-1">
                                {processo.partes.ativo && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Parte Ativa:</span>
                                    <span className="text-sm">{processo.partes.ativo}</span>
                                  </div>
                                )}
                                {processo.partes.passivo && (
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Parte Passiva:</span>
                                    <span className="text-sm">{processo.partes.passivo}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileSearch className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum dado do Escavador disponível para este lead</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Logs Tab */}
        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Interações com IA</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.ai.length > 0 ? (
                <div className="space-y-3">
                  {logs.ai.map((log) => (
                    <Card key={log._id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-blue-100 text-blue-800">
                            {log.type.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-semibold">Ação:</span>
                            <p className="text-sm text-gray-700">{log.action}</p>
                          </div>
                          {log.reasoning && (
                            <div>
                              <span className="text-sm font-semibold">Raciocínio:</span>
                              <p className="text-sm text-gray-700">{log.reasoning}</p>
                            </div>
                          )}
                          {log.model && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Modelo: {log.model}</span>
                              {log.executionTime && (
                                <span className="text-gray-600">{log.executionTime}ms</span>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">Nenhum log de IA disponível</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transfers Tab */}
        <TabsContent value="transfers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Transferências</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.transfer.length > 0 ? (
                <div className="space-y-3">
                  {logs.transfer.map((log) => (
                    <Card key={log._id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-purple-100 text-purple-800">
                              {log.fromStatus}
                            </Badge>
                            <span>→</span>
                            <Badge className="bg-green-100 text-green-800">
                              {log.toStatus}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-semibold">Motivo:</span>
                            <p className="text-sm text-gray-700">{log.reason}</p>
                          </div>
                          <div>
                            <span className="text-sm font-semibold">Disparado por:</span>
                            <Badge className="ml-2">
                              {log.triggeredBy === 'ai' ? 'IA' : log.triggeredBy === 'human' ? 'Humano' : 'Sistema'}
                            </Badge>
                          </div>
                          {log.notes && (
                            <div>
                              <span className="text-sm font-semibold">Notas:</span>
                              <p className="text-sm text-gray-700">{log.notes}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">Nenhuma transferência registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scores Tab */}
        <TabsContent value="scores" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pontuação</CardTitle>
            </CardHeader>
            <CardContent>
              {logs.score.length > 0 ? (
                <div className="space-y-3">
                  {logs.score.map((log) => (
                    <Card key={log._id} className="border">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-600">{log.previousScore}</div>
                              <Badge className="text-xs">
                                {log.previousClassification}
                              </Badge>
                            </div>
                            <span className="text-2xl">→</span>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-primary">{log.newScore}</div>
                              <Badge className={`text-xs ${getClassificationColor(log.newClassification)} text-white`}>
                                {log.newClassification}
                              </Badge>
                            </div>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatDate(log.timestamp)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-semibold">Motivo:</span>
                            <p className="text-sm text-gray-700">{log.reason}</p>
                          </div>
                          {log.factors.length > 0 && (
                            <div>
                              <span className="text-sm font-semibold">Fatores:</span>
                              <ul className="mt-1 space-y-1">
                                {log.factors.map((factor, idx) => (
                                  <li key={idx} className="text-sm text-gray-700 flex justify-between">
                                    <span>{factor.factor}: {factor.description || ''}</span>
                                    <span className="font-semibold">
                                      {factor.points > 0 ? '+' : ''}{factor.points} pts
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">
                              Disparado por: {log.triggeredBy === 'ai' ? 'IA' : log.triggeredBy === 'escavador' ? 'Escavador' : 'Manual'}
                            </span>
                            {log.metadata?.escavadorData && (
                              <Badge className="bg-blue-100 text-blue-800">
                                Com dados Escavador
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-8">Nenhuma alteração de pontuação registrada</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}