'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getAuthHeaders } from '@/lib/client-auth'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  Settings, 
  Save,
  AlertCircle,
  CheckCircle,
  Globe,
  Zap
} from 'lucide-react'

interface BotConfiguration {
  isActive: boolean
  workingHours: {
    start: string
    end: string
    timezone: string
  }
  prompts: {
    welcome: string
    qualification: string
    followUp: string
    transfer: string
  }
  eligibilityRules: {
    allowedStates: string[]
    minValue: number
    allowedTypes: string[]
  }
  transferRules: {
    scoreThreshold: number
    keywordTriggers: string[]
    maxBotResponses: number
  }
}

export default function ConfigPage() {
  const [config, setConfig] = useState<BotConfiguration>({
    isActive: true,
    workingHours: {
      start: '08:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    },
    prompts: {
      welcome: 'Olá! 👋 Sou o assistente virtual especializado em precatórios. Como posso ajudá-lo hoje?',
      qualification: 'Para melhor atendê-lo, preciso de algumas informações. Você possui algum precatório para receber?',
      followUp: 'Obrigado pelas informações! Em breve um de nossos especialistas entrará em contato.',
      transfer: 'Vou transferir você para um de nossos especialistas. Aguarde um momento...'
    },
    eligibilityRules: {
      allowedStates: ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'DF', 'ES'],
      minValue: 10000,
      allowedTypes: ['federal', 'estadual', 'municipal', 'trabalhista']
    },
    transferRules: {
      scoreThreshold: 60,
      keywordTriggers: ['falar com humano', 'quero falar com alguém', 'atendente', 'urgente'],
      maxBotResponses: 10
    }
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config/bot', {
          headers: getAuthHeaders()
        })
        
        if (response.ok) {
          const data = await response.json()
          setConfig(data)
        }
      } catch (error) {
        console.error('Error loading config:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveMessage('')

    try {
      const response = await fetch('/api/config/bot', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      })

      if (response.ok) {
        setSaveMessage('Configurações salvas com sucesso!')
      } else {
        setSaveMessage('Erro ao salvar configurações')
      }
    } catch (error) {
      setSaveMessage('Erro de conexão')
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveMessage(''), 3000)
    }
  }

  const handleStateToggle = (state: string) => {
    const currentStates = config.eligibilityRules.allowedStates
    const updatedStates = currentStates.includes(state)
      ? currentStates.filter(s => s !== state)
      : [...currentStates, state]
    
    setConfig({
      ...config,
      eligibilityRules: {
        ...config.eligibilityRules,
        allowedStates: updatedStates
      }
    })
  }

  const addKeywordTrigger = (keyword: string) => {
    if (keyword && !config.transferRules.keywordTriggers.includes(keyword)) {
      setConfig({
        ...config,
        transferRules: {
          ...config.transferRules,
          keywordTriggers: [...config.transferRules.keywordTriggers, keyword]
        }
      })
    }
  }

  const removeKeywordTrigger = (keyword: string) => {
    setConfig({
      ...config,
      transferRules: {
        ...config.transferRules,
        keywordTriggers: config.transferRules.keywordTriggers.filter(k => k !== keyword)
      }
    })
  }

  const brazilianStates = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
    'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
    'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Configurações do Bot</h1>
          <p className="text-gray-600">Configure o comportamento do assistente virtual</p>
        </div>
        <div className="flex items-center space-x-4">
          {saveMessage && (
            <div className={`flex items-center space-x-2 ${
              saveMessage.includes('sucesso') ? 'text-green-600' : 'text-red-600'
            }`}>
              {saveMessage.includes('sucesso') ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm">{saveMessage}</span>
            </div>
          )}
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bot className="w-5 h-5 mr-2" />
              Status do Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Bot Ativo</h3>
                <p className="text-sm text-gray-600">
                  {config.isActive ? 'O bot está respondendo automaticamente' : 'O bot está pausado'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) => setConfig({...config, isActive: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Horário de Funcionamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Início
                </label>
                <input
                  type="time"
                  value={config.workingHours.start}
                  onChange={(e) => setConfig({
                    ...config,
                    workingHours: {...config.workingHours, start: e.target.value}
                  })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fim
                </label>
                <input
                  type="time"
                  value={config.workingHours.end}
                  onChange={(e) => setConfig({
                    ...config,
                    workingHours: {...config.workingHours, end: e.target.value}
                  })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fuso Horário
                </label>
                <select
                  value={config.workingHours.timezone}
                  onChange={(e) => setConfig({
                    ...config,
                    workingHours: {...config.workingHours, timezone: e.target.value}
                  })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                  <option value="America/Manaus">Manaus (GMT-4)</option>
                  <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Mensagens do Bot
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Boas-vindas
                </label>
                <textarea
                  value={config.prompts.welcome}
                  onChange={(e) => setConfig({
                    ...config,
                    prompts: {...config.prompts, welcome: e.target.value}
                  })}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Qualificação
                </label>
                <textarea
                  value={config.prompts.qualification}
                  onChange={(e) => setConfig({
                    ...config,
                    prompts: {...config.prompts, qualification: e.target.value}
                  })}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Follow-up
                </label>
                <textarea
                  value={config.prompts.followUp}
                  onChange={(e) => setConfig({
                    ...config,
                    prompts: {...config.prompts, followUp: e.target.value}
                  })}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mensagem de Transferência
                </label>
                <textarea
                  value={config.prompts.transfer}
                  onChange={(e) => setConfig({
                    ...config,
                    prompts: {...config.prompts, transfer: e.target.value}
                  })}
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Critérios de Elegibilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estados Atendidos
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {brazilianStates.map(state => (
                    <div key={state} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`state-${state}`}
                        checked={config.eligibilityRules.allowedStates.includes(state)}
                        onChange={() => handleStateToggle(state)}
                        className="mr-2"
                      />
                      <label htmlFor={`state-${state}`} className="text-sm">
                        {state}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor Mínimo (R$)
                </label>
                <input
                  type="number"
                  value={config.eligibilityRules.minValue}
                  onChange={(e) => setConfig({
                    ...config,
                    eligibilityRules: {...config.eligibilityRules, minValue: Number(e.target.value)}
                  })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Regras de Transferência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Score Mínimo para Transferência
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={config.transferRules.scoreThreshold}
                  onChange={(e) => setConfig({
                    ...config,
                    transferRules: {...config.transferRules, scoreThreshold: Number(e.target.value)}
                  })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Respostas do Bot
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.transferRules.maxBotResponses}
                  onChange={(e) => setConfig({
                    ...config,
                    transferRules: {...config.transferRules, maxBotResponses: Number(e.target.value)}
                  })}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Palavras-chave para Transferência
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {config.transferRules.keywordTriggers.map((keyword, index) => (
                    <Badge 
                      key={index}
                      variant="outline"
                      className="cursor-pointer"
                      onClick={() => removeKeywordTrigger(keyword)}
                    >
                      {keyword} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Adicionar palavra-chave"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addKeywordTrigger((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = ''
                      }
                    }}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Adicionar palavra-chave"]') as HTMLInputElement
                      if (input?.value) {
                        addKeywordTrigger(input.value)
                        input.value = ''
                      }
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}