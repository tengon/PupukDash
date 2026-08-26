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

          await (db as any).suratJalan.upsert({
            where: { noSuratJalan: item.noSuratJalan },
            update: dataPayload,
            create: {
              noSuratJalan: item.noSuratJalan,
              ...dataPayload,
            },
          })
          importedCount++
        }
        console.log(`[SYNC DB] Berhasil tersinkronisasi ${importedCount} Surat Jalan ke database.`)
      }
    } catch (dbSyncErr) {
      console.warn('Gagal sinkron database SuratJalan:', dbSyncErr)
    }

    // Update lastRun di schedule_settings.json
    try {
      const { updateScraperLastRun } = await import('@/lib/update-scraper-last-run')
      updateScraperLastRun('penyaluran_pengecer')
    } catch {}

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
