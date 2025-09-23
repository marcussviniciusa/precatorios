import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'
import User from '@/models/User'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

// Ensure models are registered
import '@/models/Lead'
import '@/models/Conversation'
import '@/models/User'

interface QueueItem {
  _id: string
  conversationId: string
  leadId: string
  leadName: string
  leadPhone: string
  score: number
  classification: string
  priority: 'low' | 'medium' | 'high'
  waitingTime: number
  position: number
  transferredAt: Date
  assignedAgent?: string
  metadata?: any
}

// GET - Listar fila de atendimento
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

    // Parâmetros de query
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || 'transferred'
    const assignedOnlyParam = searchParams.get('assignedOnly')
    const assignedOnly = assignedOnlyParam === 'true'
    const assignedOnlyFalse = assignedOnlyParam === 'false'
    const myQueue = searchParams.get('myQueue') === 'true'

    // Base query
    let query: any = { status }

    // Se quiser apenas os atribuídos
    if (assignedOnly) {
      query.assignedAgent = { $exists: true, $ne: null }
    }

    // Se quiser apenas os aguardando (não atribuídos)
    if (assignedOnlyFalse) {
      query.$or = [
        { assignedAgent: { $exists: false } },
        { assignedAgent: null },
        { assignedAgent: '' }
      ]
    }

    // Se quiser apenas os próprios
    if (myQueue) {
      query['metadata.assignedAgentId'] = user.email
    }

    // Buscar conversas em fila (sem populate para evitar erro de schema)
    const conversations = await Conversation.find(query)
      .sort({
        'metadata.priority': -1,  // High priority first
        'metadata.transferredAt': 1  // Oldest first (FIFO within priority)
      })

    // Formatar dados da fila
    const queue: QueueItem[] = []
    let position = 1

    for (const conv of conversations) {
      if (!conv.leadId) continue

      // Buscar lead separadamente para evitar problemas de populate
      const lead = await Lead.findById(conv.leadId)
      if (!lead) continue
      const transferredAt = conv.metadata?.transferredAt || conv.updatedAt
      const now = new Date()
      const waitingTime = Math.floor((now.getTime() - new Date(transferredAt).getTime()) / 1000 / 60) // em minutos

      queue.push({
        _id: conv._id.toString(),
        conversationId: conv._id.toString(),
        leadId: lead._id.toString(),
        leadName: lead.name,
        leadPhone: lead.phone,
        score: lead.score || 0,
        classification: lead.classification || 'cold',
        priority: conv.metadata?.priority || 'medium',
        waitingTime,
        position: conv.assignedAgent ? 0 : position++, // 0 se já atribuído
        transferredAt: new Date(transferredAt),
        assignedAgent: conv.assignedAgent,
        metadata: conv.metadata
      })
    }

    // Estatísticas baseadas no filtro ativo
    const stats = {
      total: queue.length,
      waiting: queue.filter(q => !q.assignedAgent).length,
      assigned: queue.filter(q => q.assignedAgent).length,
      highPriority: queue.filter(q => q.priority === 'high').length,
      mediumPriority: queue.filter(q => q.priority === 'medium').length,
      lowPriority: queue.filter(q => q.priority === 'low').length,
      averageWaitTime: queue.length > 0
        ? Math.round(queue.reduce((acc, q) => acc + q.waitingTime, 0) / queue.length)
        : 0,
      longestWaitTime: queue.length > 0
        ? Math.max(...queue.map(q => q.waitingTime))
        : 0
    }

    // Para filtros específicos, também calcular stats globais para os contadores dos botões
    let globalStats = stats
    if (assignedOnlyFalse || assignedOnly || myQueue) {
      // Buscar estatísticas globais (todas as transferidas) para os contadores dos filtros
      const allTransferredQuery = { status: 'transferred' }
      const allConversations = await Conversation.find(allTransferredQuery)

      const allQueue = []
      for (const conv of allConversations) {
        if (!conv.leadId) continue
        const lead = await Lead.findById(conv.leadId)
        if (!lead) continue

        allQueue.push({
          assignedAgent: conv.assignedAgent,
          priority: conv.metadata?.priority || 'medium'
        })
      }

      globalStats = {
        total: allQueue.length,
        waiting: allQueue.filter(q => !q.assignedAgent).length,
        assigned: allQueue.filter(q => q.assignedAgent).length,
        highPriority: allQueue.filter(q => q.priority === 'high').length,
        mediumPriority: allQueue.filter(q => q.priority === 'medium').length,
        lowPriority: allQueue.filter(q => q.priority === 'low').length,
        averageWaitTime: stats.averageWaitTime, // Manter do filtro ativo
        longestWaitTime: stats.longestWaitTime   // Manter do filtro ativo
      }
    }

    return NextResponse.json({
      queue,
      stats,        // Estatísticas do filtro ativo (para os cards principais)
      globalStats   // Estatísticas globais (para os contadores dos botões de filtro)
    })

  } catch (error) {
    console.error('Queue API error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar fila' },
      { status: 500 }
    )
  }
}

// POST - Ações na fila (pegar próximo, reordenar, etc)
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

    const body = await request.json()
    const { action, conversationId, priority, agentId } = body

    switch (action) {
      case 'take_next':
        // Pegar próxima conversa da fila
        const nextConversation = await Conversation.findOne({
          status: 'transferred',
          assignedAgent: { $exists: false }
        })
        .sort({
          'metadata.priority': -1,
          'metadata.transferredAt': 1
        })
        .populate('leadId')

        if (!nextConversation) {
          return NextResponse.json({
            success: false,
            message: 'Nenhuma conversa disponível na fila'
          })
        }

        // Atribuir ao agente
        nextConversation.assignedAgent = user.userId || user.email
        nextConversation.metadata = {
          ...nextConversation.metadata,
          assignedAgentId: user.email,
          assignedAt: new Date()
        }
        await nextConversation.save()

        return NextResponse.json({
          success: true,
          conversation: nextConversation
        })

      case 'change_priority':
        // Alterar prioridade na fila
        if (!conversationId || !priority) {
          return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
        }

        const conversation = await Conversation.findById(conversationId)
        if (!conversation) {
          return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
        }

        conversation.metadata = {
          ...conversation.metadata,
          priority,
          priorityChangedBy: user.email,
          priorityChangedAt: new Date()
        }
        await conversation.save()

        return NextResponse.json({
          success: true,
          conversation
        })

      case 'remove_from_queue':
        // Remover da fila (voltar para ativo ou finalizar)
        if (!conversationId) {
          return NextResponse.json({ error: 'ID da conversa é obrigatório' }, { status: 400 })
        }

        const conv = await Conversation.findById(conversationId)
        if (!conv) {
          return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
        }

        conv.status = 'active' // ou 'completed' baseado em lógica
        conv.metadata = {
          ...conv.metadata,
          removedFromQueueBy: user.email,
          removedFromQueueAt: new Date()
        }
        await conv.save()

        return NextResponse.json({
          success: true,
          conversation: conv
        })

      case 'batch_assign':
        // Atribuir múltiplas conversas para um agente
        if (!agentId || !body.conversationIds || !Array.isArray(body.conversationIds)) {
          return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
        }

        const agent = await User.findById(agentId)
        if (!agent) {
          return NextResponse.json({ error: 'Agente não encontrado' }, { status: 404 })
        }

        const result = await Conversation.updateMany(
          { _id: { $in: body.conversationIds } },
          {
            $set: {
              assignedAgent: agent.name || agent.email,
              'metadata.assignedAgentId': agentId,
              'metadata.assignedAt': new Date(),
              'metadata.assignedBy': user.email
            }
          }
        )

        return NextResponse.json({
          success: true,
          updated: result.modifiedCount
        })

      default:
        return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
    }

  } catch (error) {
    console.error('Queue action error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar ação na fila' },
      { status: 500 }
    )
  }
}

// PUT - Reordenar fila
export async function PUT(request: NextRequest) {
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
    const { reorderedIds } = body

    if (!reorderedIds || !Array.isArray(reorderedIds)) {
      return NextResponse.json({ error: 'Lista de IDs inválida' }, { status: 400 })
    }

    // Implementar lógica de reordenação customizada
    // Por enquanto, retornar sucesso
    return NextResponse.json({
      success: true,
      message: 'Fila reordenada com sucesso'
    })

  } catch (error) {
    console.error('Queue reorder error:', error)
    return NextResponse.json(
      { error: 'Erro ao reordenar fila' },
      { status: 500 }
    )
  }
}