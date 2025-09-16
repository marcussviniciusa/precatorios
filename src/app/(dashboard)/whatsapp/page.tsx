'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Phone,
  Globe,
  Key,
  Building
} from 'lucide-react'

interface Instance {
  instanceName: string
  state?: string
  status?: string
  phoneNumber?: string
  qrcode?: string
  pairingCode?: string
  ownerJid?: string
  profileName?: string
  profilePicUrl?: string
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  businessConfig?: {
    accessToken?: string
    phoneNumberId?: string
    businessAccountId?: string
    verifyToken?: string
  }
  token?: string
  createdAt?: string
  updatedAt?: string
  lastConnectionAt?: string
  connectionHistory?: { instanceName: string; connectedAt: string }[]
}

// Função para formatar número de telefone para exibição
const formatPhoneForDisplay = (phone?: string): string => {
  if (!phone) return 'Não conectado'

  // Formato brasileiro: +55 (84) 99999-9999
  if (phone.startsWith('55') && phone.length >= 12) {
    const ddd = phone.substring(2, 4)
    const number = phone.substring(4)

    if (number.length === 9) {
      return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`
    } else if (number.length === 8) {
      return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`
    }
  }

  // Fallback: formato internacional simples
  return `+${phone}`
}

export default function WhatsAppConnectionPage() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState<string | null>(null)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [selectedIntegration, setSelectedIntegration] = useState<'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'>('WHATSAPP-BAILEYS')
  const [businessConfig, setBusinessConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: ''
  })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch existing instances
  const fetchInstances = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/evolution/instances')
      const data = await response.json()

      if (response.ok) {
        setInstances(data.instances || [])
        // Check status of all instances after fetching
        const instances = data.instances || []
        instances.forEach((instance: Instance) => {
          checkConnectionStatus(instance.instanceName)
        })
      } else {
        toast.error('Erro ao carregar instâncias: ' + data.error)
      }
    } catch (error) {
      toast.error('Erro ao carregar instâncias')
      console.error('Error fetching instances:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Create new instance
  const createInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Nome da instância é obrigatório')
      return
    }

    // Validação para WHATSAPP-BUSINESS
    if (selectedIntegration === 'WHATSAPP-BUSINESS') {
      if (!businessConfig.accessToken.trim() || !businessConfig.phoneNumberId.trim()) {
        toast.error('Access Token e Phone Number ID são obrigatórios para WhatsApp Business')
        return
      }
    }

    try {
      setLoading(true)
      const payload: any = {
        instanceName: newInstanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        integration: selectedIntegration,
        qrcode: selectedIntegration === 'WHATSAPP-BAILEYS',
        groupsIgnore: true,
        alwaysOnline: true,
        readMessages: true,
        readStatus: true
      }

      // Adicionar configuração de negócios se for WHATSAPP-BUSINESS
      if (selectedIntegration === 'WHATSAPP-BUSINESS') {
        payload.businessConfig = {
          accessToken: businessConfig.accessToken.trim(),
          phoneNumberId: businessConfig.phoneNumberId.trim(),
          businessAccountId: businessConfig.businessAccountId.trim() || undefined,
          verifyToken: Math.random().toString(36).substring(2, 15) // Gerar token de verificação
        }
      }

      const response = await fetch('/api/evolution/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Instância criada com sucesso!')
        setNewInstanceName('')
        setBusinessConfig({
          accessToken: '',
          phoneNumberId: '',
          businessAccountId: ''
        })
        setShowCreateForm(false)
        await fetchInstances()
      } else {
        toast.error(data.error || 'Erro ao criar instância')
      }
    } catch (error) {
      toast.error('Erro ao criar instância')
      console.error('Error creating instance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Connect to instance (generate QR code)
  const connectInstance = async (instanceName: string) => {
    try {
      setQrLoading(instanceName)
      const response = await fetch(`/api/evolution/connect/${instanceName}`)
      const data = await response.json()

      if (response.ok) {
        // Update instance with QR code
        setInstances(prev => prev.map(inst =>
          inst.instanceName === instanceName
            ? { ...inst, qrcode: data.qrcode, pairingCode: data.pairingCode }
            : inst
        ))
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.')

        // Start checking connection status
        checkConnectionStatus(instanceName)
      } else {
        toast.error(data.error || 'Erro ao conectar instância')
      }
    } catch (error) {
      toast.error('Erro ao conectar instância')
      console.error('Error connecting instance:', error)
    } finally {
      setQrLoading(null)
    }
  }

  // Check connection status
  const checkConnectionStatus = async (instanceName: string) => {
    try {
      const response = await fetch(`/api/evolution/status/${instanceName}`)
      const data = await response.json()

      if (response.ok) {
        setConnectionStatus(prev => ({
          ...prev,
          [instanceName]: data.state || data.status || 'close'
        }))

        // Update instances with new data
        setInstances(prev => prev.map(inst => {
          if (inst.instanceName === instanceName) {
            return {
              ...inst,
              state: data.state || data.status || 'close',
              phoneNumber: data.phoneNumber || inst.phoneNumber,
              profileName: data.profileName || inst.profileName,
              profilePicUrl: data.profilePicUrl || inst.profilePicUrl,
              ownerJid: data.ownerJid || inst.ownerJid
            }
          }
          return inst
        }))
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

  // Delete instance
  const deleteInstance = async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a instância "${instanceName}"?`)) return

    try {
      setLoading(true)
      const response = await fetch(`/api/evolution/delete/${instanceName}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Instância excluída com sucesso!')
        await fetchInstances()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Erro ao excluir instância')
      }
    } catch (error) {
      toast.error('Erro ao excluir instância')
      console.error('Error deleting instance:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  // Auto-refresh status every 5 seconds
  useEffect(() => {
    if (instances.length > 0) {
      intervalRef.current = setInterval(() => {
        instances.forEach(instance => {
          if (instance.state !== 'open') {
            checkConnectionStatus(instance.instanceName)
          }
        })
      }, 5000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [instances])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Smartphone className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Evolution</h1>
            <p className="text-gray-600">Gerencie suas conexões WhatsApp</p>
          </div>
        </div>

        <Button onClick={() => setShowCreateForm(true)} disabled={showCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Instância
        </Button>
      </div>

      {/* Form para criar nova instância */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Instância WhatsApp</CardTitle>
            <CardDescription>
              Configure uma nova conexão WhatsApp via Evolution API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nome da instância */}
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da Instância</Label>
              <Input
                id="instanceName"
                placeholder="Ex: empresa-principal"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>

            {/* Tipo de integração */}
            <div className="space-y-2">
              <Label>Tipo de Integração</Label>
              <Select value={selectedIntegration} onValueChange={(value) => setSelectedIntegration(value as 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP-BAILEYS">
                    <div className="flex items-center space-x-2">
                      <QrCode className="w-4 h-4" />
                      <div>
                        <div className="font-medium">WhatsApp Baileys</div>
                        <div className="text-xs text-gray-500">Conexão via QR Code (WhatsApp Web)</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="WHATSAPP-BUSINESS">
                    <div className="flex items-center space-x-2">
                      <Building className="w-4 h-4" />
                      <div>
                        <div className="font-medium">WhatsApp Business API</div>
                        <div className="text-xs text-gray-500">API Oficial do Meta (requer tokens)</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos específicos para WHATSAPP-BUSINESS */}
            {selectedIntegration === 'WHATSAPP-BUSINESS' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2 text-blue-800">
                  <Globe className="w-4 h-4" />
                  <span className="font-medium">Configuração Meta Business API</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accessToken">Access Token *</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      placeholder="EAA..."
                      value={businessConfig.accessToken}
                      onChange={(e) => setBusinessConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                    <Input
                      id="phoneNumberId"
                      placeholder="102290129340398"
                      value={businessConfig.phoneNumberId}
                      onChange={(e) => setBusinessConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="businessAccountId">Business Account ID</Label>
                    <Input
                      id="businessAccountId"
                      placeholder="102290129340398 (opcional)"
                      value={businessConfig.businessAccountId}
                      onChange={(e) => setBusinessConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                  <strong>Onde encontrar:</strong> Meta Developer Console &gt; Your App &gt; WhatsApp &gt; Getting Started
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewInstanceName('')
                  setBusinessConfig({ accessToken: '', phoneNumberId: '', businessAccountId: '' })
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createInstance} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Instância
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de instâncias */}
      <div className="grid gap-4">
        {instances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Smartphone className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância criada</h3>
              <p className="text-gray-500 text-center mb-4">
                Crie sua primeira instância WhatsApp para começar a receber mensagens.
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Instância
              </Button>
            </CardContent>
          </Card>
        ) : (
          instances.map((instance) => (
            <Card key={instance.instanceName} className="relative">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {instance.profilePicUrl ? (
                        <img
                          src={instance.profilePicUrl}
                          alt="Profile"
                          className="w-12 h-12 rounded-full border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                          <Phone className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {instance.instanceName}
                        </h3>
                        <Badge variant={instance.integration === 'WHATSAPP-BUSINESS' ? 'default' : 'secondary'}>
                          {instance.integration === 'WHATSAPP-BUSINESS' ? 'Business API' : 'Baileys'}
                        </Badge>
                        <Badge
                          variant={
                            (connectionStatus[instance.instanceName] || instance.state) === 'open' ? 'default' :
                            (connectionStatus[instance.instanceName] || instance.state) === 'connecting' ? 'secondary' :
                            'outline'
                          }
                        >
                          {(connectionStatus[instance.instanceName] || instance.state) === 'open' && <Wifi className="w-3 h-3 mr-1" />}
                          {(connectionStatus[instance.instanceName] || instance.state) === 'connecting' && <Clock className="w-3 h-3 mr-1" />}
                          {(connectionStatus[instance.instanceName] || instance.state) === 'close' && <WifiOff className="w-3 h-3 mr-1" />}
                          {
                            (connectionStatus[instance.instanceName] || instance.state) === 'open' ? 'Conectado' :
                            (connectionStatus[instance.instanceName] || instance.state) === 'connecting' ? 'Conectando' :
                            'Desconectado'
                          }
                        </Badge>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>{formatPhoneForDisplay(instance.phoneNumber)}</span>
                        </div>
                        {instance.profileName && (
                          <div className="flex items-center space-x-2">
                            <span className="w-4 h-4 text-center">👤</span>
                            <span>{instance.profileName}</span>
                          </div>
                        )}
                        {instance.integration === 'WHATSAPP-BUSINESS' && instance.businessConfig?.phoneNumberId && (
                          <div className="flex items-center space-x-2">
                            <Building className="w-4 h-4" />
                            <span>Phone ID: {instance.businessConfig.phoneNumberId}</span>
                          </div>
                        )}
                      </div>

                      {instance.connectionHistory && instance.connectionHistory.length > 1 && (
                        <div className="mt-2 text-xs text-gray-500">
                          Reconexão detectada - histórico de {instance.connectionHistory.length} conexões
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {(connectionStatus[instance.instanceName] || instance.state) !== 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => connectInstance(instance.instanceName)}
                        disabled={qrLoading === instance.instanceName}
                      >
                        {qrLoading === instance.instanceName ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 mr-1" />
                            {instance.integration === 'WHATSAPP-BUSINESS' ? 'Conectar' : 'QR Code'}
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteInstance(instance.instanceName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* QR Code Display */}
                {instance.qrcode && (
                  <div className="mt-4 flex justify-center">
                    <div className="bg-white p-4 rounded-lg border">
                      <img
                        src={instance.qrcode}
                        alt="QR Code"
                        className="w-48 h-48"
                      />
                      <p className="text-center text-sm text-gray-600 mt-2">
                        {instance.integration === 'WHATSAPP-BUSINESS' ?
                          'Aguardando confirmação da Meta...' :
                          'Escaneie este código com seu WhatsApp'
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Pairing Code Display */}
                {instance.pairingCode && (
                  <div className="mt-4 text-center">
                    <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg">
                      <span className="text-sm text-gray-600">Código de emparelhamento: </span>
                      <span className="font-mono text-lg font-bold">{instance.pairingCode}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}