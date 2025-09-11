'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/Badge'
import { Separator } from '@/components/ui/separator'
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
  Phone
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
  integration?: string
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
  const [instances, setInstances] = useState<Instance[]>([]
  const [loading, setLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState<string | null>(null)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({})
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch existing instances
  const fetchInstances = async () => {
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
  }

  // Create new instance
  const createInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Nome da instância é obrigatório')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/evolution/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceName: newInstanceName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true,
          groupsIgnore: true,
          alwaysOnline: true,
          readMessages: true,
          readStatus: true
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Instância criada com sucesso!')
        setNewInstanceName('')
        setShowCreateForm(false)
        await fetchInstances()
      } else {
        toast.error('Erro ao criar instância: ' + data.error)
      }
    } catch (error) {
      toast.error('Erro ao criar instância')
      console.error('Error creating instance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Connect instance and get QR code
  const connectInstance = async (instanceName: string) => {
    try {
      setQrLoading(instanceName)
      const response = await fetch(`/api/evolution/connect/${instanceName}`)
      const data = await response.json()

      if (response.ok) {
        if (data.qrcode) {
          // Update the instance with QR code
          // Check if QR code already has data URL prefix
          const qrcodeUrl = data.qrcode.startsWith('data:image/') 
            ? data.qrcode 
            : `data:image/png;base64,${data.qrcode}`
          
          setInstances(prev => 
            prev.map(instance => 
              instance.instanceName === instanceName 
                ? { ...instance, qrcode: qrcodeUrl }
                : instance
            )
          )
          toast.success('QR Code gerado! Escaneie com seu WhatsApp.')
        }
        
        if (data.pairingCode) {
          // Update the instance with pairing code
          setInstances(prev => 
            prev.map(instance => 
              instance.instanceName === instanceName 
                ? { ...instance, pairingCode: data.pairingCode }
                : instance
            )
          )
          toast.success(`Código de pareamento: ${data.pairingCode}`)
        }
      } else {
        toast.error('Erro ao conectar instância: ' + data.error)
      }
    } catch (error) {
      toast.error('Erro ao conectar instância')
      console.error('Error connecting instance:', error)
    } finally {
      setQrLoading(null)
    }
  }

  // Check connection status
  const checkConnectionStatus = useCallback(async (instanceName: string) => {
    try {
      const response = await fetch(`/api/evolution/status/${instanceName}`)
      const data = await response.json()

      if (response.ok) {
        const newState = data.instance?.state || 'unknown'
        setConnectionStatus(prev => {
          const prevState = prev[instanceName]
          
          // If status changed to 'open', refresh instances data to get profile info
          if (newState === 'open' && prevState === 'connecting') {
            toast.success(`Instância ${instanceName} conectada com sucesso!`)
            fetchInstances()
          }
          
          return {
            ...prev,
            [instanceName]: newState
          }
        })
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }, [])

  // Delete instance
  const deleteInstance = async (instanceName: string) => {
    if (!confirm(`Tem certeza que deseja excluir a instância "${instanceName}"?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/evolution/delete/${instanceName}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('Instância excluída com sucesso!')
        await fetchInstances()
      } else {
        toast.error('Erro ao excluir instância: ' + data.error)
      }
    } catch (error) {
      toast.error('Erro ao excluir instância')
      console.error('Error deleting instance:', error)
    } finally {
      setLoading(false)
    }
  }

  // Auto-refresh status
  useEffect(() => {
    fetchInstances()
  }, [])

  // Check status immediately when instances are loaded
  useEffect(() => {
    if (instances.length > 0) {
      instances.forEach(instance => {
        checkConnectionStatus(instance.instanceName)
      })
    }
  }, [instances.length])

  // Setup auto-refresh interval
  const setupInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    if (instances.length === 0) return

    // Check if any instance is connecting - use faster refresh
    const hasConnecting = instances.some(instance => 
      (connectionStatus[instance.instanceName] || instance.state) === 'connecting'
    )
    
    const refreshInterval = hasConnecting ? 3000 : 15000 // 3s if connecting, 15s otherwise

    intervalRef.current = setInterval(() => {
      instances.forEach(instance => {
        checkConnectionStatus(instance.instanceName)
      })
    }, refreshInterval)
  }, [instances, connectionStatus, checkConnectionStatus])

  // Auto-refresh with dynamic interval based on connection status
  useEffect(() => {
    setupInterval()
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [setupInterval])

  const getStatusBadge = (instance: Instance) => {
    // Priorize connectionStatus (mais atual) sobre instance.state (do fetchInstances)
    const status = connectionStatus[instance.instanceName] || instance.state || 'close'
    
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
      case 'connecting':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1 animate-spin" />Conectando</Badge>
      case 'close':
      case 'closed':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Desconhecido ({status})</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Conexão WhatsApp</h1>
          <p className="text-muted-foreground">
            Gerencie suas conexões WhatsApp via Evolution API
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchInstances}
          disabled={loading}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Atualizar
        </Button>
      </div>

      {/* Create Instance Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Nova Instância
              </CardTitle>
              <CardDescription>
                Crie uma nova instância para conectar ao WhatsApp
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowCreateForm(!showCreateForm)}
              variant={showCreateForm ? "outline" : "default"}
            >
              {showCreateForm ? 'Cancelar' : 'Nova Instância'}
            </Button>
          </div>
        </CardHeader>
        
        {showCreateForm && (
          <CardContent className="border-t">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instanceName">Nome da Instância</Label>
                <Input
                  id="instanceName"
                  placeholder="Ex: minha-empresa"
                  value={newInstanceName}
                  onChange={(e) => setNewInstanceName(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Use apenas letras minúsculas, números e hífens
                </p>
              </div>
              <Button 
                onClick={createInstance} 
                disabled={loading || !newInstanceName.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Instância'
                )}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Instances List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {instances.map((instance) => (
          <Card key={instance.instanceName} className="relative">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {instance.profilePicUrl ? (
                    <img 
                      src={instance.profilePicUrl} 
                      alt="Profile" 
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <Smartphone className="w-5 h-5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{instance.instanceName}</div>
                    {instance.phoneNumber && (
                      <div className="text-sm font-normal text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {formatPhoneForDisplay(instance.phoneNumber)}
                      </div>
                    )}
                    {instance.profileName && (
                      <div className="text-xs font-normal text-muted-foreground">
                        {instance.profileName}
                      </div>
                    )}
                  </div>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteInstance(instance.instanceName)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(instance)}
                {!instance.phoneNumber && instance.ownerJid && (
                  <Badge variant="outline" className="text-xs">
                    {instance.ownerJid.split('@')[0]}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Histórico de Conexões */}
              {instance.connectionHistory && instance.connectionHistory.length > 1 && (
                <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                  <div className="font-medium mb-1">Instância reutilizada:</div>
                  <div className="space-y-1">
                    {instance.connectionHistory.slice(-3).map((conn, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{conn.instanceName}</span>
                        <span>{new Date(conn.connectedAt).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* QR Code or Pairing Code Section */}
              {instance.qrcode ? (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg inline-block border">
                    <img 
                      src={instance.qrcode} 
                      alt="QR Code" 
                      className="w-48 h-48 mx-auto"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Escaneie este QR Code com seu WhatsApp
                  </p>
                </div>
              ) : instance.pairingCode ? (
                <div className="text-center">
                  <div className="bg-gray-100 p-6 rounded-lg">
                    <p className="text-2xl font-mono font-bold tracking-wider">
                      {instance.pairingCode}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use este código no WhatsApp para conectar
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {instance.phoneNumber 
                      ? `Reconectar ${formatPhoneForDisplay(instance.phoneNumber)}`
                      : 'Clique em "Conectar" para gerar o QR Code'
                    }
                  </p>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="space-y-2">
                <Button
                  onClick={() => connectInstance(instance.instanceName)}
                  disabled={qrLoading === instance.instanceName}
                  className="w-full"
                  variant={connectionStatus[instance.instanceName] === 'open' ? 'outline' : 'default'}
                >
                  {qrLoading === instance.instanceName ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Conectando...
                    </>
                  ) : connectionStatus[instance.instanceName] === 'open' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Reconectar
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4 mr-2" />
                      Conectar
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => checkConnectionStatus(instance.instanceName)}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar Status
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {instances.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Smartphone className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma instância encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira instância para conectar ao WhatsApp
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Instância
            </Button>
          </CardContent>
        </Card>
      )}

      {loading && instances.length === 0 && (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Carregando instâncias...</p>
        </div>
      )}
    </div>
  )
}