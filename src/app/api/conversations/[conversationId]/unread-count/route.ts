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
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Count unread user messages
    const unreadCount = conversation.messages.filter(
      (message: any) => message.sender === 'user' && !message.read
    ).length

    return NextResponse.json({ unreadCount })

  } catch (error) {
    console.error('Unread count API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}