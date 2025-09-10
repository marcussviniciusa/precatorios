import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import { calculateLeadScore, getLeadClassification } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    console.log('Webhook received:', JSON.stringify(body, null, 2))

    const { event, instance, data } = body

    if ((event === 'MESSAGES_UPSERT' || event === 'messages.upsert') && data) {
      // A mensagem pode vir em data.messages (array) ou diretamente em data (objeto único)
      const messages = data.messages || [data]
      
      for (const message of messages) {
        if (message.key.fromMe) continue // Ignorar mensagens enviadas por nós

        // Verificar se é mensagem de grupo - ignorar grupos
        if (message.key.remoteJid.includes('@g.us')) {
          console.log('Ignoring group message:', message.key.remoteJid)
          continue
        }
        
        console.log('Processing individual message from:', message.key.remoteJid)

        const phone = message.key.remoteJid.replace('@s.whatsapp.net', '')
        
        // Extrair conteúdo da mensagem baseado no tipo
        let messageText = ''
        let messageType = 'text'
        
        if (message.message?.conversation) {
          messageText = message.message.conversation
          messageType = 'text'
        } else if (message.message?.extendedTextMessage?.text) {
          messageText = message.message.extendedTextMessage.text
          messageType = 'text'
        } else if (message.message?.imageMessage) {
          messageText = message.message.imageMessage.caption || '[Imagem enviada]'
          messageType = 'image'
        } else if (message.message?.documentMessage) {
          messageText = message.message.documentMessage.caption || `[Documento: ${message.message.documentMessage.fileName || 'arquivo'}]`
          messageType = 'document'
        } else if (message.message?.audioMessage) {
          messageText = '[Áudio enviado]'
          messageType = 'audio'
        } else if (message.message?.videoMessage) {
          messageText = message.message.videoMessage.caption || '[Vídeo enviado]'
          messageType = 'video'
        } else {
          console.log('Unsupported message type:', Object.keys(message.message || {}))
          continue
        }

        if (!messageText) continue

        console.log(`Message processed: ${messageType} - "${messageText}" from ${phone}`)

        // Buscar ou criar lead
        let lead = await Lead.findOne({ phone })
        
        if (!lead) {
          // Criar novo lead
          const score = calculateLeadScore({})
          const classification = getLeadClassification(score)
          
          lead = await Lead.create({
            name: message.pushName || `Lead ${phone}`,
            phone,
            whatsappId: message.key.remoteJid,
            score,
            classification,
            source: 'whatsapp'
          })
        }

        // Buscar ou criar conversa
        let conversation = await Conversation.findOne({ leadId: lead._id })
        
        if (!conversation) {
          conversation = await Conversation.create({
            leadId: lead._id,
            whatsappId: message.key.remoteJid,
            status: 'active',
            messages: []
          })
        }

        // Adicionar mensagem à conversa
        conversation.messages.push({
          conversationId: conversation._id,
          type: messageType,
          content: messageText,
          sender: 'user',
          senderName: message.pushName,
          timestamp: new Date(message.messageTimestamp * 1000),
          read: false,
          metadata: {
            messageId: message.key.id,
            mediaUrl: message.message?.imageMessage?.url || 
                      message.message?.documentMessage?.url || 
                      message.message?.videoMessage?.url
          }
        })

        await conversation.save()

        // Atualizar última interação do lead
        lead.lastInteraction = new Date()
        await lead.save()

        // Processar mensagem para qualificação automática
        await processMessageForQualification(messageText, lead, conversation, instance)
      }
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processMessageForQualification(
  message: string, 
  lead: any, 
  conversation: any,
  instanceName: string
) {
  const lowerMessage = message.toLowerCase()
  
  // Extrair informações da mensagem
  let scoreUpdate = 0
  const updates: any = {}

  // Verificar se menciona ter precatório
  if (lowerMessage.includes('precatório') || lowerMessage.includes('precatorio')) {
    updates.hasPrecatorio = true
    scoreUpdate += 50
  }

  // Extrair valor se mencionado
  const valueMatch = message.match(/r\$?\s?([\d.,]+)/i)
  if (valueMatch) {
    const value = parseFloat(valueMatch[1].replace(/[.,]/g, ''))
    if (value > 10000) {
      updates.precatorioValue = value
      updates.isEligible = true
      scoreUpdate += 25
    }
  }

  // Verificar urgência
  const urgentKeywords = ['urgente', 'pressa', 'rápido', 'logo']
  if (urgentKeywords.some(keyword => lowerMessage.includes(keyword))) {
    updates.urgency = 'high'
    scoreUpdate += 15
  }

  // Extrair estado/cidade
  const states = ['sp', 'rj', 'mg', 'rs', 'pr', 'sc', 'ba', 'go', 'df', 'es']
  const stateMatch = states.find(state => lowerMessage.includes(state))
  if (stateMatch) {
    updates.state = stateMatch.toUpperCase()
  }

  // Atualizar lead se houver mudanças
  if (Object.keys(updates).length > 0 || scoreUpdate > 0) {
    const newScore = Math.min(lead.score + scoreUpdate, 100)
    const newClassification = getLeadClassification(newScore)
    
    await Lead.findByIdAndUpdate(lead._id, {
      ...updates,
      score: newScore,
      classification: newClassification
    })
  }

  // Enviar resposta automática baseada na qualificação
  await sendAutomaticResponse(lead, conversation, message, instanceName)
}

async function sendAutomaticResponse(lead: any, conversation: any, userMessage: string, instanceName: string) {
  // Não usar o evolutionAPI da lib, usar fetch direto com a instância correta
  
  let response = ''
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('bom dia')) {
    response = `Olá ${lead.name}! 👋\n\nSou o assistente virtual especializado em precatórios. Como posso ajudá-lo hoje?`
  } else if (lead.hasPrecatorio && !lead.isEligible) {
    response = 'Para melhor atendê-lo, preciso de algumas informações:\n\n1️⃣ Qual o valor do seu precatório?\n2️⃣ Qual estado/município emitiu?\n3️⃣ Já tem o ofício requisitório em mãos?'
  } else if (lead.score >= 80) {
    response = '🔥 Ótima notícia! Seu precatório está dentro dos nossos critérios de atendimento.\n\nVou transferir você para um especialista que vai explicar como podemos acelerar o recebimento do seu precatório.\n\nAguarde um momento...'
    
    // Marcar para transferência humana
    await Conversation.findByIdAndUpdate(conversation._id, {
      status: 'transferred',
      'metadata.transferReason': 'Lead quente - qualificação automática'
    })
  } else if (lowerMessage.includes('precatório') || lowerMessage.includes('precatorio')) {
    response = 'Entendi que você tem interesse em precatórios! 📋\n\nPara verificar se podemos ajudá-lo, preciso saber:\n\n• Qual o valor aproximado?\n• De qual estado/município?\n• Há quanto tempo está aguardando?'
  } else {
    response = 'Obrigado pela mensagem! 😊\n\nSou especialista em acelerar o recebimento de precatórios. Se você tem algum precatório para receber, posso ajudá-lo a receber mais rapidamente.\n\nConte-me mais sobre sua situação!'
  }

  try {
    // Enviar mensagem via Evolution API usando a instância correta
    const evolutionResponse = await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': process.env.EVOLUTION_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: lead.phone,
        text: response
      })
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.json()
      console.error('Error sending message via Evolution API:', errorData)
      return
    }
    
    // Salvar resposta do bot na conversa
    conversation.messages.push({
      conversationId: conversation._id,
      type: 'text',
      content: response,
      sender: 'bot',
      timestamp: new Date(),
      read: true
    })
    
    await conversation.save()
    console.log(`Bot response sent to ${lead.phone}: "${response}"`)
  } catch (error) {
    console.error('Error sending automatic response:', error)
  }
}