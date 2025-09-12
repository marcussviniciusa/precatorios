import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppOfficial from '@/models/WhatsAppOfficial'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'

// Função para verificar webhook (GET request)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    console.log('WhatsApp Official webhook verification:', { mode, token, challenge })

    if (mode === 'subscribe' && token) {
      // Verificar se o token corresponde a alguma conta configurada
      await dbConnect()
      const account = await WhatsAppOfficial.findOne({ webhookToken: token, isActive: true })
      
      if (account) {
        console.log('Webhook verified for account:', account.name)
        return new NextResponse(challenge, { status: 200 })
      } else {
        console.log('Invalid webhook token:', token)
        return NextResponse.json({ error: 'Invalid token' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Invalid verification request' }, { status: 403 })
    }

  } catch (error) {
    console.error('WhatsApp Official webhook verification error:', error)
    return NextResponse.json({ error: 'Webhook verification error' }, { status: 500 })
  }
}

// Função para processar mensagens (POST request)
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    console.log('WhatsApp Official webhook received:', JSON.stringify(body, null, 2))

    // Estrutura padrão do webhook do WhatsApp
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await processMessageChange(change.value)
          }
        }
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('WhatsApp Official webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing error' }, { status: 500 })
  }
}

async function processMessageChange(value: any) {
  try {
    const { metadata, messages, statuses } = value
    const phoneNumberId = metadata.phone_number_id

    // Encontrar a conta correspondente
    const account = await WhatsAppOfficial.findOne({ 
      phoneNumberId, 
      isActive: true 
    })
    
    if (!account) {
      console.log('No account found for phone number ID:', phoneNumberId)
      return
    }

    // Processar mensagens recebidas
    if (messages) {
      for (const message of messages) {
        await processIncomingMessage(account, message, value.contacts)
      }
    }

    // Processar status de mensagens (entregues, lidas, etc.)
    if (statuses) {
      for (const status of statuses) {
        await processMessageStatus(account, status)
      }
    }

  } catch (error) {
    console.error('Error processing message change:', error)
  }
}

async function processIncomingMessage(account: any, message: any, contacts: any[]) {
  try {
    const senderPhone = message.from
    const messageId = message.id
    const timestamp = new Date(parseInt(message.timestamp) * 1000)

    // Encontrar informações do contato
    const contact = contacts?.find(c => c.wa_id === senderPhone)
    const contactName = contact?.profile?.name || `User ${senderPhone}`

    // Extrair conteúdo da mensagem baseado no tipo
    let messageText = ''
    let messageType = 'text'

    switch (message.type) {
      case 'text':
        messageText = message.text.body
        messageType = 'text'
        break
      case 'image':
        messageText = message.image.caption || '[Imagem enviada]'
        messageType = 'image'
        break
      case 'video':
        messageText = message.video.caption || '[Vídeo enviado]'
        messageType = 'video'
        break
      case 'audio':
        messageText = '[Áudio enviado]'
        messageType = 'audio'
        break
      case 'document':
        messageText = message.document.filename || '[Documento enviado]'
        messageType = 'document'
        break
      case 'location':
        messageText = '[Localização enviada]'
        messageType = 'location'
        break
      default:
        messageText = `[Mensagem do tipo: ${message.type}]`
        messageType = message.type
    }

    console.log(`Processing ${messageType} message from ${senderPhone}: ${messageText}`)

    // Limpar número de telefone
    const cleanPhone = senderPhone.replace(/\D/g, '')

    // Buscar ou criar lead
    let lead = await Lead.findOne({ phone: cleanPhone })
    if (!lead) {
      lead = new Lead({
        phone: cleanPhone,
        name: contactName,
        source: 'whatsapp_official',
        status: 'new',
        classification: 'cold',
        score: 0,
        profilePicUrl: contact?.profile?.picture_url
      })
      await lead.save()
      console.log('New lead created:', lead._id)
    } else {
      // Atualizar nome se mudou
      if (lead.name !== contactName && contactName !== `User ${senderPhone}`) {
        lead.name = contactName
        await lead.save()
      }
    }

    // Buscar ou criar conversa
    let conversation = await Conversation.findOne({ 
      leadId: lead._id,
      phoneNumber: cleanPhone
    })

    if (!conversation) {
      conversation = new Conversation({
        leadId: lead._id,
        phoneNumber: cleanPhone,
        status: 'active',
        lastMessageAt: timestamp,
        messages: []
      })
      console.log('New conversation created for lead:', lead._id)
    }

    // Adicionar mensagem à conversa
    const messageData = {
      _id: messageId,
      sender: 'user',
      content: messageText,
      type: messageType,
      timestamp,
      fromMe: false,
      metadata: {
        messageId,
        from: senderPhone,
        contactName,
        source: 'whatsapp_official',
        accountId: account._id.toString(),
        // Adicionar dados específicos do tipo de mensagem
        ...(message.image && { mediaId: message.image.id, mimetype: message.image.mime_type }),
        ...(message.video && { mediaId: message.video.id, mimetype: message.video.mime_type }),
        ...(message.audio && { mediaId: message.audio.id, mimetype: message.audio.mime_type }),
        ...(message.document && { mediaId: message.document.id, mimetype: message.document.mime_type }),
        ...(message.location && { 
          latitude: message.location.latitude, 
          longitude: message.location.longitude 
        })
      }
    }

    conversation.messages.push(messageData)
    conversation.lastMessageAt = timestamp
    await conversation.save()

    // Atualizar estatísticas da conta
    await account.incrementMessagesReceived()

    console.log('Message processed and saved to conversation:', conversation._id)

    // Aqui você pode adicionar lógica para:
    // 1. Processar com IA (como no webhook do Evolution)
    // 2. Enviar notificações via WebSocket
    // 3. Trigger automações baseadas no conteúdo

    return { success: true, leadId: lead._id, conversationId: conversation._id }

  } catch (error) {
    console.error('Error processing incoming message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

async function processMessageStatus(account: any, status: any) {
  try {
    console.log('Processing message status:', status)
    
    // Aqui você pode processar status de mensagens como:
    // - sent: mensagem enviada
    // - delivered: mensagem entregue
    // - read: mensagem lida
    // - failed: mensagem falhou

    // Por enquanto apenas log, mas pode atualizar o status das mensagens no banco
    
  } catch (error) {
    console.error('Error processing message status:', error)
  }
}