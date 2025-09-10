import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Lead from '@/models/Lead'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const leads = await Lead.find({})
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json(leads)

  } catch (error) {
    console.error('Leads API error:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const lead = await Lead.create(body)

    return NextResponse.json(lead, { status: 201 })

  } catch (error) {
    console.error('Create lead error:', error)
    return NextResponse.json(
      { error: 'Erro ao criar lead' },
      { status: 500 }
    )
  }
}