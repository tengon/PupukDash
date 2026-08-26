import { NextResponse } from 'next/server'
import fs from 'fs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const product = searchParams.get('product') || ''

    const filePath = path.join(process.cwd(), 'scraper', 'realisasi_stok_kios_full.json')

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        scraped_at: null,
        total_records: 0,
        total_kios: 0,
        data: [],
        message: 'File stok_kios_ipuber_full.json belum tersedia. Silakan jalankan scraper stok_kios_ipuber.js'
      })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(fileContent)
    let list = json.data || []

    if (search) {
      list = list.filter((item: any) =>
        (item.namaKios && item.namaKios.toLowerCase().includes(search)) ||
        (item.kodeKios && item.kodeKios.toLowerCase().includes(search)) ||
        (item.namaProduct && item.namaProduct.toLowerCase().includes(search)) ||
        (item.kodeProduct && item.kodeProduct.toLowerCase().includes(search))
      )
    }

    if (product && product !== 'ALL') {
      list = list.filter((item: any) => item.kodeProduct === product || item.namaProduct.toLowerCase().includes(product.toLowerCase()))
    }

    const uniqueKios = new Set(list.map((item: any) => item.kodeKios))

    return NextResponse.json({
      success: true,
      scraped_at: json.scraped_at || null,
      total_records: list.length,
      total_kios: uniqueKios.size,
      last_sync_summary: json.last_sync_summary || null,
      data: list
    })
  } catch (error: any) {
    console.error('Error fetching PPTS stock:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data stok PPTS', details: error.message },
      { status: 500 }
    )
  }
}
