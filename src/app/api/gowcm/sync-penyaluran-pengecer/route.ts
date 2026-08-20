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
      timeout: 300000, // 5 min timeout
    })

    console.log('[SYNC STDOUT]:', stdout)
    if (stderr) console.error('[SYNC STDERR]:', stderr)

    // Otomatis sinkronkan hasil scraping ke tabel SuratJalan di database SQLite
    let importedCount = 0
    try {
      const jsonPath = path.join(scraperDir, 'penyaluran_pengecer_full.json')
      if (fs.existsSync(jsonPath) && (db as any).suratJalan) {
        const raw = fs.readFileSync(jsonPath, 'utf-8')
        const json = JSON.parse(raw)
        const items = json.data || []

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
          importedCount++
        }
        console.log(`[SYNC DB] Berhasil tersimpan ke tabel SuratJalan (${importedCount} data)`)
      }
    } catch (dbSyncErr) {
      console.warn('Gagal sinkron database SuratJalan:', dbSyncErr)
    }

    return NextResponse.json({
      success: true,
      message: `Scraper Penyaluran Pengecer berhasil dijalankan & ${importedCount} Surat Jalan tersimpan di DB!`,
      output: stdout,
      importedCount,
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
