import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const district = searchParams.get('district')?.toLowerCase() || ''

    let data = await db.alokasiTahunanKecamatan.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    if (data.length === 0) {
      const { syncAnnualTotalToDb } = await import('@/lib/sync-annual-to-db')
      await syncAnnualTotalToDb()
      data = await db.alokasiTahunanKecamatan.findMany({
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (district) {
      data = data.filter((item) => item.district.toLowerCase() === district)
    }

    if (search) {
      data = data.filter(
        (item) =>
          item.district.toLowerCase().includes(search) ||
          item.productName.toLowerCase().includes(search) ||
          item.spjbNumber.toLowerCase().includes(search)
      )
    }

    return NextResponse.json({
      success: true,
      total: data.length,
      data,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil Alokasi Tahunan Kecamatan', details: error.message },
      { status: 500 }
    )
  }
}
