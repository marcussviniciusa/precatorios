'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/select'
import { Toaster, toast } from 'sonner'
import { PlusIcon, UserIcon, ShieldIcon, EditIcon, TrashIcon, KeyIcon, CheckIcon, XIcon } from 'lucide-react'

interface User {
  _id: string
  name: string
  email: string
  role: 'admin' | 'user'
  phone?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewUserForm, setShowNewUserForm] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState<string | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
    phone: ''
  })

  const [editData, setEditData] = useState<Partial<User>>({})
  const [newPassword, setNewPassword] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar usuários')
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário')
      }

      toast.success('Usuário criado com sucesso!')
      setShowNewUserForm(false)
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        phone: ''
      })
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleUpdateUser = async (userId: string) => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar usuário')
      }

      toast.success('Usuário atualizado com sucesso!')
      setEditingUser(null)
      setEditData({})
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleChangePassword = async (userId: string) => {
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar senha')
      }

      toast.success('Senha alterada com sucesso!')
      setChangingPassword(null)
      setNewPassword('')
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem('token')

      if (!currentStatus) {
        // Reativar usuário
        const response = await fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ isActive: true })
        })

        if (!response.ok) {
          throw new Error('Erro ao reativar usuário')
        }

        toast.success('Usuário reativado com sucesso!')
      } else {
        // Desativar usuário
        const response = await fetch(`/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error('Erro ao desativar usuário')
        }

        toast.success('Usuário desativado com sucesso!')
      }

      fetchUsers()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <Toaster position="top-right" />

      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Usuários</h1>
          <p className="text-gray-600 mt-2">Gerencie os usuários e suas permissões</p>
        </div>

        <Button
          onClick={() => setShowNewUserForm(!showNewUserForm)}
          className="bg-green-600 hover:bg-green-700"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Formulário de novo usuário */}
      {showNewUserForm && (
        <Card className="mb-6 p-6">
          <h2 className="text-xl font-semibold mb-4">Criar Novo Usuário</h2>
          <form onSubmit={handleCreateUser} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nome</label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Senha</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Telefone</label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Nível de Acesso</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Criar Usuário
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewUserForm(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de usuários */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b">
              <tr className="text-left">
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Usuário</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Email</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Telefone</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Nível</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Status</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Criado em</th>
                <th className="px-6 py-4 text-sm font-medium text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <UserIcon className="w-8 h-8 text-gray-400 mr-3" />
                      <div>
                        {editingUser === user._id ? (
                          <Input
                            type="text"
                            value={editData.name || user.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="w-32"
                          />
                        ) : (
                          <p className="font-medium text-gray-900">{user.name}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {editingUser === user._id ? (
                      <Input
                        type="email"
                        value={editData.email || user.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-48"
                      />
                    ) : (
                      <p className="text-gray-600">{user.email}</p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingUser === user._id ? (
                      <Input
                        type="tel"
                        value={editData.phone || user.phone || ''}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        className="w-32"
                      />
                    ) : (
                      <p className="text-gray-600">{user.phone || '-'}</p>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    {editingUser === user._id ? (
                      <select
                        value={editData.role || user.role}
                        onChange={(e) => setEditData({ ...editData, role: e.target.value as 'admin' | 'user' })}
                        className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="user">Usuário</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <Badge
                        className={
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }
                      >
                        {user.role === 'admin' ? (
                          <>
                            <ShieldIcon className="w-3 h-3 mr-1" />
                            Admin
                          </>
                        ) : (
                          <>
                            <UserIcon className="w-3 h-3 mr-1" />
                            Usuário
                          </>
                        )}
                      </Badge>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <Badge
                      className={
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {editingUser === user._id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleUpdateUser(user._id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(null)
                              setEditData({})
                            }}
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        </>
                      ) : changingPassword === user._id ? (
                        <>
                          <Input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nova senha"
                            className="w-24"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleChangePassword(user._id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setChangingPassword(null)
                              setNewPassword('')
                            }}
                          >
                            <XIcon className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user._id)
                              setEditData({
                                name: user.name,
                                email: user.email,
                                phone: user.phone,
                                role: user.role
                              })
                            }}
                            title="Editar"
                          >
                            <EditIcon className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setChangingPassword(user._id)}
                            title="Alterar senha"
                          >
                            <KeyIcon className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleUserStatus(user._id, user.isActive)}
                            className={user.isActive ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}
                            title={user.isActive ? 'Desativar' : 'Reativar'}
                          >
                            {user.isActive ? (
                              <TrashIcon className="w-4 h-4" />
                            ) : (
                              <CheckIcon className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}