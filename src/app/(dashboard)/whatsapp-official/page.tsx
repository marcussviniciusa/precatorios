'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/Badge'
import { 
  Webhook,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Key,
  Phone,
  Globe,
  Shield
} from 'lucide-react'

interface OfficialAccount {
  _id?: string
  name: string
  phoneNumberId: string
  accessToken: string
  businessAccountId: string
  webhookUrl: string
  webhookToken: string
  isActive: boolean
  createdAt?: string
  lastUsed?: string
}

export default function WhatsAppOfficialPage() {
  const [accounts, setAccounts] = useState<OfficialAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<OfficialAccount | null>(null)
  const [formData, setFormData] = useState<OfficialAccount>({
    name: '',
    phoneNumberId: '',
    accessToken: '',
    businessAccountId: '',
    webhookUrl: '',
    webhookToken: '',
    isActive: true
  })

  // Webhook test state
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/whatsapp-official/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data.accounts || [])
      } else {
        throw new Error('Falha ao carregar contas')
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao carregar contas' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      phoneNumberId: '',
      accessToken: '',
      businessAccountId: '',
      webhookUrl: `${window.location.origin}/api/webhook/whatsapp-official`,
      webhookToken: generateWebhookToken(),
      isActive: true
    })
    setEditingAccount(null)
  }

  const generateWebhookToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (account: OfficialAccount) => {
    setFormData(account)
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleCancel = () => {
    setShowForm(false)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.phoneNumberId.trim() || !formData.accessToken.trim()) {
      setMessage({ type: 'error', text: 'Por favor, preencha todos os campos obrigatórios.' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const url = editingAccount 
        ? `/api/whatsapp-official/accounts/${editingAccount._id}`
        : '/api/whatsapp-official/accounts'
      
      const method = editingAccount ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ 
          type: 'success', 
          text: editingAccount ? 'Conta atualizada com sucesso!' : 'Conta criada com sucesso!' 
        })
        setShowForm(false)
        resetForm()
        await fetchAccounts()
      } else {
        throw new Error(data.error || 'Erro ao salvar conta')
      }

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao salvar conta' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta?')) return

    try {
      const response = await fetch(`/api/whatsapp-official/accounts/${accountId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Conta excluída com sucesso!' })
        await fetchAccounts()
      } else {
        throw new Error(data.error || 'Erro ao excluir conta')
      }

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao excluir conta' })
    }
  }

  const handleTestWebhook = async (accountId: string) => {
    setTestingWebhook(accountId)
    
    try {
      const response = await fetch(`/api/whatsapp-official/test-webhook/${accountId}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: 'Webhook testado com sucesso!' })
      } else {
        throw new Error(data.error || 'Erro no teste do webhook')
      }

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Erro ao testar webhook' })
    } finally {
      setTestingWebhook(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando contas...</span>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Webhook className="h-8 w-8 text-green-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp API Oficial</h1>
            <p className="text-gray-600">Gerencie conexões com a API oficial do Meta</p>
          </div>
        </div>

        <Button onClick={handleAddNew} disabled={showForm}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
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

      {/* Documentação de setup */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-900">
            <Globe className="w-5 h-5 mr-2" />
            Como Configurar WhatsApp API Oficial
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Pré-requisitos:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>
                <a 
                  href="https://developers.facebook.com/apps" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-900 inline-flex items-center"
                >
                  Criar um app no Meta Developers <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </li>
              <li>Adicionar o produto &quot;WhatsApp Business&quot; ao app</li>
              <li>Configurar um Business Account do WhatsApp</li>
              <li>Obter um Phone Number ID e Access Token</li>
              <li>
                Configurar webhook URL: <code className="bg-gray-100 px-1 rounded">
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/webhook/whatsapp-official` : '[URL_DO_SEU_SITE]/api/webhook/whatsapp-official'}
                </code>
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Form para nova conta/edição */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{editingAccount ? 'Editar Conta' : 'Nova Conta WhatsApp Oficial'}</span>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Conta *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Empresa Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumberId">Phone Number ID *</Label>
                <Input
                  id="phoneNumberId"
                  placeholder="Ex: 102290129340398"
                  value={formData.phoneNumberId}
                  onChange={(e) => setFormData({ ...formData, phoneNumberId: e.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="accessToken">Access Token *</Label>
                <Input
                  id="accessToken"
                  type="password"
                  placeholder="EAA..."
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="businessAccountId">Business Account ID</Label>
                <Input
                  id="businessAccountId"
                  placeholder="Ex: 102290129340398"
                  value={formData.businessAccountId}
                  onChange={(e) => setFormData({ ...formData, businessAccountId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookToken">Webhook Token</Label>
                <div className="flex space-x-2">
                  <Input
                    id="webhookToken"
                    value={formData.webhookToken}
                    onChange={(e) => setFormData({ ...formData, webhookToken: e.target.value })}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setFormData({ ...formData, webhookToken: generateWebhookToken() })}
                  >
                    Gerar
                  </Button>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="webhookUrl">Webhook URL</Label>
                <Input
                  id="webhookUrl"
                  value={formData.webhookUrl}
                  onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label>Conta Ativa</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {editingAccount ? 'Atualizar' : 'Salvar'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de contas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Contas Configuradas ({accounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma conta configurada ainda.</p>
              <p className="text-sm text-gray-400">Clique em &quot;Nova Conta&quot; para começar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium text-lg">{account.name}</h3>
                        <Badge variant={account.isActive ? 'default' : 'secondary'}>
                          {account.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>Phone ID: {account.phoneNumberId}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Key className="w-4 h-4" />
                          <span>Token: {account.accessToken.substring(0, 15)}...</span>
                        </div>

                        {account.businessAccountId && (
                          <div className="flex items-center space-x-2">
                            <Globe className="w-4 h-4" />
                            <span>Business ID: {account.businessAccountId}</span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <Shield className="w-4 h-4" />
                          <span>Webhook: {account.webhookToken.substring(0, 8)}...</span>
                        </div>
                      </div>

                      {account.lastUsed && (
                        <div className="text-xs text-gray-500">
                          Último uso: {new Date(account.lastUsed).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestWebhook(account._id!)}
                        disabled={testingWebhook === account._id}
                      >
                        {testingWebhook === account._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Testar
                          </>
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(account)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account._id!)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}