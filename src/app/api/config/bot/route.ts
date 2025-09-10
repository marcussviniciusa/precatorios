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

    // Validate required fields
    const requiredFields = ['isActive', 'workingHours', 'prompts', 'eligibilityRules', 'transferRules']
    for (const field of requiredFields) {
      if (!configData[field]) {
        return NextResponse.json(
          { error: `Campo obrigatório: ${field}` },
          { status: 400 }
        )
      }
    }

    // Find existing config or create new one
    let config = await BotConfig.findOne()
    
    if (config) {
      // Update existing config
      config = await BotConfig.findOneAndUpdate(
        {},
        {
          ...configData,
          updatedBy: payload.userId
        },
        { new: true }
      )
    } else {
      // Create new config
      config = await BotConfig.create({
        ...configData,
        updatedBy: payload.userId
      })
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