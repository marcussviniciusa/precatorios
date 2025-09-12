import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import WhatsAppInstance from '@/models/WhatsAppInstance'
import WhatsAppOfficial from '@/models/WhatsAppOfficial'
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

async function sendViaEvolution(instanceId: string, phone: string, message: string) {
  try {
    await dbConnect()
    
    // Buscar a instância
    const instance = await WhatsAppInstance.findById(instanceId)
    if (!instance || !instance.isActive) {
      throw new Error('Instância não encontrada ou inativa')
    }

    // Formatar número para o padrão WhatsApp
    const formattedPhone = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`

    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instance.instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`Evolution API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    
    // Criar ou atualizar lead
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      
      let lead = await Lead.findOne({ phone: cleanPhone })
      if (!lead) {
        lead = new Lead({
          phone: cleanPhone,
          name: `Lead ${cleanPhone}`,
          source: 'broadcast',
          status: 'new',
          classification: 'cold',
          score: 0
        })
        await lead.save()
      }

      // Criar conversa se não existir
      let conversation = await Conversation.findOne({ 
        leadId: lead._id,
        phoneNumber: cleanPhone
      })
      
      if (!conversation) {
        conversation = new Conversation({
          leadId: lead._id,
          phoneNumber: cleanPhone,
          status: 'active',
          lastMessageAt: new Date(),
          messages: []
        })
      }

      // Adicionar mensagem à conversa
      conversation.messages.push({
        _id: data.key?.id || `broadcast_${Date.now()}`,
        sender: 'bot',
        content: message,
        type: 'text',
        timestamp: new Date(),
        fromMe: true,
        metadata: {
          messageId: data.key?.id,
          broadcast: true
        }
      })

      conversation.lastMessageAt = new Date()
      await conversation.save()

    } catch (dbError) {
      console.error('Database error during broadcast:', dbError)
      // Continue mesmo com erro de banco, pois a mensagem foi enviada
    }

    return { success: true, data }
    
  } catch (error) {
    console.error(`Evolution API send error for ${phone}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

async function sendViaOfficial(accountId: string, phone: string, message: string) {
  try {
    await dbConnect()
    
    // Buscar a conta oficial
    const account = await WhatsAppOfficial.findById(accountId)
    if (!account || !account.isActive) {
      throw new Error('Conta oficial não encontrada ou inativa')
    }

    // Formatar número para WhatsApp (remover símbolos e adicionar código do país se necessário)
    let formattedPhone = phone.replace(/\D/g, '')
    if (!formattedPhone.startsWith('55')) {
      formattedPhone = '55' + formattedPhone
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${account.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${account.accessToken}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: {
          body: message
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    
    // Atualizar estatísticas da conta
    await account.incrementMessagesSent()

    // Criar ou atualizar lead
    try {
      const cleanPhone = phone.replace(/\D/g, '')
      
      let lead = await Lead.findOne({ phone: cleanPhone })
      if (!lead) {
        lead = new Lead({
          phone: cleanPhone,
          name: `Lead ${cleanPhone}`,
          source: 'broadcast_official',
          status: 'new',
          classification: 'cold',
          score: 0
        })
        await lead.save()
      }

      // Criar conversa se não existir
      let conversation = await Conversation.findOne({ 
        leadId: lead._id,
        phoneNumber: cleanPhone
      })
      
      if (!conversation) {
        conversation = new Conversation({
          leadId: lead._id,
          phoneNumber: cleanPhone,
          status: 'active',
          lastMessageAt: new Date(),
          messages: []
        })
      }

      // Adicionar mensagem à conversa
      conversation.messages.push({
        _id: data.messages?.[0]?.id || `broadcast_official_${Date.now()}`,
        sender: 'bot',
        content: message,
        type: 'text',
        timestamp: new Date(),
        fromMe: true,
        metadata: {
          messageId: data.messages?.[0]?.id,
          broadcast: true,
          source: 'whatsapp_official'
        }
      })

      conversation.lastMessageAt = new Date()
      await conversation.save()

    } catch (dbError) {
      console.error('Database error during official broadcast:', dbError)
      // Continue mesmo com erro de banco, pois a mensagem foi enviada
    }

    return { success: true, data }
    
  } catch (error) {
    console.error(`WhatsApp Official API send error for ${phone}:`, error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, instanceId, officialAccountId, message, phones } = body

    // Validações
    if (!source || !message || !phones || !Array.isArray(phones)) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: source, message, phones' },
        { status: 400 }
      )
    }

    if (source === 'evolution' && !instanceId) {
      return NextResponse.json(
        { error: 'instanceId é obrigatório para source=evolution' },
        { status: 400 }
      )
    }

    if (source === 'official' && !officialAccountId) {
      return NextResponse.json(
        { error: 'officialAccountId é obrigatório para source=official' },
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
        { error: 'Máximo de 1000 números por disparo' },
        { status: 400 }
      )
    }

    const results: BroadcastResult = {
      success: 0,
      failed: 0,
      details: []
    }

    // Processar cada número
    for (const phone of phones) {
      if (!phone || typeof phone !== 'string') {
        results.failed++
        results.details.push({
          phone: phone || 'undefined',
          status: 'failed',
          error: 'Número inválido'
        })
        continue
      }

      let result
      if (source === 'evolution') {
        result = await sendViaEvolution(instanceId, phone.trim(), message)
      } else {
        result = await sendViaOfficial(officialAccountId, phone.trim(), message)
      }

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
          error: result.error
        })
      }

      // Pequeno delay entre envios para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Disparo finalizado: ${results.success} enviados, ${results.failed} falharam`
    })

  } catch (error) {
    console.error('Broadcast send error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}