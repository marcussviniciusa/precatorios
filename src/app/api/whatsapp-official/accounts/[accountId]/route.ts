import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppOfficial from '@/models/WhatsAppOfficial'

export async function PUT(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { accountId } = params
    
    const {
      name,
      phoneNumberId,
      accessToken,
      businessAccountId,
      webhookUrl,
      webhookToken,
      isActive
    } = body

    // Validações básicas
    if (!name || !phoneNumberId || !accessToken || !webhookUrl || !webhookToken) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, phoneNumberId, accessToken, webhookUrl, webhookToken' },
        { status: 400 }
      )
    }

    // Verificar se a conta existe
    const account = await WhatsAppOfficial.findById(accountId)
    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se o phoneNumberId não está sendo usado por outra conta
    if (phoneNumberId !== account.phoneNumberId) {
      const existingAccount = await WhatsAppOfficial.findOne({ 
        phoneNumberId,
        _id: { $ne: accountId }
      })
      if (existingAccount) {
        return NextResponse.json(
          { error: 'Este Phone Number ID já está sendo usado por outra conta' },
          { status: 400 }
        )
      }
    }

    // Atualizar conta
    account.name = name
    account.phoneNumberId = phoneNumberId
    account.accessToken = accessToken
    account.businessAccountId = businessAccountId
    account.webhookUrl = webhookUrl
    account.webhookToken = webhookToken
    account.isActive = isActive

    await account.save()

    // Retornar conta sem o access token
    const { accessToken: _, ...accountWithoutToken } = account.toObject()

    return NextResponse.json({
      success: true,
      account: accountWithoutToken,
      message: 'Conta atualizada com sucesso'
    })

  } catch (error) {
    console.error('WhatsApp Official update account error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await dbConnect()
    
    const { accountId } = params

    // Verificar se a conta existe
    const account = await WhatsAppOfficial.findById(accountId)
    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    // Excluir conta
    await WhatsAppOfficial.findByIdAndDelete(accountId)

    return NextResponse.json({
      success: true,
      message: 'Conta excluída com sucesso'
    })

  } catch (error) {
    console.error('WhatsApp Official delete account error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await dbConnect()
    
    const { accountId } = params

    const account = await WhatsAppOfficial.findById(accountId)
      .select('-accessToken') // Não retornar o token por segurança
    
    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      account
    })

  } catch (error) {
    console.error('WhatsApp Official get account error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}