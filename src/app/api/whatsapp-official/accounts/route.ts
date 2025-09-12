import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppOfficial from '@/models/WhatsAppOfficial'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const accounts = await WhatsAppOfficial.find({})
      .select('-accessToken') // Não retornar o token por segurança
      .sort({ createdAt: -1 })
    
    return NextResponse.json({
      success: true,
      accounts
    })

  } catch (error) {
    console.error('WhatsApp Official accounts API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const {
      name,
      phoneNumberId,
      accessToken,
      businessAccountId,
      webhookUrl,
      webhookToken,
      isActive = true
    } = body

    // Validações básicas
    if (!name || !phoneNumberId || !accessToken || !webhookUrl || !webhookToken) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, phoneNumberId, accessToken, webhookUrl, webhookToken' },
        { status: 400 }
      )
    }

    // Verificar se já existe uma conta com este phoneNumberId
    const existingAccount = await WhatsAppOfficial.findOne({ phoneNumberId })
    if (existingAccount) {
      return NextResponse.json(
        { error: 'Já existe uma conta com este Phone Number ID' },
        { status: 400 }
      )
    }

    // Criar nova conta
    const account = new WhatsAppOfficial({
      name,
      phoneNumberId,
      accessToken,
      businessAccountId,
      webhookUrl,
      webhookToken,
      isActive,
      stats: {
        totalMessagesSent: 0,
        totalMessagesReceived: 0
      }
    })

    await account.save()

    // Retornar conta sem o access token
    const { accessToken: _, ...accountWithoutToken } = account.toObject()

    return NextResponse.json({
      success: true,
      account: accountWithoutToken,
      message: 'Conta WhatsApp Oficial criada com sucesso'
    })

  } catch (error) {
    console.error('WhatsApp Official create account error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}