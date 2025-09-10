import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { conversationId } = params
    
    const conversation = await Conversation.findById(conversationId)
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Marcar todas as mensagens do usuário como lidas
    conversation.messages.forEach((message: any) => {
      if (message.sender === 'user' && !message.read) {
        message.read = true
      }
    })

    await conversation.save()

    return NextResponse.json({
      success: true,
      message: 'Mensagens marcadas como lidas'
    })

  } catch (error) {
    console.error('Mark as read API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}