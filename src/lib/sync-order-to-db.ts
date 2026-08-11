import fs from 'fs'
import path from 'path'
import { db } from '@/lib/db'

export async function syncOrderToDb() {
  let syncedCount = 0

  let combinedFilePath = path.join(process.cwd(), 'scraper', 'order_full.json')
  if (!fs.existsSync(combinedFilePath)) {
    combinedFilePath = path.join('d:', 'testGet', 'order_full.json')
  }

  let moFilePath = path.join(process.cwd(), 'scraper', 'monitoring_order_full.json')
  if (!fs.existsSync(moFilePath)) {
    moFilePath = path.join('d:', 'testGet', 'monitoring_order_full.json')
  }

  let doFilePath = path.join(process.cwd(), 'scraper', 'monitoring_do_full.json')
  if (!fs.existsSync(doFilePath)) {
    doFilePath = path.join('d:', 'testGet', 'monitoring_do_full.json')
  }

  // Map DO items by noPenebusan or kodeSo
  const doMap = new Map<string, any>()
  if (fs.existsSync(doFilePath)) {
    try {
      const doContent = fs.readFileSync(doFilePath, 'utf-8')
      const doJson = JSON.parse(doContent)
      const doList = doJson.data || []
      doList.forEach((item: any) => {
        if (item.noPenebusan) doMap.set(item.noPenebusan.trim(), item)
        if (item.kodeSo) doMap.set(item.kodeSo.trim(), item)
      })
    } catch (e: any) {
      console.warn('[Sync Order Warn] Failed reading DO json:', e.message)
    }
  }

  let orderList: any[] = []

  if (fs.existsSync(combinedFilePath)) {
    try {
      const content = fs.readFileSync(combinedFilePath, 'utf-8')
      orderList = JSON.parse(content).data || []
    } catch (e: any) {}
  }

  if (orderList.length === 0 && fs.existsSync(moFilePath)) {
    try {
      const content = fs.readFileSync(moFilePath, 'utf-8')
      orderList = JSON.parse(content).data || []
    } catch (e: any) {}
  }

  for (const ord of orderList) {
    if (!ord.noPenebusan) continue

    const matchingDo = doMap.get(ord.noPenebusan.trim()) || doMap.get((ord.kodeSo || '').trim())

    const kodeSo = ord.kodeSo || matchingDo?.kodeSo || ord.kodeBooking || null
    const nomorDo = ord.nomorDo || matchingDo?.nomorDo || null
    const tglDo = ord.tglDo || matchingDo?.tanggalDo || null
    const prodName = ord.namaProduk || matchingDo?.namaProduk || ord.detail?.itemsTable?.rows?.[0]?.[1] || 'UREA'
    const qtyKgStr = ord.qtyKg || matchingDo?.qty || ord.detail?.itemsTable?.rows?.[0]?.[2] || '0'
    const qtyKg = parseFloat(String(qtyKgStr).replace(/\./g, '').replace(',', '.')) || 0
    const qtyTon = qtyKg > 0 ? qtyKg / 1000 : 0

    try {
      if ((db as any).orderGow) {
        await (db as any).orderGow.upsert({
          where: { noPenebusan: ord.noPenebusan },
          update: {
            kodeReferensi: ord.kodeReferensi || null,
            distributorName: ord.namaDistributor || null,
            producerName: ord.namaProdusen || null,
            kodeBooking: ord.kodeBooking || null,
            batasAkhir: ord.batasAkhir || null,
            tglPengambilan: ord.tglPengambilan || null,
            tglRencana: ord.tglRencana || null,
            tglOrder: ord.tglOrder || null,
            status: ord.status || null,
            kodeSo: kodeSo,
            nomorDo: nomorDo,
            productName: prodName,
            quantityKg: qtyKg,
            quantityTon: qtyTon,
            tglDo: tglDo,
            rawJson: JSON.stringify({ ...ord, kodeSo, nomorDo, namaProduk: prodName, qtyKg: qtyKg.toString(), tglDo }),
            updatedAt: new Date(),
          },
          create: {
            noPenebusan: ord.noPenebusan,
            kodeReferensi: ord.kodeReferensi || null,
            distributorName: ord.namaDistributor || null,
            producerName: ord.namaProdusen || null,
            kodeBooking: ord.kodeBooking || null,
            batasAkhir: ord.batasAkhir || null,
            tglPengambilan: ord.tglPengambilan || null,
            tglRencana: ord.tglRencana || null,
            tglOrder: ord.tglOrder || null,
            status: ord.status || null,
            kodeSo: kodeSo,
            nomorDo: nomorDo,
            productName: prodName,
            quantityKg: qtyKg,
            quantityTon: qtyTon,
            tglDo: tglDo,
            rawJson: JSON.stringify({ ...ord, kodeSo, nomorDo, namaProduk: prodName, qtyKg: qtyKg.toString(), tglDo }),
          },
        })
        syncedCount++
      }
    } catch (e: any) {
      console.warn(`[Sync Order Warn] Failed upsert ${ord.noPenebusan}:`, e.message)
    }
  }

  console.log(`✅ Sukses sync ${syncedCount} record Order (Monitoring Order + DO) ke database.`)
  return {
    success: true,
    syncedCount,
    syncedAt: new Date().toISOString(),
  }
}
