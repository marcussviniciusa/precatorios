import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY

    if (!evolutionApiUrl || !evolutionApiKey) {
      return NextResponse.json(
        { error: 'Configuração da Evolution API não encontrada' },
        { status: 500 }
      )
    }

    const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': evolutionApiKey
      }
    })

    const responseText = await response.text()
    console.log('Fetch instances response:', responseText)

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
        { error: data.message || 'Erro ao buscar instâncias' },
        { status: response.status }
      )
    }

    // Map Evolution API response to our format
    const instances = Array.isArray(data) ? data : data.response || []
    const mappedInstances = instances.map((instance: any) => ({
      instanceName: instance.name,
      state: instance.connectionStatus,
      status: instance.connectionStatus,
      ownerJid: instance.ownerJid,
      profileName: instance.profileName,
      profilePicUrl: instance.profilePicUrl,
      integration: instance.integration,
      token: instance.token,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt
    }))

    return NextResponse.json({
      success: true,
      instances: mappedInstances
    })

  } catch (error) {
    console.error('Fetch instances error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}