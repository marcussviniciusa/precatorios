import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { instance: string } }
) {
  try {
    const { instance } = params
    const { searchParams } = new URL(request.url)
    const number = searchParams.get('number')

    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY

    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      )
    }

    let url = `${evolutionApiUrl}/instance/connect/${instance}`
    if (number) {
      url += `?number=${number}`
    }

    console.log('Connecting instance:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey
      }
    })

    const responseText = await response.text()
    console.log('Connect instance response:', responseText)

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
        { error: data.message || 'Erro ao conectar instância' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      pairingCode: data.pairingCode,
      code: data.code,
      count: data.count,
      qrcode: data.base64 // Assuming the API returns QR code as base64
    })

  } catch (error) {
    console.error('Connect instance error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}