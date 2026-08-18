import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import util from 'util'

const execPromise = util.promisify(exec)

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), 'scraper', 'realisasi_stok_kios.js')
    const nodeCmd = process.platform === 'win32'
      ? `$env:NODE_PATH="d:\\testGet\\node_modules"; node "${scriptPath}"`
      : `node "${scriptPath}"`

    console.log('[API SYNC REALISASI] Executing scraper script:', scriptPath)
    const { stdout, stderr } = await execPromise(nodeCmd, {
      shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh',
      timeout: 120000,
    })

    console.log('[API SYNC REALISASI STDOUT]:', stdout)

    return NextResponse.json({
      success: true,
      message: 'Scraping Realisasi Stok Kios IPubers berhasil dijalankan.',
      output: stdout,
    })
  } catch (error: any) {
    console.error('❌ [API SYNC REALISASI ERROR]:', error.message)
    return NextResponse.json(
      { success: false, error: 'Gagal menjalankan scraper Realisasi Stok Kios', details: error.message },
      { status: 500 }
    )
  }
}
