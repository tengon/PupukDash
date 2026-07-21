import { NextRequest, NextResponse } from 'next/server'
import { db, logActivity } from '@/lib/db'
import { parseFarmerCSV, type FarmerImportRow } from '@/lib/import'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'File CSV wajib diunggah' },
        { status: 400 },
      )
    }

    // Validasi tipe file
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      return NextResponse.json(
        { error: 'File harus berformat CSV (.csv)' },
        { status: 400 },
      )
    }

    // Batas ukuran file 5MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Ukuran file maksimal 5MB' },
        { status: 400 },
      )
    }

    const csvText = await file.text()
    let rows: FarmerImportRow[]

    try {
      rows = await parseFarmerCSV(csvText)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memparse CSV'
      return NextResponse.json(
        { error: message, imported: 0, skipped: 0, errors: [message] },
        { status: 400 },
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data yang dapat diproses', imported: 0, skipped: 0, errors: [] },
        { status: 400 },
      )
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    // Ambil semua NIK yang sudah ada
    const existingFarmers = await db.farmer.findMany({
      select: { nik: true },
    })
    const existingNikSet = new Set(existingFarmers.map((f) => f.nik))

    for (const row of rows) {
      if (!row.valid) {
        errors.push(`Baris ${row.row}: ${row.error}`)
        skipped++
        continue
      }

      if (existingNikSet.has(row.nik)) {
        skipped++
        continue
      }

      try {
        await db.farmer.create({
          data: {
            nik: row.nik,
            name: row.name,
            phone: row.phone || null,
            address: row.address || null,
            village: row.village || null,
            district: row.district || null,
            regency: row.regency || null,
            province: row.province || null,
            landAreaHa: row.landAreaHa ?? null,
            farmerGroup: row.farmerGroup || null,
          },
        })
        existingNikSet.add(row.nik)
        imported++
      } catch {
        errors.push(`Baris ${row.row}: Gagal menyimpan data ${row.name} (NIK: ${row.nik})`)
        skipped++
      }
    }

    // Log aktivitas
    logActivity(
      'IMPORT_FARMERS',
      `Impor CSV petani: ${imported} berhasil, ${skipped} dilewati`,
    )

    return NextResponse.json({
      imported,
      skipped,
      errors,
      total: rows.length,
    })
  } catch (error) {
    console.error('Import farmers error:', error)
    return NextResponse.json(
      { error: 'Gagal mengimpor data petani', imported: 0, skipped: 0, errors: ['Kesalahan server internal'] },
      { status: 500 },
    )
  }
}