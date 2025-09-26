import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    // Verificar autenticação
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json(
        { error: 'Token de acesso requerido' },
        { status: 401 }
      )
    }

    const user = verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido ou expirado' },
        { status: 401 }
      )
    }

    // Conectar ao banco
    await dbConnect()

    const { leadId } = params
    const body = await request.json()
    const { classification } = body

    // Validar parâmetros
    if (!leadId) {
      return NextResponse.json(
        { error: 'ID do lead é obrigatório' },
        { status: 400 }
      )
    }

    if (!classification) {
      return NextResponse.json(
        { error: 'Classificação é obrigatória' },
        { status: 400 }
      )
    }

    // Validar classificação
    const validClassifications = ['hot', 'warm', 'cold', 'discard']
    if (!validClassifications.includes(classification)) {
      return NextResponse.json(
        { error: `Classificação inválida. Valores válidos: ${validClassifications.join(', ')}` },
        { status: 400 }
      )
    }

    // Buscar o lead atual
    const currentLead = await Lead.findById(leadId)
    if (!currentLead) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      )
    }

    // Verificar se houve mudança
    if (currentLead.classification === classification) {
      return NextResponse.json({
        success: true,
        message: 'Classificação já está atualizada',
        lead: {
          _id: currentLead._id,
          name: currentLead.name,
          classification: currentLead.classification
        }
      })
    }

    // Atualizar classificação
    const updatedLead = await Lead.findByIdAndUpdate(
      leadId,
      {
        classification,
        $push: {
          logs: {
            action: 'classification_updated',
            details: {
              previousClassification: currentLead.classification,
              newClassification: classification,
              updatedBy: user.email || user.name || 'Sistema',
              source: 'manual'
            },
            timestamp: new Date()
          }
        }
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Classificação atualizada com sucesso',
      lead: {
        _id: updatedLead._id,
        name: updatedLead.name,
        classification: updatedLead.classification
      }
    })

  } catch (error) {
    console.error('Erro ao atualizar classificação do lead:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}