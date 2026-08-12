import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { syncLaporanPkpToDb } from '@/lib/sync-laporan-pkp-to-db'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const district = searchParams.get('district') || ''
    const status = searchParams.get('status') || ''

    // Sync DB if table is empty
    let count = 0
    if ((db as any).laporanPkp) {
      count = await (db as any).laporanPkp.count()
    }

    if (count === 0) {
      await syncLaporanPkpToDb()
    }

    let records: any[] = []
    if ((db as any).laporanPkp) {
      records = await (db as any).laporanPkp.findMany({
        orderBy: { createdAt: 'desc' },
      })
    }

    // Fallback read from JSON if DB is empty
    if (records.length === 0) {
      let jsonPath = path.join(process.cwd(), 'scraper', 'laporan_item_penyaluran_pkp_full.json')
      if (!fs.existsSync(jsonPath)) {
        jsonPath = path.join('d:', 'testGet', 'laporan_item_penyaluran_pkp_full.json')
      }
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const parsed = JSON.parse(raw)
        records = parsed.data || []
      }
    }

    // In-memory filtering
    if (search || district || status) {
      records = records.filter((r) => {
        const s = search.toLowerCase()
        const matchSearch =
          !search ||
          (r.noPkp || '').toLowerCase().includes(s) ||
          (r.noPenebusan || '').toLowerCase().includes(s) ||
          (r.kodePengecer || '').toLowerCase().includes(s) ||
          (r.pengecer || r.namaPengecer || '').toLowerCase().includes(s) ||
          (r.kodeSo || '').toLowerCase().includes(s) ||
          (r.productName || r.produk || '').toLowerCase().includes(s)

        const matchDistrict =
          !district || district === 'all' || (r.kecamatan || '').toLowerCase() === district.toLowerCase()

        const matchStatus =
          !status || status === 'ALL' || (r.status || '').toLowerCase() === status.toLowerCase()

        return matchSearch && matchDistrict && matchStatus
      })
    }

    return NextResponse.json({
      success: true,
      total: records.length,
      data: records,
    })
  } catch (error: any) {
    console.error('Error fetching Laporan PKP:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil data Laporan PKP' },
      { status: 500 }
    )
  }
}
