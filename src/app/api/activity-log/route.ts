import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('List activity logs error:', error)
    return NextResponse.json(
      { error: 'Gagal memuat riwayat aktivitas' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, detail, userId } = body

    if (!action || !detail) {
      return NextResponse.json(
        { error: 'Action dan detail wajib diisi' },
        { status: 400 }
      )
    }

    const log = await db.activityLog.create({
      data: {
        action,
        detail,
        userId: userId || null,
      },
    })

    return NextResponse.json(log, { status: 201 })
  } catch (error) {
    console.error('Create activity log error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat log aktivitas' },
      { status: 500 }
    )
  }
}