import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

export async function syncDistribusiPoToDb() {
  let syncedCount = 0

  let poFilePath = path.join(process.cwd(), 'scraper', 'penyaluran_pemenuhan_order_kios_full.json')
  if (!fs.existsSync(poFilePath)) {
    poFilePath = path.join('d:', 'testGet', 'penyaluran_pemenuhan_order_kios_full.json')
  }

  let sjFilePath = path.join(process.cwd(), 'scraper', 'penyaluran_surat_jalan_full.json')
  if (!fs.existsSync(sjFilePath)) {
    sjFilePath = path.join('d:', 'testGet', 'penyaluran_surat_jalan_full.json')
  }

  if (!fs.existsSync(poFilePath)) {
    console.warn('⚠️ File penyaluran_pemenuhan_order_kios_full.json tidak ditemukan.')
    return { success: false, syncedCount: 0 }
  }

  let poList: any[] = []
  try {
    const raw = fs.readFileSync(poFilePath, 'utf-8')
    poList = JSON.parse(raw).data || []
  } catch (e: any) {
    console.error('❌ Gagal membaca file PO JSON:', e.message)
    return { success: false, syncedCount: 0 }
  }

  for (const item of poList) {
    if (!item.noOrderPengecer) continue

    const qtyTon = parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
    const qtyKg = qtyTon * 1000

    try {
      if ((db as any).distribusiPo) {
        await (db as any).distribusiPo.upsert({
          where: { noOrderPengecer: item.noOrderPengecer },
          update: {
            noPkp: item.noPkp || null,
            kodePengecer: item.kodePengecer || null,
            namaPengecer: item.namaPengecer || null,
            provinsi: item.provinsi || null,
            kabupaten: item.kabupaten || null,
            kecamatan: item.kecamatan || null,
            kodeSo: item.kodeSo || null,
            status: item.status || null,
            tanggalPenyaluran: item.tanggalPenyaluran || null,
            productName: item.produk || 'UREA',
            quantityTon: qtyTon,
            quantityKg: qtyKg,
            rawJson: JSON.stringify(item),
            updatedAt: new Date(),
          },
          create: {
            noPkp: item.noPkp || null,
            noOrderPengecer: item.noOrderPengecer,
            kodePengecer: item.kodePengecer || null,
            namaPengecer: item.namaPengecer || null,
            provinsi: item.provinsi || null,
            kabupaten: item.kabupaten || null,
            kecamatan: item.kecamatan || null,
            kodeSo: item.kodeSo || null,
            status: item.status || null,
            tanggalPenyaluran: item.tanggalPenyaluran || null,
            productName: item.produk || 'UREA',
            quantityTon: qtyTon,
            quantityKg: qtyKg,
            rawJson: JSON.stringify(item),
          },
        })
        syncedCount++
      }
    } catch (err: any) {
      console.warn(`[Sync Distribusi PO Warn] Gagal upsert ${item.noOrderPengecer}:`, err.message)
    }
  }

  console.log(`✅ Sukses sync ${syncedCount} record Distribusi PO ke database.`)
  return {
    success: true,
    syncedCount,
    syncedAt: new Date().toISOString(),
  }
}
