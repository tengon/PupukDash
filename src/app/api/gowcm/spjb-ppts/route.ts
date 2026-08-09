import { NextResponse } from 'next/server'
import fs from 'fs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const status = searchParams.get('status') || 'ALL'

    const filePath = 'd:\\testGet\\spjb_ppts_full.json'

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        scraped_at: null,
        total: 0,
        data: [],
        message: 'File spjb_ppts_full.json belum tersedia. Silakan jalankan scraper spjb_ppts.js'
      })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(fileContent)
    let list = json.data || []

    if (search) {
      list = list.filter((item: any) =>
        (item.namaPpts && item.namaPpts.toLowerCase().includes(search)) ||
        (item.kodePpts && item.kodePpts.toLowerCase().includes(search)) ||
        (item.nomorSpjb && item.nomorSpjb.toLowerCase().includes(search)) ||
        (item.kabupaten && item.kabupaten.toLowerCase().includes(search))
      )
    }

    if (status && status !== 'ALL') {
      list = list.filter((item: any) =>
        (item.status && item.status.toLowerCase() === status.toLowerCase()) ||
        (item.detail?.header?.status && item.detail.header.status.toLowerCase() === status.toLowerCase())
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
    console.error('Error fetching SPJB PPTS:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data SPJB PPTS', details: error.message },
      { status: 500 }
    )
  }
}
