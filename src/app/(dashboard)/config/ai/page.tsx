'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Brain, Settings, MessageSquare, Target, Zap, Save, Loader2 } from 'lucide-react'
import { getAuthHeaders } from '@/lib/client-auth'
import type { BotConfig } from '@/types'


export default function AIConfigPage() {
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config/bot', {
        headers: getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar configurações')
      }

      const data = await response.json()
      console.log('Config loaded:', data.aiConfig)
      setConfig(data)
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!config) return

    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/config/bot', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar configurações')
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setSaving(false)
    }
  }

  const updateAIConfig = (field: string, value: any) => {
    if (!config) return
    
    setConfig({
      ...config,
      aiConfig: {
        enabled: false,
        provider: 'openrouter',
        ...config.aiConfig,
        [field]: value
      } as any
    })
  }

  const updateAIPrompt = (promptType: string, value: string) => {
    if (!config) return
    
    setConfig({
      ...config,
      aiConfig: {
        enabled: false,
        provider: 'openrouter',
        ...config.aiConfig,
        prompts: {
          extraction: '',
          scoring: '',
          response: '',
          transfer: '',
          ...config.aiConfig?.prompts,
          [promptType]: value
        }
      } as any
    })
  }

  const updateAISetting = (setting: string, value: any) => {
    if (!config) return
    
    setConfig({
      ...config,
      aiConfig: {
        enabled: false,
        provider: 'openrouter',
        ...config.aiConfig,
        settings: {
          autoExtraction: true,
          autoScoring: true,
          autoTransfer: true,
          temperature: 0.3,
          maxTokens: 500,
          ...config.aiConfig?.settings,
          [setting]: value
        }
      } as any
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    )
  }

  if (!config) {
    return (
      <Alert>
        <AlertDescription>
          Erro ao carregar configurações. Tente recarregar a página.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuração de IA</h1>
            <p className="text-gray-600">Configure o comportamento do assistente inteligente</p>
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Salvar Configurações
            </>
          )}
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Status e Configurações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configurações Gerais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3">
            <Switch
              checked={config.aiConfig?.enabled || false}
              onCheckedChange={(checked) => updateAIConfig('enabled', checked)}
            />
            <div>
              <Label>Habilitar IA</Label>
              <p className="text-sm text-gray-600">
                Ativar o assistente inteligente para processar mensagens
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provedor</Label>
              <Select
                value={config.aiConfig?.provider || 'openrouter'}
                onValueChange={(value) => updateAIConfig('provider', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="analysisModel">Modelo para Análise (extração, scoring, transferência)</Label>
              <Input
                id="analysisModel"
                placeholder="Ex: openai/gpt-4-turbo-preview"
                value={config.aiConfig?.analysisModel || ''}
                onChange={(e) => updateAIConfig('analysisModel', e.target.value)}
              />
              <p className="text-sm text-gray-600">
                Use tags do OpenRouter como: openai/gpt-4-turbo-preview, anthropic/claude-3-opus, etc.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseModel">Modelo para Resposta (conversação com cliente)</Label>
              <Input
                id="responseModel"
                placeholder="Ex: openai/gpt-3.5-turbo"
                value={config.aiConfig?.responseModel || ''}
                onChange={(e) => updateAIConfig('responseModel', e.target.value)}
              />
              <p className="text-sm text-gray-600">
                Use tags do OpenRouter. Pode ser um modelo mais rápido/barato para conversação.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key do OpenRouter</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Insira sua API key do OpenRouter"
              value={config.aiConfig?.apiKey || ''}
              onChange={(e) => updateAIConfig('apiKey', e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Obtenha sua API key em{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Prompts de IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Prompts do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="responsePrompt">Prompt de Resposta</Label>
            <Textarea
              id="responsePrompt"
              rows={4}
              placeholder="Defina como a IA deve se comportar ao responder mensagens..."
              value={config.aiConfig?.prompts?.response || ''}
              onChange={(e) => updateAIPrompt('response', e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Instrução principal que define o comportamento da IA nas respostas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="extractionPrompt">Prompt de Extração</Label>
            <Textarea
              id="extractionPrompt"
              rows={3}
              placeholder="Instrução para extrair informações dos leads..."
              value={config.aiConfig?.prompts?.extraction || ''}
              onChange={(e) => updateAIPrompt('extraction', e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Como a IA deve identificar e extrair informações relevantes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scoringPrompt">Prompt de Pontuação</Label>
            <Textarea
              id="scoringPrompt"
              rows={3}
              placeholder="Critérios para calcular o score do lead..."
              value={config.aiConfig?.prompts?.scoring || ''}
              onChange={(e) => updateAIPrompt('scoring', e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Regras para a IA calcular a pontuação dos leads
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transferPrompt">Prompt de Transferência</Label>
            <Textarea
              id="transferPrompt"
              rows={3}
              placeholder="Quando transferir para atendimento humano..."
              value={config.aiConfig?.prompts?.transfer || ''}
              onChange={(e) => updateAIPrompt('transfer', e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Critérios para a IA decidir quando transferir para humano
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Configurações Avançadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2" />
            Configurações Avançadas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Switch
                checked={config.aiConfig?.settings?.autoExtraction || true}
                onCheckedChange={(checked) => updateAISetting('autoExtraction', checked)}
              />
              <div>
                <Label>Extração Automática</Label>
                <p className="text-sm text-gray-600">
                  Extrair informações dos leads automaticamente
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                checked={config.aiConfig?.settings?.autoScoring || true}
                onCheckedChange={(checked) => updateAISetting('autoScoring', checked)}
              />
              <div>
                <Label>Pontuação Automática</Label>
                <p className="text-sm text-gray-600">
                  Calcular score dos leads automaticamente
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                checked={config.aiConfig?.settings?.autoTransfer || true}
                onCheckedChange={(checked) => updateAISetting('autoTransfer', checked)}
              />
              <div>
                <Label>Transferência Automática</Label>
                <p className="text-sm text-gray-600">
                  Decidir transferências automaticamente
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temperatura (0.0 - 1.0)</Label>
              <Input
                id="temperature"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={config.aiConfig?.settings?.temperature || 0.3}
                onChange={(e) => updateAISetting('temperature', parseFloat(e.target.value))}
              />
              <p className="text-sm text-gray-600">
                Controla a criatividade das respostas (0.1 = conservador, 0.9 = criativo)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxTokens">Máximo de Tokens</Label>
              <Input
                id="maxTokens"
                type="number"
                min="50"
                max="2000"
                value={config.aiConfig?.settings?.maxTokens || 500}
                onChange={(e) => updateAISetting('maxTokens', parseInt(e.target.value))}
              />
              <p className="text-sm text-gray-600">
                Limite máximo de tokens por resposta (aproximadamente palavras)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}