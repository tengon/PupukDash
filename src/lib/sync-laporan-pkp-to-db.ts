import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

export async function syncLaporanPkpToDb() {
  let syncedCount = 0

  let filePath = path.join(process.cwd(), 'scraper', 'laporan_item_penyaluran_pkp_full.json')
  if (!fs.existsSync(filePath)) {
    filePath = path.join('d:', 'testGet', 'laporan_item_penyaluran_pkp_full.json')
  }

  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ File laporan_item_penyaluran_pkp_full.json tidak ditemukan.')
    return { success: false, syncedCount: 0 }
  }

  let dataList: any[] = []
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    dataList = JSON.parse(raw).data || []
  } catch (e: any) {
    console.error('❌ Gagal membaca file Laporan PKP JSON:', e.message)
    return { success: false, syncedCount: 0 }
  }

  for (const item of dataList) {
    if (!item.noPkp) continue

    const qtyTon = parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
    const qtyKg = qtyTon * 1000

    try {
      if ((db as any).laporanPkp) {
        await (db as any).laporanPkp.upsert({
          where: {
            noPkp_noPenebusan_kodePengecer_productName: {
              noPkp: item.noPkp,
              noPenebusan: item.noPenebusan || '',
              kodePengecer: item.kodePengecer || '',
              productName: item.produk || 'UREA',
            },
          },
          update: {
            produsen: item.produsen || null,
            distributor: item.distributor || null,
            kodeDistributor: item.kodeDistributor || null,
            tipePenyaluran: item.tipePenyaluran || null,
            kodeSo: item.kodeSo || null,
            tahun: item.tahun || null,
            bulan: item.bulan || null,
            tglPenyaluran: item.tglPenyaluran || null,
            provinsi: item.provinsi || null,
            kabupaten: item.kabupaten || null,
            kecamatan: item.kecamatan || null,
            pengecer: item.pengecer || null,
            quantityTon: qtyTon,
            quantityKg: qtyKg,
            status: item.status || null,
            schemaType: item.schema || null,
            statusIpubers: item.statusIpubers || null,
            rawJson: JSON.stringify(item),
            updatedAt: new Date(),
          },
          create: {
            noPkp: item.noPkp,
            produsen: item.produsen || null,
            distributor: item.distributor || null,
            kodeDistributor: item.kodeDistributor || null,
            tipePenyaluran: item.tipePenyaluran || null,
            noPenebusan: item.noPenebusan || '',
            kodeSo: item.kodeSo || null,
            tahun: item.tahun || null,
            bulan: item.bulan || null,
            tglPenyaluran: item.tglPenyaluran || null,
            provinsi: item.provinsi || null,
            kabupaten: item.kabupaten || null,
            kecamatan: item.kecamatan || null,
            kodePengecer: item.kodePengecer || '',
            pengecer: item.pengecer || null,
            productName: item.produk || 'UREA',
            quantityTon: qtyTon,
            quantityKg: qtyKg,
            status: item.status || null,
            schemaType: item.schema || null,
            statusIpubers: item.statusIpubers || null,
            rawJson: JSON.stringify(item),
          },
        })
        syncedCount++
      }
    } catch (err: any) {
      console.warn(`[Sync Laporan PKP Warn] Gagal upsert ${item.noPkp}:`, err.message)
    }
  }

  console.log(`✅ Sukses sync ${syncedCount} record Laporan Item Penyaluran PKP ke database.`)
  return {
    success: true,
    syncedCount,
    syncedAt: new Date().toISOString(),
  }
}
