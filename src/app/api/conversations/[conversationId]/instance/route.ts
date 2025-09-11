import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/models/Conversation'
import Lead from '@/models/Lead'
import WhatsAppInstance from '@/models/WhatsAppInstance'

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    await dbConnect()
    
    const { conversationId } = params

    // Buscar a conversa
    const conversation = await Conversation.findById(conversationId)
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversa não encontrada' },
        { status: 404 }
      )
    }

    // Buscar o lead
    const lead = await Lead.findById(conversation.leadId)
    if (!lead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Buscar instância ativa com o número do lead
    // O lead.phone deve corresponder ao phoneNumber da instância
    const activeInstance = await WhatsAppInstance.findOne({
      phoneNumber: lead.phone,
      isActive: true,
      state: 'open'
    })

    if (!activeInstance) {
      // Buscar qualquer instância ativa (fallback)
      const anyActiveInstance = await WhatsAppInstance.findOne({
        isActive: true,
        state: 'open'
      })

      return NextResponse.json({
        success: true,
        instance: anyActiveInstance ? {
          instanceName: anyActiveInstance.instanceName,
          phoneNumber: anyActiveInstance.phoneNumber,
          profileName: anyActiveInstance.profileName,
          state: anyActiveInstance.state,
          isMatched: false
        } : null,
        leadPhone: lead.phone,
        warning: 'Nenhuma instância encontrada para este número específico'
      })
    }

    return NextResponse.json({
      success: true,
      instance: {
        instanceName: activeInstance.instanceName,
        phoneNumber: activeInstance.phoneNumber,
        profileName: activeInstance.profileName,
        profilePicUrl: activeInstance.profilePicUrl,
        state: activeInstance.state,
        isMatched: true
      },
      leadPhone: lead.phone
    })

  } catch (error) {
    console.error('Error fetching conversation instance:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}