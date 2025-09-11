import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import BotConfig from '@/models/BotConfig'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const config = await BotConfig.findOne().sort({ updatedAt: -1 })
    
    if (!config) {
      // Return default config if none exists
      const defaultConfig = {
        isActive: true,
        workingHours: {
          start: '08:00',
          end: '18:00',
          timezone: 'America/Sao_Paulo'
        },
        prompts: {
          welcome: 'Olá! 👋 Sou o assistente virtual especializado em precatórios. Como posso ajudá-lo hoje?',
          qualification: 'Para melhor atendê-lo, preciso de algumas informações. Você possui algum precatório para receber?',
          followUp: 'Obrigado pelas informações! Em breve um de nossos especialistas entrará em contato.',
          transfer: 'Vou transferir você para um de nossos especialistas. Aguarde um momento...'
        },
        eligibilityRules: {
          allowedStates: ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'GO', 'DF', 'ES'],
          minValue: 10000,
          allowedTypes: ['federal', 'estadual', 'municipal', 'trabalhista']
        },
        transferRules: {
          scoreThreshold: 60,
          keywordTriggers: ['falar com humano', 'quero falar com alguém', 'atendente', 'urgente'],
          maxBotResponses: 10
        },
        aiConfig: {
          enabled: false,
          provider: 'openrouter',
          apiKey: '',
          analysisModel: '',
          responseModel: '',
          prompts: {
            extraction: 'Extraia informações sobre precatórios da mensagem: nome, valor, estado, urgência, tipo.',
            scoring: 'Calcule o score do lead baseado nas informações: precatório confirmado (+40), valor elegível (+20), estado válido (+10), urgência (+15), documentos (+10), interesse (+5).',
            response: 'Você é um assistente de precatórios. Seja cordial, direto e colete informações básicas. Máximo 3 linhas por resposta.',
            transfer: 'Decida se deve transferir para humano baseado no score (>=60), urgência, solicitação explícita ou mais de 5 mensagens.'
          },
          settings: {
            autoExtraction: true,
            autoScoring: true,
            autoTransfer: true,
            temperature: 0.3,
            maxTokens: 500
          }
        }
      }
      
      return NextResponse.json(defaultConfig)
    }
    
    return NextResponse.json(config)

  } catch (error) {
    console.error('Get bot config error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso requerido' },
        { status: 401 }
      )
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const configData = await request.json()
    console.log('Config data received:', JSON.stringify(configData, null, 2))

    // Validate required fields (responseTemplates e aiConfig são opcionais com defaults)
    const requiredFields = ['isActive', 'workingHours', 'prompts', 'eligibilityRules', 'transferRules']
    for (const field of requiredFields) {
      // Use hasOwnProperty or 'in' operator instead of truthy check for boolean fields
      if (!(field in configData) || configData[field] === undefined || configData[field] === null) {
        console.log(`Missing required field: ${field}`)
        console.log(`Available fields:`, Object.keys(configData))
        console.log(`Field value:`, configData[field])
        return NextResponse.json(
          { error: `Campo obrigatório: ${field}` },
          { status: 400 }
        )
      }
    }

    // Validate aiConfig if provided
    if (configData.aiConfig) {
      const aiRequiredFields = ['enabled', 'provider', 'model', 'prompts', 'settings']
      for (const field of aiRequiredFields) {
        if (!(field in configData.aiConfig) || configData.aiConfig[field] === undefined || configData.aiConfig[field] === null) {
          console.log(`Missing required AI field: aiConfig.${field}`)
          return NextResponse.json(
            { error: `Campo obrigatório de IA: aiConfig.${field}` },
            { status: 400 }
          )
        }
      }

      // If AI is enabled, require API key
      if (configData.aiConfig.enabled && !configData.aiConfig.apiKey) {
        return NextResponse.json(
          { error: 'API Key é obrigatória quando IA está habilitada' },
          { status: 400 }
        )
      }
    }

    // Add default responseTemplates if not provided
    const configWithDefaults = {
      ...configData,
      responseTemplates: configData.responseTemplates || {
        greeting: 'Olá! Como posso ajudá-lo com seus precatórios?',
        not_eligible: 'Infelizmente seu precatório não se enquadra em nossos critérios no momento.',
        eligible: 'Ótima notícia! Seu precatório está dentro de nossos critérios de atendimento.',
        need_documents: 'Para prosseguir, precisarei que envie alguns documentos.',
        outside_hours: 'Nosso atendimento funciona das 8h às 18h. Retornarei seu contato no próximo horário comercial.'
      },
      updatedBy: payload.userId
    }

    // Find existing config or create new one
    let config = await BotConfig.findOne()
    
    if (config) {
      // Update existing config
      config = await BotConfig.findOneAndUpdate(
        {},
        configWithDefaults,
        { new: true }
      )
    } else {
      // Create new config
      config = await BotConfig.create(configWithDefaults)
    }

    return NextResponse.json({
      message: 'Configuração salva com sucesso',
      config
    })

  } catch (error) {
    console.error('Save bot config error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}