import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import BotConfig from '@/models/BotConfig'
import { requireAdmin } from '@/lib/middleware/auth'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const config = await BotConfig.findOne().sort({ updatedAt: -1 })
    
    if (!config) {
      return NextResponse.json(
        { error: 'Configuração não encontrada. Configure o bot primeiro.' },
        { status: 404 }
      )
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

    // Requer usuário admin
    const authResult = requireAdmin(request)
    if (authResult instanceof NextResponse) {
      return authResult
    }
    const user = authResult

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
      const aiRequiredFields = ['enabled', 'provider', 'prompts', 'settings']
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
      updatedBy: user.userId
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