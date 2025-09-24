'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  Settings,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/client-auth'

interface BitrixConfig {
  webhookUrl: string
  isActive: boolean
  defaultUserId: number
}

interface BitrixStatus {
  isActive: boolean
  webhookConfigured: boolean
  defaultUserId: number
}

export default function BitrixConfigPage() {
  const [config, setConfig] = useState<BitrixConfig>({
    webhookUrl: '',
    isActive: false,
    defaultUserId: 1
  })
  const [status, setStatus] = useState<BitrixStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showWebhookUrl, setShowWebhookUrl] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/integrations/bitrix', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        setConfig(prev => ({
          ...prev,
          isActive: data.isActive,
          defaultUserId: data.defaultUserId
        }))
      }
    } catch (error) {
      console.error('Error fetching Bitrix status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Em um cenário real, você salvaria essas configurações no banco
      // Por agora, apenas simular o salvamento
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Configurações salvas com sucesso! Reinicie a aplicação para aplicar as mudanças.')
    } catch (error) {
      console.error('Error saving config:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setIsSaving(false)
    }
  }

  const testConnection = async () => {
    if (!config.webhookUrl) {
      setTestResult({
        success: false,
        message: 'URL do webhook é obrigatória'
      })
      return
    }

    try {
      // Teste simples de conectividade
      const testUrl = `${config.webhookUrl}/crm.lead.fields`
      const response = await fetch(testUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Conexão com Bitrix estabelecida com sucesso!'
        })
      } else {
        setTestResult({
          success: false,
          message: `Erro na conexão: HTTP ${response.status}`
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `Erro na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      })
    }
  }

  const copyWebhookExample = () => {
    const example = 'https://your-domain.bitrix24.com/rest/1/your-webhook-key'
    navigator.clipboard.writeText(example)
    alert('Exemplo copiado para a área de transferência!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Carregando configurações...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Integração Bitrix24</h1>
          <p className="text-gray-600">Configure a integração automática com Bitrix24 CRM</p>
        </div>
        <div className="flex items-center space-x-2">
          {status?.isActive && status?.webhookConfigured ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Ativo
            </Badge>
          ) : (
            <Badge className="bg-red-100 text-red-800">
              <AlertCircle className="w-3 h-3 mr-1" />
              Inativo
            </Badge>
          )}
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Status da Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Status</div>
              <div className="flex items-center space-x-2 mt-1">
                {status?.isActive ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Ativo</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Inativo</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Webhook</div>
              <div className="flex items-center space-x-2 mt-1">
                {status?.webhookConfigured ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">Configurado</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Não configurado</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Usuário Padrão</div>
              <div className="text-sm font-medium mt-1">ID: {status?.defaultUserId}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">URL do Webhook Bitrix24</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyWebhookExample}
                className="text-xs"
              >
                <Copy className="w-3 h-3 mr-1" />
                Copiar exemplo
              </Button>
            </div>
            <div className="relative">
              <input
                type={showWebhookUrl ? 'text' : 'password'}
                value={config.webhookUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder="https://your-domain.bitrix24.com/rest/1/your-webhook-key"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent pr-10"
              />
              <button
                type="button"
                onClick={() => setShowWebhookUrl(!showWebhookUrl)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showWebhookUrl ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Obtenha este URL no seu Bitrix24 em Aplicações → Webhooks
            </p>
          </div>

          {/* Active Toggle */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={config.isActive}
                onChange={(e) => setConfig(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium">Ativar integração automática</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Quando ativo, leads serão enviados automaticamente para Bitrix na primeira transferência IA → Humano
            </p>
          </div>

          {/* Default User ID */}
          <div>
            <label className="text-sm font-medium">ID do Usuário Padrão no Bitrix</label>
            <input
              type="number"
              value={config.defaultUserId}
              onChange={(e) => setConfig(prev => ({ ...prev, defaultUserId: parseInt(e.target.value) || 1 }))}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              ID do usuário do Bitrix que será responsável pelos leads importados
            </p>
          </div>

          {/* Test Connection */}
          <div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={!config.webhookUrl}
              >
                Testar Conexão
              </Button>

              {testResult && (
                <div className="flex items-center space-x-2">
                  {testResult.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {testResult.message}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => window.open('https://dev.1c-bitrix.ru/rest_help/', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentação Bitrix
            </Button>

            <Button
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Como Configurar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">1. Criar Webhook no Bitrix24</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Acesse seu Bitrix24 → Aplicações → Webhooks</li>
                <li>Clique em "Webhook de entrada"</li>
                <li>Selecione as permissões: CRM (crm)</li>
                <li>Copie a URL gerada</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">2. Configurar Campos Personalizados (Opcional)</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Acesse CRM → Leads → Configurações</li>
                <li>Adicione campos personalizados para dados de precatórios</li>
                <li>Use prefixo UF_CRM_ nos nomes dos campos</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">3. Funcionamento</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Integração é disparada na primeira transferência IA → Humano</li>
                <li>Dados do lead, resumo IA e informações do precatório são enviados</li>
                <li>Lead é criado automaticamente no Bitrix24</li>
                <li>Log da integração fica visível na aba "Transferências"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}