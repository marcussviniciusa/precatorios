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
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const message = formData.get('message') as string || ''
    const instanceName = formData.get('instanceName') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo é obrigatório' },
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
      // Converter arquivo para base64
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')

      // Determinar o tipo de mídia
      const isImage = file.type.startsWith('image/')
      const messageType = isImage ? 'image' : 'document'
      
      // Preparar o payload para Evolution API
      const payload = isImage ? {
        number: lead.phone,
        mediatype: 'image',
        media: base64,
        caption: message || ''
      } : {
        number: lead.phone,
        mediatype: 'document',
        media: base64,
        caption: message || '',
        filename: file.name
      }

      // Enviar via Evolution API
      const evolutionResponse = await fetch(
        `${process.env.EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, 
        {
          method: 'POST',
          headers: {
            'apikey': process.env.EVOLUTION_API_KEY || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      )

      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.json()
        console.error('Evolution API error:', errorData)
        return NextResponse.json(
          { error: 'Erro ao enviar arquivo via WhatsApp' },
          { status: 500 }
        )
      }

      const evolutionResult = await evolutionResponse.json()

      // Salvar mensagem na conversa
      const newMessage = {
        _id: Date.now().toString(), // ID temporário
        conversationId: conversation._id,
        type: messageType,
        content: message || (isImage ? '[Imagem enviada]' : `[Documento: ${file.name}]`),
        sender: 'agent',
        senderName: 'Atendente',
        timestamp: new Date(),
        metadata: {
          messageId: evolutionResult.key?.id,
          fileName: file.name,
          mimetype: file.type,
          mediaUrl: `data:${file.type};base64,${base64}` // Para preview local
        }
      }

      conversation.messages.push(newMessage)

      // Atualizar status da conversa se estava pausada
      if (conversation.status === 'paused') {
        conversation.status = 'active'
      }

      await conversation.save()

      // Atualizar última interação do lead
      await Lead.findByIdAndUpdate(lead._id, {
        lastInteraction: new Date()
      })

      return NextResponse.json({
        success: true,
        message: newMessage
      })

    } catch (evolutionError) {
      console.error('Error sending media via Evolution API:', evolutionError)
      return NextResponse.json(
        { error: 'Erro ao enviar arquivo via WhatsApp' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Send media API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}