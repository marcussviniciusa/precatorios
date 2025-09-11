import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'
import { uploadFileToMinio } from '@/lib/minio'
import { broadcastNewMessage } from '@/lib/websocket'

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

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Buscar lead separadamente
    const lead = await Lead.findById(conversation.leadId)
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    try {
      // Determinar o tipo de mídia
      const isImage = file.type.startsWith('image/')
      const messageType = isImage ? 'image' : 'document'
      
      // 1. Salvar arquivo no MinIO primeiro
      let minioUrl: string
      try {
        const folder = isImage ? 'images' : 'documents'
        minioUrl = await uploadFileToMinio(file, file.name, folder)
        console.log(`File saved to MinIO: ${minioUrl}`)
      } catch (minioError) {
        console.error('Error saving file to MinIO:', minioError)
        return NextResponse.json(
          { error: 'Erro ao salvar arquivo no servidor' },
          { status: 500 }
        )
      }
      
      // 2. Tentar primeiro com FormData (método mais compatível)
      const evolutionFormData = new FormData()
      evolutionFormData.append('attachment', file)
      evolutionFormData.append('number', lead.phone)
      
      if (message) {
        evolutionFormData.append('caption', message)
      }

      // Enviar via Evolution API usando FormData
      let evolutionResponse = await fetch(
        `${process.env.EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, 
        {
          method: 'POST',
          headers: {
            'apikey': process.env.EVOLUTION_API_KEY || ''
            // Não incluir Content-Type para FormData, o browser define automaticamente
          },
          body: evolutionFormData
        }
      )

      // Se FormData falhar, tentar com base64
      if (!evolutionResponse.ok) {
        console.log('FormData failed, trying base64...')
        
        // Converter arquivo para base64
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64 = buffer.toString('base64')
        
        // Preparar o payload JSON para Evolution API
        const payload = {
          number: lead.phone,
          mediatype: isImage ? 'image' : 'document',
          media: base64,
          fileName: file.name,
          ...(message && { caption: message })
        }

        evolutionResponse = await fetch(
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
      }

      if (!evolutionResponse.ok) {
        const errorData = await evolutionResponse.json()
        console.error('Evolution API error:', {
          status: evolutionResponse.status,
          statusText: evolutionResponse.statusText,
          error: errorData,
          payload: {
            ...payload,
            media: '[BASE64_TRUNCATED]' // Não logar o base64 completo
          }
        })
        return NextResponse.json(
          { error: `Erro ao enviar arquivo via WhatsApp: ${errorData.response?.message || errorData.message || 'Erro desconhecido'}` },
          { status: 500 }
        )
      }

      const evolutionResult = await evolutionResponse.json()

      // Salvar mensagem na conversa (deixar Mongoose gerar o _id automaticamente)
      const newMessage = {
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
          mediaUrl: minioUrl, // URL do arquivo no MinIO
          fileSize: file.size
        }
      }

      conversation.messages.push(newMessage)

      // Atualizar status da conversa se estava pausada
      if (conversation.status === 'paused') {
        conversation.status = 'active'
      }

      await conversation.save()

      // Broadcast da mensagem do agente via WebSocket
      broadcastNewMessage(conversation._id.toString(), newMessage)

      // Atualizar última interação do lead
      await Lead.findByIdAndUpdate(lead._id, {
        lastInteraction: new Date()
      })

      // Obter a mensagem salva com o _id gerado
      const savedMessage = conversation.messages[conversation.messages.length - 1]
      
      return NextResponse.json({
        success: true,
        message: {
          _id: savedMessage._id,
          type: savedMessage.type,
          content: savedMessage.content,
          sender: savedMessage.sender,
          senderName: savedMessage.senderName,
          timestamp: savedMessage.timestamp,
          metadata: savedMessage.metadata
        }
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