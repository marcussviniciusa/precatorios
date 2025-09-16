import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppInstance from '@/models/WhatsAppInstance'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY

    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      )
    }

    // Payload seguindo a documentação oficial Evolution API v2
    const integration = body.integration || 'WHATSAPP-BAILEYS'
    const instanceData: any = {
      instanceName: body.instanceName,
      integration,
      qrcode: integration === 'WHATSAPP-BAILEYS' ? true : false,
      token: body.token || Math.random().toString(36).substring(2, 15) // Token sempre obrigatório
    }

    // Adicionar configurações específicas para WHATSAPP-BUSINESS
    if (integration === 'WHATSAPP-BUSINESS' && body.businessConfig) {
      if (body.businessConfig.accessToken) {
        instanceData.businessConfig = {
          accessToken: body.businessConfig.accessToken,
          phoneNumberId: body.businessConfig.phoneNumberId,
          businessAccountId: body.businessConfig.businessAccountId
        }

        // Para WHATSAPP-BUSINESS, usar o phoneNumberId como número
        // A Evolution API precisa de um número associado à instância
        instanceData.number = body.businessConfig.phoneNumberId
      }
    }

    // Adicionar webhook com estrutura completa
    const webhookUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    if (webhookUrl) {
      instanceData.webhook = {
        url: `${webhookUrl}/api/webhook/evolution`,
        enabled: true,
        events: [
          'APPLICATION_STARTUP',
          'QRCODE_UPDATED', 
          'CONNECTION_UPDATE',
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'SEND_MESSAGE'
        ]
      }
    }

    // Adiciona campos opcionais apenas se fornecidos
    if (body.token) instanceData.token = body.token
    if (body.number) instanceData.number = body.number
    if (body.msgCall) instanceData.msgCall = body.msgCall

    console.log('Creating instance with data:', instanceData)

    const response = await fetch(`${evolutionApiUrl}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey
      },
      body: JSON.stringify(instanceData)
    })

    const responseText = await response.text()
    console.log('Evolution API response:', responseText)

    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('Error parsing response:', e)
      return NextResponse.json(
        { error: 'Resposta inválida da Evolution API' },
        { status: 500 }
      )
    }

    if (!response.ok) {
      console.error('Evolution API error:', data)
      
      // Extrair mensagem de erro específica
      let errorMessage = 'Erro ao criar instância'
      if (data.response?.message) {
        if (Array.isArray(data.response.message)) {
          errorMessage = data.response.message.join(', ')
        } else {
          errorMessage = data.response.message
        }
      } else if (data.message) {
        errorMessage = data.message
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          details: data,
          instanceData: instanceData // Para debug
        },
        { status: response.status }
      )
    }

    // Salvar instância no banco de dados local
    await dbConnect()
    
    // Verificar se já existe uma instância com este nome (inativa)
    const existingInstance = await WhatsAppInstance.findOne({
      instanceName: body.instanceName
    })
    
    let instanceRecord
    
    if (existingInstance) {
      // Reativar instância existente
      const updateData: any = {
        state: 'close',
        integration,
        webhookUrl: instanceData.webhook?.url,
        isActive: true,
        updatedAt: new Date()
      }

      // Atualizar businessConfig e phoneNumber para WHATSAPP-BUSINESS
      if (integration === 'WHATSAPP-BUSINESS' && body.businessConfig) {
        updateData.businessConfig = body.businessConfig
        // Para BUSINESS API, usar phoneNumberId como phoneNumber
        if (body.businessConfig.phoneNumberId) {
          updateData.phoneNumber = body.businessConfig.phoneNumberId
        }
      }

      instanceRecord = await WhatsAppInstance.findByIdAndUpdate(
        existingInstance._id,
        updateData,
        { new: true }
      )
    } else {
      // Criar nova instância
      const createData: any = {
        instanceName: body.instanceName,
        state: 'close',
        integration,
        webhookUrl: instanceData.webhook?.url,
        isActive: true,
        createdBy: 'system', // TODO: usar usuário autenticado quando implementado
        connectionHistory: []
      }

      // Adicionar businessConfig e phoneNumber para WHATSAPP-BUSINESS
      if (integration === 'WHATSAPP-BUSINESS' && body.businessConfig) {
        createData.businessConfig = body.businessConfig
        // Para BUSINESS API, usar phoneNumberId como phoneNumber
        if (body.businessConfig.phoneNumberId) {
          createData.phoneNumber = body.businessConfig.phoneNumberId
        }
      }

      instanceRecord = await WhatsAppInstance.create(createData)
    }

    return NextResponse.json({
      success: true,
      instance: {
        instanceName: instanceRecord.instanceName,
        state: instanceRecord.state,
        integration: instanceRecord.integration,
        phoneNumber: instanceRecord.phoneNumber,
        reactivated: !!existingInstance
      },
      hash: data.hash,
      settings: data.settings
    })

  } catch (error) {
    console.error('Create instance error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}