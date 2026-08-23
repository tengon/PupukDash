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

  const suratJalanModel = (db as any).suratJalan
  if (!suratJalanModel) {
    console.error('❌ Error: Model SuratJalan belum ter-generate di Prisma Client.')
    console.error('👉 Silakan jalankan perintah: npx prisma generate')
    return
  }

  let upsertCount = 0

  for (const item of items) {
    if (!item.noSuratJalan) continue

    const detailStr = item.detail ? JSON.stringify(item.detail) : null

    const dataPayload = {
      uuid: item.uuid || null,
      nomorPkp: item.nomorPkp || null,
      nomorOrder: item.nomorOrder || null,
      kodeSo: item.kodeSo || null,
      kodeDistributor: item.kodeDistributor || null,
      namaDistributor: item.namaDistributor || null,
      provinsi: item.provinsi || null,
      kabupaten: item.kabupaten || null,
      kecamatan: item.kecamatan || null,
      kodeProdusen: item.kodeProdusen || null,
      namaProdusen: item.namaProdusen || null,
      urea: item.urea || null,
      npk: item.npk || null,
      organik: item.organik || null,
      npkKakao: item.npkKakao || null,
      za: item.za || null,
      sp36: item.sp36 || null,
      status: item.status || null,
      tglSuratJalan: item.tglSuratJalan || null,
      tglDibuat: item.tglDibuat || null,
      tglDiubah: item.tglDiubah || null,
      tglSyncIpubers: item.tglSyncIpubers || null,
      tglTerimaKios: item.tglTerimaKios || null,
      asalPengambilan: item.asalPengambilan || null,
      href: item.href || null,
      detail: detailStr,
    }

    await suratJalanModel.upsert({
      where: { noSuratJalan: item.noSuratJalan },
      update: dataPayload,
      create: {
        noSuratJalan: item.noSuratJalan,
        ...dataPayload,
      },
    })

    upsertCount++
  }

  console.log(`✅ Selesai! ${upsertCount} Surat Jalan berhasil disinkronkan ke database SQLite.`)
}

main()
  .catch(e => {
    console.error('Error importing Surat Jalan:', e)
  })
  .finally(async () => {
    await db.$disconnect()
  })
