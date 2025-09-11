import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppInstance from '@/models/WhatsAppInstance'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // Buscar apenas instâncias criadas por este sistema
    const instances = await WhatsAppInstance.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    // Mapear para o formato esperado pelo frontend
    const mappedInstances = instances.map((instance: any) => ({
      instanceName: instance.instanceName,
      state: instance.state,
      status: instance.state,
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