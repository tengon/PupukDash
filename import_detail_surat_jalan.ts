import { db } from './src/lib/db'
import fs from 'fs'
import path from 'path'

async function main() {
  const possiblePaths = [
    path.join(__dirname, 'scraper', 'detail_surat_jalan_full.json'),
    path.join(__dirname, 'detail_surat_jalan_full.json'),
    path.join(process.cwd(), 'scraper', 'detail_surat_jalan_full.json'),
    path.join(process.cwd(), 'detail_surat_jalan_full.json'),
    path.join(__dirname, 'scraper', 'penyaluran_pengecer_full.json'),
    path.join(process.cwd(), 'scraper', 'penyaluran_pengecer_full.json'),
  ]

  const filePath = possiblePaths.find(p => fs.existsSync(p))
  if (!filePath) {
    console.error('File detail_surat_jalan_full.json atau penyaluran_pengecer_full.json tidak ditemukan!')
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

    // Extract detail list (from dedicated detail scraper or main scraper item)
    let detailsList: any[] = []
    if (Array.isArray(item.details)) {
      detailsList = item.details
    } else if (item.detail && Array.isArray(item.detail.tables)) {
      item.detail.tables.forEach((t: any) => {
        if (Array.isArray(t.rows)) {
          t.rows.forEach((r: any) => {
            if (Array.isArray(r) && r.length >= 2) {
              detailsList.push({
                kodeKios: r[0] || '',
                namaKios: r[1] || '',
                kecamatan: r[2] || '',
                desa: r[3] || '',
                namaProduk: r[4] || '',
                jumlah: parseFloat(r[5]) || 0,
                satuan: r[6] || 'Ton',
                rawCells: r,
              })
            }
          })
        }
      })
    }

    // High-performance fallback detail generation if table details missing
    if (detailsList.length === 0) {
      const pupukTypes = [
        { name: 'Urea', val: item.urea },
        { name: 'NPK', val: item.npk },
        { name: 'Organik', val: item.organik },
        { name: 'ZA', val: item.za },
        { name: 'SP-36', val: item.sp36 },
        { name: 'NPK Kakao', val: item.npkKakao },
      ]

      pupukTypes.forEach(p => {
        const qty = parseFloat(p.val)
        if (!isNaN(qty) && qty > 0) {
          detailsList.push({
            kodeKios: '',
            namaKios: item.nomorPkp ? `Kios PKP (${item.nomorPkp})` : 'Kios Pengecer',
            kecamatan: item.kecamatan || '',
            desa: item.kabupaten || '',
            namaProduk: p.name,
            jumlah: qty,
            satuan: 'Ton',
          })
        }
      })
    }

    // Insert detail items into SuratJalanDetail
    for (const d of detailsList) {
      await detailModel.create({
        data: {
          suratJalanId: masterId,
          noSuratJalan: noSuratJalan,
          kodeKios: d.kodeKios || null,
          namaKios: d.namaKios || null,
          kecamatan: d.kecamatan || item.kecamatan || null,
          desa: d.desa || item.kabupaten || null,
          namaProduk: d.namaProduk || null,
          jumlah: parseFloat(d.jumlah) || 0,
          satuan: d.satuan || 'Ton',
          keterangan: d.keterangan || null,
          rawJson: JSON.stringify(d),
        },
      })
      insertedCount++
    }
  }

  console.log(`✅ Selesai! ${insertedCount} rincian item Detail Surat Jalan berhasil dimasukkan ke tabel SuratJalanDetail di SQLite.`)
}

main()
  .catch(e => {
    console.error('Error importing Detail Surat Jalan:', e)
  })
  .finally(async () => {
    await db.$disconnect()
  })
