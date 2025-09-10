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

    if (event === 'MESSAGES_UPSERT' && data?.messages) {
      for (const message of data.messages) {
        if (message.key.fromMe) continue // Ignorar mensagens enviadas por nós

        const phone = message.key.remoteJid.replace('@s.whatsapp.net', '')
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || ''

        if (!messageText) continue

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
          type: 'text',
          content: messageText,
          sender: 'user',
          senderName: message.pushName,
          timestamp: new Date(message.messageTimestamp * 1000),
          metadata: {
            messageId: message.key.id
          }
        })

        await conversation.save()

        // Atualizar última interação do lead
        lead.lastInteraction = new Date()
        await lead.save()

        // Processar mensagem para qualificação automática
        await processMessageForQualification(messageText, lead, conversation)
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
  conversation: any
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
  await sendAutomaticResponse(lead, conversation, message)
}

async function sendAutomaticResponse(lead: any, conversation: any, userMessage: string) {
  const evolutionAPI = (await import('@/lib/evolution-api')).default
  
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
    await evolutionAPI.sendTextMessage(lead.phone, response)
    
    // Salvar resposta do bot na conversa
    conversation.messages.push({
      conversationId: conversation._id,
      type: 'text',
      content: response,
      sender: 'bot',
      timestamp: new Date()
    })
    
    await conversation.save()
  } catch (error) {
    console.error('Error sending automatic response:', error)
  }
}