'use client'

import { useState, useEffect } from 'react'
import MetricCard from '@/components/dashboard/MetricCard'
import LeadsChart from '@/components/dashboard/LeadsChart'
import ConversionFunnel from '@/components/dashboard/ConversionFunnel'
import RecentActivity from '@/components/dashboard/RecentActivity'
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  UserCheck,
  Flame
} from 'lucide-react'
import type { Dashboard } from '@/types'

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/dashboard/stats')
        if (response.ok) {
          const dashboardData = await response.json()
          setData(dashboardData)
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Visão geral do sistema de precatórios</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Leads"
            value="0"
            change="Nenhum lead cadastrado"
            changeType="neutral"
            icon={Users}
          />
          <MetricCard
            title="Conversas Ativas"
            value="0"
            change="Nenhuma conversa ativa"
            changeType="neutral"
            icon={MessageSquare}
          />
          <MetricCard
            title="Leads Quentes"
            value="0"
            change="Nenhum lead qualificado"
            changeType="neutral"
            icon={Flame}
          />
          <MetricCard
            title="Taxa de Conversão"
            value="0%"
            change="Dados insuficientes"
            changeType="neutral"
            icon={TrendingUp}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Novos Leads Hoje"
            value="0"
            icon={UserCheck}
            description="Desde 00h"
          />
          <MetricCard
            title="Mensagens Hoje"
            value="0"
            icon={MessageSquare}
            description="Últimas 24h"
          />
          <MetricCard
            title="Tempo de Resposta"
            value="-"
            icon={Clock}
            description="Sem dados disponíveis"
          />
        </div>

        <div className="bg-white p-8 rounded-lg border text-center">
          <div className="text-gray-400 mb-4">
            <Users className="w-16 h-16 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado disponível</h3>
            <p className="text-gray-600">
              Configure a Evolution API e comece a receber mensagens do WhatsApp para ver os dados aqui.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do sistema de precatórios</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total de Leads"
          value={data.totalLeads.toLocaleString()}
          change="+12% vs mês anterior"
          changeType="positive"
          icon={Users}
        />
        <MetricCard
          title="Conversas Ativas"
          value={data.activeConversations}
          change="3 aguardando resposta"
          changeType="neutral"
          icon={MessageSquare}
        />
        <MetricCard
          title="Leads Quentes"
          value={data.hotLeads}
          change="Análise imediata"
          changeType="positive"
          icon={Flame}
        />
        <MetricCard
          title="Taxa de Conversão"
          value={`${data.conversionRate}%`}
          change="+2.1% vs mês anterior"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Novos Leads Hoje"
          value={data.todayStats.newLeads}
          icon={UserCheck}
          description="Desde 00h"
        />
        <MetricCard
          title="Mensagens Hoje"
          value={data.todayStats.messages}
          icon={MessageSquare}
          description="Últimas 24h"
        />
        <MetricCard
          title="Tempo de Resposta"
          value={`${data.averageResponseTime}min`}
          icon={Clock}
          description="Média atual"
        />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <LeadsChart data={data.chartData.leadsOverTime} />
        <ConversionFunnel data={data.chartData.conversionFunnel} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <RecentActivity />
        <div className="lg:col-span-4">
          <div className="bg-white p-6 rounded-lg border">
            <h3 className="text-lg font-medium mb-4">Distribuição de Pontuação</h3>
            <div className="space-y-3">
              {data.chartData.scoreDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {item.range}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${(item.count / data.totalLeads) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}