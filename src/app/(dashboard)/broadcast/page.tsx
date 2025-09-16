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
import { Badge } from '@/components/ui/Badge'
import {
  Send,
  Users,
  MessageSquare,
  Upload,
  Plus,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Phone,
  BarChart3
} from 'lucide-react'

interface WhatsAppInstance {
  _id: string
  instanceName: string
  phoneNumber?: string
  isConnected: boolean
}

export default function BroadcastPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Configuração da mensagem
  const [selectedInstance, setSelectedInstance] = useState('')
  const [messageText, setMessageText] = useState('')
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>([''])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [useCsv, setUseCsv] = useState(false)

  // Estado do envio
  const [broadcastResults, setBroadcastResults] = useState<{
    success: number
    failed: number
    details: Array<{
      phone: string
      status: 'success' | 'failed'
      error?: string
    }>
  } | null>(null)

  useEffect(() => {
    fetchInstances()
  }, [])

  const fetchInstances = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/evolution/instances')
      if (response.ok) {
        const data = await response.json()
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Error fetching instances:', error)
    } finally {
      setLoading(false)
    }
  }

  const addPhoneNumber = () => {
    setPhoneNumbers([...phoneNumbers, ''])
  }

  const removePhoneNumber = (index: number) => {
    if (phoneNumbers.length > 1) {
      setPhoneNumbers(phoneNumbers.filter((_, i) => i !== index))
    }
  }

  const updatePhoneNumber = (index: number, value: string) => {
    const updated = [...phoneNumbers]
    updated[index] = value
    setPhoneNumbers(updated)
  }

  const processCsv = (csvContent: string): string[] => {
    const lines = csvContent.split('\n')
    const phones = lines
      .map(line => line.trim().replace(/[^\d]/g, ''))
      .filter(phone => phone.length >= 10)
    return phones
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setCsvFile(file)
    }
  }

  const handleBroadcast = async () => {
    if (!messageText.trim()) {
      setMessage({ type: 'error', text: 'Por favor, digite uma mensagem.' })
      return
    }

    if (!selectedInstance) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma instância do WhatsApp.' })
      return
    }

    let phonesToSend: string[] = []

    if (useCsv && csvFile) {
      try {
        const csvContent = await csvFile.text()
        phonesToSend = processCsv(csvContent)
      } catch (error) {
        setMessage({ type: 'error', text: 'Erro ao processar arquivo CSV.' })
        return
      }
    } else {
      phonesToSend = phoneNumbers
        .map(phone => phone.trim().replace(/[^\d]/g, ''))
        .filter(phone => phone.length >= 10)
    }

    if (phonesToSend.length === 0) {
      setMessage({ type: 'error', text: 'Por favor, adicione pelo menos um número válido.' })
      return
    }

    setSending(true)
    setMessage(null)
    setBroadcastResults(null)

    try {
      const response = await fetch('/api/broadcast/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          phones: phonesToSend,
          instanceId: selectedInstance,
        })
      })

      const data = await response.json()

      if (response.ok) {
        setBroadcastResults(data.results)
        setMessage({
          type: 'success',
          text: `Broadcast enviado! ${data.results.success} sucessos, ${data.results.failed} falhas.`
        })
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao enviar broadcast.' })
      }

    } catch (error) {
      console.error('Broadcast error:', error)
      setMessage({ type: 'error', text: 'Erro ao conectar com o servidor.' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando instâncias...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Send className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Disparo de Mensagens</h1>
            <p className="text-gray-600">Envie mensagens em massa via WhatsApp</p>
          </div>
        </div>
      </div>

      {message && (
        <Alert className={
          message.type === 'error' ? 'border-red-500 bg-red-50' :
          message.type === 'success' ? 'border-green-500 bg-green-50' :
          'border-blue-500 bg-blue-50'
        }>
          <AlertDescription className={
            message.type === 'error' ? 'text-red-700' :
            message.type === 'success' ? 'text-green-700' :
            'text-blue-700'
          }>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração da Mensagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2" />
              Configuração da Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Seleção de Instância */}
            <div className="space-y-2">
              <Label>Instância WhatsApp</Label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances
                    .filter(instance => instance.isConnected && instance.phoneNumber)
                    .map((instance) => (
                      <SelectItem key={instance.instanceName} value={instance.instanceName}>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>{instance.instanceName}</span>
                          <Badge variant="secondary" className="text-xs">
                            {instance.phoneNumber}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {instances.filter(i => i.isConnected && i.phoneNumber).length === 0 && (
                <p className="text-sm text-red-600">
                  Nenhuma instância conectada disponível. Conecte uma instância em WhatsApp &gt; Conexões.
                </p>
              )}
            </div>

            {/* Texto da Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                placeholder="Digite sua mensagem aqui..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="text-right text-sm text-gray-500">
                {messageText.length}/1000 caracteres
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Destinatários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Destinatários
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Switch para CSV */}
            <div className="flex items-center space-x-2">
              <Switch checked={useCsv} onCheckedChange={setUseCsv} />
              <Label>Usar arquivo CSV</Label>
            </div>

            {useCsv ? (
              /* Upload de CSV */
              <div className="space-y-2">
                <Label htmlFor="csv-upload">Arquivo CSV</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <Input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Clique para fazer upload do arquivo CSV
                    </p>
                  </Label>
                  {csvFile && (
                    <p className="text-sm text-green-600 mt-2">
                      Arquivo selecionado: {csvFile.name}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  O arquivo deve conter uma coluna com números de telefone (apenas números)
                </p>
              </div>
            ) : (
              /* Números Manuais */
              <div className="space-y-2">
                <Label>Números de Telefone</Label>
                {phoneNumbers.map((phone, index) => (
                  <div key={index} className="flex space-x-2">
                    <Input
                      placeholder="Ex: 5511999999999"
                      value={phone}
                      onChange={(e) => updatePhoneNumber(index, e.target.value)}
                    />
                    {phoneNumbers.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePhoneNumber(index)}
                        className="text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addPhoneNumber}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Número
                </Button>
              </div>
            )}

            {/* Botão de Envio */}
            <Button
              onClick={handleBroadcast}
              disabled={sending}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Broadcast
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Resultados */}
      {broadcastResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Resultados do Broadcast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Sucessos</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{broadcastResults.success}</p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <span className="font-medium">Falhas</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{broadcastResults.failed}</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Total</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {broadcastResults.success + broadcastResults.failed}
                </p>
              </div>
            </div>

            {broadcastResults.details && broadcastResults.details.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <h4 className="font-medium">Detalhes por número:</h4>
                {broadcastResults.details.map((result, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded text-sm ${
                      result.status === 'success'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    <span>{result.phone}</span>
                    <div className="flex items-center space-x-2">
                      {result.status === 'success' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      <span>{result.status === 'success' ? 'Enviado' : result.error}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}