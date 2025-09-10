'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Users, 
  Search, 
  Filter, 
  Plus,
  Phone,
  MessageSquare,
  Mail,
  MoreVertical,
  Eye,
  Edit
} from 'lucide-react'
import { formatCurrency, formatDate, getLeadStatusColor } from '@/lib/utils'

interface Lead {
  _id: string
  name: string
  phone: string
  email?: string
  classification: 'hot' | 'warm' | 'cold' | 'descarte'
  score: number
  status: 'new' | 'qualified' | 'in_analysis' | 'proposal' | 'closed_won' | 'closed_lost'
  precatorioValue?: number
  state?: string
  city?: string
  source: string
  assignedTo?: string
  lastInteraction: Date
  createdAt: Date
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [classificationFilter, setClassificationFilter] = useState<string>('all')

  useEffect(() => {
    async function fetchLeads() {
      try {
        const response = await fetch('/api/leads')
        if (response.ok) {
          const leadsData = await response.json()
          setLeads(leadsData)
          setFilteredLeads(leadsData)
        }
      } catch (error) {
        console.error('Erro ao carregar leads:', error)
        setLeads([])
        setFilteredLeads([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchLeads()
  }, [])

  useEffect(() => {
    let filtered = leads

    if (searchTerm) {
      filtered = filtered.filter(lead =>
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(lead => lead.status === statusFilter)
    }

    if (classificationFilter !== 'all') {
      filtered = filtered.filter(lead => lead.classification === classificationFilter)
    }

    setFilteredLeads(filtered)
  }, [leads, searchTerm, statusFilter, classificationFilter])

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
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
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
        <div className="text-lg text-gray-600">Carregando leads...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-gray-600">Gerencie todos os seus leads de precatórios</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Novo Lead
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Leads ({filteredLeads.length})
            </CardTitle>
            
            <div className="flex space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todos Status</option>
                <option value="new">Novo</option>
                <option value="qualified">Qualificado</option>
                <option value="in_analysis">Em Análise</option>
                <option value="proposal">Proposta</option>
                <option value="closed_won">Fechado</option>
                <option value="closed_lost">Perdido</option>
              </select>
              
              <select
                value={classificationFilter}
                onChange={(e) => setClassificationFilter(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Todas Classificações</option>
                <option value="hot">Quente</option>
                <option value="warm">Morno</option>
                <option value="cold">Frio</option>
                <option value="descarte">Descarte</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum lead encontrado</h3>
              <p className="text-gray-600 mb-6">
                {leads.length === 0 
                  ? "Configure a Evolution API para começar a receber leads do WhatsApp."
                  : "Tente ajustar os filtros para encontrar os leads que procura."
                }
              </p>
              {leads.length === 0 && (
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Lead Manualmente
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Nome</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Contato</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Score</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Classificação</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Valor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Localização</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Responsável</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Última Interação</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-600">{lead.phone}</div>
                        {lead.email && (
                          <div className="text-xs text-gray-500">{lead.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          <span className="font-medium text-lg">{lead.score}</span>
                          <div className="ml-2 w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {getClassificationBadge(lead.classification)}
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(lead.status)}
                      </td>
                      <td className="py-3 px-4">
                        {lead.precatorioValue ? (
                          <span className="font-medium">
                            {formatCurrency(lead.precatorioValue)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {lead.state && lead.city ? (
                          <div className="text-sm">
                            <div>{lead.city}</div>
                            <div className="text-gray-500">{lead.state}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {lead.assignedTo ? (
                          <span className="text-sm">{lead.assignedTo}</span>
                        ) : (
                          <span className="text-gray-400">Não atribuído</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {formatDate(lead.lastInteraction)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}