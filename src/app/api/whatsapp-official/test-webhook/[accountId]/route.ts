import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppOfficial from '@/models/WhatsAppOfficial'

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  try {
    await dbConnect()
    
    const { accountId } = params

    // Buscar a conta
    const account = await WhatsAppOfficial.findById(accountId)
    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      )
    }

    if (!account.isActive) {
      return NextResponse.json(
        { error: 'Conta não está ativa' },
        { status: 400 }
      )
    }

    // Testar conexão com a API do WhatsApp
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${account.phoneNumberId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`)
      }

      const phoneData = await response.json()
      
      // Atualizar último uso
      await account.updateLastUsed()

      return NextResponse.json({
        success: true,
        message: 'Conexão com WhatsApp API testada com sucesso!',
        phoneData: {
          id: phoneData.id,
          display_phone_number: phoneData.display_phone_number,
          verified_name: phoneData.verified_name,
          status: phoneData.status
        }
      })

    } catch (apiError) {
      console.error('WhatsApp API test error:', apiError)
      
      return NextResponse.json({
        success: false,
        error: 'Falha ao conectar com a API do WhatsApp',
        details: apiError instanceof Error ? apiError.message : 'Erro desconhecido',
        suggestions: [
          'Verifique se o Access Token está correto e não expirou',
          'Confirme se o Phone Number ID está correto',
          'Verifique se o app tem as permissões necessárias',
          'Certifique-se que o Business Account está ativo'
        ]
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}