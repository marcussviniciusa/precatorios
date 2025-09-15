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
import { Brain, Settings, MessageSquare, Target, Zap, Save, Loader2, Image, Mic, FileText, Eye, Upload, CheckCircle, X } from 'lucide-react'
import { getAuthHeaders } from '@/lib/client-auth'
import type { BotConfig } from '@/types'


export default function AIConfigPage() {
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [uploadingCredentials, setUploadingCredentials] = useState(false)

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
        ...config.aiConfig,
        prompts: {
          ...config.aiConfig?.prompts,
          [promptType]: value
        }
      } as any
    })
  }

  const updateAISetting = (setting: string, value: any) => {
    if (!config) return
    
    console.log(`Updating AI setting: ${setting} = ${value}`)
    console.log('Current config:', config.aiConfig?.settings)
    
    setConfig({
      ...config,
      aiConfig: {
        ...config.aiConfig,
        settings: {
          ...config.aiConfig?.settings,
          [setting]: value
        }
      } as any
    })
  }

  const getSwitchValue = (setting: string, defaultValue: boolean = true): boolean => {
    const value = config?.aiConfig?.settings?.[setting as keyof typeof config.aiConfig.settings]
    const result = typeof value === 'boolean' ? value : defaultValue
    console.log(`getSwitchValue(${setting}) = ${result} (raw value: ${value})`)
    return result
  }

  const handleCredentialsUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Verificar se é um arquivo JSON
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo JSON válido.' })
      return
    }

    setUploadingCredentials(true)
    setMessage(null)

    try {
      // Ler o conteúdo do arquivo
      const fileContent = await file.text()
      
      // Verificar se é um JSON válido
      const credentials = JSON.parse(fileContent)
      
      // Verificar se tem as propriedades necessárias do Google Cloud
      if (!credentials.type || !credentials.project_id || !credentials.private_key_id) {
        throw new Error('Arquivo de credenciais inválido. Certifique-se de que é um arquivo de chave de serviço do Google Cloud.')
      }

      // Enviar as credenciais para o servidor
      const formData = new FormData()
      formData.append('credentials', file)

      // Para FormData, não incluir Content-Type nos headers (será definido automaticamente pelo navegador)
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {}
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch('/api/config/google-vision/upload', {
        method: 'POST',
        headers,
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao enviar credenciais')
      }

      const data = await response.json()

      // Atualizar a configuração com o caminho do arquivo
      setConfig({
        ...config!,
        mediaProcessing: {
          ...config!.mediaProcessing,
          googleVision: {
            ...config!.mediaProcessing?.googleVision,
            keyPath: data.filePath,
            credentialsUploaded: true
          }
        }
      })

      setMessage({ type: 'success', text: 'Credenciais do Google Vision enviadas com sucesso!' })
      
    } catch (error: any) {
      console.error('Error uploading credentials:', error)
      setMessage({ type: 'error', text: error.message || 'Erro ao processar arquivo de credenciais' })
    } finally {
      setUploadingCredentials(false)
      // Limpar o input para permitir re-upload do mesmo arquivo
      event.target.value = ''
    }
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
                checked={getSwitchValue('autoExtraction', true)}
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
                checked={getSwitchValue('autoScoring', true)}
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
                checked={getSwitchValue('autoTransfer', true)}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="messageGroupingDelay">Delay para Agrupamento (ms)</Label>
              <Input
                id="messageGroupingDelay"
                type="number"
                min="1000"
                max="10000"
                step="500"
                value={config.aiConfig?.settings?.messageGroupingDelay || 3000}
                onChange={(e) => updateAISetting('messageGroupingDelay', parseInt(e.target.value))}
              />
              <p className="text-sm text-gray-600">
                Tempo de espera para agrupar mensagens consecutivas (padrão: 3000ms)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxMessagesToGroup">Máximo de Mensagens por Grupo</Label>
              <Input
                id="maxMessagesToGroup"
                type="number"
                min="1"
                max="10"
                value={config.aiConfig?.settings?.maxMessagesToGroup || 5}
                onChange={(e) => updateAISetting('maxMessagesToGroup', parseInt(e.target.value))}
              />
              <p className="text-sm text-gray-600">
                Quantas mensagens consecutivas incluir no processamento (padrão: 5)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processamento de Mídia */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Processamento de Mídia</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="mediaProcessingEnabled">Processamento de Mídia</Label>
              <div className="text-sm text-gray-600">
                Habilitar extração de texto de imagens, documentos e áudios
              </div>
            </div>
            <Switch
              checked={config.mediaProcessing?.enabled || false}
              onCheckedChange={(checked) => {
                setConfig({
                  ...config,
                  mediaProcessing: {
                    ...config.mediaProcessing,
                    enabled: checked
                  }
                })
              }}
            />
          </div>

          {config.mediaProcessing?.enabled && (
            <>
              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Eye className="h-4 w-4" />
                  <span>OpenRouter Vision (Descrição de Imagens)</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="openRouterEnabled">Habilitar OpenRouter Vision</Label>
                      <div className="text-sm text-gray-600">
                        Usa IA multimodal para descrever imagens (Sonoma Sky Alpha)
                      </div>
                    </div>
                    <Switch
                      checked={config.mediaProcessing?.openRouter?.enabled || false}
                      onCheckedChange={(checked) => {
                        setConfig({
                          ...config,
                          mediaProcessing: {
                            ...config.mediaProcessing,
                            openRouter: {
                              ...config.mediaProcessing?.openRouter,
                              enabled: checked
                            }
                          }
                        })
                      }}
                    />
                  </div>

                  {config.mediaProcessing?.openRouter?.enabled && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="openRouterApiKey">Chave da API OpenRouter</Label>
                        <Input
                          id="openRouterApiKey"
                          type="password"
                          placeholder="sk-or-v1-..."
                          value={config.mediaProcessing?.openRouter?.apiKey || config.aiConfig?.apiKey || ''}
                          onChange={(e) => {
                            setConfig({
                              ...config,
                              mediaProcessing: {
                                ...config.mediaProcessing,
                                openRouter: {
                                  ...config.mediaProcessing?.openRouter,
                                  apiKey: e.target.value
                                }
                              }
                            })
                          }}
                        />
                        <p className="text-sm text-gray-600">
                          Usa a mesma chave da configuração de IA se não especificada
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="imageModel">Modelo de Visão</Label>
                        <Select
                          value={config.mediaProcessing?.openRouter?.imageModel || 'openrouter/sonoma-sky-alpha'}
                          onValueChange={(value) => {
                            setConfig({
                              ...config,
                              mediaProcessing: {
                                ...config.mediaProcessing,
                                openRouter: {
                                  ...config.mediaProcessing?.openRouter,
                                  imageModel: value
                                }
                              }
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openrouter/sonoma-sky-alpha">Sonoma Sky Alpha (Grátis, 2M tokens)</SelectItem>
                            <SelectItem value="openai/gpt-4o">GPT-4 Vision</SelectItem>
                            <SelectItem value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</SelectItem>
                            <SelectItem value="google/gemini-2.0-flash-exp:free">Gemini 2.0 Flash (Grátis)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-gray-600">
                          Modelo multimodal para descrever imagens
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Image className="h-4 w-4" />
                  <span>Google Vision OCR (Imagens e Documentos)</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="googleVisionEnabled">Habilitar Google Vision</Label>
                      <div className="text-sm text-gray-600">
                        OCR para extrair texto de imagens e documentos PDF
                      </div>
                    </div>
                    <Switch
                      checked={config.mediaProcessing?.googleVision?.enabled || false}
                      onCheckedChange={(checked) => {
                        setConfig({
                          ...config,
                          mediaProcessing: {
                            ...config.mediaProcessing,
                            googleVision: {
                              ...config.mediaProcessing?.googleVision,
                              enabled: checked
                            }
                          }
                        })
                      }}
                    />
                  </div>

                  {config.mediaProcessing?.googleVision?.enabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="googleVisionCredentials">Arquivo de Credenciais do Google Cloud</Label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="flex items-center mb-2">
                              {config.mediaProcessing?.googleVision?.credentialsUploaded ? (
                                <CheckCircle className="h-8 w-8 text-green-500" />
                              ) : (
                                <Upload className="h-8 w-8 text-gray-400" />
                              )}
                            </div>
                            <div className="mb-2">
                              {config.mediaProcessing?.googleVision?.credentialsUploaded ? (
                                <p className="text-sm text-green-600 font-medium">Credenciais carregadas com sucesso</p>
                              ) : (
                                <p className="text-sm text-gray-600">Clique para fazer upload do arquivo JSON de credenciais</p>
                              )}
                            </div>
                            <input
                              id="googleVisionCredentials"
                              type="file"
                              accept=".json,application/json"
                              onChange={handleCredentialsUpload}
                              disabled={uploadingCredentials}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={uploadingCredentials}
                              onClick={() => document.getElementById('googleVisionCredentials')?.click()}
                              className="mb-2"
                            >
                              {uploadingCredentials ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                <>
                                  <Upload className="h-4 w-4 mr-2" />
                                  {config.mediaProcessing?.googleVision?.credentialsUploaded ? 'Atualizar Credenciais' : 'Enviar Credenciais'}
                                </>
                              )}
                            </Button>
                            {config.mediaProcessing?.googleVision?.keyPath && (
                              <p className="text-xs text-gray-500">
                                Arquivo: {config.mediaProcessing.googleVision.keyPath.split('/').pop()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-sm text-blue-800">
                            <strong>Como obter as credenciais:</strong>
                          </p>
                          <ol className="text-sm text-blue-700 mt-1 ml-4 list-decimal space-y-1">
                            <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Google Cloud Console</a></li>
                            <li>Vá para APIs e Serviços → Credenciais</li>
                            <li>Clique em &quot;Criar credenciais&quot; → &quot;Chave da conta de serviço&quot;</li>
                            <li>Selecione uma conta de serviço e baixe o arquivo JSON</li>
                            <li>Ative a API Vision no seu projeto Google Cloud</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-3 flex items-center space-x-2">
                  <Mic className="h-4 w-4" />
                  <span>Groq Whisper (Transcrição de Áudio)</span>
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="groqEnabled">Habilitar Groq</Label>
                      <div className="text-sm text-gray-600">
                        Transcrição ultra-rápida de áudios com Whisper
                      </div>
                    </div>
                    <Switch
                      checked={config.mediaProcessing?.groq?.enabled || false}
                      onCheckedChange={(checked) => {
                        setConfig({
                          ...config,
                          mediaProcessing: {
                            ...config.mediaProcessing,
                            groq: {
                              ...config.mediaProcessing?.groq,
                              enabled: checked
                            }
                          }
                        })
                      }}
                    />
                  </div>

                  {config.mediaProcessing?.groq?.enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="groqApiKey">Chave da API Groq</Label>
                      <Input
                        id="groqApiKey"
                        type="password"
                        placeholder="gsk_..."
                        value={config.mediaProcessing?.groq?.apiKey || ''}
                        onChange={(e) => {
                          setConfig({
                            ...config,
                            mediaProcessing: {
                              ...config.mediaProcessing,
                              groq: {
                                ...config.mediaProcessing?.groq,
                                apiKey: e.target.value
                              }
                            }
                          })
                        }}
                      />
                      <p className="text-sm text-gray-600">
                        Chave de API do Groq para transcrição de áudio
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}