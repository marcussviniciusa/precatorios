import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import BotConfig from '@/models/BotConfig'
import { calculateLeadScore, getLeadClassification } from '@/lib/utils'
import { broadcastNewMessage, broadcastConversationUpdated } from '@/lib/websocket'
import { uploadBufferToMinio } from '@/lib/minio'

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

        // Buscar ou criar lead (phone já é o identificador correto)
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

        // Buscar ou criar conversa (usando leadId, que está correto)
        let conversation = await Conversation.findOne({ leadId: lead._id.toString() })
        
        if (!conversation) {
          conversation = await Conversation.create({
            leadId: lead._id.toString(),
            whatsappId: message.key.remoteJid,
            status: 'active',
            messages: []
          })
        }

        // Extrair URL de mídia do WhatsApp se disponível
        const whatsappMediaUrl = message.message?.imageMessage?.url || 
                                 message.message?.documentMessage?.url || 
                                 message.message?.videoMessage?.url ||
                                 message.message?.audioMessage?.url

        const fileName = message.message?.documentMessage?.fileName ||
                        message.message?.imageMessage?.fileName ||
                        message.message?.videoMessage?.fileName ||
                        'media-file'

        const mimetype = message.message?.documentMessage?.mimetype ||
                        message.message?.imageMessage?.mimetype ||
                        message.message?.videoMessage?.mimetype ||
                        message.message?.audioMessage?.mimetype

        let minioUrl: string | undefined

        // Se há URL de mídia, baixar usando Evolution API (decodificado) e salvar no MinIO
        if (whatsappMediaUrl) {
          try {
            console.log(`Attempting to download media using Evolution API for message: ${message.key.id}`)
            
            // Usar Evolution API para obter arquivo decodificado
            const evolutionResponse = await fetch(`${process.env.EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/${instance}`, {
              method: 'POST',
              headers: {
                'apikey': process.env.EVOLUTION_API_KEY || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: {
                  key: {
                    id: message.key.id
                  }
                }
              })
            })

            if (evolutionResponse.ok) {
              const base64Data = await evolutionResponse.json()
              if (base64Data.base64) {
                const mediaBuffer = Buffer.from(base64Data.base64, 'base64')
                console.log(`Media decoded successfully from Evolution API (${mediaBuffer.length} bytes)`)
                
                const folder = messageType === 'image' ? 'images' : 
                             messageType === 'audio' ? 'audio' :
                             messageType === 'video' ? 'videos' : 'documents'
                
                minioUrl = await uploadBufferToMinio(mediaBuffer, fileName, mimetype || 'application/octet-stream', folder)
                console.log(`Media saved to MinIO: ${minioUrl}`)
              } else {
                console.log('Evolution API response missing base64 data:', base64Data)
              }
            } else {
              console.log(`Evolution API failed: ${evolutionResponse.status} ${evolutionResponse.statusText}`)
            }
          } catch (error) {
            console.error('Error downloading/saving media to MinIO:', error)
          }
        }

        // Criar objeto da mensagem
        const newMessage = {
          conversationId: conversation._id,
          type: messageType,
          content: messageText,
          sender: 'user',
          senderName: message.pushName,
          timestamp: new Date(message.messageTimestamp * 1000),
          read: false,
          metadata: {
            messageId: message.key.id,
            mediaUrl: minioUrl || whatsappMediaUrl, // Priorizar MinIO, fallback para WhatsApp
            fileName,
            mimetype
          }
        }

        // Adicionar mensagem à conversa
        conversation.messages.push(newMessage)
        await conversation.save()

        // Broadcast da nova mensagem via WebSocket
        broadcastNewMessage(conversation._id.toString(), newMessage)

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
  // Verificar se o bot está ativo na configuração
  const config = await BotConfig.findOne().sort({ updatedAt: -1 })
  
  if (!config || !config.isActive) {
    console.log('Bot is disabled, skipping automatic response')
    return
  }
  
  // Verificar horário de funcionamento
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 100 + currentMinute
  
  const startTime = parseInt(config.workingHours.start.replace(':', ''))
  const endTime = parseInt(config.workingHours.end.replace(':', ''))
  
  if (currentTime < startTime || currentTime > endTime) {
    console.log(`Bot is outside working hours (${config.workingHours.start}-${config.workingHours.end}), skipping response`)
    return
  }

  // Verificar limite de respostas do bot
  const botMessagesCount = conversation.messages.filter((msg: any) => msg.sender === 'bot').length
  if (botMessagesCount >= config.transferRules.maxBotResponses) {
    console.log(`Bot reached max responses limit (${config.transferRules.maxBotResponses}), transferring to human`)
    
    // Marcar para transferência por limite de mensagens
    await Conversation.findByIdAndUpdate(conversation._id, {
      status: 'transferred',
      'metadata.transferReason': 'Limite de mensagens do bot atingido'
    })
    return
  }
  
  let response = ''
  const lowerMessage = userMessage.toLowerCase()

  if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('bom dia')) {
    response = config.prompts.welcome.replace('{nome}', lead.name)
  } else if (lead.hasPrecatorio && !lead.isEligible) {
    response = config.prompts.qualification
  } else if (lead.score >= config.transferRules.scoreThreshold) {
    response = config.prompts.transfer
    
    // Marcar para transferência humana
    await Conversation.findByIdAndUpdate(conversation._id, {
      status: 'transferred',
      'metadata.transferReason': 'Lead quente - qualificação automática'
    })
  } else if (lowerMessage.includes('precatório') || lowerMessage.includes('precatorio')) {
    response = config.prompts.qualification
  } else {
    response = config.prompts.welcome
  }

  // Verificar se deve transferir por palavras-chave
  const keywordTriggered = config.transferRules.keywordTriggers.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  )
  
  if (keywordTriggered) {
    response = config.prompts.transfer
    
    // Marcar para transferência humana
    await Conversation.findByIdAndUpdate(conversation._id, {
      status: 'transferred',
      'metadata.transferReason': 'Palavra-chave trigger'
    })
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
    
    // Criar objeto da mensagem do bot
    const botMessage = {
      conversationId: conversation._id,
      type: 'text',
      content: response,
      sender: 'bot',
      timestamp: new Date(),
      read: true
    }

    // Salvar resposta do bot na conversa
    conversation.messages.push(botMessage)
    await conversation.save()

    // Broadcast da mensagem do bot via WebSocket
    broadcastNewMessage(conversation._id.toString(), botMessage)
    
    console.log(`Bot response sent to ${lead.phone}: "${response}"`)
  } catch (error) {
    console.error('Error sending automatic response:', error)
  }
}