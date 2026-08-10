import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const type = searchParams.get('type') || 'ALL' // OPERASIONAL, PPTS, ALL
    const district = searchParams.get('district') || ''

    let allocations = await db.allocation.findMany({
      orderBy: { updatedAt: 'desc' },
    })

    // Jika tabel Allocation masih kosong di DB, otomatis jalankan sync/seed 1x
    if (allocations.length === 0) {
      const { syncAnnualTotalToDb } = await import('@/lib/sync-annual-to-db')
      await syncAnnualTotalToDb()
      allocations = await db.allocation.findMany({
        orderBy: { updatedAt: 'desc' },
      })
    }

    if (type !== 'ALL') {
      allocations = allocations.filter(a => a.type === type)
    }

    if (district) {
      allocations = allocations.filter(a => a.district && a.district.toLowerCase() === district.toLowerCase())
    }

    if (search) {
      const s = search.toLowerCase()
      allocations = allocations.filter(a =>
        (a.productName && a.productName.toLowerCase().includes(s)) ||
        (a.district && a.district.toLowerCase().includes(s)) ||
        (a.spjbNumber && a.spjbNumber.toLowerCase().includes(s)) ||
        (a.pptsName && a.pptsName.toLowerCase().includes(s)) ||
        (a.pptsCode && a.pptsCode.toLowerCase().includes(s))
      )
    }

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
