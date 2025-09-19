import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import AILog from '@/models/AILog'
import TransferLog from '@/models/TransferLog'
import ScoreLog from '@/models/ScoreLog'

export async function GET(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    await dbConnect()

    const { leadId } = params
    const { searchParams } = new URL(request.url)

    // Parâmetros de filtro
    const type = searchParams.get('type') // 'ai' | 'transfer' | 'score' | 'all'
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = parseInt(searchParams.get('skip') || '0')

    let logs = []

    if (type === 'ai' || type === 'all' || !type) {
      const aiLogs = await AILog.find({ leadId })
        .sort({ timestamp: -1 })
        .limit(type === 'all' || !type ? limit : undefined)
        .skip(type === 'all' || !type ? 0 : skip)
        .lean()

      logs = [...logs, ...aiLogs.map(log => ({ ...log, logType: 'ai' }))]
    }

    if (type === 'transfer' || type === 'all' || !type) {
      const transferLogs = await TransferLog.find({ leadId })
        .sort({ timestamp: -1 })
        .limit(type === 'all' || !type ? limit : undefined)
        .skip(type === 'all' || !type ? 0 : skip)
        .lean()

      logs = [...logs, ...transferLogs.map(log => ({ ...log, logType: 'transfer' }))]
    }

    if (type === 'score' || type === 'all' || !type) {
      const scoreLogs = await ScoreLog.find({ leadId })
        .sort({ timestamp: -1 })
        .limit(type === 'all' || !type ? limit : undefined)
        .skip(type === 'all' || !type ? 0 : skip)
        .lean()

      logs = [...logs, ...scoreLogs.map(log => ({ ...log, logType: 'score' }))]
    }

    // Ordenar todos os logs por timestamp
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Aplicar limite se for 'all'
    if (type === 'all' || !type) {
      logs = logs.slice(skip, skip + limit)
    }

    // Contadores totais
    const [totalAI, totalTransfer, totalScore] = await Promise.all([
      AILog.countDocuments({ leadId }),
      TransferLog.countDocuments({ leadId }),
      ScoreLog.countDocuments({ leadId })
    ])

    return NextResponse.json({
      logs,
      totals: {
        ai: totalAI,
        transfer: totalTransfer,
        score: totalScore,
        all: totalAI + totalTransfer + totalScore
      },
      pagination: {
        skip,
        limit,
        hasMore: logs.length === limit
      }
    })

  } catch (error) {
    console.error('Logs fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar logs' },
      { status: 500 }
    )
  }
}