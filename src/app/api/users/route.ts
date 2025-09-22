import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { requireAdmin, requireAuth } from '@/lib/middleware/auth'

// GET - Listar todos os usuários (Admin only)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Requer admin para listar usuários
    const authResult = requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const users = await User.find({})
      .select('-password')
      .sort({ createdAt: -1 })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

// POST - Criar novo usuário (Admin only)
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    // Requer admin para criar usuários
    const authResult = requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { name, email, password, role = 'user', phone, isActive = true } = await request.json()

    // Validações
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      )
    }

    if (!['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Role deve ser "admin" ou "user"' },
        { status: 400 }
      )
    }

    // Verificar se email já existe
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está em uso' },
        { status: 409 }
      )
    }

    // Criar usuário
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
      isActive
    })

    // Retornar sem a senha
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      createdAt: user.createdAt
    }

    return NextResponse.json(
      {
        message: 'Usuário criado com sucesso',
        user: userResponse
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}