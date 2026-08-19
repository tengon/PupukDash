import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''

    const filePath = path.join(process.cwd(), 'scraper', 'penyaluran_pengecer_full.json')

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        success: true,
        scraped_at: null,
        total: 0,
        data: [],
        message: 'File penyaluran_pengecer_full.json belum tersedia. Silakan jalankan scraper penyaluran_pengecer.js',
      })
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(fileContent)
    let list = json.data || []

    if (search) {
      list = list.filter((item: any) =>
        (item.noSuratJalan && item.noSuratJalan.toLowerCase().includes(search)) ||
        (item.kodeProdusen && item.kodeProdusen.toLowerCase().includes(search)) ||
        (item.tglSuratJalan && item.tglSuratJalan.toLowerCase().includes(search))
      )
    }

    return NextResponse.json({
      success: true,
      scraped_at: json.scraped_at || null,
      total: list.length,
      data: list,
    })
  } catch (error: any) {
    console.error('Error fetching Penyaluran Pengecer:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Penyaluran Pengecer', details: error.message },
      { status: 500 }
    )
  }
}
