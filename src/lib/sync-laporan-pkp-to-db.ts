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

  // Load Order map to lookup tglSo
  const orderMap = new Map<string, string>()
  let orderPath = path.join(process.cwd(), 'scraper', 'order_full.json')
  if (fs.existsSync(orderPath)) {
    try {
      const rawOrd = fs.readFileSync(orderPath, 'utf-8')
      const ordList = JSON.parse(rawOrd).data || []
      ordList.forEach((o: any) => {
        if (o.noPenebusan && o.tglOrder) orderMap.set(o.noPenebusan.trim(), o.tglOrder)
        if (o.kodeSo && o.tglOrder) orderMap.set(o.kodeSo.trim(), o.tglOrder)
      })
    } catch (e) {}
  }

  let poPath = path.join(process.cwd(), 'scraper', 'penyaluran_pemenuhan_order_kios_full.json')
  if (fs.existsSync(poPath)) {
    try {
      const rawPo = fs.readFileSync(poPath, 'utf-8')
      const poList = JSON.parse(rawPo).data || []
      poList.forEach((p: any) => {
        if (p.noOrderPengecer && p.tanggalPenyaluran) orderMap.set(p.noOrderPengecer.trim(), p.tanggalPenyaluran)
        if (p.kodeSo && p.tanggalPenyaluran) orderMap.set(p.kodeSo.trim(), p.tanggalPenyaluran)
      })
    } catch (e) {}
  }

  let dataList: any[] = []
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    dataList = JSON.parse(raw).data || []
  } catch (e: any) {
    console.error('❌ Gagal membaca file Laporan PKP JSON:', e.message)
    return { success: false, syncedCount: 0 }
  }

  const modelClient = (db as any).tablePkp || (db as any).laporanPkp

  for (const item of dataList) {
    if (!item.noPkp) continue

    const qtyTon = parseFloat(String(item.qtyTon || '0').replace(/\./g, '').replace(',', '.')) || 0
    const qtyKg = qtyTon * 1000

    const tglSo = item.tglSo || orderMap.get((item.noPenebusan || '').trim()) || orderMap.get((item.kodeSo || '').trim()) || item.tglPenyaluran || ''

    try {
      if (modelClient) {
        await modelClient.upsert({
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
            tglSo: tglSo || null,
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
            rawJson: JSON.stringify({ ...item, tglSo }),
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
            tglSo: tglSo || null,
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
            rawJson: JSON.stringify({ ...item, tglSo }),
          },
        })
        syncedCount++
      }
    } catch (err: any) {
      console.warn(`[Sync Table PKP Warn] Gagal upsert ${item.noPkp}:`, err.message)
    }
  }

  console.log(`✅ Sukses sync ${syncedCount} record Laporan Item Penyaluran PKP ke tabel table_pkp di database.`)
  return {
    success: true,
    syncedCount,
    syncedAt: new Date().toISOString(),
  }
}
