import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import TransferLog from '@/models/TransferLog'
import LeadSummary from '@/models/LeadSummary'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// Interface para os dados do Bitrix
interface BitrixLeadData {
  fields: {
    TITLE: string
    NAME?: string
    LAST_NAME?: string
    STATUS_ID: string
    OPENED: string
    ASSIGNED_BY_ID: number
    CURRENCY_ID: string
    OPPORTUNITY?: number
    PHONE?: Array<{
      VALUE: string
      VALUE_TYPE: string
    }>
    COMMENTS?: string
    SOURCE_DESCRIPTION?: string
    // Campos customizados para precatórios
    UF_CRM_POSSUI_PRECATORIO?: string
    UF_CRM_ELEGIVEL?: string
    UF_CRM_URGENCIA?: string
    UF_CRM_TIPO_PRECATORIO?: string
    UF_CRM_FONTE_ORIGINAL?: string
    UF_CRM_SCORE?: number
    UF_CRM_CLASSIFICACAO?: string
    UF_CRM_RESUMO_IA?: string
    UF_CRM_PREOCUPACOES?: string
    UF_CRM_PROXIMOS_PASSOS?: string
  }
  params: {
    REGISTER_SONET_EVENT: string
  }
}

interface BitrixConfig {
  webhookUrl: string
  isActive: boolean
  defaultAssignedUserId: number
}

// Configuração do Bitrix (em produção, mover para banco de dados ou env)
const BITRIX_CONFIG: BitrixConfig = {
  webhookUrl: process.env.BITRIX_WEBHOOK_URL || '',
  isActive: process.env.BITRIX_INTEGRATION_ENABLED === 'true',
  defaultAssignedUserId: parseInt(process.env.BITRIX_DEFAULT_USER_ID || '1')
}

// POST - Enviar lead para Bitrix CRM
export async function POST(request: NextRequest) {
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

    const { leadId, transferLogId } = await request.json()

    if (!leadId || !transferLogId) {
      return NextResponse.json({
        error: 'leadId e transferLogId são obrigatórios'
      }, { status: 400 })
    }

    // Verificar se a integração está ativa
    if (!BITRIX_CONFIG.isActive || !BITRIX_CONFIG.webhookUrl) {
      return NextResponse.json({
        success: false,
        message: 'Integração Bitrix não configurada ou desativada'
      })
    }

    // Buscar dados completos do lead
    const lead = await Lead.findById(leadId)
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    // Buscar resumo inteligente
    const summary = await LeadSummary.findOne({ leadId })

    // Verificar se já foi enviado para Bitrix (controle de duplicação)
    const existingTransferLog = await TransferLog.findById(transferLogId)
    if (!existingTransferLog) {
      return NextResponse.json({ error: 'Log de transferência não encontrado' }, { status: 404 })
    }

    if (existingTransferLog.metadata?.bitrixSent) {
      return NextResponse.json({
        success: false,
        message: 'Lead já foi enviado para o Bitrix',
        bitrixLeadId: existingTransferLog.metadata.bitrixLeadId
      })
    }

    // Preparar dados para o Bitrix
    const bitrixData = await prepareBitrixData(lead, summary)

    // Enviar para Bitrix
    const bitrixResponse = await sendToBitrix(bitrixData)

    if (bitrixResponse.success) {
      // Atualizar log de transferência
      existingTransferLog.metadata = {
        ...existingTransferLog.metadata,
        bitrixSent: true,
        bitrixLeadId: bitrixResponse.result,
        bitrixSentAt: new Date(),
        bitrixSentBy: user.email
      }
      await existingTransferLog.save()

      return NextResponse.json({
        success: true,
        bitrixLeadId: bitrixResponse.result,
        message: 'Lead enviado para Bitrix com sucesso'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: bitrixResponse.error,
        message: 'Erro ao enviar lead para Bitrix'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Bitrix integration error:', error)
    return NextResponse.json(
      { error: 'Erro interno na integração com Bitrix' },
      { status: 500 }
    )
  }
}

// GET - Obter status da integração
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Token de acesso requerido' }, { status: 401 })
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    return NextResponse.json({
      isActive: BITRIX_CONFIG.isActive,
      webhookConfigured: !!BITRIX_CONFIG.webhookUrl,
      defaultUserId: BITRIX_CONFIG.defaultAssignedUserId
    })

  } catch (error) {
    console.error('Bitrix status error:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status da integração' },
      { status: 500 }
    )
  }
}

// Função auxiliar: Preparar dados para envio ao Bitrix
async function prepareBitrixData(lead: any, summary: any): Promise<BitrixLeadData> {
  // Determinar valor da oportunidade baseado no precatório
  const opportunity = lead.precatorioValue || 0

  // Mapear classificação para status do Bitrix
  const statusMapping: Record<string, string> = {
    'hot': 'NEW',
    'warm': 'IN_PROCESS',
    'cold': 'NEW',
    'discard': 'JUNK'
  }

  // Preparar telefones
  const phones = lead.phone ? [{
    VALUE: lead.phone,
    VALUE_TYPE: 'WORK'
  }] : []

  // Preparar resumo para comentários
  let comments = `Lead importado automaticamente do sistema de WhatsApp.\n\n`

  if (summary) {
    comments += `RESUMO IA: ${summary.summary}\n\n`

    if (summary.keyPoints && summary.keyPoints.length > 0) {
      comments += `PONTOS PRINCIPAIS:\n${summary.keyPoints.map((p: string) => `• ${p}`).join('\n')}\n\n`
    }

    if (summary.concerns && summary.concerns.length > 0) {
      comments += `PREOCUPAÇÕES:\n${summary.concerns.map((c: string) => `• ${c}`).join('\n')}\n\n`
    }

    if (summary.nextSteps && summary.nextSteps.length > 0) {
      comments += `PRÓXIMOS PASSOS:\n${summary.nextSteps.map((s: string) => `• ${s}`).join('\n')}`
    }
  }

  return {
    fields: {
      TITLE: `Lead WhatsApp: ${lead.name}`,
      NAME: lead.name,
      LAST_NAME: lead.name.split(' ').slice(1).join(' ') || '',
      STATUS_ID: statusMapping[lead.classification] || 'NEW',
      OPENED: 'Y',
      ASSIGNED_BY_ID: BITRIX_CONFIG.defaultAssignedUserId,
      CURRENCY_ID: 'BRL',
      OPPORTUNITY: opportunity,
      PHONE: phones,
      COMMENTS: comments,
      SOURCE_DESCRIPTION: `WhatsApp via ${lead.source}`,

      // Campos customizados específicos para precatórios
      UF_CRM_POSSUI_PRECATORIO: lead.hasPrecatorio ? 'Sim' : 'Não confirmado',
      UF_CRM_ELEGIVEL: lead.isEligible ? 'Sim' : 'Não',
      UF_CRM_URGENCIA: lead.urgency || 'medium',
      UF_CRM_TIPO_PRECATORIO: lead.precatorioType || '',
      UF_CRM_FONTE_ORIGINAL: lead.source,
      UF_CRM_SCORE: lead.score,
      UF_CRM_CLASSIFICACAO: lead.classification,
      UF_CRM_RESUMO_IA: summary?.summary || '',
      UF_CRM_PREOCUPACOES: summary?.concerns?.join('; ') || '',
      UF_CRM_PROXIMOS_PASSOS: summary?.nextSteps?.join('; ') || ''
    },
    params: {
      REGISTER_SONET_EVENT: 'Y'
    }
  }
}

// Função auxiliar: Enviar dados para Bitrix via webhook
async function sendToBitrix(data: BitrixLeadData): Promise<{ success: boolean; result?: number; error?: string }> {
  try {
    const response = await fetch(`${BITRIX_CONFIG.webhookUrl}/crm.lead.add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()

    if (result.error) {
      return {
        success: false,
        error: `${result.error}: ${result.error_description}`
      }
    }

    return {
      success: true,
      result: result.result
    }

  } catch (error) {
    console.error('Bitrix API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }
  }
}