import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncOrderToDb } from '@/lib/sync-order-to-db'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    // Sycn DB if table is empty
    let count = 0
    if ((db as any).orderGow) {
      count = await (db as any).orderGow.count()
    }

    if (count === 0) {
      await syncOrderToDb()
    }

    let orders: any[] = []
    if ((db as any).orderGow) {
      orders = await (db as any).orderGow.findMany({
        orderBy: { createdAt: 'desc' },
      })
    }

    // Fallback read from JSON if DB is empty
    if (orders.length === 0) {
      let jsonPath = path.join(process.cwd(), 'scraper', 'order_full.json')
      if (!fs.existsSync(jsonPath)) {
        jsonPath = path.join(process.cwd(), 'scraper', 'monitoring_order_full.json')
      }
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const parsed = JSON.parse(raw)
        orders = parsed.data || []
      }
    }

    // In-memory filtering
    if (search || status) {
      orders = orders.filter((o) => {
        const s = search.toLowerCase()
        const matchSearch =
          !search ||
          (o.noPenebusan || '').toLowerCase().includes(s) ||
          (o.kodeSo || '').toLowerCase().includes(s) ||
          (o.kodeBooking || '').toLowerCase().includes(s) ||
          (o.distributorName || o.namaDistributor || '').toLowerCase().includes(s) ||
          (o.productName || o.namaProduk || '').toLowerCase().includes(s)

        const matchStatus = !status || status === 'ALL' || (o.status || '').toLowerCase() === status.toLowerCase()
        return matchSearch && matchStatus
      })
    }

    return NextResponse.json({
      success: true,
      total: orders.length,
      data: orders,
    })
  } catch (error: any) {
    console.error('Error fetching GOW CM orders:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil data order GOW CM' },
      { status: 500 }
    )
  }
}
