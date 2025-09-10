import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { conversationId } = params
    
    const conversation = await Conversation.findById(conversationId)
      .populate('leadId', 'name phone profilePicUrl')
      .select('messages leadId status')
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Ordenar mensagens por timestamp
    const sortedMessages = conversation.messages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    return NextResponse.json({
      success: true,
      conversation: {
        _id: conversation._id,
        leadId: conversation.leadId,
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