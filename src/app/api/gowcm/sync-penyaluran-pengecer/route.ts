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

    // Tentukan range argument
    let rangeArg = ''
    if (rangeParam) {
      rangeArg = `--range=${rangeParam}`
    }

    console.log(`[SYNC] Executing penyaluran_pengecer.js ${rangeArg}...`)
    const { stdout, stderr } = await execAsync(`node penyaluran_pengecer.js ${rangeArg}`.trim(), {
      cwd: scraperDir,
      env: execEnv,
      timeout: 600000, // 10 min timeout
      maxBuffer: 20 * 1024 * 1024, // 20MB maxBuffer
    })

    console.log('[SYNC STDOUT]:', stdout)
    if (stderr) console.error('[SYNC STDERR]:', stderr)

    // Otomatis sinkronkan hasil scraping ke tabel SuratJalan di database SQLite (Lewati jika sudah ada)
    let importedCount = 0
    let skippedCount = 0
    try {
      const jsonPath = path.join(scraperDir, 'penyaluran_pengecer_full.json')
      if (fs.existsSync(jsonPath) && (db as any).suratJalan) {
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const json = JSON.parse(raw)
        const items = json.data || []

        // Ambil set noSuratJalan yang sudah tersimpan di database
        const existingRecords = await (db as any).suratJalan.findMany({
          select: { noSuratJalan: true },
        })
        const existingSet = new Set(existingRecords.map((r: any) => r.noSuratJalan))

        for (const item of items) {
          if (!item.noSuratJalan) continue

          // Lewati jika noSuratJalan sudah ada di database
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
          importedCount++
        }
        console.log(`[SYNC DB] Tersimpan ${importedCount} Surat Jalan baru ke DB (${skippedCount} dilewati karena sudah ada).`)
      }
    } catch (dbSyncErr) {
      console.warn('Gagal sinkron database SuratJalan:', dbSyncErr)
    }

    return NextResponse.json({
      success: true,
      message: `Scraper Penyaluran Pengecer selesai! ${importedCount} Surat Jalan baru dimasukkan ke DB (${skippedCount} dilewati).`,
      output: stdout,
      importedCount,
      skippedCount,
    })
  } catch (error: any) {
    console.error('Error running penyaluran_pengecer scraper:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menjalankan scraper Penyaluran Pengecer',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
