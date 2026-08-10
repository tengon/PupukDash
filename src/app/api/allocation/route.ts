import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const type = searchParams.get('type') || 'ALL' // OPERASIONAL, PPTS, ALL
    const district = searchParams.get('district') || ''

    const where: any = {
      ...(type !== 'ALL' ? { type } : {}),
      ...(district ? { district } : {}),
      ...(search
        ? {
            OR: [
              { productName: { contains: search } },
              { district: { contains: search } },
              { spjbNumber: { contains: search } },
              { pptsName: { contains: search } },
              { pptsCode: { contains: search } },
            ],
          }
        : {}),
    }

    const allocations = await db.allocation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      success: true,
      total: allocations.length,
      data: allocations,
    })
  } catch (error: any) {
    console.error('Error fetching allocation table:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Alokasi', details: error.message },
      { status: 500 }
    )
  }
}
