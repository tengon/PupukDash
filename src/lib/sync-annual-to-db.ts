import fs from 'fs'
import path from 'path'
import { db } from './db'

export async function syncAnnualTotalToDb() {
  console.log('🔄 Memulai sinkronisasi Total Alokasi Tahunan ke SQLite Database...')
  let updatedPptsCount = 0

  // 1. Sync SPJB PPTS (Alokasi, Realisasi, & Sisa Tahunan per Kios PPTS)
  let pptsFilePath = path.join(process.cwd(), 'scraper', 'spjb_ppts_full.json')
  if (!fs.existsSync(pptsFilePath)) {
    pptsFilePath = path.join('d:', 'testGet', 'spjb_ppts_full.json')
  }

  if (fs.existsSync(pptsFilePath)) {
    try {
      const content = fs.readFileSync(pptsFilePath, 'utf-8')
      const json = JSON.parse(content)
      const list = json.data || []

      for (const item of list) {
        if (!item.kodePpts) continue

        let alokasiUrea = 0
        let realisasiUrea = 0
        let sisaUrea = 0

        let alokasiNpk = 0
        let realisasiNpk = 0
        let sisaNpk = 0

        // Parse tabel alokasi detail (Urea & NPK)
        const rows = item.detail?.alokasiTable?.rows || []
        for (const row of rows) {
          const prodName = (row[1] || '').toLowerCase()
          const alok = parseFloat(row[2]) || 0
          const real = parseFloat(row[3]) || 0
          const sisa = parseFloat(row[4]) || (alok - real)

          if (prodName.includes('urea')) {
            alokasiUrea = alok
            realisasiUrea = real
            sisaUrea = sisa
          } else if (prodName.includes('npk')) {
            alokasiNpk = alok
            realisasiNpk = real
            sisaNpk = sisa
          }
        }

        // Upsert ke tabel Ppts di SQLite Database
        await db.ppts.upsert({
          where: { code: item.kodePpts },
          update: {
            name: item.namaPpts || undefined,
            spjbNumber: item.nomorSpjb || undefined,
            alokasiUrea: alokasiUrea > 0 ? alokasiUrea : undefined,
            realisasiUrea: realisasiUrea >= 0 ? realisasiUrea : undefined,
            sisaUrea: sisaUrea >= 0 ? sisaUrea : undefined,
            alokasiNpk: alokasiNpk > 0 ? alokasiNpk : undefined,
            realisasiNpk: realisasiNpk >= 0 ? realisasiNpk : undefined,
            sisaNpk: sisaNpk >= 0 ? sisaNpk : undefined,
            updatedAt: new Date(),
          },
          create: {
            code: item.kodePpts,
            name: item.namaPpts || 'Kios PPTS',
            address: item.kabupaten || 'Kab. Semarang',
            district: item.kecamatan || 'Kudus',
            spjbNumber: item.nomorSpjb || '',
            alokasiUrea: alokasiUrea,
            realisasiUrea: realisasiUrea,
            sisaUrea: sisaUrea,
            alokasiNpk: alokasiNpk,
            realisasiNpk: realisasiNpk,
            sisaNpk: sisaNpk,
          },
        })
        updatedPptsCount++
      }
      console.log(`✅ Sukses update ${updatedPptsCount} Kios PPTS ke database.`)
    } catch (err: any) {
      console.error('⚠️ Gagal sync SPJB PPTS ke DB:', err.message)
    }
  } else {
    console.log('ℹ️ File spjb_ppts_full.json belum ditemukan.')
  }

  return {
    success: true,
    updatedPptsCount,
    syncedAt: new Date().toISOString(),
  }
}
