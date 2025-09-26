import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    // Extrair parâmetros de paginação
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const requestedLimit = parseInt(searchParams.get('limit') || '25')
    const limit = Math.min(500, Math.max(5, requestedLimit)) // Entre 5 e 500
    const skip = (page - 1) * limit

    // Contar total de conversas (máximo 500)
    const totalCount = await Conversation.countDocuments({})
    const actualCount = Math.min(totalCount, 500)

    if (actualCount === 0) {
      return NextResponse.json({
        conversations: [],
        currentPage: 1,
        itemsPerPage: limit,
        totalPages: 0,
        totalCount: 0,
        startNumber: 0,
        endNumber: 0,
        showingAll: true
      })
    }

    const conversations = await Conversation.aggregate([
      {
        $addFields: {
          leadObjectId: { $toObjectId: '$leadId' }
        }
      },
      {
        $lookup: {
          from: 'leads',
          localField: 'leadObjectId',
          foreignField: '_id',
          as: 'lead'
        }
      },
      {
        $unwind: {
          path: '$lead',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          leadName: { $ifNull: ['$lead.name', 'Usuário sem nome'] },
          leadPhone: { $ifNull: ['$lead.phone', 'N/A'] },
          status: 1,
          lastMessage: {
            $cond: {
              if: { $gt: [{ $size: '$messages' }, 0] },
              then: { $last: '$messages.content' },
              else: 'Sem mensagens'
            }
          },
          lastMessageTime: {
            $cond: {
              if: { $gt: [{ $size: '$messages' }, 0] },
              then: { $ifNull: [{ $last: '$messages.timestamp' }, new Date()] },
              else: { $ifNull: ['$createdAt', new Date()] }
            }
          },
          unreadCount: {
            $size: {
              $filter: {
                input: '$messages',
                cond: {
                  $and: [
                    { $eq: ['$$this.sender', 'user'] },
                    { $ne: ['$$this.read', true] }
                  ]
                }
              }
            }
          },
          classification: { $ifNull: ['$lead.classification', 'cold'] },
          assignedAgent: '$assignedAgent',
          createdAt: 1,
          updatedAt: 1
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: Math.min(limit, 500 - skip) // Garantir que não passa de 500
      }
    ])

    // Adicionar numeração sequencial a cada conversa
    const conversationsWithNumbers = conversations.map((conv, index) => ({
      ...conv,
      sequentialNumber: skip + index + 1
    }))

    const totalPages = Math.ceil(actualCount / limit)
    const startNumber = conversations.length > 0 ? skip + 1 : 0
    const endNumber = skip + conversations.length

    return NextResponse.json({
      conversations: conversationsWithNumbers,
      currentPage: page,
      itemsPerPage: limit,
      totalPages,
      totalCount: actualCount,
      startNumber,
      endNumber,
      showingAll: limit >= actualCount,
      hasMore: page < totalPages
    })

  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}