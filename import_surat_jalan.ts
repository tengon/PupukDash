import { db } from './src/lib/db'
import fs from 'fs'
import path from 'path'

async function main() {
  const filePath = path.join(process.cwd(), 'scraper', 'penyaluran_pengecer_full.json')
  if (!fs.existsSync(filePath)) {
    console.error('File penyaluran_pengecer_full.json tidak ditemukan!')
    return
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const json = JSON.parse(raw)
  const items = json.data || []

  console.log(`Memeriksa ${items.length} Surat Jalan dari hasil scraper...`)

  // Ambil daftar No. Surat Jalan yang sudah tersimpan di DB
  const existingRecords = await (db as any).suratJalan.findMany({
    select: { noSuratJalan: true },
  })
  const existingSet = new Set(existingRecords.map((r: any) => r.noSuratJalan))

  let insertedCount = 0
  let skippedCount = 0

  for (const item of items) {
    if (!item.noSuratJalan) continue

    // Jika noSuratJalan sudah ada di database, lewati
    if (existingSet.has(item.noSuratJalan)) {
      skippedCount++
      continue
    }

    const detailStr = item.detail ? JSON.stringify(item.detail) : null

    await (db as any).suratJalan.create({
      data: {
        noSuratJalan: item.noSuratJalan,
        uuid: item.uuid || null,
        kodeDistributor: item.kodeDistributor || null,
        namaDistributor: item.namaDistributor || null,
        provinsi: item.provinsi || null,
        kabupaten: item.kabupaten || null,
        kodeProdusen: item.kodeProdusen || null,
        namaProdusen: item.namaProdusen || null,
        status: item.status || null,
        tglSuratJalan: item.tglSuratJalan || null,
        tglDibuat: item.tglDibuat || null,
        tglDiubah: item.tglDiubah || null,
        href: item.href || null,
        detail: detailStr,
      },
    })

    existingSet.add(item.noSuratJalan)
    insertedCount++
  }

  console.log(`✅ Selesai! ${insertedCount} Surat Jalan baru berhasil dimasukkan, ${skippedCount} dilewati (karena sudah ada).`)
}

main()
  .catch(e => {
    console.error('Error importing Surat Jalan:', e)
  })
  .finally(async () => {
    await db.$disconnect()
  })
