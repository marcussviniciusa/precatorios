import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'
import TransferLog from '@/models/TransferLog'
import User from '@/models/User'
import { broadcastConversationUpdated, broadcastNotification } from '@/lib/websocket'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
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

    const body = await request.json()
    const {
      action,           // 'transfer' | 'pause' | 'resume' | 'assign'
      assignToAgent,    // ID do agente para atribuir
      reason,           // Motivo da transferência
      notes,            // Observações opcionais
      priority          // 'low' | 'medium' | 'high'
    } = body

    console.log('Transfer API - Received data:', { action, priority, reason, assignToAgent })

    const conversationId = params.conversationId

    // Buscar conversa e lead
    const conversation = await Conversation.findById(conversationId).populate('leadId')
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    const lead = await Lead.findById(conversation.leadId)
    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    const previousStatus = conversation.status
    let newStatus = previousStatus
    let transferLog = null

    switch (action) {
      case 'transfer':
        // Transferir para atendimento humano
        newStatus = 'transferred'
        conversation.status = newStatus
        console.log('Transfer API - Original metadata:', conversation.metadata)
        console.log('Transfer API - Priority to save:', priority)

        const newMetadata = {
          ...conversation.metadata,
          transferReason: reason || 'Transferência manual',
          transferredAt: new Date(),
          transferredBy: user.email,
          priority: priority || 'medium'
        }

        console.log('Transfer API - New metadata object:', newMetadata)

        conversation.metadata = newMetadata

        console.log('Transfer API - Final metadata after assignment:', conversation.metadata)

        // Se especificou agente, atribuir
        if (assignToAgent) {
          const agent = await User.findById(assignToAgent)
          if (agent) {
            conversation.assignedAgent = agent.name || agent.email
            conversation.metadata.assignedAgentId = assignToAgent
          }
        }

        // Criar log de transferência
        transferLog = await TransferLog.create({
          leadId: lead._id.toString(),
          fromStatus: previousStatus,
          toStatus: newStatus,
          reason: reason || 'Transferência manual via interface',
          triggeredBy: 'human',
          agent: user.email,
          notes,
          metadata: {
            score: lead.score,
            classification: lead.classification,
            conversationId: conversation._id.toString(),
            priority
          }
        })

        // Notificar agentes disponíveis
        await notifyAgents(conversation, lead, priority)
        break

      case 'pause':
        // Pausar bot temporariamente
        newStatus = 'paused'
        conversation.status = newStatus
        conversation.metadata = {
          ...conversation.metadata,
          pausedAt: new Date(),
          pausedBy: user.email,
          pauseReason: reason || 'Bot pausado manualmente'
        }
        break

      case 'resume':
        // Retomar atendimento automático
        newStatus = 'active'
        conversation.status = newStatus
        conversation.metadata = {
          ...conversation.metadata,
          resumedAt: new Date(),
          resumedBy: user.email
        }
        break

      case 'assign':
        // Atribuir para agente específico
        if (!assignToAgent) {
          return NextResponse.json({ error: 'ID do agente é obrigatório' }, { status: 400 })
        }

        const agent = await User.findById(assignToAgent)
        if (!agent) {
          return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
        }

        conversation.assignedAgent = agent.name || agent.email
        conversation.metadata = {
          ...conversation.metadata,
          assignedAgentId: assignToAgent,
          assignedAt: new Date(),
          assignedBy: user.email
        }

        // Se não estava transferida, transferir automaticamente
        if (conversation.status !== 'transferred') {
          conversation.status = 'transferred'
          newStatus = 'transferred'

          transferLog = await TransferLog.create({
            leadId: lead._id.toString(),
            fromStatus: previousStatus,
            toStatus: 'transferred',
            reason: `Atribuído para ${agent.name || agent.email}`,
            triggeredBy: 'human',
            agent: user.email,
            notes: `Atribuição direta para agente específico`,
            metadata: {
              score: lead.score,
              classification: lead.classification,
              conversationId: conversation._id.toString(),
              assignedTo: assignToAgent
            }
          })
        }

        // Notificar agente específico
        await notifySpecificAgent(agent, conversation, lead)
        break

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

    // Salvar alterações
    await conversation.save()

    // Atualizar lead se necessário
    if (previousStatus !== newStatus) {
      lead.status = newStatus === 'transferred' ? 'in_analysis' : lead.status
      await lead.save()
    }

    // Broadcast via WebSocket
    broadcastConversationUpdated(
      conversation._id.toString(),
      {
      conversationId: conversation._id.toString(),
      status: conversation.status,
      assignedAgent: conversation.assignedAgent
    })

    return NextResponse.json({
      success: true,
      conversation: {
        _id: conversation._id,
        status: conversation.status,
        assignedAgent: conversation.assignedAgent,
        metadata: conversation.metadata
      },
      transferLog
    })

  } catch (error) {
    console.error('Transfer API error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar transferência' },
      { status: 500 }
    )
  }
}

// Função auxiliar para notificar agentes disponíveis
async function notifyAgents(conversation: any, lead: any, priority: string = 'medium') {
  try {
    // Buscar agentes online (simplificado - pode ser expandido com tracking de sessão)
    const agents = await User.find({
      role: { $in: ['admin', 'agent', 'manager'] },
      isActive: true
    })

    // Preparar dados da notificação
    const notification: any = {
      type: 'new_transfer' as const,
      priority,
      data: {
        conversationId: conversation._id.toString(),
        leadName: lead.name,
        leadPhone: lead.phone,
        leadScore: lead.score,
        classification: lead.classification,
        message: `Nova conversa transferida: ${lead.name}`,
        timestamp: new Date()
      }
    }

    // Broadcast para todos os agentes via WebSocket
    broadcastNotification(notification)

    // Aqui poderia adicionar outros tipos de notificação:
    // - Email
    // - SMS
    // - Push notification
    // - Slack/Discord webhook

    console.log(`Notified ${agents.length} agents about new transfer`)
  } catch (error) {
    console.error('Error notifying agents:', error)
  }
}

// Função auxiliar para notificar agente específico
async function notifySpecificAgent(agent: any, conversation: any, lead: any) {
  try {
    const notification: any = {
      type: 'direct_assignment' as const,
      userId: agent._id.toString(),
      data: {
        conversationId: conversation._id.toString(),
        leadName: lead.name,
        leadPhone: lead.phone,
        leadScore: lead.score,
        classification: lead.classification,
        message: `Nova conversa atribuída a você: ${lead.name}`,
        timestamp: new Date()
      }
    }

    // Broadcast específico para o agente
    broadcastNotification(notification)

    // Aqui poderia adicionar notificação por email/SMS
    console.log(`Notified agent ${agent.email} about assignment`)
  } catch (error) {
    console.error('Error notifying specific agent:', error)
  }
}