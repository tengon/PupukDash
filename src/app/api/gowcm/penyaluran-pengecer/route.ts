import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase() || ''

    const filePath = path.join(process.cwd(), 'scraper', 'penyaluran_pengecer_full.json')
    let scrapedAt: string | null = null

    if (fs.existsSync(filePath)) {
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const json = JSON.parse(raw)
        scrapedAt = json.scraped_at || null
      } catch { }
    }

    // Try fetching from Prisma DB (SuratJalan model)
    try {
      if ((db as any).suratJalan) {
        const whereClause = search
          ? {
            OR: [
              { noSuratJalan: { contains: search } },
              { kodeProdusen: { contains: search } },
              { namaProdusen: { contains: search } },
              { kodeDistributor: { contains: search } },
              { namaDistributor: { contains: search } },
              { kabupaten: { contains: search } },
            ],
          }
          : {}

        const dbRecords = await (db as any).suratJalan.findMany({
          where: whereClause,
          include: {
            details: true,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (dbRecords && dbRecords.length > 0) {
          const formatted = dbRecords.map((r: any) => ({
            ...r,
            detail: r.detail ? JSON.parse(r.detail) : null,
          }))

          return NextResponse.json({
            success: true,
            scraped_at: scrapedAt,
            source: 'database',
            total: formatted.length,
            data: formatted,
          })
        }
      }
    } catch (dbErr) {
      console.warn('Fallback to JSON file for Surat Jalan:', dbErr)
    }

    // Fallback to reading JSON file directly
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
        (item.namaProdusen && item.namaProdusen.toLowerCase().includes(search)) ||
        (item.status && item.status.toLowerCase().includes(search)) ||
        (item.kabupaten && item.kabupaten.toLowerCase().includes(search)) ||
        (item.kodeDistributor && item.kodeDistributor.toLowerCase().includes(search)) ||
        (item.namaDistributor && item.namaDistributor.toLowerCase().includes(search)) ||
        (item.tglSuratJalan && item.tglSuratJalan.toLowerCase().includes(search)) ||
        (item.tglDiubah && item.tglDiubah.toLowerCase().includes(search))
      )
    }

    return NextResponse.json({
      success: true,
      scraped_at: json.scraped_at || null,
      source: 'json',
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
