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

interface OfficialAccount {
  _id: string
  name: string
  phoneNumberId: string
  accessToken: string
  isActive: boolean
}

export default function BroadcastPage() {
  const [instances, setInstances] = useState<WhatsAppInstance[]>([])
  const [officialAccounts, setOfficialAccounts] = useState<OfficialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // Configuração da mensagem
  const [selectedSource, setSelectedSource] = useState<'evolution' | 'official' | ''>('')
  const [selectedInstance, setSelectedInstance] = useState('')
  const [selectedOfficial, setSelectedOfficial] = useState('')
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
    fetchOfficialAccounts()
  }, [])

  const fetchInstances = async () => {
    try {
      const response = await fetch('/api/evolution/instances')
      if (response.ok) {
        const data = await response.json()
        setInstances(data.instances || [])
      }
    } catch (error) {
      console.error('Error fetching instances:', error)
    }
  }

  const fetchOfficialAccounts = async () => {
    try {
      const response = await fetch('/api/whatsapp-official/accounts')
      if (response.ok) {
        const data = await response.json()
        setOfficialAccounts(data.accounts || [])
      }
    } catch (error) {
      console.error('Error fetching official accounts:', error)
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

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      setMessage({ type: 'success', text: 'Arquivo CSV carregado com sucesso!' })
    } else {
      setMessage({ type: 'error', text: 'Por favor, selecione um arquivo CSV válido.' })
    }
  }

  const processCsv = (csvContent: string): string[] => {
    const lines = csvContent.split('\n')
    const phones: string[] = []
    
    lines.forEach((line, index) => {
      if (index === 0 && line.toLowerCase().includes('telefone')) return // Skip header
      const phone = line.split(',')[0].trim()
      if (phone && phone.match(/^\d+$/)) {
        phones.push(phone)
      }
    })
    
    return phones
  }

  const handleBroadcast = async () => {
    if (!messageText.trim()) {
      setMessage({ type: 'error', text: 'Por favor, digite uma mensagem.' })
      return
    }

    if (!selectedSource) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma fonte (Evolution API ou WhatsApp Oficial).' })
      return
    }

    if (selectedSource === 'evolution' && !selectedInstance) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma instância do Evolution API.' })
      return
    }

    if (selectedSource === 'official' && !selectedOfficial) {
      setMessage({ type: 'error', text: 'Por favor, selecione uma conta oficial do WhatsApp.' })
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
      phonesToSend = phoneNumbers.filter(phone => phone.trim().length > 0)
    }

    if (phonesToSend.length === 0) {
      setMessage({ type: 'error', text: 'Por favor, adicione pelo menos um número de telefone.' })
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
          source: selectedSource,
          instanceId: selectedSource === 'evolution' ? selectedInstance : undefined,
          officialAccountId: selectedSource === 'official' ? selectedOfficial : undefined,
          message: messageText,
          phones: phonesToSend
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setBroadcastResults(data.results)
        setMessage({ 
          type: 'success', 
          text: `Disparo finalizado! ${data.results.success} enviados, ${data.results.failed} falharam.` 
        })
      } else {
        throw new Error(data.error || 'Erro no disparo')
      }

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao enviar mensagens.' })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Send className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Disparo de Mensagens</h1>
            <p className="text-gray-600">Envie mensagens em massa via Evolution API ou WhatsApp Oficial</p>
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

      {/* Seleção da fonte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Configuração do Envio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Selecionar Fonte</Label>
            <Select value={selectedSource} onValueChange={(value) => setSelectedSource(value as 'evolution' | 'official')}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha entre Evolution API ou WhatsApp Oficial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="evolution">Evolution API (Instâncias)</SelectItem>
                <SelectItem value="official">WhatsApp API Oficial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedSource === 'evolution' && (
            <div className="space-y-2">
              <Label>Instância do Evolution API</Label>
              <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma instância" />
                </SelectTrigger>
                <SelectContent>
                  {instances
                    .filter(instance => instance.isConnected)
                    .map(instance => (
                      <SelectItem key={instance._id} value={instance._id}>
                        <div className="flex items-center space-x-2">
                          <span>{instance.instanceName}</span>
                          {instance.phoneNumber && (
                            <Badge variant="outline">
                              <Phone className="w-3 h-3 mr-1" />
                              {instance.phoneNumber}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {instances.filter(i => i.isConnected).length === 0 && (
                <p className="text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Nenhuma instância conectada encontrada.
                </p>
              )}
            </div>
          )}

          {selectedSource === 'official' && (
            <div className="space-y-2">
              <Label>Conta Oficial do WhatsApp</Label>
              <Select value={selectedOfficial} onValueChange={setSelectedOfficial}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma conta oficial" />
                </SelectTrigger>
                <SelectContent>
                  {officialAccounts
                    .filter(account => account.isActive)
                    .map(account => (
                      <SelectItem key={account._id} value={account._id}>
                        <div className="flex items-center space-x-2">
                          <span>{account.name}</span>
                          <Badge variant="outline">{account.phoneNumberId}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {officialAccounts.filter(a => a.isActive).length === 0 && (
                <p className="text-sm text-amber-600">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Nenhuma conta oficial ativa encontrada. Configure em WhatsApp API Oficial.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuração da mensagem */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Mensagem
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Texto da Mensagem</Label>
            <Textarea
              id="message"
              rows={4}
              placeholder="Digite a mensagem que será enviada para todos os contatos..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <p className="text-sm text-gray-600">
              A mensagem será enviada exatamente como digitada. Caracteres: {messageText.length}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Destinatários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Destinatários
            </div>
            <div className="flex items-center space-x-3">
              <Switch
                checked={useCsv}
                onCheckedChange={setUseCsv}
              />
              <Label>Usar arquivo CSV</Label>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {useCsv ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">
                  Faça upload de um arquivo CSV com números de telefone
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('csv-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo CSV
                </Button>
                {csvFile && (
                  <p className="text-sm text-green-600 mt-2">
                    <CheckCircle className="w-4 h-4 inline mr-1" />
                    {csvFile.name} carregado
                  </p>
                )}
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Formato do CSV:</strong> Uma coluna com números de telefone (apenas números, sem símbolos).
                  Exemplo: 5511999999999
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Números de Telefone</Label>
              {phoneNumbers.map((phone, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder="Ex: 5511999999999"
                    value={phone}
                    onChange={(e) => updatePhoneNumber(index, e.target.value)}
                  />
                  {phoneNumbers.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePhoneNumber(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={addPhoneNumber}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Número
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Botão de envio */}
      <div className="flex justify-center">
        <Button 
          onClick={handleBroadcast}
          disabled={sending}
          size="lg"
          className="px-8"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Enviar Mensagens
            </>
          )}
        </Button>
      </div>

      {/* Resultados do disparo */}
      {broadcastResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Resultados do Disparo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-600">{broadcastResults.success}</p>
                <p className="text-sm text-green-600">Enviados</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-600">{broadcastResults.failed}</p>
                <p className="text-sm text-red-600">Falharam</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-600">
                  {broadcastResults.success + broadcastResults.failed}
                </p>
                <p className="text-sm text-blue-600">Total</p>
              </div>
            </div>

            {broadcastResults.details.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Detalhes por Número</h3>
                <div className="max-h-60 overflow-y-auto border rounded-lg">
                  {broadcastResults.details.map((detail, index) => (
                    <div
                      key={index}
                      className={`p-3 border-b last:border-b-0 flex items-center justify-between ${
                        detail.status === 'success' ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {detail.status === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">{detail.phone}</span>
                      </div>
                      {detail.error && (
                        <span className="text-sm text-red-600">{detail.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}