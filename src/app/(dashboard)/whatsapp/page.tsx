'use client'

import React, { useState, useEffect } from 'react'
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
  Clock
} from 'lucide-react'

interface Instance {
  instanceName: string
  state?: string
  status?: string
  qrcode?: string
  pairingCode?: string
  ownerJid?: string
  profileName?: string
  profilePicUrl?: string
  integration?: string
  token?: string
  createdAt?: string
  updatedAt?: string
}

export default function WhatsAppConnectionPage() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(false)
  const [qrLoading, setQrLoading] = useState<string | null>(null)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({})

  // Fetch existing instances
  const fetchInstances = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/evolution/instances')
      const data = await response.json()
      
      if (response.ok) {
        setInstances(data.instances || [])
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
  const checkConnectionStatus = async (instanceName: string) => {
    try {
      const response = await fetch(`/api/evolution/status/${instanceName}`)
      const data = await response.json()

      if (response.ok) {
        setConnectionStatus(prev => ({
          ...prev,
          [instanceName]: data.instance?.state || 'unknown'
        }))
      }
    } catch (error) {
      console.error('Error checking status:', error)
    }
  }

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

  useEffect(() => {
    if (instances.length > 0) {
      const interval = setInterval(() => {
        instances.forEach(instance => {
          checkConnectionStatus(instance.instanceName)
        })
      }, 10000) // Check every 10 seconds

      return () => clearInterval(interval)
    }
  }, [instances])

  const getStatusBadge = (instance: Instance) => {
    const status = connectionStatus[instance.instanceName] || instance.state || 'close'
    
    switch (status) {
      case 'open':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Conectado</Badge>
      case 'connecting':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Conectando</Badge>
      case 'close':
      case 'closed':
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" />Desconectado</Badge>
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Desconhecido ({status})</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conexão WhatsApp</h1>
        <p className="text-muted-foreground">
          Gerencie suas conexões WhatsApp via Evolution API
        </p>
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
                  <div>
                    <div>{instance.instanceName}</div>
                    {instance.profileName && (
                      <div className="text-sm font-normal text-muted-foreground">
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
              <div className="flex items-center gap-2">
                {getStatusBadge(instance)}
                {instance.ownerJid && (
                  <Badge variant="outline" className="text-xs">
                    {instance.ownerJid.split('@')[0]}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
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
                    Clique em "Conectar" para gerar o QR Code
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