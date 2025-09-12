import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import BotConfig from '@/models/BotConfig'
import { calculateLeadScore, getLeadClassification } from '@/lib/utils'
import { broadcastNewMessage, broadcastConversationUpdated } from '@/lib/websocket'
import { uploadBufferToMinio } from '@/lib/minio'

// Mapa global para controlar timeouts de processamento por conversa
const processingTimeouts = new Map<string, NodeJS.Timeout>()
// Mapa para controlar se uma conversa está sendo processada (evitar race conditions)
const processingLocks = new Map<string, boolean>()

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

        // Processar mensagem com IA usando debounce para agrupar mensagens consecutivas
        await scheduleAIProcessing(lead, conversation, instance)
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

async function scheduleAIProcessing(
  lead: any, 
  conversation: any,
  instanceName: string
) {
  const conversationId = conversation._id.toString()
  
  // Buscar configuração para obter delay
  const config = await BotConfig.findOne().sort({ updatedAt: -1 })
  const delay = config?.aiConfig?.settings?.messageGroupingDelay || 3000
  
  // Cancelar timeout anterior se existir
  if (processingTimeouts.has(conversationId)) {
    clearTimeout(processingTimeouts.get(conversationId)!)
    console.log(`Cancelled previous AI processing for conversation ${conversationId}`)
  }
  
  // Criar um timestamp único para esta execução
  const executionId = Date.now() + Math.random()
  
  // Agendar novo processamento
  const timeout = setTimeout(async () => {
    console.log(`Processing grouped messages for conversation ${conversationId} after ${delay}ms delay (exec: ${executionId})`)
    
    // Verificar se este timeout ainda é o válido (não foi cancelado)
    if (processingTimeouts.get(conversationId) !== timeout) {
      console.log(`Execution ${executionId} was cancelled, skipping`)
      return
    }
    
    // Verificar se já está sendo processado (evitar race condition)
    if (processingLocks.get(conversationId)) {
      console.log(`Conversation ${conversationId} already being processed, skipping (exec: ${executionId})`)
      processingTimeouts.delete(conversationId)
      return
    }
    
    // Marcar como sendo processado
    processingLocks.set(conversationId, true)
    
    try {
      // Buscar conversa atualizada com todas as mensagens
      await dbConnect()
      const updatedConversation = await Conversation.findById(conversationId)
      const updatedLead = await Lead.findById(lead._id)
      
      if (updatedConversation && updatedLead) {
        // Pegar últimas mensagens não processadas do usuário  
        const maxMessages = config?.aiConfig?.settings?.maxMessagesToGroup || 5
        const userMessagesArray = updatedConversation.messages
          .filter((msg: any) => msg.sender === 'user')
          .slice(-maxMessages)
        
        const userMessages = userMessagesArray
          .map((msg: any) => msg.content)
          .join(' ')
        
        console.log(`Actually processing with IA for conversation ${conversationId} (exec: ${executionId})`)
        console.log(`User messages found: ${userMessagesArray.length}`)
        console.log(`Messages content: [${userMessagesArray.map(m => `"${m.content}"`).join(', ')}]`)
        console.log(`Grouped message: "${userMessages}"`)
        
        // Processar com IA usando mensagens agrupadas
        await processMessageWithAI(userMessages, updatedLead, updatedConversation, instanceName)
      }
    } catch (error) {
      console.error('Error in scheduled AI processing:', error)
    } finally {
      // Remover locks e timeout do mapa
      processingLocks.delete(conversationId)
      processingTimeouts.delete(conversationId)
      console.log(`Finished processing conversation ${conversationId} (exec: ${executionId})`)
    }
  }, delay)
  
  // Salvar timeout no mapa
  processingTimeouts.set(conversationId, timeout)
  console.log(`Scheduled AI processing for conversation ${conversationId} in ${delay}ms (exec: ${executionId})`)
}

async function processMessageWithAI(
  message: string, 
  lead: any, 
  conversation: any,
  instanceName: string
) {
  // Verificar se o bot está ativo na configuração
  const config = await BotConfig.findOne().sort({ updatedAt: -1 })
  
  if (!config || !config.isActive) {
    console.log('Bot is disabled, skipping automatic response')
    return
  }

  // Verificar se IA está habilitada, senão não processa
  if (!config.aiConfig?.enabled) {
    console.log('AI is disabled, skipping AI processing')
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

  try {
    // Importar o serviço de IA dinamicamente
    const { PrecatoriosAI } = await import('@/lib/ai-service')
    
    // Obter instância da IA
    const ai = await PrecatoriosAI.getInstance()
    if (!ai) {
      console.log('AI service not available, skipping processing')
      return
    }

    // Preparar contexto da conversa
    const conversationHistory = conversation.messages
      .slice(-5) // Últimas 5 mensagens
      .map((msg: any) => `${msg.sender}: ${msg.content}`)
      .join('\n')

    // 1. Extrair informações do lead usando IA
    if (config.aiConfig.settings.autoExtraction) {
      const extractedInfo = await ai.extractLeadInfo(message, conversationHistory)
      
      if (Object.keys(extractedInfo).length > 0) {
        console.log('AI extracted lead info:', extractedInfo)
        await Lead.findByIdAndUpdate(lead._id, extractedInfo)
        // Atualizar lead local com as novas informações
        Object.assign(lead, extractedInfo)
      }
    }

    // 2. Calcular score usando IA
    if (config.aiConfig.settings.autoScoring) {
      const scoreResult = await ai.calculateScore(lead, conversationHistory)
      
      if (scoreResult.score !== lead.score) {
        console.log(`AI calculated new score: ${scoreResult.score} (${scoreResult.classification})`)
        await Lead.findByIdAndUpdate(lead._id, {
          score: scoreResult.score,
          classification: scoreResult.classification
        })
        // Atualizar lead local
        lead.score = scoreResult.score
        lead.classification = scoreResult.classification
      }
    }

    // 3. Decidir transferência usando IA
    if (config.aiConfig.settings.autoTransfer) {
      const transferDecision = await ai.shouldTransfer(
        lead.score,
        conversationHistory,
        conversation.messages.length
      )

      if (transferDecision.shouldTransfer) {
        console.log(`AI decided to transfer: ${transferDecision.reason}`)
        await Conversation.findByIdAndUpdate(conversation._id, {
          status: 'transferred',
          'metadata.transferReason': transferDecision.reason
        })
        return
      }
    }

    // 4. Gerar resposta usando IA
    const response = await ai.generateResponse(
      message,
      lead,
      conversationHistory,
      config.aiConfig.prompts.response
    )

    // Enviar mensagem via Evolution API
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
    
    console.log(`AI response sent to ${lead.phone}: "${response}"`)
  } catch (error) {
    console.error('Error processing message with AI:', error)
  }
}

