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

  console.log(`Mengimport ${items.length} Surat Jalan ke database SQLite...`)

  let successCount = 0
  for (const item of items) {
    if (!item.noSuratJalan) continue

    const detailStr = item.detail ? JSON.stringify(item.detail) : null

    await (db as any).suratJalan.upsert({
      where: { noSuratJalan: item.noSuratJalan },
      update: {
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
      create: {
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
    successCount++
  }

  console.log(`✅ Berhasil mengimpor/memperbarui ${successCount} Surat Jalan di database!`)
}

main()
  .catch(e => {
    console.error('Error importing Surat Jalan:', e)
  })
  .finally(async () => {
    await db.$disconnect()
  })
