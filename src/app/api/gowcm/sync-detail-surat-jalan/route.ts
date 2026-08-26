import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { db } from '@/lib/db'

const execAsync = promisify(exec)

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const rangeParam = searchParams.get('range')

    const scraperDir = path.join(process.cwd(), 'scraper')
    const testGetNodeModules = path.join('d:', 'testGet', 'node_modules')
    const nodePath = fs.existsSync(testGetNodeModules)
      ? `${testGetNodeModules};${process.env.NODE_PATH || ''}`
      : process.env.NODE_PATH || ''

    const execEnv = { ...process.env, NODE_PATH: nodePath }

    let rangeArg = ''
    if (rangeParam) {
      rangeArg = `--range=${rangeParam}`
    }

    console.log(`[SYNC DETAIL SJ] Executing detail_surat_jalan.js ${rangeArg}...`)
    const { stdout, stderr } = await execAsync(`node detail_surat_jalan.js ${rangeArg}`.trim(), {
      cwd: scraperDir,
      env: execEnv,
      timeout: 600000, // 10 min timeout
      maxBuffer: 20 * 1024 * 1024,
    })

    console.log('[SYNC DETAIL SJ STDOUT]:', stdout)
    if (stderr) console.error('[SYNC DETAIL SJ STDERR]:', stderr)

    // Otomatis impor data ke tabel SuratJalanDetail di database SQLite
    let importedCount = 0
    try {
      const jsonPath = path.join(scraperDir, 'detail_surat_jalan_full.json')
      if (fs.existsSync(jsonPath) && (db as any).suratJalanDetail) {
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const json = JSON.parse(raw)
        const items = json.data || []

        const masterRecords = await (db as any).suratJalan.findMany({
          select: { id: true, noSuratJalan: true },
        })
        const masterMap = new Map<string, string>()
        masterRecords.forEach((r: any) => masterMap.set(r.noSuratJalan, r.id))

        for (const item of items) {
          const noSuratJalan = item.noSuratJalan
          if (!noSuratJalan) continue
          const masterId = masterMap.get(noSuratJalan) || null

          let detailsList: any[] = []
          if (Array.isArray(item.details) && item.details.length > 0) {
            detailsList = item.details
          } else {
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
            await (db as any).suratJalanDetail.create({
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
            importedCount++
          }
        }
        console.log(`[SYNC DB] Tersimpan ${importedCount} rincian item ke tabel SuratJalanDetail.`)
      }
    } catch (dbSyncErr) {
      console.warn('Gagal sinkron database SuratJalanDetail:', dbSyncErr)
    }

    // Update lastRun di schedule_settings.json
    try {
      const { updateScraperLastRun } = await import('@/lib/update-scraper-last-run')
      updateScraperLastRun('detail_surat_jalan')
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Scraper Detail Surat Jalan selesai! ${importedCount} rincian item dimasukkan ke DB.`,
      output: stdout,
      importedCount,
    })
  } catch (error: any) {
    console.error('Error running detail_surat_jalan scraper:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menjalankan scraper Detail Surat Jalan',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
