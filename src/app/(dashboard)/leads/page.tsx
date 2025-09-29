'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatCurrency, formatDate, getLeadStatusColor } from '@/lib/utils'
import { getAuthHeaders } from '@/lib/client-auth'

interface Lead {
  _id: string
  name: string
  phone: string
  email?: string
  classification: 'hot' | 'warm' | 'cold' | 'discard'
  score: number
  status: 'new' | 'qualified' | 'in_analysis' | 'proposal' | 'closed_won' | 'closed_lost'
  precatorioValue?: number
  precatorioType?: string
  state?: string
  city?: string
  source: string
  assignedTo?: string
  lastInteraction: Date
  createdAt: Date
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [classificationFilter, setClassificationFilter] = useState<string>('all')
  const [precatorioTypeFilter, setPrecatorioTypeFilter] = useState<string>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean, leadId: string, leadName: string }>({ show: false, leadId: '', leadName: '' })
  const [isDeleting, setIsDeleting] = useState(false)

  // Estados para seleção múltipla
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState<{ show: boolean, leadIds: string[], leadCount: number }>({ show: false, leadIds: [], leadCount: 0 })
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  // Paginação
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [paginatedLeads, setPaginatedLeads] = useState<Lead[]>([])
  const [totalPages, setTotalPages] = useState(0)

  // Função para calcular número do lead baseado na ordem de criação global
  const getLeadNumber = (lead: Lead) => {
    // Ordenar todos os leads originais por data de criação (mais antigo primeiro)
    const sortedByCreation = [...leads].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    // Retornar posição do lead na lista ordenada + 1
    return sortedByCreation.findIndex(l => l._id === lead._id) + 1
  }

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

    if (precatorioTypeFilter !== 'all') {
      filtered = filtered.filter(lead => lead.precatorioType === precatorioTypeFilter)
    }

    setFilteredLeads(filtered)

    // Reset para primeira página quando filtros mudarem
    setCurrentPage(1)
  }, [leads, searchTerm, statusFilter, classificationFilter, precatorioTypeFilter])

  // useEffect para paginação
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedData = filteredLeads.slice(startIndex, endIndex)

    setPaginatedLeads(paginatedData)
    setTotalPages(Math.ceil(filteredLeads.length / itemsPerPage))
  }, [filteredLeads, currentPage, itemsPerPage])

  const handleDeleteClick = (leadId: string, leadName: string) => {
    setDeleteConfirm({ show: true, leadId, leadName })
  }

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, leadId: '', leadName: '' })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.leadId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/leads/${deleteConfirm.leadId}/delete`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        // Remove o lead da lista
        setLeads(prev => prev.filter(lead => lead._id !== deleteConfirm.leadId))
        // Remove da seleção se estiver selecionado
        setSelectedLeads(prev => {
          const newSet = new Set(prev)
          newSet.delete(deleteConfirm.leadId)
          return newSet
        })
        alert('Lead e todos os dados relacionados foram deletados com sucesso!')
      } else {
        const error = await response.json()
        alert('Erro ao deletar lead: ' + error.error)
      }
    } catch (error) {
      console.error('Error deleting lead:', error)
      alert('Erro interno. Tente novamente.')
    } finally {
      setIsDeleting(false)
      setDeleteConfirm({ show: false, leadId: '', leadName: '' })
    }
  }

  // Funções para seleção múltipla
  const handleSelectLead = (leadId: string, checked: boolean) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(leadId)
      } else {
        newSet.delete(leadId)
      }
      return newSet
    })
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Selecionar todos os leads filtrados e paginados
      const allFilteredIds = new Set(filteredLeads.map(lead => lead._id))
      setSelectedLeads(allFilteredIds)
    } else {
      // Desselecionar todos
      setSelectedLeads(new Set())
    }
  }

  const handleBulkDeleteClick = () => {
    const selectedIds = Array.from(selectedLeads)
    if (selectedIds.length === 0) return

    setBulkDeleteConfirm({
      show: true,
      leadIds: selectedIds,
      leadCount: selectedIds.length
    })
  }

  const handleBulkDeleteCancel = () => {
    setBulkDeleteConfirm({ show: false, leadIds: [], leadCount: 0 })
  }

  const handleBulkDeleteConfirm = async () => {
    if (bulkDeleteConfirm.leadIds.length === 0) return

    setIsBulkDeleting(true)
    let successCount = 0
    let errorCount = 0

    try {
      // Deletar leads em paralelo (máximo 5 por vez para não sobrecarregar)
      const chunks = []
      for (let i = 0; i < bulkDeleteConfirm.leadIds.length; i += 5) {
        chunks.push(bulkDeleteConfirm.leadIds.slice(i, i + 5))
      }

      for (const chunk of chunks) {
        const promises = chunk.map(leadId =>
          fetch(`/api/leads/${leadId}/delete`, {
            method: 'DELETE',
            headers: getAuthHeaders()
          })
        )

        const responses = await Promise.all(promises)

        // Contar sucessos e erros
        responses.forEach(response => {
          if (response.ok) {
            successCount++
          } else {
            errorCount++
          }
        })
      }

      // Remover leads bem-sucedidos da lista
      const successfulIds = bulkDeleteConfirm.leadIds.slice(0, successCount)
      setLeads(prev => prev.filter(lead => !successfulIds.includes(lead._id)))

      // Limpar seleção
      setSelectedLeads(new Set())

      // Mostrar resultado
      if (errorCount === 0) {
        alert(`${successCount} lead(s) deletado(s) com sucesso!`)
      } else {
        alert(`${successCount} lead(s) deletado(s) com sucesso, ${errorCount} erro(s).`)
      }
    } catch (error) {
      console.error('Erro na exclusão em lote:', error)
      alert('Erro interno na exclusão em lote. Tente novamente.')
    } finally {
      setIsBulkDeleting(false)
      setBulkDeleteConfirm({ show: false, leadIds: [], leadCount: 0 })
    }
  }

  // Verificar se todos os leads filtrados estão selecionados
  const isAllSelected = filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeads.has(lead._id))
  const isPartiallySelected = selectedLeads.size > 0 && !isAllSelected

  // Funções de paginação
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1) // Reset para primeira página
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

  const getPrecatorioTypeBadge = (type?: string) => {
    if (!type) {
      return <span className="text-gray-400">-</span>
    }

    const typeConfigs: Record<string, { color: string; label: string }> = {
      federal: { color: 'bg-blue-100 text-blue-800', label: 'Federal' },
      estadual: { color: 'bg-green-100 text-green-800', label: 'Estadual' },
      municipal: { color: 'bg-purple-100 text-purple-800', label: 'Municipal' },
      trabalhista: { color: 'bg-orange-100 text-orange-800', label: 'Trabalhista' },
      parceria: { color: 'bg-pink-100 text-pink-800', label: 'Parceria' },
      honorarios: { color: 'bg-yellow-100 text-yellow-800', label: 'Honorários' }
    }

    const config = typeConfigs[type] || { color: 'bg-gray-100 text-gray-800', label: type }
    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando leads...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Leads</h1>
          <p className="text-sm sm:text-base text-gray-600">Gerencie todos os seus leads de precatórios</p>
        </div>
        <div className="flex gap-2">
          {selectedLeads.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleBulkDeleteClick}
              className="self-start sm:self-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Deletar {selectedLeads.size} selecionado(s)</span>
              <span className="sm:hidden">Deletar ({selectedLeads.size})</span>
            </Button>
          )}
          <Button className="self-start sm:self-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Novo Lead</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="flex items-center text-base sm:text-lg">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              Leads ({filteredLeads.length})
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Status</option>
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
                className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Classificação</option>
                <option value="hot">Quente</option>
                <option value="warm">Morno</option>
                <option value="cold">Frio</option>
                <option value="discard">Descarte</option>
              </select>

              <select
                value={precatorioTypeFilter}
                onChange={(e) => setPrecatorioTypeFilter(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">Tipo</option>
                <option value="federal">Federal</option>
                <option value="estadual">Estadual</option>
                <option value="municipal">Municipal</option>
                <option value="trabalhista">Trabalhista</option>
                <option value="parceria">Parceria</option>
                <option value="honorarios">Honorários</option>
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
            <>
              {/* Versão Desktop - Tabela */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-900 w-12">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                          title={isAllSelected ? "Desselecionar todos" : "Selecionar todos"}
                        />
                      </th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900 w-16">#</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Contato</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Score</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Classificação</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Tipo</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Valor</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Localização</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Responsável</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Primeira Interação</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                  {paginatedLeads.map((lead) => (
                    <tr key={lead._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead._id)}
                          onChange={(e) => handleSelectLead(lead._id, e.target.checked)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-primary text-sm">
                          #{getLeadNumber(lead)}
                        </span>
                      </td>
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
                        {getPrecatorioTypeBadge(lead.precatorioType)}
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
                          {formatDate(lead.createdAt)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/leads/${lead._id}`)}
                            title="Ver detalhes"
                          >
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
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteClick(lead._id, lead.name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              {/* Versão Mobile - Cards */}
              <div className="lg:hidden space-y-4">
                {paginatedLeads.map((lead) => (
                  <div key={lead._id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-start space-x-3 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedLeads.has(lead._id)}
                          onChange={(e) => handleSelectLead(lead._id, e.target.checked)}
                          className="w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2 mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded">#{getLeadNumber(lead)}</span>
                            <h3 className="font-medium text-gray-900 text-lg">{lead.name}</h3>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            <div>{lead.phone}</div>
                            {lead.email && <div>{lead.email}</div>}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/leads/${lead._id}`)}
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteClick(lead._id, lead.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">Score:</span>
                        <div className="flex items-center mt-1">
                          <span className="font-medium text-lg mr-2">{lead.score}</span>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-primary h-1.5 rounded-full"
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500">Classificação:</span>
                        <div className="mt-1">{getClassificationBadge(lead.classification)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Tipo:</span>
                        <div className="mt-1">{getPrecatorioTypeBadge(lead.precatorioType)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Valor:</span>
                        <div className="mt-1 font-medium">
                          {lead.precatorioValue ? formatCurrency(lead.precatorioValue) : '-'}
                        </div>
                      </div>
                    </div>
                    
                    {(lead.state && lead.city) && (
                      <div className="mt-3 text-sm">
                        <span className="text-gray-500">Localização:</span>
                        <div className="mt-1">{lead.city}, {lead.state}</div>
                      </div>
                    )}
                    
                    <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center text-sm text-gray-500">
                      <div>
                        {lead.assignedTo ? `Responsável: ${lead.assignedTo}` : 'Não atribuído'}
                      </div>
                      <div>
                        {formatDate(lead.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Paginação */}
          {filteredLeads.length > 0 && (
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Mostrar</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span>de {filteredLeads.length} leads</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </Button>

                <div className="flex items-center gap-1">
                  {(() => {
                    const pages = []
                    const maxVisiblePages = 5
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1)
                    }

                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <Button
                          key={i}
                          variant={currentPage === i ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(i)}
                          className="w-8 h-8 p-0"
                        >
                          {i}
                        </Button>
                      )
                    }

                    return pages
                  })()}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                Página {currentPage} de {totalPages}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Confirmação para Delete */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Exclusão
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja deletar completamente o contato <strong>{deleteConfirm.leadName}</strong>? 
              Esta ação irá remover:
            </p>
            <ul className="text-sm text-gray-600 mb-6 list-disc list-inside">
              <li>Dados do lead</li>
              <li>Todas as conversas</li>
              <li>Histórico de mensagens</li>
              <li>Atividades relacionadas</li>
            </ul>
            <p className="text-red-600 text-sm font-medium mb-6">
              ⚠️ Esta ação não pode ser desfeita!
            </p>
            
            <div className="flex justify-end space-x-3">
              <Button 
                variant="outline" 
                onClick={handleDeleteCancel}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deletando...' : 'Deletar Definitivamente'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Exclusão em Lote */}
      {bulkDeleteConfirm.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Confirmar Exclusão em Lote
            </h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja deletar completamente <strong>{bulkDeleteConfirm.leadCount} lead(s) selecionado(s)</strong>?
              Esta ação irá remover para cada lead:
            </p>
            <ul className="text-sm text-gray-600 mb-6 list-disc list-inside">
              <li>Dados do lead</li>
              <li>Todas as conversas</li>
              <li>Histórico de mensagens</li>
              <li>Atividades relacionadas</li>
              <li>Logs de IA e pontuação</li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-800 text-sm">
                <strong>Atenção:</strong> A exclusão será feita em lotes de 5 leads por vez.
                O processo pode levar alguns segundos para ser concluído.
              </p>
            </div>
            <p className="text-red-600 text-sm font-medium mb-6">
              ⚠️ Esta ação não pode ser desfeita!
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={handleBulkDeleteCancel}
                disabled={isBulkDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleBulkDeleteConfirm}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? `Deletando... (${bulkDeleteConfirm.leadCount} leads)` : `Deletar ${bulkDeleteConfirm.leadCount} Lead(s)`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}