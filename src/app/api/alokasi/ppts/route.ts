import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''

    let data = await db.alokasiPpts.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    if (data.length === 0) {
      const { syncAnnualTotalToDb } = await import('@/lib/sync-annual-to-db')
      await syncAnnualTotalToDb()
      data = await db.alokasiPpts.findMany({
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (search) {
      data = data.filter(
        (item) =>
          item.pptsCode.toLowerCase().includes(search) ||
          item.pptsName.toLowerCase().includes(search) ||
          item.productName.toLowerCase().includes(search) ||
          (item.district && item.district.toLowerCase().includes(search))
      )
    }

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil Alokasi PPTS', details: error.message },
      { status: 500 }
    )
  }
}
