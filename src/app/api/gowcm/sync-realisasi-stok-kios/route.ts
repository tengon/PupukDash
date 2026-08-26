import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { syncRealisasiStokKiosToDb } from '@/lib/sync-realisasi-stok-kios-to-db'

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

    console.log(`[SYNC REALISASI] Executing realisasi_stok_kios.js ${rangeArg}...`)
    const { stdout, stderr } = await execAsync(`node realisasi_stok_kios.js ${rangeArg}`.trim(), {
      cwd: scraperDir,
      env: execEnv,
      timeout: 300000,
      maxBuffer: 20 * 1024 * 1024,
    })

    console.log('[SYNC REALISASI STDOUT]:', stdout)
    if (stderr) console.error('[SYNC REALISASI STDERR]:', stderr)

    // Sync output to SQLite database
    const syncRes = await syncRealisasiStokKiosToDb()

    // Update lastRun di schedule_settings.json
    try {
      const { updateScraperLastRun } = await import('@/lib/update-scraper-last-run')
      updateScraperLastRun('realisasi_stok_kios')
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Scraper Realisasi Stok Kios selesai! ${syncRes.updatedCount || 0} data tersimpan ke DB.`,
      output: stdout,
      dbSync: syncRes,
    })
  } catch (error: any) {
    console.error('Error running realisasi_stok_kios scraper:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menjalankan scraper Realisasi Stok Kios',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
