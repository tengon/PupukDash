import { NextResponse } from 'next/server'
import fs from 'fs'

import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const produsen = searchParams.get('produsen') || 'ALL'

    let filePath = path.join(process.cwd(), 'scraper', 'spjb_operasional_full.json')
    if (!fs.existsSync(filePath)) {
      filePath = path.join('d:', 'testGet', 'spjb_operasional_full.json')
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        scraped_at: null,
        total: 0,
        data: [],
        message: 'File spjb_operasional_full.json belum tersedia. Silakan jalankan scraper spjb_operasional.js'
      })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(fileContent)
    let list = json.data || []

    // Fetch user-edited allocation values from DB
    const { db } = await import('@/lib/db')
    const dbAllocations = await db.allocation.findMany({ where: { type: 'OPERASIONAL' } })
    const allocMap = new Map<string, number>()
    dbAllocations.forEach(a => {
      if (a.district && a.productName) {
        const key = `${a.district.toLowerCase().trim()}_${a.productName.toLowerCase().trim()}`
        allocMap.set(key, a.totalAllocationTon)
      }
    })

    // Merge user-edited allocation values into list
    list = list.map((item: any) => {
      if (item.detail?.alokasiTable?.rows && item.detail?.alokasiTable?.headers) {
        const headers: string[] = item.detail.alokasiTable.headers
        const prodIdx = headers.findIndex(h => h.includes('Prov') || h.includes('Prod'))
        const baseProdIdx = prodIdx >= 0 ? prodIdx : 1
        const totalAlokasiIdx = headers.findIndex(h => h.toLowerCase().trim() === 'total alokasi')
        const totalSoApproveIdx = headers.findIndex(h => h.toLowerCase().trim() === 'total so approve')
        const totalSisaIdx = headers.findIndex(h => h.toLowerCase().trim() === 'total sisa')

        if (totalAlokasiIdx >= 0) {
          item.detail.alokasiTable.rows = item.detail.alokasiTable.rows.map((row: string[]) => {
            const cellVal = row[baseProdIdx] || ''
            const parts = cellVal.split(' - ')
            if (parts.length > 1) {
              const dist = parts[0].trim().toLowerCase()
              const prod = parts.slice(1).join(' - ').trim().toLowerCase()
              const key = `${dist}_${prod}`
              if (allocMap.has(key)) {
                const userAlloc = allocMap.get(key)!
                row[totalAlokasiIdx] = userAlloc.toFixed(2).replace('.', ',')
                if (totalSoApproveIdx >= 0 && totalSisaIdx >= 0) {
                  const realTon = parseFloat((row[totalSoApproveIdx] || '0').replace(/\./g, '').replace(',', '.')) || 0
                  const sisaTon = Math.max(0, userAlloc - realTon)
                  row[totalSisaIdx] = sisaTon.toFixed(2).replace('.', ',')
                }
              }
            }
            return row
          })
        }
      }
      return item
    })

    if (search) {
      list = list.filter((item: any) => {
        const inSpjb = item.nomorSpjb && item.nomorSpjb.toLowerCase().includes(search)
        const inProdusen = item.produsen && item.produsen.toLowerCase().includes(search)
        const inDistributor = item.distributor && item.distributor.toLowerCase().includes(search)
        const inNamaPud = item.namaPud && item.namaPud.toLowerCase().includes(search)
        const inKecamatan = item.detailPerKecamatan?.some((d: any) =>
          d.kecamatan && d.kecamatan.toLowerCase().includes(search)
        )
        return inSpjb || inProdusen || inDistributor || inNamaPud || inKecamatan
      })
    }

    if (produsen && produsen !== 'ALL') {
      list = list.filter((item: any) =>
        (item.produsen && item.produsen.toLowerCase().includes(produsen.toLowerCase())) ||
        (item.namaPud && item.namaPud.toLowerCase().includes(produsen.toLowerCase()))
      )
    }

    return NextResponse.json({
      success: true,
      scraped_at: json.scraped_at || null,
      total: list.length,
      last_sync_summary: json.last_sync_summary || null,
      data: list
    })
  } catch (error: any) {
    console.error('Error fetching SPJB Operasional:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data SPJB Operasional', details: error.message },
      { status: 500 }
    )
  }
}
