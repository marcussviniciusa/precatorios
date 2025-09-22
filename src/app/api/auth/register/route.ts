import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { generateToken } from '@/lib/auth'
import { requireAdmin } from '@/lib/middleware/auth'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    // Apenas admin pode criar novos usuários
    const authResult = requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }

    const { name, email, password, role = 'user' } = await request.json()

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

    // Validar role
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Role inválido. Use "admin" ou "user"' },
        { status: 400 }
      )
    }

    const existingUser = await User.findOne({ email })
    
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email já está sendo usado' },
        { status: 400 }
      )
    }

    const user = await User.create({
      name,
      email,
      password,
      role
    })

    const token = generateToken(user)

    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }

    return NextResponse.json({
      user: userResponse,
      token
    }, { status: 201 })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}