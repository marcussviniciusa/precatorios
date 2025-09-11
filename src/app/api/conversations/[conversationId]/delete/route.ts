import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { conversationId } = params

    // Buscar a conversa para obter o leadId
    const conversation = await Conversation.findById(conversationId)
    
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Excluir a conversa
    await Conversation.findByIdAndDelete(conversationId)

    // Opcional: Atualizar o lead para remover a última interação se desejar
    // ou manter o histórico do lead mesmo sem conversa
    await Lead.findByIdAndUpdate(conversation.leadId, {
      lastInteraction: new Date() // Atualiza para mostrar quando foi excluída
    })

    return NextResponse.json({
      success: true,
      message: 'Conversa excluída com sucesso'
    })

  } catch (error) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}