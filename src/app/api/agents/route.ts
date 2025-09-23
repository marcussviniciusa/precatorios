import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// GET - Listar agentes ativos (para seleção em transferências)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Verificar autenticação
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Buscar apenas agentes ativos (admin, agent, manager)
    const agents = await User.find({
      role: { $in: ['admin', 'agent', 'manager'] },
      isActive: true
    })
    .select('_id name email role isActive')
    .sort({ name: 1 })

    return NextResponse.json(agents)
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar agentes' },
      { status: 500 }
    )
  }
}