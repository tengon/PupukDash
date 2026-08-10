import fs from 'fs'
import path from 'path'
import { db } from './db'

export async function syncAnnualTotalToDb() {
  console.log('🔄 Memulai sinkronisasi Total Alokasi Tahunan ke SQLite Database (Tabel Ppts & Allocation)...')
  let updatedPptsCount = 0
  let updatedAllocationCount = 0

  // 1. Sync SPJB PPTS (Alokasi Tahunan per Kios PPTS)
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
          const prodName = (row[1] || '').trim()
          const alok = parseFloat(row[2]) || 0
          const real = parseFloat(row[3]) || 0
          const sisa = parseFloat(row[4]) || (alok - real)
          const pctStr = (row[5] || '0').replace('%', '').trim()
          const pct = parseFloat(pctStr) || (alok > 0 ? (real / alok) * 100 : 0)

          if (prodName.toLowerCase().includes('urea')) {
            alokasiUrea = alok
            realisasiUrea = real
            sisaUrea = sisa
          } else if (prodName.toLowerCase().includes('npk')) {
            alokasiNpk = alok
            realisasiNpk = real
            sisaNpk = sisa
          }

          if (prodName) {
            // Upsert ke tabel Allocation (PPTS)
            const allocId = `PPTS-${item.kodePpts}-${prodName.toUpperCase().replace(/\s+/g, '_')}`
            await db.allocation.upsert({
              where: { id: allocId },
              update: {
                spjbNumber: item.nomorSpjb || undefined,
                pptsName: item.namaPpts || undefined,
                distributorName: item.namaPud || 'CV. ANUGERAH MAKMUR',
                district: item.kabupaten || 'Kab. Semarang',
                productName: prodName.toUpperCase(),
                totalAllocationTon: alok,
                totalRealizationTon: real,
                totalRemainingTon: sisa,
                realizationPct: pct,
                status: item.status || 'Active',
                updatedAt: new Date(),
              },
              create: {
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
            updatedAllocationCount++
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
      console.log(`✅ Sukses update ${updatedPptsCount} Kios PPTS dan ${updatedAllocationCount} rekap alokasi PPTS.`)
    } catch (err: any) {
      console.error('⚠️ Gagal sync SPJB PPTS ke DB:', err.message)
    }
  }

  // 2. Sync SPJB Operasional (Alokasi Rincian Bulanan & Total PUD)
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
          const regionProd = (row[1] || '').trim() // e.g. "Tuntang - UREA"
          if (!regionProd || regionProd === '-' || regionProd.toLowerCase().includes('total')) continue

          const parts = regionProd.split('-').map(s => s.trim())
          const district = parts[0] || 'Kudus'
          const prodName = (parts[1] || 'UREA').toUpperCase()

          // Index parse (setiap bulan ada 4 kolom: Alokasi, SO, SO Approve, Sisa)
          const parseVal = (idx: number) => parseFloat((row[idx] || '0').replace('.', '').replace(',', '.')) || 0

          const janAlloc = parseVal(2); const janReal = parseVal(4)
          const febAlloc = parseVal(6); const febReal = parseVal(8)
          const marAlloc = parseVal(10); const marReal = parseVal(12)
          const aprAlloc = parseVal(14); const aprReal = parseVal(16)
          const mayAlloc = parseVal(18); const mayReal = parseVal(20)
          const junAlloc = parseVal(22); const junReal = parseVal(24)
          const julAlloc = parseVal(26); const julReal = parseVal(28)
          const augAlloc = parseVal(30); const augReal = parseVal(32)
          const sepAlloc = parseVal(34); const sepReal = parseVal(36)
          const octAlloc = parseVal(38); const octReal = parseVal(40)
          const novAlloc = parseVal(42); const novReal = parseVal(44)
          const decAlloc = parseVal(46); const decReal = parseVal(48)

          const totalAlloc = parseVal(50) || (janAlloc + febAlloc + marAlloc + aprAlloc + mayAlloc + junAlloc + julAlloc + augAlloc + sepAlloc + octAlloc + novAlloc + decAlloc)
          const totalReal = parseVal(52) || (janReal + febReal + marReal + aprReal + mayReal + junReal + julReal + augReal + sepReal + octReal + novReal + decReal)
          const totalRemaining = parseVal(53) || (totalAlloc - totalReal)
          const pct = totalAlloc > 0 ? (totalReal / totalAlloc) * 100 : 0

          const allocId = `OP-${item.nomorSpjb ? item.nomorSpjb.replace(/[^A-Za-z0-9]/g, '_') : 'SPJB'}-${district}-${prodName}`

          await db.allocation.upsert({
            where: { id: allocId },
            update: {
              year: item.tahun || '2026',
              type: 'OPERASIONAL',
              spjbNumber: item.nomorSpjb || undefined,
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
              updatedAt: new Date(),
            },
            create: {
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
          updatedAllocationCount++
        }
      }
      console.log(`✅ Sukses update alokasi operasional PUD ke tabel Allocation. Total record: ${updatedAllocationCount}`)
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
