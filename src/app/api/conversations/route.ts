import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const conversations = await Conversation.aggregate([
      {
        $lookup: {
          from: 'leads',
          localField: 'leadId',
          foreignField: '_id',
          as: 'lead'
        }
      },
      {
        $unwind: '$lead'
      },
      {
        $project: {
          _id: 1,
          leadName: '$lead.name',
          leadPhone: '$lead.phone',
          status: 1,
          lastMessage: { $last: '$messages.content' },
          lastMessageTime: { $last: '$messages.timestamp' },
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
          classification: '$lead.classification',
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