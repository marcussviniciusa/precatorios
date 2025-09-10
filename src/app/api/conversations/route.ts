import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // Verificar se há conversas
    const totalConversations = await Conversation.countDocuments()
    
    if (totalConversations === 0) {
      return NextResponse.json([])
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
          assignedAgent: '$assignedAgent'
        }
      },
      {
        $sort: { lastMessageTime: -1 }
      }
    ])

    return NextResponse.json(conversations)

  } catch (error) {
    console.error('Conversations API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}