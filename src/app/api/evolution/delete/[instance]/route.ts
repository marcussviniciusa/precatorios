import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppInstance from '@/models/WhatsAppInstance'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { instance: string } }
) {
  try {
    const { instance } = params

    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY

    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      )
    }

    const response = await fetch(`${evolutionApiUrl}/instance/delete/${instance}`, {
      method: 'DELETE',
      headers: {
        'apikey': evolutionApiKey
      }
    })

    const responseText = await response.text()
    console.log('Delete instance response:', responseText)

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
      return NextResponse.json(
        { error: data.message || 'Erro ao excluir instância' },
        { status: response.status }
      )
    }

    // Remover instância do banco de dados local
    await dbConnect()
    
    await WhatsAppInstance.findOneAndUpdate(
      { instanceName: instance },
      { isActive: false },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      status: data.status,
      error: data.error,
      response: data.response
    })

  } catch (error) {
    console.error('Delete instance error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}