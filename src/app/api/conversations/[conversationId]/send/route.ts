import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'
import { broadcastNewMessage } from '@/lib/websocket'

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { conversationId } = params
    const { message, instanceName } = await request.json()

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Mensagem é obrigatória' },
        { status: 400 }
      )
    }

    const conversation = await Conversation.findById(conversationId)
      .populate('leadId')

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    const lead = conversation.leadId as any

    try {
      // Enviar mensagem via Evolution API
      const response = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName || 'precatorios'}`, {
        method: 'POST',
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY || '',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: lead.phone,
          text: message
        })
      })

      const evolutionResponse = await response.json()

      if (!response.ok) {
        console.error('Evolution API error:', evolutionResponse)
        return NextResponse.json(
          { error: 'Erro ao enviar mensagem via WhatsApp' },
          { status: 500 }
        )
      }

      // Criar objeto da mensagem do agente
      const agentMessage = {
        conversationId: conversation._id,
        type: 'text',
        content: message,
        sender: 'agent',
        senderName: 'Atendente',
        timestamp: new Date(),
        metadata: {
          messageId: evolutionResponse.key?.id
        }
      }

      // Salvar mensagem na conversa
      conversation.messages.push(agentMessage)

      // Atualizar status da conversa se estava pausada
      if (conversation.status === 'paused') {
        conversation.status = 'active'
      }

      await conversation.save()

      // Broadcast da mensagem do agente via WebSocket
      broadcastNewMessage(conversation._id.toString(), agentMessage)

      // Atualizar última interação do lead
      await Lead.findByIdAndUpdate(lead._id, {
        lastInteraction: new Date()
      })

      return NextResponse.json({
        success: true,
        message: {
          _id: conversation.messages[conversation.messages.length - 1]._id,
          type: 'text',
          content: message,
          sender: 'agent',
          senderName: 'Atendente',
          timestamp: new Date()
        }
      })

    } catch (evolutionError) {
      console.error('Error sending message via Evolution API:', evolutionError)
      return NextResponse.json(
        { error: 'Erro ao enviar mensagem via WhatsApp' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Send message API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}