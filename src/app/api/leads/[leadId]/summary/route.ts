import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import LeadSummary from '@/models/LeadSummary'
import Conversation from '@/models/Conversation'
import AILog from '@/models/AILog'
import ScoreLog from '@/models/ScoreLog'
import { PrecatoriosAI } from '@/lib/ai-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    await dbConnect()

    const { leadId } = params

    const summary = await LeadSummary.findOne({ leadId }).lean()

    if (!summary) {
      return NextResponse.json(
        { error: 'Resumo não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(summary)

  } catch (error) {
    console.error('Summary fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar resumo' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    await dbConnect()

    const { leadId } = params

    // Buscar dados do lead
    const [lead, conversation, aiLogs, scoreLogs] = await Promise.all([
      Lead.findById(leadId).lean(),
      Conversation.findOne({ leadId }).lean(),
      AILog.find({ leadId }).sort({ timestamp: -1 }).limit(20).lean(),
      ScoreLog.find({ leadId }).sort({ timestamp: -1 }).limit(10).lean()
    ])

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Preparar contexto para IA
    const context = {
      leadData: lead,
      messagesCount: conversation?.messages?.length || 0,
      lastMessages: conversation?.messages?.slice(-10) || [],
      aiLogsCount: aiLogs.length,
      scoreHistory: scoreLogs.map(log => ({
        from: log.previousScore,
        to: log.newScore,
        reason: log.reason
      }))
    }

    // Gerar resumo básico para agora (simplificado)
    const summary = {
      leadId,
      summary: `Lead ${lead.name} com score ${lead.score} (${lead.classification}). ${lead.hasPrecatorio ? 'Possui precatório' : 'Sem precatório confirmado'}.`,
      keyPoints: [
        lead.hasPrecatorio && `Precatório de R$ ${lead.precatorioValue || 'valor não informado'}`,
        lead.state && `Localizado em ${lead.city || 'cidade não informada'}, ${lead.state}`,
        lead.urgency === 'high' && 'Demonstra urgência alta',
        lead.escavadorData?.hasEligibleProcessos && `${lead.escavadorData.processosEncontrados} processos encontrados no Escavador`
      ].filter(Boolean),
      concerns: [
        !lead.hasPrecatorio && 'Precatório não confirmado',
        lead.classification === 'cold' && 'Lead frio necessita aquecimento',
        lead.classification === 'discard' && 'Lead marcado para descarte'
      ].filter(Boolean),
      opportunities: [
        lead.classification === 'hot' && 'Lead quente pronto para conversão',
        lead.escavadorData?.hasEligibleProcessos && 'Processos elegíveis encontrados',
        lead.precatorioValue && lead.precatorioValue > 50000 && 'Alto valor do precatório'
      ].filter(Boolean),
      nextSteps: [
        lead.classification === 'hot' && 'Entrar em contato imediato',
        lead.classification === 'warm' && 'Agendar follow-up',
        !lead.documentsUploaded && 'Solicitar documentação',
        lead.escavadorData && 'Analisar processos encontrados'
      ].filter(Boolean),
      generatedBy: 'system' as const,
      lastUpdated: new Date(),
      metadata: {
        totalInteractions: conversation?.messages?.length || 0,
        avgResponseTime: 0,
        engagementLevel: lead.classification === 'hot' ? 'high' as const :
                        lead.classification === 'warm' ? 'medium' as const : 'low' as const
      }
    }

    const savedSummary = await LeadSummary.findOneAndUpdate(
      { leadId },
      summary,
      { upsert: true, new: true }
    )

    return NextResponse.json(savedSummary)

  } catch (error) {
    console.error('Summary generation error:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar resumo' },
      { status: 500 }
    )
  }
}