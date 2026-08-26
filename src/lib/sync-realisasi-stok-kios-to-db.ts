import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

export async function syncRealisasiStokKiosToDb() {
  let updatedCount = 0

  let filePath = path.join(process.cwd(), 'scraper', 'realisasi_stok_kios_full.json')
  if (!fs.existsSync(filePath)) {
    filePath = path.join('d:', 'testGet', 'realisasi_stok_kios_full.json')
  }

  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ File realisasi_stok_kios_full.json tidak ditemukan.')
    return { success: false, message: 'File realisasi_stok_kios_full.json tidak ditemukan.' }
  }

  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const json = JSON.parse(fileContent)
    const list = json.data || []
    const scrapedAt = json.scraped_at || new Date().toISOString()

    for (const item of list) {
      if (!item.kodeKios || !item.namaProduk) continue

      const stokKg = parseFloat(item.stokKg) || 0
      const stokTon = parseFloat(item.stokTon) || (stokKg / 1000)

      try {
        await (db as any).realisasiStokKios.upsert({
          where: {
            kodeKios_namaProduk: {
              kodeKios: item.kodeKios,
              namaProduk: item.namaProduk,
            },
          },
          update: {
            namaKios: item.namaKios || '',
            kodeProduk: item.kodeProduk || null,
            stokKg: stokKg,
            stokTon: stokTon,
            syncAt: scrapedAt,
            updatedAt: new Date(),
          },
          create: {
            kodeKios: item.kodeKios,
            namaKios: item.namaKios || '',
            kodeProduk: item.kodeProduk || null,
            namaProduk: item.namaProduk,
            stokKg: stokKg,
            stokTon: stokTon,
            syncAt: scrapedAt,
          },
        })
        updatedCount++
      } catch (e: any) {
        console.warn(`[SYNC REALISASI] Error item ${item.kodeKios} - ${item.namaProduk}:`, e.message)
      }
    }

    console.log(`✅ [SYNC REALISASI STOK KIOS] Sukses sync ${updatedCount} data stok kios ke DB.`)
    return {
      success: true,
      updatedCount,
      syncedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('❌ [SYNC REALISASI STOK KIOS] Gagal sync ke DB:', err.message)
    return { success: false, error: err.message }
  }
}
