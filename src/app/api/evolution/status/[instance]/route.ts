import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppInstance from '@/models/WhatsAppInstance'
import { extractPhoneFromJid } from '@/lib/whatsapp-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { instance: string } }
) {
  try {
    const { instance } = params

    // Primeiro, verificar se a instância existe no banco local
    await dbConnect()
    const localInstance = await WhatsAppInstance.findOne({
      instanceName: instance,
      isActive: true
    })

    if (!localInstance) {
      return NextResponse.json(
        { error: 'Instância não encontrada no banco local' },
        { status: 404 }
      )
    }

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
      // Se instância não existe na Evolution API (404), marcar como inativa no banco local
      if (response.status === 404) {
        await localInstance.updateOne({ isActive: false })
        return NextResponse.json(
          { error: 'Instância não existe na Evolution API', instanceRemoved: true },
          { status: 404 }
        )
      }

      console.error('Evolution API error:', data)
      return NextResponse.json(
        { error: data.message || 'Erro ao verificar status da instância' },
        { status: response.status }
      )
    }

    // Atualizar status no banco de dados local
    await dbConnect()
    
    const instanceData = data.instance || data
    const connectionState = instanceData.state || instanceData.connectionStatus || 'close'
    const phoneNumber = extractPhoneFromJid(instanceData.ownerJid)
    
    // Buscar instância atual
    const currentInstance = await WhatsAppInstance.findOne({ instanceName: instance })
    
    if (!currentInstance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }
    
    // Se conectou com sucesso e temos um número de telefone
    if (connectionState === 'open' && phoneNumber) {
      // Verificar se já existe uma instância com este número
      const existingPhoneInstance = await WhatsAppInstance.findOne({
        phoneNumber,
        isActive: true,
        _id: { $ne: currentInstance._id }
      })
      
      if (existingPhoneInstance) {
        // Desativar a instância antiga com o mesmo número
        await WhatsAppInstance.findByIdAndUpdate(existingPhoneInstance._id, {
          isActive: false,
          state: 'close'
        })
      }
      
      // Atualizar instância atual com o número
      await WhatsAppInstance.findByIdAndUpdate(currentInstance._id, {
        phoneNumber,
        state: connectionState,
        ownerJid: instanceData.ownerJid,
        profileName: instanceData.profileName,
        profilePicUrl: instanceData.profilePicUrl,
        lastConnectionAt: new Date(),
        $push: {
          connectionHistory: {
            instanceName: instance,
            connectedAt: new Date()
          }
        }
      })
    } else {
      // Apenas atualizar o estado
      await WhatsAppInstance.findByIdAndUpdate(currentInstance._id, {
        state: connectionState,
        ownerJid: instanceData.ownerJid,
        profileName: instanceData.profileName,
        profilePicUrl: instanceData.profilePicUrl,
        ...(connectionState === 'open' && { lastConnectionAt: new Date() })
      })
    }

    return NextResponse.json({
      success: true,
      instance: {
        ...instanceData,
        phoneNumber
      }
    })

  } catch (error) {
    console.error('Connection state error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}