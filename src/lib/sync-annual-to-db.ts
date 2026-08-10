import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

export async function syncAnnualTotalToDb() {
  let updatedPptsCount = 0
  let updatedAllocationCount = 0

  // 1. Sync SPJB PPTS (Tabel AlokasiPpts <==> SPJB PPTS)
  let pptsFilePath = path.join(process.cwd(), 'scraper', 'spjb_ppts_full.json')
  if (!fs.existsSync(pptsFilePath)) {
    pptsFilePath = path.join('d:', 'testGet', 'spjb_ppts_full.json')
  }

  if (fs.existsSync(pptsFilePath)) {
    try {
      const fileContent = fs.readFileSync(pptsFilePath, 'utf-8')
      const json = JSON.parse(fileContent)
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
            const cleanProd = prodName.toUpperCase().trim().replace(/\s+/g, '_')
            const allocId = `PPTS-${item.kodePpts}-${cleanProd}`
            const alok = parseFloat(row[2]) || 0
            const sisa = Math.max(0, alok - real)
            const pct = alok > 0 ? (real / alok) * 100 : 0

            // 1. Sync ke model Allocation
            const existingAlloc = await db.allocation.findUnique({ where: { id: allocId } })
            if (existingAlloc) {
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
              try {
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
              } catch (e: any) {}
            }

            // 2. Sync ke model AlokasiPpts (Tabel Alokasi PPTS <==> SPJB PPTS)
            try {
              const existingAlokPpts = await db.alokasiPpts.findUnique({ where: { id: allocId } })
              if (existingAlokPpts) {
                const currentAlok = existingAlokPpts.totalAlokasi
                const sisa = Math.max(0, currentAlok - real)
                const pct = currentAlok > 0 ? (real / currentAlok) * 100 : 0
                await db.alokasiPpts.update({
                  where: { id: allocId },
                  data: {
                    totalRealisasi: real,
                    totalSisa: sisa,
                    realizationPct: pct,
                    updatedAt: new Date(),
                  },
                })
              } else {
                await db.alokasiPpts.create({
                  data: {
                    id: allocId,
                    pptsCode: item.kodePpts,
                    pptsName: item.namaPpts || 'Kios PPTS',
                    district: item.kecamatan || 'Kudus',
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
              }
            } catch (e: any) {}

            updatedAllocationCount++
          }
        }

        // 3. Upsert ke tabel Ppts
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

          try {
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
          } catch (e: any) {}
        }
        updatedPptsCount++
      }
      console.log(`✅ Sukses sync ke 3 tabel PPTS tanpa mengubah Kuota Alokasi yang ada.`)
    } catch (err: any) {
      console.error('⚠️ Gagal sync SPJB PPTS ke DB:', err.message)
    }
  }

  // 2. Sync SPJB Operasional (Alokasi Bulanan & Alokasi Tahunan Kecamatan)
  let opFilePath = path.join(process.cwd(), 'scraper', 'spjb_operasional_full.json')
  if (!fs.existsSync(opFilePath)) {
    opFilePath = path.join('d:', 'testGet', 'spjb_operasional_full.json')
  }

  if (fs.existsSync(opFilePath)) {
    try {
      const fileContent = fs.readFileSync(opFilePath, 'utf-8')
      const json = JSON.parse(fileContent)
      const list = json.data || []

      for (const item of list) {
        const rows = item.detail?.alokasiTable?.rows || []
        for (const row of rows) {
          const regionProd = row[1] || ''
          if (!regionProd || regionProd === '-' || regionProd.toLowerCase().includes('total')) continue

          const parts = regionProd.split('-').map(s => s.trim())
          const district = parts[0] || 'Kudus'
          const prodName = (parts[1] || 'UREA').toUpperCase()

          const parseVal = (idx: number) => parseFloat((row[idx] || '0').replace(/\./g, '').replace(',', '.')) || 0

          // Monthly values (Jan - Des: Alloc, SO, Real/Approve, Sisa)
          const janAlloc = parseVal(2); const janSo = parseVal(3); const janReal = parseVal(4); const janSisa = parseVal(5)
          const febAlloc = parseVal(6); const febSo = parseVal(7); const febReal = parseVal(8); const febSisa = parseVal(9)
          const marAlloc = parseVal(10); const marSo = parseVal(11); const marReal = parseVal(12); const marSisa = parseVal(13)
          const aprAlloc = parseVal(14); const aprSo = parseVal(15); const aprReal = parseVal(16); const aprSisa = parseVal(17)
          const mayAlloc = parseVal(18); const maySo = parseVal(19); const mayReal = parseVal(20); const maySisa = parseVal(21)
          const junAlloc = parseVal(22); const junSo = parseVal(23); const junReal = parseVal(24); const junSisa = parseVal(25)
          const julAlloc = parseVal(26); const julSo = parseVal(27); const julReal = parseVal(28); const julSisa = parseVal(29)
          const augAlloc = parseVal(30); const augSo = parseVal(31); const augReal = parseVal(32); const augSisa = parseVal(33)
          const sepAlloc = parseVal(34); const sepSo = parseVal(35); const sepReal = parseVal(36); const sepSisa = parseVal(37)
          const octAlloc = parseVal(38); const octSo = parseVal(39); const octReal = parseVal(40); const octSisa = parseVal(41)
          const novAlloc = parseVal(42); const novSo = parseVal(43); const novReal = parseVal(44); const novSisa = parseVal(45)
          const decAlloc = parseVal(46); const decSo = parseVal(47); const decReal = parseVal(48); const decSisa = parseVal(49)

          // Annual values (Total Alokasi, Total SO, Total SO Approve, Total Sisa)
          const totalAlok = parseVal(50)
          const totalSo = parseVal(51)
          const totalReal = parseVal(52) || (janReal + febReal + marReal + aprReal + mayReal + junReal + julReal + augReal + sepReal + octReal + novReal + decReal)
          const totalSisa = parseVal(53) || Math.max(0, totalAlok - totalReal)
          const realPct = totalAlok > 0 ? (totalReal / totalAlok) * 100 : 0
          const sisaPct = totalAlok > 0 ? (totalSisa / totalAlok) * 100 : 0

          const cleanDistrict = district.replace(/\s+/g, '_')
          const cleanProd = prodName.replace(/\s+/g, '_')
          const baseKey = `${item.nomorSpjb ? item.nomorSpjb.replace(/[^A-Za-z0-9]/g, '_') : 'SPJB'}-${cleanDistrict}-${cleanProd}`
          const allocId = `OP-${baseKey}`

          // 1. Sync ke model Allocation (Proteksi Alokasi Tahunan)
          const existing = await db.allocation.findUnique({ where: { id: allocId } })
          if (existing) {
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
            try {
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
                  totalAllocationTon: totalAlok,
                  totalRealizationTon: totalReal,
                  totalApprovedSoTon: totalReal,
                  totalRemainingTon: totalSisa,
                  realizationPct: realPct,
                  janAlloc, febAlloc, marAlloc, aprAlloc, mayAlloc, junAlloc, julAlloc, augAlloc, sepAlloc, octAlloc, novAlloc, decAlloc,
                  janReal, febReal, marReal, aprReal, mayReal, junReal, julReal, augReal, sepReal, octReal, novReal, decReal,
                  status: item.status || 'Active',
                },
              })
            } catch (e: any) {}
          }

          // 2. TABEL 1: AlokasiBulananKecamatan (Jan - Des)
          const blkId = `BLK-${baseKey}`
          try {
            const existingBlk = await db.alokasiBulananKecamatan.findUnique({ where: { id: blkId } })
            if (existingBlk) {
              await db.alokasiBulananKecamatan.update({
                where: { id: blkId },
                data: {
                  janSo, janReal, janSisa,
                  febSo, febReal, febSisa,
                  marSo, marReal, marSisa,
                  aprSo, aprReal, aprSisa,
                  maySo, mayReal, maySisa,
                  junSo, junReal, junSisa,
                  julSo, julReal, julSisa,
                  augSo, augReal, augSisa,
                  sepSo, sepReal, sepSisa,
                  octSo, octReal, octSisa,
                  novSo, novReal, novSisa,
                  decSo, decReal, decSisa,
                  updatedAt: new Date(),
                },
              })
            } else {
              await db.alokasiBulananKecamatan.create({
                data: {
                  id: blkId,
                  spjbNumber: item.nomorSpjb || '',
                  district: district,
                  productName: prodName,
                  year: item.tahun || '2026',
                  janAlloc, janSo, janReal, janSisa,
                  febAlloc, febSo, febReal, febSisa,
                  marAlloc, marSo, marReal, marSisa,
                  aprAlloc, aprSo, aprReal, aprSisa,
                  mayAlloc, maySo, mayReal, maySisa,
                  junAlloc, junSo, junReal, junSisa,
                  julAlloc, julSo, julReal, julSisa,
                  augAlloc, augSo, augReal, augSisa,
                  sepAlloc, sepSo, sepReal, sepSisa,
                  octAlloc, octSo, octReal, octSisa,
                  novAlloc, novSo, novReal, novSisa,
                  decAlloc, decSo, decReal, decSisa,
                },
              })
            }
          } catch (e: any) {}

          // 3. TABEL 2: AlokasiTahunanKecamatan (Total Alokasi - Total SO - Total SO Approve - Total Sisa)
          const thkId = `THK-${baseKey}`
          try {
            const existingThk = await db.alokasiTahunanKecamatan.findUnique({ where: { id: thkId } })
            if (existingThk) {
              const currentAlok = existingThk.totalAlokasi
              const newSisa = Math.max(0, currentAlok - totalReal)
              const newRealPct = currentAlok > 0 ? (totalReal / currentAlok) * 100 : 0
              const newSisaPct = currentAlok > 0 ? (newSisa / currentAlok) * 100 : 0

              await db.alokasiTahunanKecamatan.update({
                where: { id: thkId },
                data: {
                  totalSo,
                  totalSoApprove: totalReal,
                  totalSisa: newSisa,
                  realizationPct: newRealPct,
                  sisaPct: newSisaPct,
                  updatedAt: new Date(),
                },
              })
            } else {
              await db.alokasiTahunanKecamatan.create({
                data: {
                  id: thkId,
                  spjbNumber: item.nomorSpjb || '',
                  district: district,
                  productName: prodName,
                  year: item.tahun || '2026',
                  totalAlokasi: totalAlok,
                  totalSo,
                  totalSoApprove: totalReal,
                  totalSisa,
                  realizationPct: realPct,
                  sisaPct,
                },
              })
            }
          } catch (e: any) {}

          updatedAllocationCount++
        }
      }
      console.log(`✅ Sukses update 3 tabel alokasi operasional PUD ke database. Total record: ${updatedAllocationCount}`)
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
