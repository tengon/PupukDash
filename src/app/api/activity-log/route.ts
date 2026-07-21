import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    // Support prefix-based filtering: 'order' matches CREATE_ORDER, CANCEL_ORDER, UPDATE_STATUS on orders
    const actionPrefix = searchParams.get('action')
    const where = actionPrefix
      ? { action: { contains: actionPrefix.toUpperCase() } }
      : {}

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.activityLog.count({ where }),
    ])

    return NextResponse.json({ logs, total })
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