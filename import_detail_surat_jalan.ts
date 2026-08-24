import { db } from './src/lib/db'
import fs from 'fs'
import path from 'path'

async function main() {
  const possiblePaths = [
    path.join(__dirname, 'scraper', 'detail_surat_jalan_full.json'),
    path.join(__dirname, 'detail_surat_jalan_full.json'),
    path.join(process.cwd(), 'scraper', 'detail_surat_jalan_full.json'),
    path.join(process.cwd(), 'detail_surat_jalan_full.json'),
  ]

  const filePath = possiblePaths.find(p => fs.existsSync(p))
  if (!filePath) {
    console.error('File detail_surat_jalan_full.json tidak ditemukan!')
    return
  }

  console.log(`Membaca file data dari: ${filePath}`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const json = JSON.parse(raw)
  const items = json.data || []

  const detailModel = (db as any).suratJalanDetail
  const masterModel = (db as any).suratJalan

  if (!detailModel || !masterModel) {
    console.error('❌ Error: Model SuratJalanDetail/SuratJalan belum ter-generate di Prisma Client.')
    console.error('👉 Silakan jalankan perintah: npx prisma generate')
    return
  }

  // Load master Surat Jalan map
  const masterRecords = await masterModel.findMany({
    select: { id: true, noSuratJalan: true },
  })
  const masterMap = new Map<string, string>()
  masterRecords.forEach((r: any) => masterMap.set(r.noSuratJalan, r.id))

  let insertedCount = 0

  for (const item of items) {
    const noSuratJalan = item.noSuratJalan
    if (!noSuratJalan) continue

    const masterId = masterMap.get(noSuratJalan) || null

    let detailsList: any[] = []
    if (Array.isArray(item.details) && item.details.length > 0) {
      detailsList = item.details
    } else {
      // Fallback row if no sub-table in modal
      detailsList = [{
        kodeKios: null,
        namaKios: item.nomorPkp ? `Kios PKP (${item.nomorPkp})` : 'Kios Pengecer',
        kecamatan: item.kecamatan || null,
        desa: item.kabupaten || null,
        namaProduk: item.urea ? 'Urea' : item.npk ? 'NPK' : 'Pupuk Bersubsidi',
        jumlah: parseFloat(item.urea || item.npk || item.organik || item.za || item.sp36 || '0') || 0,
        satuan: 'Ton',
      }]
    }

    for (const d of detailsList) {
      await detailModel.create({
        data: {
          suratJalanId: masterId,
          noSuratJalan: noSuratJalan,
          nomorPkp: item.nomorPkp || d.nomorPkp || null,
          nomorOrder: item.nomorOrder || d.nomorOrder || null,
          kodeSo: item.kodeSo || d.kodeSo || null,
          provinsi: item.provinsi || d.provinsi || null,
          kabupaten: item.kabupaten || d.kabupaten || null,
          kecamatan: item.kecamatan || d.kecamatan || null,
          desa: d.desa || null,
          kodeKios: d.kodeKios || null,
          namaKios: d.namaKios || (item.nomorPkp ? `Kios PKP (${item.nomorPkp})` : 'Kios Pengecer'),
          namaProduk: d.namaProduk || null,
          jumlah: parseFloat(d.jumlah) || 0,
          satuan: d.satuan || 'Ton',
          urea: parseFloat(item.urea || '0') || 0,
          npk: parseFloat(item.npk || '0') || 0,
          organik: parseFloat(item.organik || '0') || 0,
          npkKakao: parseFloat(item.npkKakao || '0') || 0,
          za: parseFloat(item.za || '0') || 0,
          sp36: parseFloat(item.sp36 || '0') || 0,
          tglSuratJalan: item.tglSuratJalan || null,
          tglSyncIpubers: item.tglSyncIpubers || null,
          tglTerimaKios: item.tglTerimaKios || null,
          asalPengambilan: item.asalPengambilan || null,
          namaProdusen: item.namaProdusen || null,
          kodeDistributor: item.kodeDistributor || null,
          namaDistributor: item.namaDistributor || null,
          keterangan: d.keterangan || null,
          rawJson: JSON.stringify(item),
        },
      })
      insertedCount++
    }
  }

  console.log(`✅ Selesai! ${insertedCount} rincian item Detail Surat Jalan (PKP Order) berhasil dimasukkan ke tabel SuratJalanDetail di SQLite.`)
}

main()
  .catch(e => {
    console.error('Error importing Detail Surat Jalan:', e)
  })
  .finally(async () => {
    await db.$disconnect()
  })
