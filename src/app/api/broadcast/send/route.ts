import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppInstance from '@/models/WhatsAppInstance'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY

interface BroadcastResult {
  success: number
  failed: number
  details: Array<{
    phone: string
    status: 'success' | 'failed'
    error?: string
  }>
}

async function sendViaEvolution(instanceName: string, phone: string, message: string) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error('Evolution API não configurada')
    }

    // Formatar número para WhatsApp (garantir que tenha o formato correto)
    let formattedPhone = phone.replace(/\D/g, '')
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone
    }

    const whatsappId = `${formattedPhone}@s.whatsapp.net`

    const payload = {
      number: whatsappId,
      text: message,
      delay: 1000
    }

    console.log(`Sending message via Evolution to ${whatsappId}:`, payload)

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify(payload)
    })

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(responseData.response?.message || responseData.message || 'Erro na Evolution API')
    }

    // Criar/atualizar lead
    await dbConnect()
    let lead = await Lead.findOne({ phone: formattedPhone })

    if (!lead) {
      lead = await Lead.create({
        phone: formattedPhone,
        name: `Lead ${formattedPhone}`,
        source: 'broadcast',
        status: 'new',
        classification: 'cold',
        score: 0
      })
    }

    // Criar/atualizar conversa
    let conversation = await Conversation.findOne({ leadId: lead._id.toString() })

    if (!conversation) {
      conversation = await Conversation.create({
        leadId: lead._id.toString(),
        whatsappId,
        status: 'active',
        messages: []
      })
    }

    // Adicionar mensagem à conversa
    const messageData = {
      _id: responseData.key?.id || Date.now().toString(),
      sender: 'bot',
      content: message,
      type: 'text',
      timestamp: new Date(),
      fromMe: true,
      metadata: {
        source: 'broadcast',
        instanceName
      }
    }

    conversation.messages.push(messageData)
    conversation.lastMessageAt = new Date()
    await conversation.save()

    console.log(`Message sent successfully to ${phone}`)
    return { success: true, data: responseData }

  } catch (error) {
    console.error(`Error sending message to ${phone}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceId, message, phones } = body

    // Validações
    if (!instanceId || !message || !phones || !Array.isArray(phones)) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: instanceId, message, phones (array)' },
        { status: 400 }
      )
    }

    if (phones.length === 0) {
      return NextResponse.json(
        { error: 'Lista de telefones não pode estar vazia' },
        { status: 400 }
      )
    }

    if (phones.length > 1000) {
      return NextResponse.json(
        { error: 'Máximo de 1000 números por broadcast' },
        { status: 400 }
      )
    }

    // Verificar se a instância existe e está ativa
    await dbConnect()
    const instance = await WhatsAppInstance.findOne({
      instanceName: instanceId,
      isActive: true
    })

    if (!instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada ou inativa' },
        { status: 404 }
      )
    }

    // Processar envios
    const results: BroadcastResult = {
      success: 0,
      failed: 0,
      details: []
    }

    console.log(`Starting broadcast to ${phones.length} numbers via instance ${instanceId}`)

    for (const phone of phones) {
      if (!phone || phone.trim().length < 10) {
        results.failed++
        results.details.push({
          phone: phone || 'empty',
          status: 'failed',
          error: 'Número inválido'
        })
        continue
      }

      const result = await sendViaEvolution(instanceId, phone.trim(), message)

      if (result.success) {
        results.success++
        results.details.push({
          phone: phone.trim(),
          status: 'success'
        })
      } else {
        results.failed++
        results.details.push({
          phone: phone.trim(),
          status: 'failed',
          error: result.error || 'Erro desconhecido'
        })
      }

      // Delay entre mensagens para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    console.log(`Broadcast completed: ${results.success} success, ${results.failed} failed`)

    return NextResponse.json({
      success: true,
      results,
      message: `Broadcast enviado: ${results.success} sucessos, ${results.failed} falhas`
    })

  } catch (error) {
    console.error('Broadcast error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}