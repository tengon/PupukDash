import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const noSuratJalan = searchParams.get('noSuratJalan') || ''

    if (!noSuratJalan) {
      return NextResponse.json(
        { success: false, error: 'Parameter noSuratJalan wajib diisi' },
        { status: 400 }
      )
    }

    // Try fetching from Prisma DB (SuratJalanDetail model)
    try {
      if ((db as any).suratJalanDetail) {
        const details = await (db as any).suratJalanDetail.findMany({
          where: { noSuratJalan },
          orderBy: { createdAt: 'asc' },
        })

        if (details && details.length > 0) {
          return NextResponse.json({
            success: true,
            source: 'database',
            total: details.length,
            data: details,
          })
        }
      }
    } catch (dbErr) {
      console.warn('Fallback to JSON file for Detail Surat Jalan:', dbErr)
    }

    // Fallback to JSON file
    const filePath = path.join(process.cwd(), 'scraper', 'detail_surat_jalan_full.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const json = JSON.parse(raw)
      const items = json.data || []

      const foundItem = items.find((it: any) => it.noSuratJalan === noSuratJalan)
      if (foundItem) {
        const detailsList = Array.isArray(foundItem.details) ? foundItem.details : []
        return NextResponse.json({
          success: true,
          source: 'json',
          total: detailsList.length,
          data: detailsList,
          itemInfo: foundItem,
        })
      }
    }

    return NextResponse.json({
      success: true,
      source: 'none',
      total: 0,
      data: [],
      message: `Tidak ada data detail untuk Surat Jalan ${noSuratJalan}`,
    })
  } catch (error: any) {
    console.error('Error fetching Detail Surat Jalan:', error)
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil Detail Surat Jalan', details: error.message },
      { status: 500 }
    )
  }
}
