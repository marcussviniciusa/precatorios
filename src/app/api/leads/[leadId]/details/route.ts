import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import Activity from '@/models/Activity'
import LeadSummary from '@/models/LeadSummary'
import AILog from '@/models/AILog'
import TransferLog from '@/models/TransferLog'
import ScoreLog from '@/models/ScoreLog'

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    await dbConnect()

    const { leadId } = params

    // Buscar lead completo
    const lead = await Lead.findById(leadId).lean() as any

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Buscar dados relacionados em paralelo
    const [
      conversation,
      activities,
      summary,
      recentAILogs,
      recentTransferLogs,
      recentScoreLogs,
      aiLogCount,
      transferLogCount,
      scoreLogCount
    ] = await Promise.all([
      // Conversa mais recente
      Conversation.findOne({ leadId })
        .sort({ updatedAt: -1 })
        .lean() as any,

      // Atividades
      Activity.find({ leadId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean() as any,

      // Resumo do lead
      LeadSummary.findOne({ leadId }).lean() as any,

      // Últimos logs de IA
      AILog.find({ leadId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean() as any,

      // Últimos logs de transferência
      TransferLog.find({ leadId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean() as any,

      // Últimos logs de pontuação
      ScoreLog.find({ leadId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean() as any,

      // Contadores
      AILog.countDocuments({ leadId }),
      TransferLog.countDocuments({ leadId }),
      ScoreLog.countDocuments({ leadId })
    ])

    // Calcular estatísticas básicas
    const stats = {
      totalMessages: conversation?.messages?.length || 0,
      totalActivities: activities.length,
      totalAILogs: aiLogCount,
      totalTransferLogs: transferLogCount,
      totalScoreLogs: scoreLogCount,
      hasEscavadorData: !!lead.escavadorData,
      lastInteraction: lead.lastInteraction || lead.createdAt
    }

    return NextResponse.json({
      lead,
      conversation: conversation ? {
        _id: conversation._id,
        status: conversation.status,
        messagesCount: conversation.messages.length,
        lastMessage: conversation.messages[conversation.messages.length - 1],
        botActive: conversation.botActive
      } : null,
      activities,
      summary,
      logs: {
        ai: recentAILogs,
        transfer: recentTransferLogs,
        score: recentScoreLogs
      },
      stats
    })

  } catch (error) {
    console.error('Lead details error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar detalhes do lead' },
      { status: 500 }
    )
  }
}