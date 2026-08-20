import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const scraperDir = path.join(process.cwd(), 'scraper')
    const testGetNodeModules = path.join('d:', 'testGet', 'node_modules')
    const nodePath = fs.existsSync(testGetNodeModules)
      ? `${testGetNodeModules};${process.env.NODE_PATH || ''}`
      : process.env.NODE_PATH || ''

    const execEnv = { ...process.env, NODE_PATH: nodePath }

    console.log('[SYNC] Executing penyaluran_pengecer.js scraper...')
    const { stdout, stderr } = await execAsync('node penyaluran_pengecer.js', {
      cwd: scraperDir,
      env: execEnv,
      timeout: 300000, // 5 min timeout
    })

    console.log('[SYNC STDOUT]:', stdout)
    if (stderr) console.error('[SYNC STDERR]:', stderr)

    return NextResponse.json({
      success: true,
      message: 'Scraper Penyaluran Pengecer (Surat Jalan) berhasil dijalankan!',
      output: stdout,
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
