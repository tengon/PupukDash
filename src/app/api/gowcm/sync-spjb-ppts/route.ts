import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'
import { syncSpjbPptsToDb } from '@/lib/sync-spjb-ppts-to-db'

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

    console.log(`[SYNC PPTS] Executing spjb_ppts.js ${rangeArg}...`)
    const { stdout, stderr } = await execAsync(`node spjb_ppts.js ${rangeArg}`.trim(), {
      cwd: scraperDir,
      env: execEnv,
      timeout: 300000,
      maxBuffer: 20 * 1024 * 1024,
    })

    console.log('[SYNC PPTS STDOUT]:', stdout)
    if (stderr) console.error('[SYNC PPTS STDERR]:', stderr)

    const syncRes = await syncSpjbPptsToDb()

    return NextResponse.json({
      success: true,
      message: `Scraper SPJB PPTS selesai! Data tersimpan ke DB.`,
      output: stdout,
      dbSync: syncRes,
    })
  } catch (error: any) {
    console.error('Error running spjb_ppts scraper:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal menjalankan scraper SPJB PPTS',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
