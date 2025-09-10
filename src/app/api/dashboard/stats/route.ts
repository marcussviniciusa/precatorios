import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'
import Conversation from '@/models/Conversation'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const today = new Date()
    const startToday = startOfDay(today)
    const endToday = endOfDay(today)
    const last7Days = subDays(today, 7)

    const [
      totalLeads,
      activeConversations,
      hotLeads,
      todayNewLeads,
      todayMessages,
      todayQualifiedLeads,
      conversionData,
      leadsOverTime
    ] = await Promise.all([
      Lead.countDocuments(),
      Conversation.countDocuments({ status: 'active' }),
      Lead.countDocuments({ classification: 'hot' }),
      Lead.countDocuments({ createdAt: { $gte: startToday, $lte: endToday } }),
      Conversation.aggregate([
        {
          $match: {
            'messages.timestamp': { $gte: startToday, $lte: endToday }
          }
        },
        {
          $project: {
            todayMessages: {
              $size: {
                $filter: {
                  input: '$messages',
                  cond: {
                    $and: [
                      { $gte: ['$$this.timestamp', startToday] },
                      { $lte: ['$$this.timestamp', endToday] }
                    ]
                  }
                }
              }
            }
          }
        },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: '$todayMessages' }
          }
        }
      ]).then(result => result[0]?.totalMessages || 0),
      Lead.countDocuments({
        classification: { $in: ['hot', 'warm'] },
        createdAt: { $gte: startToday, $lte: endToday }
      }),
      Lead.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Lead.aggregate([
        {
          $match: {
            createdAt: { $gte: last7Days }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            leads: { $sum: 1 }
          }
        },
        {
          $sort: { '_id': 1 }
        }
      ])
    ])

    const totalConversions = conversionData.find(item => item._id === 'closed_won')?.count || 0
    const conversionRate = totalLeads > 0 ? (totalConversions / totalLeads) * 100 : 0

    const conversionFunnel = [
      { stage: 'Novos Leads', count: conversionData.find(item => item._id === 'new')?.count || 0 },
      { stage: 'Qualificados', count: conversionData.find(item => item._id === 'qualified')?.count || 0 },
      { stage: 'Em Análise', count: conversionData.find(item => item._id === 'in_analysis')?.count || 0 },
      { stage: 'Proposta', count: conversionData.find(item => item._id === 'proposal')?.count || 0 },
      { stage: 'Fechados', count: totalConversions }
    ]

    const scoreDistribution = await Lead.aggregate([
      {
        $bucket: {
          groupBy: '$score',
          boundaries: [0, 20, 50, 80, 100],
          default: 'Outros',
          output: {
            count: { $sum: 1 }
          }
        }
      }
    ])

    const formattedScoreDistribution = scoreDistribution.map(item => ({
      range: item._id === 'Outros' ? 'Outros' : 
             item._id === 0 ? '0-19 (Descarte)' :
             item._id === 20 ? '20-49 (Frios)' :
             item._id === 50 ? '50-79 (Mornos)' :
             '80-100 (Quentes)',
      count: item.count
    }))

    const dashboardData = {
      totalLeads,
      activeConversations,
      hotLeads,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageResponseTime: totalLeads > 0 ? 2.5 : 0,
      todayStats: {
        newLeads: todayNewLeads,
        messages: todayMessages,
        qualifiedLeads: todayQualifiedLeads
      },
      chartData: {
        leadsOverTime: leadsOverTime.map(item => ({
          date: item._id,
          leads: item.leads
        })),
        conversionFunnel,
        scoreDistribution: formattedScoreDistribution
      }
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}