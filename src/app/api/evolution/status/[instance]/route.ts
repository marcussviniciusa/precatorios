import { NextRequest, NextResponse } from 'next/server'

export async function GET(
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

    const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instance}`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey
      },
      cache: 'no-store'
    })

    const responseText = await response.text()
    console.log('Connection state response:', responseText)

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
        { error: data.message || 'Erro ao verificar status da instância' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      instance: data.instance || data
    })

  } catch (error) {
    console.error('Connection state error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}