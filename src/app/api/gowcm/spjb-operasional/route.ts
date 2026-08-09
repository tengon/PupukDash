import { NextResponse } from 'next/server'
import fs from 'fs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const produsen = searchParams.get('produsen') || 'ALL'

    const filePath = 'd:\\testGet\\spjb_operasional_full.json'

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

    if (search) {
      list = list.filter((item: any) =>
        (item.nomorSpjb && item.nomorSpjb.toLowerCase().includes(search)) ||
        (item.produsen && item.produsen.toLowerCase().includes(search)) ||
        (item.distributor && item.distributor.toLowerCase().includes(search))
      )
    }

    if (produsen && produsen !== 'ALL') {
      list = list.filter((item: any) =>
        item.produsen && item.produsen.toLowerCase().includes(produsen.toLowerCase())
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
