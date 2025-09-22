import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { requireAdmin, requireAuth } from '@/lib/middleware/auth'
import { hashPassword } from '@/lib/auth'

// GET - Buscar usuário específico
export async function GET(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await dbConnect()

    // Requer autenticação
    const authResult = requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const currentUser = authResult

    const { userId } = params

    // Usuários normais só podem ver seus próprios dados
    if (currentUser.role !== 'admin' && currentUser.userId !== userId) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      )
    }

    const user = await User.findById(userId).select('-password')

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await dbConnect()

    // Requer autenticação
    const authResult = requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const currentUser = authResult

    const { userId } = params
    const updates = await request.json()

    // Usuários normais só podem editar seus próprios dados (exceto role e isActive)
    if (currentUser.role !== 'admin') {
      if (currentUser.userId !== userId) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        )
      }

      // Remover campos que apenas admin pode alterar
      delete updates.role
      delete updates.isActive
    }

    // Se está atualizando senha, fazer hash
    if (updates.password) {
      if (updates.password.length < 6) {
        return NextResponse.json(
          { error: 'Senha deve ter pelo menos 6 caracteres' },
          { status: 400 }
        )
      }
      updates.password = await hashPassword(updates.password)
    }

    // Validar role se admin está mudando
    if (updates.role && !['admin', 'user'].includes(updates.role)) {
      return NextResponse.json(
        { error: 'Role deve ser "admin" ou "user"' },
        { status: 400 }
      )
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    ).select('-password')

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Usuário atualizado com sucesso',
      user
    })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

// DELETE - Desativar usuário (não deletar fisicamente)
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    await dbConnect()

    // Apenas admin pode desativar usuários
    const authResult = requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const currentUser = authResult

    const { userId } = params

    // Não permitir que admin desative a si mesmo
    if (currentUser.userId === userId) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      )
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password')

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Usuário desativado com sucesso',
      user
    })
  } catch (error) {
    console.error('Error deactivating user:', error)
    return NextResponse.json(
      { error: 'Erro ao desativar usuário' },
      { status: 500 }
    )
  }
}