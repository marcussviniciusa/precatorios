import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { requireAuth } from '@/lib/middleware/auth'

// GET - Buscar dados do usuário logado
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Requer autenticação
    const authResult = requireAuth(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const currentUser = authResult

    const user = await User.findById(currentUser.userId).select('-password')

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching current user:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar dados do usuário' },
      { status: 500 }
    )
  }
}