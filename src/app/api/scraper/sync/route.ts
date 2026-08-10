import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

let isRunning = false
let lastSyncTime: string | null = null
let lastSyncStatus: 'SUCCESS' | 'FAILED' | null = null
let lastSyncMessage: string | null = null

export async function GET() {
  const scraperDir = path.join(process.cwd(), 'scraper')
  
  const getFileTime = (filename: string) => {
    const p = path.join(scraperDir, filename)
    if (fs.existsSync(p)) {
      try {
        const content = fs.readFileSync(p, 'utf-8')
        const json = JSON.parse(content)
        return json.scraped_at || json.updated_at || fs.statSync(p).mtime.toISOString()
      } catch {
        return fs.statSync(p).mtime.toISOString()
      }
    }
    return null
  }

  const spjbOpTime = getFileTime('spjb_operasional_full.json')
  const spjbPptsTime = getFileTime('spjb_ppts_full.json')
  const penyaluranTime = getFileTime('penyaluran_full.json')

  return NextResponse.json({
    success: true,
    schedule: {
      interval: 'Setiap 6 Jam',
      times: ['06:00 WIB', '12:00 WIB', '18:00 WIB', '00:00 WIB'],
      cron: '0 0,6,12,18 * * *',
    },
    isRunning,
    lastSyncTime: lastSyncTime || penyaluranTime || spjbOpTime || new Date().toISOString(),
    lastSyncStatus: lastSyncStatus || 'SUCCESS',
    lastSyncMessage: lastSyncMessage || 'Scraper siap dijalankan otomatis setiap 6 jam.',
    files: {
      spjb_operasional: spjbOpTime,
      spjb_ppts: spjbPptsTime,
      penyaluran: penyaluranTime,
    },
  })
}

export async function POST() {
  if (isRunning) {
    return NextResponse.json({
      success: false,
      message: 'Proses sync scraper GOW CM sedang berjalan...',
    }, { status: 409 })
  }

  isRunning = true
  lastSyncStatus = null
  lastSyncMessage = 'Menjalankan sinkronisasi data GOW CM...'

  // Run in background asynchronously
  ;(async () => {
    try {
      const scraperDir = path.join(process.cwd(), 'scraper')
      const testGetNodeModules = path.join('d:', 'testGet', 'node_modules')
      const nodePath = `${testGetNodeModules};${path.join(process.cwd(), 'node_modules')};${process.env.NODE_PATH || ''}`
      const execEnv = { ...process.env, NODE_PATH: nodePath }
      
      // 1. Execute SPJB Operasional Scraper
      await execAsync('node spjb_operasional.js', { cwd: scraperDir, timeout: 60000, env: execEnv })
      
      // 2. Execute SPJB PPTS Scraper
      await execAsync('node spjb_ppts.js', { cwd: scraperDir, timeout: 90000, env: execEnv })

      // 3. Execute Penyaluran Scraper
      await execAsync('node penyaluran_monitoring_order_kios.js', { cwd: scraperDir, timeout: 60000, env: execEnv })

      lastSyncTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
      lastSyncStatus = 'SUCCESS'
      lastSyncMessage = 'Sinkronisasi scraper GOW CM selesai dengan sukses!'
    } catch (err: any) {
      console.error('Scraper sync execution error:', err)
      lastSyncStatus = 'FAILED'
      lastSyncMessage = `Gagal sinkronisasi: ${err.message || 'Terjadi kesalahan saat memproses Playwright'}`
    } finally {
      isRunning = false
    }
  })()

  return NextResponse.json({
    success: true,
    message: 'Sinyal sinkronisasi scraper GOW CM telah dikirim & sedang berjalan di background.',
    status: 'RUNNING',
  })
}
