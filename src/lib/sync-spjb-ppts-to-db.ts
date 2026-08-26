import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

function parseTonValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0
  if (typeof val === 'number') return val
  const str = String(val).trim()
  if (!str || str === '-') return 0

  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0
  }
  if (str.includes('.')) {
    const parts = str.split('.')
    if (parts.length === 2 && parts[1].length !== 3) {
      return parseFloat(str) || 0
    }
  }
  return parseFloat(str) || 0
}

export async function syncSpjbPptsToDb() {
  let updatedPptsCount = 0
  let updatedAllocationCount = 0

  let pptsFilePath = path.join(process.cwd(), 'scraper', 'spjb_ppts_full.json')
  if (!fs.existsSync(pptsFilePath)) {
    pptsFilePath = path.join(process.cwd(), '..', 'spjb_ppts_full.json')
  }

  if (!fs.existsSync(pptsFilePath)) {
    console.warn('⚠️ File spjb_ppts_full.json tidak ditemukan.')
    return { success: false, message: 'File spjb_ppts_full.json tidak ditemukan.' }
  }

  try {
    const fileContent = fs.readFileSync(pptsFilePath, 'utf-8')
    const json = JSON.parse(fileContent)
    const list = json.data || []

    for (const item of list) {
      if (!item.kodePpts) continue

      let realisasiUreaScraped = 0
      let realisasiNpkScraped = 0
      let alokasiUreaScraped = 0
      let alokasiNpkScraped = 0

      const details = item.alokasiDetail || []

      if (details.length > 0) {
        for (const d of details) {
          const prodName = (d.produk || '').trim()
          if (!prodName || prodName.toUpperCase() === 'TOTAL') continue

          const alok = parseTonValue(d.alokasiSpjb)
          const real = parseTonValue(d.realisasi)
          const sisa = parseTonValue(d.sisaAlokasi) || Math.max(0, alok - real)
          const pct = alok > 0 ? (real / alok) * 100 : 0
          const district = d.kecamatan || item.kabupaten || 'Semarang'

          if (prodName.toLowerCase().includes('urea')) {
            realisasiUreaScraped = real
            alokasiUreaScraped = alok
          } else if (prodName.toLowerCase().includes('npk')) {
            realisasiNpkScraped = real
            alokasiNpkScraped = alok
          }

          const cleanProd = prodName.toUpperCase().replace(/\s+/g, '_')
          const allocId = `PPTS-${item.kodePpts}-${cleanProd}`

          // 1. Upsert model Allocation
          try {
            await db.allocation.upsert({
              where: { id: allocId },
              update: {
                spjbNumber: item.nomorSpjb || '',
                pptsName: item.namaPpts || 'Kios PPTS',
                distributorName: item.namaPud || 'CV. ANUGERAH MAKMUR',
                district: district,
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
                district: district,
                productName: prodName.toUpperCase(),
                totalAllocationTon: alok,
                totalRealizationTon: real,
                totalRemainingTon: sisa,
                realizationPct: pct,
                status: item.status || 'Active',
              },
            })
          } catch (e: any) {}

          // 2. Upsert model AlokasiPpts
          try {
            await db.alokasiPpts.upsert({
              where: { id: allocId },
              update: {
                pptsName: item.namaPpts || 'Kios PPTS',
                district: district,
                spjbNumber: item.nomorSpjb || '',
                totalAlokasi: alok,
                totalRealisasi: real,
                totalSisa: sisa,
                realizationPct: pct,
                updatedAt: new Date(),
              },
              create: {
                id: allocId,
                pptsCode: item.kodePpts,
                pptsName: item.namaPpts || 'Kios PPTS',
                district: district,
                address: item.kabupaten || 'Kab. Semarang',
                spjbNumber: item.nomorSpjb || '',
                productName: prodName.toUpperCase(),
                year: '2026',
                totalAlokasi: alok,
                totalRealisasi: real,
                totalSisa: sisa,
                realizationPct: pct,
              },
            })
          } catch (e: any) {}

          updatedAllocationCount++
        }
      }

      // 3. Upsert model Ppts
      try {
        const sisaUrea = Math.max(0, alokasiUreaScraped - realisasiUreaScraped)
        const sisaNpk = Math.max(0, alokasiNpkScraped - realisasiNpkScraped)

        await db.ppts.upsert({
          where: { code: item.kodePpts },
          update: {
            name: item.namaPpts || undefined,
            spjbNumber: item.nomorSpjb || undefined,
            alokasiUrea: alokasiUreaScraped > 0 ? alokasiUreaScraped : undefined,
            realisasiUrea: realisasiUreaScraped,
            sisaUrea: sisaUrea,
            alokasiNpk: alokasiNpkScraped > 0 ? alokasiNpkScraped : undefined,
            realisasiNpk: realisasiNpkScraped,
            sisaNpk: sisaNpk,
            updatedAt: new Date(),
          },
          create: {
            code: item.kodePpts,
            name: item.namaPpts || 'Kios PPTS',
            address: item.kabupaten || 'Kab. Semarang',
            district: item.provinsi || 'Jawa Tengah',
            spjbNumber: item.nomorSpjb || '',
            alokasiUrea: alokasiUreaScraped,
            realisasiUrea: realisasiUreaScraped,
            sisaUrea: sisaUrea,
            alokasiNpk: alokasiNpkScraped,
            realisasiNpk: realisasiNpkScraped,
            sisaNpk: sisaNpk,
          },
        })
        updatedPptsCount++
      } catch (e: any) {}
    }

    console.log(`✅ [SYNC SPJB PPTS] Sukses sync ${updatedPptsCount} PPTS & ${updatedAllocationCount} alokasi ke DB.`)
    return {
      success: true,
      updatedPptsCount,
      updatedAllocationCount,
      syncedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('❌ [SYNC SPJB PPTS] Gagal sync ke DB:', err.message)
    return { success: false, error: err.message }
  }
}
