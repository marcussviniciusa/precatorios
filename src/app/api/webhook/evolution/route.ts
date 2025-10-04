import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import BotConfig from '@/models/BotConfig'
import WhatsAppInstance from '@/models/WhatsAppInstance'
import { calculateLeadScore, getLeadClassification } from '@/lib/utils'
import { broadcastNewMessage, broadcastConversationUpdated } from '@/lib/websocket'
import { uploadBufferToMinio } from '@/lib/minio'
import MediaProcessor from '@/lib/media-processor'
import { EscavadorService, isValidCPF } from '@/lib/escavador-service'
import TransferLog from '@/models/TransferLog'
import AILog from '@/models/AILog'

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
                        message.message?.audioMessage?.mimetype ||
                        message.message?.audioMessage?.mime_type // WhatsApp Official API format

        let minioUrl: string | undefined
        let transcription: string | undefined

        // Debug para entender o problema
        if (messageType === 'audio' || messageType === 'image' || messageType === 'document') {
          console.log(`${messageType.toUpperCase()} message detected:`)
          console.log('- messageType:', messageType)
          console.log('- message.base64 present:', !!message.base64)
          console.log('- data.message.base64 present:', !!(data.message?.base64))
          console.log('- message.base64 length:', message.base64?.length || 0)
          console.log('- data.message.base64 length:', data.message?.base64?.length || 0)
          console.log('- whatsappMediaUrl:', whatsappMediaUrl)
          if (messageType === 'audio') {
            console.log('- audioMessage.url:', message.message?.audioMessage?.url)
          } else if (messageType === 'image') {
            console.log('- imageMessage.url:', message.message?.imageMessage?.url)
          } else if (messageType === 'document') {
            console.log('- documentMessage.url:', message.message?.documentMessage?.url)
          }
        }

        // Verificar se é mídia do WhatsApp Official API (tem base64 direto)
        if ((messageType === 'audio' || messageType === 'image' || messageType === 'document' || messageType === 'video') &&
            data.message?.base64 && !whatsappMediaUrl) {
          console.log(`Processing WhatsApp Official API ${messageType} from base64`)

          try {
            // Converter base64 para buffer
            const mediaBuffer = Buffer.from(data.message.base64, 'base64')
            console.log(`${messageType.charAt(0).toUpperCase() + messageType.slice(1)} decoded from base64 (${mediaBuffer.length} bytes)`)

            // Determinar nome do arquivo e pasta baseado no tipo
            let fileName: string
            let folder: string
            let defaultMimetype: string

            switch (messageType) {
              case 'audio':
                fileName = `audio_${message.key.id}.ogg`
                folder = 'audio'
                defaultMimetype = 'audio/ogg'
                break
              case 'image':
                fileName = `image_${message.key.id}.jpg`
                folder = 'images'
                defaultMimetype = 'image/jpeg'
                break
              case 'document':
                const originalFileName = message.message?.documentMessage?.fileName || 'document'
                const fileExtension = originalFileName.split('.').pop() || 'pdf'
                fileName = `document_${message.key.id}.${fileExtension}`
                folder = 'documents'
                defaultMimetype = 'application/pdf'
                break
              case 'video':
                const videoExtension = mimetype?.includes('mp4') ? 'mp4' :
                                     mimetype?.includes('webm') ? 'webm' :
                                     mimetype?.includes('3gpp') ? '3gp' : 'mp4'
                fileName = `video_${message.key.id}.${videoExtension}`
                folder = 'videos'
                defaultMimetype = 'video/mp4'
                break
              default:
                fileName = `media_${message.key.id}.bin`
                folder = 'uploads'
                defaultMimetype = 'application/octet-stream'
            }

            // Upload para MinIO
            minioUrl = await uploadBufferToMinio(mediaBuffer, fileName, mimetype || defaultMimetype, folder)

            // Buscar configuração de processamento de mídia
            const config = await BotConfig.findOne().sort({ updatedAt: -1 })

            if (config?.mediaProcessing?.enabled) {
              // Processar com IA
              const mediaProcessor = MediaProcessor.getInstance()
              await mediaProcessor.initialize({
                googleVisionEnabled: config.mediaProcessing?.googleVision?.enabled || false,
                googleVisionKeyPath: config.mediaProcessing?.googleVision?.keyPath,
                groqEnabled: config.mediaProcessing?.groq?.enabled || false,
                groqApiKey: config.mediaProcessing?.groq?.apiKey,
                openRouterEnabled: config.mediaProcessing?.openRouter?.enabled || false,
                openRouterApiKey: config.mediaProcessing?.openRouter?.apiKey || config.aiConfig?.apiKey || process.env.OPENROUTER_API_KEY,
                imageDescriptionModel: config.mediaProcessing?.openRouter?.imageModel || 'openrouter/sonoma-sky-alpha',
                temperature: config.aiConfig?.settings?.temperature || 0.3,
                maxTokens: config.aiConfig?.settings?.maxTokens || 500
              })

              if (mediaProcessor.isConfigured()) {
                const extractedText = await mediaProcessor.processMedia(
                  mediaBuffer,
                  mimetype || defaultMimetype,
                  messageType as 'audio' | 'image' | 'document'
                )

                if (extractedText) {
                  if (messageType === 'audio') {
                    transcription = extractedText
                    messageText = extractedText // ✅ IA recebe transcrição!
                    console.log(`WhatsApp Official audio transcribed: ${extractedText.substring(0, 100)}...`)
                  } else if (messageType === 'video') {
                    // Para vídeos, não mostrar texto extraído (apenas logs internos)
                    console.log(`WhatsApp Official ${messageType} processed (no text shown to user)`)
                  } else {
                    // Para imagens e documentos, substituir o texto padrão ou adicionar ao caption existente
                    if (messageText === '[Imagem enviada]' ||
                        messageText.startsWith('[Documento:')) {
                      messageText = extractedText
                    } else {
                      messageText = `${messageText}\n\n[Texto extraído]:\n${extractedText}`
                    }
                    console.log(`WhatsApp Official ${messageType} processed: ${extractedText.substring(0, 100)}...`)
                  }
                }
              } else {
                console.log(`Media processor not configured for ${messageType} processing`)
              }
            } else {
              console.log('Media processing disabled in configuration')
            }
          } catch (error) {
            console.error(`Error processing WhatsApp Official ${messageType}:`, error)
          }
        }
        // Se há URL de mídia, baixar usando Evolution API (decodificado) e salvar no MinIO
        else if (whatsappMediaUrl) {
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
                
                // Processar mídia para extrair texto (OCR/Transcription)
                try {
                  // Buscar configuração de processamento de mídia
                  const config = await BotConfig.findOne().sort({ updatedAt: -1 })
                  
                  if (config?.mediaProcessing?.enabled) {
                    const mediaProcessor = MediaProcessor.getInstance()
                    
                    // Inicializar o processador com configurações do banco
                    await mediaProcessor.initialize({
                      googleVisionEnabled: config.mediaProcessing.googleVision?.enabled || false,
                      googleVisionKeyPath: config.mediaProcessing.googleVision?.keyPath || process.env.GOOGLE_VISION_KEY_PATH,
                      groqEnabled: config.mediaProcessing.groq?.enabled || false,
                      groqApiKey: config.mediaProcessing.groq?.apiKey || process.env.GROQ_API_KEY,
                      openRouterEnabled: config.mediaProcessing.openRouter?.enabled || false,
                      openRouterApiKey: config.mediaProcessing.openRouter?.apiKey || config.aiConfig?.apiKey || process.env.OPENROUTER_API_KEY,
                      imageDescriptionModel: config.mediaProcessing.openRouter?.imageModel || 'openrouter/sonoma-sky-alpha',
                      temperature: config.aiConfig?.settings?.temperature || 0.3,
                      maxTokens: config.aiConfig?.settings?.maxTokens || 500
                    })
                    
                    if (mediaProcessor.isConfigured()) {
                    const extractedText = await mediaProcessor.processMedia(
                      mediaBuffer,
                      mimetype || 'application/octet-stream',
                      messageType as 'image' | 'document' | 'audio' | 'video'
                    )
                    
                    if (extractedText) {
                      // Para áudios, manter o texto original e salvar transcrição separadamente
                      if (messageType === 'audio') {
                        // Salvar transcrição na metadata para exibir no botão
                        transcription = extractedText
                        // Para a IA, usar o texto transcrito
                        messageText = extractedText
                      } else if (messageType === 'video') {
                        // Para vídeos, não mostrar texto extraído (apenas manter mensagem original)
                        console.log(`Video processed but no extracted text shown to user`)
                      } else {
                        // Para imagens e documentos, substituir o texto
                        messageText = messageText === '[Imagem enviada]' ||
                                     messageText.startsWith('[Documento:')
                                     ? extractedText
                                     : `${messageText}\n\n[Texto extraído]:\n${extractedText}`
                      }
                      
                      console.log(`Extracted text from ${messageType}: ${extractedText.substring(0, 100)}...`)
                    }
                    } else {
                      console.log('Media processor not configured, skipping text extraction')
                    }
                  } else {
                    console.log('Media processing disabled in configuration')
                  }
                } catch (processingError) {
                  console.error('Error processing media:', processingError)
                  // Continue sem o texto extraído
                }
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
            mimetype,
            transcription // Salvar transcrição para áudios
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

// Função para verificar e enviar lead para Bitrix baseado em score
async function checkAndSendToBitrix(
  lead: any,
  previousScore: number,
  config: any,
  conversationId: string
) {
  try {
    // Pegar scoreThreshold configurado pelo usuário (variável)
    const scoreThreshold = config.bitrixConfig?.scoreThreshold || 80
    const currentScore = lead.score || 0

    // Verificar se o lead CRUZOU o threshold pela primeira vez
    const crossedThreshold = previousScore < scoreThreshold && currentScore >= scoreThreshold

    if (!crossedThreshold) {
      return // Não cruzou o threshold, não faz nada
    }

    // Verificar se integração Bitrix está ativa
    const bitrixWebhookUrl = process.env.BITRIX_WEBHOOK_URL
    const bitrixEnabled = process.env.BITRIX_INTEGRATION_ENABLED === 'true'

    if (!bitrixWebhookUrl || !bitrixEnabled) {
      console.log('Bitrix integration is not configured or disabled')
      return
    }

    console.log(`Lead ${lead._id} crossed score threshold (${previousScore} -> ${currentScore} >= ${scoreThreshold}). Triggering Bitrix integration...`)

    // Verificar se já foi enviado anteriormente (evitar duplicação)
    const existingLog = await TransferLog.findOne({
      leadId: lead._id.toString(),
      'metadata.bitrixSent': true
    })

    if (existingLog) {
      console.log(`Lead ${lead._id} already sent to Bitrix (dealId: ${existingLog.metadata?.bitrixDealId}). Skipping.`)
      return
    }

    // Buscar resumo do lead (se existir)
    const LeadSummary = (await import('@/models/LeadSummary')).default
    const summary = await LeadSummary.findOne({ leadId: lead._id.toString() })

    // Preparar comentários
    let comments = `Lead importado automaticamente do sistema de WhatsApp.\n\n`
    comments += `Score: ${currentScore}\n`
    comments += `Classificação: ${lead.classification}\n`
    comments += `Telefone: ${lead.phone}\n`
    comments += `Status: ${lead.hasPrecatorio ? 'Possui precatório' : 'Não possui precatório'}\n`
    comments += `Tipo: ${lead.precatorioType || 'Não informado'}\n`
    comments += `Elegível: ${lead.isEligible ? 'Sim' : 'Não'}\n`
    comments += `Urgência: ${lead.urgency || 'Não informado'}\n\n`

    if (summary) {
      comments += `RESUMO IA: ${summary.summary}\n\n`
      if (summary.keyPoints && summary.keyPoints.length > 0) {
        comments += `PONTOS PRINCIPAIS:\n${summary.keyPoints.map((p: string) => `• ${p}`).join('\n')}\n\n`
      }
    }

    // Preparar dados para Bitrix Deal
    const bitrixData = {
      fields: {
        TITLE: `Lead WhatsApp: ${lead.name || 'Sem nome'}`,
        STAGE_ID: "C19:NEW",
        CATEGORY_ID: 19,
        ASSIGNED_BY_ID: parseInt(process.env.BITRIX_DEFAULT_USER_ID || '1218'),
        OPPORTUNITY: lead.precatorioValue || 0,
        CURRENCY_ID: "BRL",
        COMMENTS: comments
      }
    }

    // Criar log de transferência ANTES do envio
    const transferLog = await TransferLog.create({
      leadId: lead._id.toString(),
      fromStatus: 'active',
      toStatus: 'bitrix_sent',
      reason: `Score atingiu ${currentScore} (threshold: ${scoreThreshold})`,
      triggeredBy: 'ai',
      metadata: {
        score: currentScore,
        classification: lead.classification,
        conversationId,
        bitrixSent: false,
        previousScore,
        scoreThreshold
      }
    })

    // Enviar para Bitrix de forma assíncrona
    fetch(`${bitrixWebhookUrl}/crm.deal.add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bitrixData)
    })
    .then(async (response) => {
      if (response.ok) {
        const result = await response.json()
        console.log('Bitrix deal created successfully:', result)

        // Atualizar TransferLog com sucesso
        await TransferLog.findByIdAndUpdate(transferLog._id, {
          'metadata.bitrixSent': true,
          'metadata.bitrixDealId': result.result?.toString() || null,
          'metadata.bitrixSentAt': new Date()
        })
      } else {
        const errorText = await response.text()
        console.error('Bitrix webhook failed:', response.status, errorText)
        await TransferLog.findByIdAndUpdate(transferLog._id, {
          'metadata.bitrixSent': false,
          'metadata.bitrixError': `HTTP ${response.status}: ${errorText}`
        })
      }
    })
    .catch(async (error) => {
      console.error('Bitrix integration error:', error)
      await TransferLog.findByIdAndUpdate(transferLog._id, {
        'metadata.bitrixSent': false,
        'metadata.bitrixError': error.message
      })
    })

  } catch (error) {
    console.error('Error in checkAndSendToBitrix:', error)
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
        console.log(`Messages content: [${userMessagesArray.map((m: any) => `"${m.content}"`).join(', ')}]`)
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
      const extractedInfo = await ai.extractLeadInfo(message, conversationHistory, config.aiConfig.prompts.extraction, lead._id.toString())

      if (Object.keys(extractedInfo).length > 0) {
        console.log('AI extracted lead info:', extractedInfo)

        // NOVO: Se CPF foi extraído e é válido, consultar Escavador (apenas se estiver habilitado)
        if (extractedInfo.cpf && isValidCPF(extractedInfo.cpf) && config.escavadorConfig?.enabled) {
          // Verificar se ainda não consultamos este CPF recentemente
          const cacheHours = config.escavadorConfig?.cacheHours || 24
          const shouldConsult = !lead.escavadorData ||
            !lead.escavadorData.ultimaConsulta ||
            (new Date().getTime() - new Date(lead.escavadorData.ultimaConsulta).getTime()) > cacheHours * 60 * 60 * 1000

          if (shouldConsult) {
            console.log(`[Escavador] CPF detectado: ${extractedInfo.cpf}. Iniciando consulta...`)

            const escavadorService = EscavadorService.getInstance(config.escavadorConfig.apiKey)
            if (escavadorService) {
              const escavadorData = await escavadorService.buscarProcessosPorCPF(extractedInfo.cpf)

              if (escavadorData) {
                console.log(`[Escavador] Dados encontrados: ${escavadorData.processosEncontrados} processos`)
                extractedInfo.escavadorData = escavadorData

                // Log Escavador query
                await AILog.create({
                  leadId: lead._id.toString(),
                  type: 'escavador_query',
                  action: 'Consulta Escavador por CPF',
                  input: { cpf: extractedInfo.cpf },
                  output: escavadorData,
                  reasoning: `${escavadorData.processosEncontrados} processos encontrados`,
                  metadata: {
                    conversationId: conversation._id.toString()
                  }
                })

                // Atualizar informações baseadas nos dados do Escavador
                if (escavadorData.hasEligibleProcessos) {
                  extractedInfo.hasPrecatorio = true
                  if (escavadorData.totalValue > 0) {
                    extractedInfo.precatorioValue = escavadorData.totalValue
                  }
                }
              }
            }
          }
        } else if (extractedInfo.cpf && isValidCPF(extractedInfo.cpf) && !config.escavadorConfig?.enabled) {
          console.log(`[Escavador] CPF detectado mas integração está desabilitada`)
        }

        await Lead.findByIdAndUpdate(lead._id, extractedInfo)
        // Atualizar lead local com as novas informações
        Object.assign(lead, extractedInfo)
      }
    }

    // Verificar se Escavador está habilitado (usar em múltiplos lugares)
    const escavadorEnabled = config.escavadorConfig?.enabled || false

    // 2. Calcular score usando IA
    if (config.aiConfig.settings.autoScoring) {
      const previousScore = lead.score || 0
      const scoreResult = await ai.calculateScore(lead, conversationHistory, escavadorEnabled, lead._id.toString(), config.aiConfig.prompts.scoring)

      if (scoreResult.score !== lead.score) {
        console.log(`AI calculated new score: ${scoreResult.score} (${scoreResult.classification})`)
        await Lead.findByIdAndUpdate(lead._id, {
          score: scoreResult.score,
          classification: scoreResult.classification
        })
        // Atualizar lead local
        lead.score = scoreResult.score
        lead.classification = scoreResult.classification

        // 🚀 NOVO GATILHO: Enviar para Bitrix quando score atingir threshold configurado
        await checkAndSendToBitrix(lead, previousScore, config, conversation._id.toString())
      }
    }

    // 3. Decidir transferência usando IA
    if (config.aiConfig.settings.autoTransfer) {
      const transferDecision = await ai.shouldTransfer(
        lead.score,
        conversationHistory,
        conversation.messages.length,
        config.aiConfig.prompts.transfer,
        lead._id.toString()
      )

      if (transferDecision.shouldTransfer) {
        console.log(`AI decided to transfer: ${transferDecision.reason}`)
        await Conversation.findByIdAndUpdate(conversation._id, {
          status: 'transferred',
          'metadata.transferReason': transferDecision.reason,
          'metadata.transferredAt': new Date(),
          'metadata.priority': 'medium' // Pode ser melhorado com lógica de prioridade baseada no score
        })

        // Log transfer (sem integração Bitrix aqui)
        await TransferLog.create({
          leadId: lead._id.toString(),
          fromStatus: 'active',
          toStatus: 'transferred',
          reason: transferDecision.reason,
          triggeredBy: 'ai',
          metadata: {
            score: lead.score,
            classification: lead.classification,
            conversationId: conversation._id.toString()
          }
        })

        return
      }
    }

    // 4. Gerar resposta usando IA
    const response = await ai.generateResponse(
      message,
      lead,
      conversationHistory,
      config.aiConfig.prompts.response,
      escavadorEnabled,
      lead._id.toString()
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
    
    // Garantir que timestamp do bot seja posterior à última mensagem do usuário
    const lastUserMessage = conversation.messages
      .filter((msg: any) => msg.sender === 'user')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    const botTimestamp = lastUserMessage
      ? new Date(Math.max(new Date(lastUserMessage.timestamp).getTime() + 1000, Date.now()))
      : new Date()

    // Criar objeto da mensagem do bot
    const botMessage = {
      conversationId: conversation._id,
      type: 'text',
      content: response,
      sender: 'bot',
      timestamp: botTimestamp,
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

