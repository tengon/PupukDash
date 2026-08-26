import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

export async function syncSpjbOperasionalToDb() {
  let updatedAllocationCount = 0

  let opFilePath = path.join(process.cwd(), 'scraper', 'spjb_operasional_full.json')
  if (!fs.existsSync(opFilePath)) {
    opFilePath = path.join(process.cwd(), '..', 'spjb_operasional_full.json')
  }

  if (!fs.existsSync(opFilePath)) {
    console.warn('⚠️ File spjb_operasional_full.json tidak ditemukan.')
    return { success: false, message: 'File spjb_operasional_full.json tidak ditemukan.' }
  }

  try {
    const fileContent = fs.readFileSync(opFilePath, 'utf-8')
    const json = JSON.parse(fileContent)
    const list = json.data || []

    for (const item of list) {
      const details = item.detailPerKecamatan || []

      for (const d of details) {
        const district = d.kecamatan || ''
        const prodName = (d.produk || 'UREA').toUpperCase()
        if (prodName === 'TOTAL' || !district || district === '-') continue

        const totalAlok = Number(d.totalAlokasi) || 0
        const totalSo = Number(d.totalSo) || 0
        const totalReal = Number(d.totalSoApprove) || 0
        const totalSisa = Number(d.totalSisa) || Math.max(0, totalAlok - totalReal)
        const realPct = totalAlok > 0 ? (totalReal / totalAlok) * 100 : 0
        const sisaPct = totalAlok > 0 ? (totalSisa / totalAlok) * 100 : 0

        const cleanDistrict = district.replace(/\s+/g, '_')
        const cleanProd = prodName.replace(/\s+/g, '_')
        const spjbClean = item.nomorSpjb ? item.nomorSpjb.replace(/[^A-Za-z0-9]/g, '_') : 'SPJB'
        const baseKey = `${spjbClean}-${cleanDistrict}-${cleanProd}`
        const allocId = `OP-${baseKey}`

        // 1. Sync model Allocation
        try {
          await db.allocation.upsert({
            where: { id: allocId },
            update: {
              spjbNumber: item.nomorSpjb || '',
              distributorName: item.namaPud || 'CV. ANUGERAH MAKMUR',
              district: district,
              totalAllocationTon: totalAlok,
              totalRealizationTon: totalReal,
              totalApprovedSoTon: totalReal,
              totalRemainingTon: totalSisa,
              realizationPct: realPct,
              status: item.status || 'Active',
              updatedAt: new Date(),
            },
            create: {
              id: allocId,
              year: '2026',
              type: 'OPERASIONAL',
              spjbNumber: item.nomorSpjb || '',
              distributorName: item.namaPud || 'CV. ANUGERAH MAKMUR',
              producerName: 'PT Pupuk Sriwidjaja',
              district: district,
              productName: prodName,
              totalAllocationTon: totalAlok,
              totalRealizationTon: totalReal,
              totalApprovedSoTon: totalReal,
              totalRemainingTon: totalSisa,
              realizationPct: realPct,
              status: item.status || 'Active',
            },
          })
        } catch (e: any) {}

        // 2. Sync model AlokasiTahunanKecamatan
        const thkId = `THK-${baseKey}`
        try {
          await db.alokasiTahunanKecamatan.upsert({
            where: { id: thkId },
            update: {
              spjbNumber: item.nomorSpjb || '',
              totalAlokasi: totalAlok,
              totalSo: totalSo,
              totalSoApprove: totalReal,
              totalSisa: totalSisa,
              realizationPct: realPct,
              sisaPct: sisaPct,
              updatedAt: new Date(),
            },
            create: {
              id: thkId,
              spjbNumber: item.nomorSpjb || '',
              district: district,
              productName: prodName,
              year: '2026',
              totalAlokasi: totalAlok,
              totalSo: totalSo,
              totalSoApprove: totalReal,
              totalSisa: totalSisa,
              realizationPct: realPct,
              sisaPct: sisaPct,
            },
          })
        } catch (e: any) {}

        updatedAllocationCount++
      }
    }

    console.log(`✅ [SYNC SPJB OPERASIONAL] Sukses sync ${updatedAllocationCount} alokasi operasional ke DB.`)
    return {
      success: true,
      updatedAllocationCount,
      syncedAt: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error('❌ [SYNC SPJB OPERASIONAL] Gagal sync ke DB:', err.message)
    return { success: false, error: err.message }
  }
}
