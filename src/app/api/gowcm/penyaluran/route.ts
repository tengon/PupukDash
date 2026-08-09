import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    let filePath = path.join(process.cwd(), 'scraper', 'penyaluran_full.json')
    if (!fs.existsSync(filePath)) {
      filePath = path.join('d:', 'testGet', 'penyaluran_full.json')
    }

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({
        total: 0,
        data: [],
        summary: {},
        updated_at: null,
      })
    }

    const fileContent = fs.readFileSync(filePath, 'utf8')
    const json = JSON.parse(fileContent)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''
    const status = searchParams.get('status') || 'ALL'
    const kecamatan = searchParams.get('kecamatan') || 'ALL'
    const produk = searchParams.get('produk') || 'ALL'

    let orders = json.orders_terintegrasi || []

    if (search) {
      orders = orders.filter((o: any) =>
        (o.nomorOrder || '').toLowerCase().includes(search) ||
        (o.namaPengecer || '').toLowerCase().includes(search) ||
        (o.kodePengecer || '').toLowerCase().includes(search) ||
        (o.kecamatan || '').toLowerCase().includes(search) ||
        (o.detailPemenuhan || []).some((p: any) =>
          (p.noPkp || '').toLowerCase().includes(search) ||
          (p.kodeSo || '').toLowerCase().includes(search)
        )
      )
    }

    if (status !== 'ALL') {
      orders = orders.filter((o: any) =>
        (o.statusOrder || '').toUpperCase() === status.toUpperCase()
      )
    }

    if (kecamatan !== 'ALL') {
      orders = orders.filter((o: any) =>
        (o.kecamatan || '').toLowerCase().includes(kecamatan.toLowerCase())
      )
    }

    if (produk !== 'ALL') {
      orders = orders.filter((o: any) =>
        (o.detailPemenuhan || []).some((p: any) =>
          (p.produk || '').toLowerCase().includes(produk.toLowerCase())
        )
      )
    }

    return NextResponse.json({
      total: orders.length,
      data: orders,
      summary: json.summary || {},
      updated_at: json.updated_at || null,
    })
  } catch (error) {
    console.error('Error fetching GOW CM Penyaluran:', error)
    return NextResponse.json(
      { error: 'Gagal memuat data penyaluran GOW CM' },
      { status: 500 }
    )
  }
}
