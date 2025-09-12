import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import BotConfig from '@/models/BotConfig'
import MediaProcessor from '@/lib/media-processor'

export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json({ error: 'ID da mensagem é obrigatório' }, { status: 400 })
    }

    // Buscar a conversa e a mensagem específica
    const conversation = await Conversation.findById(params.conversationId)
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })
    }

    const message = conversation.messages.find((msg: any) => msg._id.toString() === messageId)
    if (!message) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }

    if (message.type !== 'audio') {
      return NextResponse.json({ error: 'Mensagem não é um áudio' }, { status: 400 })
    }

    // Verificar se já possui transcrição
    if (message.metadata?.transcription) {
      return NextResponse.json({ 
        success: true, 
        transcription: message.metadata.transcription,
        cached: true
      })
    }

    // Verificar se tem URL de mídia
    if (!message.metadata?.mediaUrl) {
      return NextResponse.json({ error: 'URL de mídia não encontrada' }, { status: 404 })
    }

    // Buscar configuração de processamento de mídia
    const config = await BotConfig.findOne().sort({ updatedAt: -1 })
    
    if (!config?.mediaProcessing?.enabled) {
      return NextResponse.json({ error: 'Processamento de mídia não está habilitado' }, { status: 400 })
    }

    try {
      // Baixar o áudio do MinIO/URL
      const audioResponse = await fetch(message.metadata.mediaUrl)
      if (!audioResponse.ok) {
        throw new Error('Falha ao baixar áudio')
      }

      const audioBuffer = Buffer.from(await audioResponse.arrayBuffer())

      // Inicializar o processador de mídia
      const mediaProcessor = MediaProcessor.getInstance()
      await mediaProcessor.initialize({
        googleVisionEnabled: config.mediaProcessing.googleVision?.enabled || false,
        googleVisionKeyPath: config.mediaProcessing.googleVision?.keyPath,
        groqEnabled: config.mediaProcessing.groq?.enabled || false,
        groqApiKey: config.mediaProcessing.groq?.apiKey,
        openRouterEnabled: config.mediaProcessing.openRouter?.enabled || false,
        openRouterApiKey: config.mediaProcessing.openRouter?.apiKey || config.aiConfig?.apiKey,
        imageDescriptionModel: config.mediaProcessing.openRouter?.imageModel || 'openrouter/sonoma-sky-alpha'
      })

      // Transcrever o áudio
      const transcription = await mediaProcessor.transcribeAudio(
        audioBuffer,
        message.metadata.mimetype || 'audio/ogg'
      )

      if (transcription) {
        // Salvar a transcrição na mensagem
        const messageIndex = conversation.messages.findIndex((msg: any) => msg._id.toString() === messageId)
        if (messageIndex !== -1) {
          conversation.messages[messageIndex].metadata = {
            ...conversation.messages[messageIndex].metadata,
            transcription
          }
          await conversation.save()
        }

        return NextResponse.json({
          success: true,
          transcription,
          cached: false
        })
      } else {
        return NextResponse.json({ 
          error: 'Não foi possível transcrever o áudio',
          details: 'Serviço de transcrição pode estar indisponível ou áudio incompatível'
        }, { status: 500 })
      }

    } catch (processingError) {
      console.error('Error processing audio transcription:', processingError)
      return NextResponse.json({ 
        error: 'Erro ao processar transcrição',
        details: processingError instanceof Error ? processingError.message : 'Erro desconhecido'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Transcription API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}