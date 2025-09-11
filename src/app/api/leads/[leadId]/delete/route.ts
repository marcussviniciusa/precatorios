import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import Activity from '@/models/Activity'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    await dbConnect()

    // Verificar autenticação
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso requerido' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const { leadId } = params

    // Verificar se o lead existe
    const lead = await Lead.findById(leadId)
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Deletar dados relacionados
    console.log(`Deleting all data for lead ${leadId} (phone: ${lead.phone})`)

    // 1. Deletar todas as conversas do lead
    const conversationsDeleted = await Conversation.deleteMany({ leadId })
    console.log(`Deleted ${conversationsDeleted.deletedCount} conversations`)

    // 2. Deletar todas as atividades do lead
    const activitiesDeleted = await Activity.deleteMany({ leadId })
    console.log(`Deleted ${activitiesDeleted.deletedCount} activities`)

    // 3. Deletar o lead
    await Lead.findByIdAndDelete(leadId)
    console.log(`Deleted lead ${leadId}`)

    return NextResponse.json({
      message: 'Lead e todos os dados relacionados foram deletados com sucesso',
      deletedData: {
        lead: 1,
        conversations: conversationsDeleted.deletedCount,
        activities: activitiesDeleted.deletedCount
      }
    })

  } catch (error) {
    console.error('Delete lead error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}