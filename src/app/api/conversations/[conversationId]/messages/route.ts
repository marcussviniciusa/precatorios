import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { conversationId } = params
    
    const conversation = await Conversation.findById(conversationId)
      .select('messages leadId status')
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Buscar lead separadamente
    let lead = null
    if (conversation.leadId) {
      lead = await Lead.findById(conversation.leadId).select('name phone profilePicUrl')
    }

    // Ordenar mensagens por timestamp
    const sortedMessages = conversation.messages.sort(
      (a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return NextResponse.json({
      success: true,
      conversation: {
        _id: conversation._id,
        leadId: lead,
        status: conversation.status,
        messages: sortedMessages
      }
    })

  } catch (error) {
    console.error('Messages API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}