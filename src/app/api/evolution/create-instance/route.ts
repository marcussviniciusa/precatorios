import { NextRequest, NextResponse } from 'next/server'

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

    // Dados para criar a instância
    const instanceData = {
      instanceName: body.instanceName,
      integration: body.integration || 'WHATSAPP-BAILEYS',
      token: body.token,
      qrcode: body.qrcode || true,
      number: body.number,
      rejectCall: body.rejectCall || false,
      msgCall: body.msgCall,
      groupsIgnore: body.groupsIgnore || true,
      alwaysOnline: body.alwaysOnline || true,
      readMessages: body.readMessages || true,
      readStatus: body.readStatus || true,
      syncFullHistory: body.syncFullHistory || false,
      webhook: {
        url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhook/evolution`,
        byEvents: true,
        base64: false
      }
    }

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
      return NextResponse.json(
        { error: data.message || 'Erro ao criar instância' },
        { status: response.status }
      )
    }

    return NextResponse.json({
      success: true,
      instance: data.instance,
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