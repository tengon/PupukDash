import fs from 'fs'
import path from 'path'
import { db } from './db'

export async function syncAnnualTotalToDb() {
  console.log('🔄 Memulai sinkronisasi Realisasi GOW CM ke SQLite Database (Proteksi Alokasi Tahunan)...')
  let updatedPptsCount = 0
  let updatedAllocationCount = 0

  // 1. Sync SPJB PPTS (Hanya update Realisasi & Sisa, TIDAK menimpa Total Alokasi yang ada)
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

        let realisasiUreaScraped = 0
        let realisasiNpkScraped = 0

        const rows = item.detail?.alokasiTable?.rows || []
        for (const row of rows) {
          const prodName = (row[1] || '').trim()
          const real = parseFloat(row[3]) || 0

          if (prodName.toLowerCase().includes('urea')) {
            realisasiUreaScraped = real
          } else if (prodName.toLowerCase().includes('npk')) {
            realisasiNpkScraped = real
          }

          if (prodName) {
            const allocId = `PPTS-${item.kodePpts}-${prodName.toUpperCase().replace(/\s+/g, '_')}`
            const existingAlloc = await db.allocation.findUnique({ where: { id: allocId } })

            if (existingAlloc) {
              // RECORD SUDAH ADA: Proteksi nilai Alokasi, HANYA UPDATE Realisasi & Hitung Sisa/Pct baru!
              const currentAlloc = existingAlloc.totalAllocationTon
              const newRemaining = Math.max(0, currentAlloc - real)
              const newPct = currentAlloc > 0 ? (real / currentAlloc) * 100 : 0

              await db.allocation.update({
                where: { id: allocId },
                data: {
                  totalRealizationTon: real,
                  totalRemainingTon: newRemaining,
                  realizationPct: newPct,
                  status: item.status || 'Active',
                  updatedAt: new Date(),
                },
              })
            } else {
              // RECORD BARU: Inisialisasi awal dari scraper
              const alok = parseFloat(row[2]) || 0
              const sisa = Math.max(0, alok - real)
              const pct = alok > 0 ? (real / alok) * 100 : 0

              await db.allocation.create({
                data: {
                  id: allocId,
                  year: '2026',
                  type: 'PPTS',
                  spjbNumber: item.nomorSpjb || '',
                  pptsCode: item.kodePpts,
                  pptsName: item.namaPpts || 'Kios PPTS',
                  distributorName: item.namaPud || 'CV. ANUGERAH MAKMUR',
                  district: item.kabupaten || 'Kab. Semarang',
                  productName: prodName.toUpperCase(),
                  totalAllocationTon: alok,
                  totalRealizationTon: real,
                  totalRemainingTon: sisa,
                  realizationPct: pct,
                  status: item.status || 'Active',
                },
              })
            }
            updatedAllocationCount++
          }
        }

        // Upsert ke tabel Ppts di SQLite Database (Proteksi Alokasi)
        const existingPpts = await db.ppts.findUnique({ where: { code: item.kodePpts } })
        if (existingPpts) {
          const finalAlokUrea = existingPpts.alokasiUrea || 0
          const finalAlokNpk = existingPpts.alokasiNpk || 0

          await db.ppts.update({
            where: { code: item.kodePpts },
            data: {
              name: item.namaPpts || undefined,
              spjbNumber: item.nomorSpjb || undefined,
              realisasiUrea: realisasiUreaScraped,
              sisaUrea: Math.max(0, finalAlokUrea - realisasiUreaScraped),
              realisasiNpk: realisasiNpkScraped,
              sisaNpk: Math.max(0, finalAlokNpk - realisasiNpkScraped),
              updatedAt: new Date(),
            },
          })
        } else {
          const alokUrea = parseFloat(rows.find(r => (r[1]||'').toLowerCase().includes('urea'))?.[2] || '0') || 0
          const alokNpk = parseFloat(rows.find(r => (r[1]||'').toLowerCase().includes('npk'))?.[2] || '0') || 0

          await db.ppts.create({
            data: {
              code: item.kodePpts,
              name: item.namaPpts || 'Kios PPTS',
              address: item.kabupaten || 'Kab. Semarang',
              district: item.kecamatan || 'Kudus',
              spjbNumber: item.nomorSpjb || '',
              alokasiUrea: alokUrea,
              realisasiUrea: realisasiUreaScraped,
              sisaUrea: Math.max(0, alokUrea - realisasiUreaScraped),
              alokasiNpk: alokNpk,
              realisasiNpk: realisasiNpkScraped,
              sisaNpk: Math.max(0, alokNpk - realisasiNpkScraped),
            },
          })
        }
        updatedPptsCount++
      }
      console.log(`✅ Sukses sync Realisasi ke ${updatedPptsCount} PPTS tanpa mengubah Kuota Alokasi yang ada.`)
    } catch (err: any) {
      console.error('⚠️ Gagal sync SPJB PPTS ke DB:', err.message)
    }
  }

  // 2. Sync SPJB Operasional (Hanya update Realisasi & SO, TIDAK menimpa Total Alokasi PUD)
  let opFilePath = path.join(process.cwd(), 'scraper', 'spjb_operasional_full.json')
  if (!fs.existsSync(opFilePath)) {
    opFilePath = path.join('d:', 'testGet', 'spjb_operasional_full.json')
  }

  if (fs.existsSync(opFilePath)) {
    try {
      const content = fs.readFileSync(opFilePath, 'utf-8')
      const json = JSON.parse(content)
      const list = json.data || []

      for (const item of list) {
        const rows = item.detail?.alokasiTable?.rows || []
        for (const row of rows) {
          const regionProd = (row[1] || '').trim()
          if (!regionProd || regionProd === '-' || regionProd.toLowerCase().includes('total')) continue

          const parts = regionProd.split('-').map(s => s.trim())
          const district = parts[0] || 'Kudus'
          const prodName = (parts[1] || 'UREA').toUpperCase()

          const parseVal = (idx: number) => parseFloat((row[idx] || '0').replace(/\./g, '').replace(',', '.')) || 0

          const janReal = parseVal(4); const febReal = parseVal(8); const marReal = parseVal(12)
          const aprReal = parseVal(16); const mayReal = parseVal(20); const junReal = parseVal(24)
          const julReal = parseVal(28); const augReal = parseVal(32); const sepReal = parseVal(36)
          const octReal = parseVal(40); const novReal = parseVal(44); const decReal = parseVal(48)

          const totalReal = parseVal(52) || (janReal + febReal + marReal + aprReal + mayReal + junReal + julReal + augReal + sepReal + octReal + novReal + decReal)

          const allocId = `OP-${item.nomorSpjb ? item.nomorSpjb.replace(/[^A-Za-z0-9]/g, '_') : 'SPJB'}-${district}-${prodName}`
          const existing = await db.allocation.findUnique({ where: { id: allocId } })

          if (existing) {
            // RECORD SUDAH ADA: Proteksi Alokasi Tahunan, update Realisasi
            const currentAlloc = existing.totalAllocationTon
            const newRemaining = Math.max(0, currentAlloc - totalReal)
            const newPct = currentAlloc > 0 ? (totalReal / currentAlloc) * 100 : 0

            await db.allocation.update({
              where: { id: allocId },
              data: {
                totalRealizationTon: totalReal,
                totalApprovedSoTon: totalReal,
                totalRemainingTon: newRemaining,
                realizationPct: newPct,
                janReal, febReal, marReal, aprReal, mayReal, junReal, julReal, augReal, sepReal, octReal, novReal, decReal,
                status: item.status || 'Active',
                updatedAt: new Date(),
              },
            })
          } else {
            // RECORD BARU: Inisialisasi awal
            const janAlloc = parseVal(2); const febAlloc = parseVal(6); const marAlloc = parseVal(10)
            const aprAlloc = parseVal(14); const mayAlloc = parseVal(18); const junAlloc = parseVal(22)
            const julAlloc = parseVal(26); const augAlloc = parseVal(30); const sepAlloc = parseVal(34)
            const octAlloc = parseVal(38); const novAlloc = parseVal(42); const decAlloc = parseVal(46)
            const totalAlloc = parseVal(50) || (janAlloc + febAlloc + marAlloc + aprAlloc + mayAlloc + junAlloc + julAlloc + augAlloc + sepAlloc + octAlloc + novAlloc + decAlloc)
            const totalRemaining = Math.max(0, totalAlloc - totalReal)
            const pct = totalAlloc > 0 ? (totalReal / totalAlloc) * 100 : 0

            await db.allocation.create({
              data: {
                id: allocId,
                year: item.tahun || '2026',
                type: 'OPERASIONAL',
                spjbNumber: item.nomorSpjb || '',
                distributorName: item.distributor || 'CV. ANUGERAH MAKMUR',
                producerName: item.produsen || 'PT Pupuk Sriwidjaja',
                district: district,
                productName: prodName,
                totalAllocationTon: totalAlloc,
                totalRealizationTon: totalReal,
                totalApprovedSoTon: totalReal,
                totalRemainingTon: totalRemaining,
                realizationPct: pct,
                janAlloc, febAlloc, marAlloc, aprAlloc, mayAlloc, junAlloc, julAlloc, augAlloc, sepAlloc, octAlloc, novAlloc, decAlloc,
                janReal, febReal, marReal, aprReal, mayReal, junReal, julReal, augReal, sepReal, octReal, novReal, decReal,
                status: item.status || 'Active',
              },
            })
          }
          updatedAllocationCount++
        }
      }
      console.log(`✅ Sukses update Realisasi alokasi operasional PUD ke database. Total record: ${updatedAllocationCount}`)
    } catch (err: any) {
      console.error('⚠️ Gagal sync SPJB Operasional ke DB:', err.message)
    }
  }

  return {
    success: true,
    updatedPptsCount,
    updatedAllocationCount,
    syncedAt: new Date().toISOString(),
  }
}
