import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const kodeKios = searchParams.get('kodeKios')?.toLowerCase() || ''
    const produk = searchParams.get('produk')?.toLowerCase() || ''

    let jsonFilePath = path.join(process.cwd(), 'scraper', 'realisasi_stok_kios_full.json')

    if (!fs.existsSync(jsonFilePath)) {
      jsonFilePath = path.join('d:', 'testGet', 'realisasi_stok_kios_full.json')
    }

    if (!fs.existsSync(jsonFilePath)) {
      return NextResponse.json({
        success: false,
        message: 'Data Realisasi Stok Kios belum tersedia. Silakan jalankan scraper realisasi_stok_kios.js.',
        total: 0,
        data: [],
      })
    }

    const fileContent = fs.readFileSync(jsonFilePath, 'utf-8')
    const parsed = JSON.parse(fileContent)
    let list: Array<{
      kodeKios: string
      namaKios: string
      kodeProduk: string
      namaProduk: string
      stokKg: number
      syncAt: string
    }> = parsed.data || []

    if (kodeKios && kodeKios !== 'all') {
      list = list.filter((item) => item.kodeKios.toLowerCase() === kodeKios)
    }

    if (produk && produk !== 'all') {
      list = list.filter(
        (item) =>
          item.kodeProduk.toLowerCase().includes(produk) ||
          item.namaProduk.toLowerCase().includes(produk)
      )
    }

    if (search) {
      list = list.filter(
        (item) =>
          item.kodeKios.toLowerCase().includes(search) ||
          item.namaKios.toLowerCase().includes(search) ||
          item.kodeProduk.toLowerCase().includes(search) ||
          item.namaProduk.toLowerCase().includes(search)
      )
    }

    return NextResponse.json({
      success: true,
      total: list.length,
      scraped_at: parsed.scraped_at || null,
      data: list,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data Realisasi Stok Kios', details: error.message },
      { status: 500 }
    )
  }
}
