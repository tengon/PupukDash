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

          const detailsList = Array.isArray(item.details) ? item.details : []
          for (const d of detailsList) {
            await (db as any).suratJalanDetail.create({
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
            importedCount++
          }
        }
        console.log(`[SYNC DB] Tersimpan ${importedCount} rincian item ke tabel SuratJalanDetail.`)
      }
    } catch (dbSyncErr) {
      console.warn('Gagal sinkron database SuratJalanDetail:', dbSyncErr)
    }

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
