import { NextResponse } from 'next/server'
import { syncAnnualTotalToDb } from '@/lib/sync-annual-to-db'

let isRunning = false
let lastSyncTime: string | null = null
let lastSyncStatus: 'SUCCESS' | 'FAILED' | null = null
let lastSyncMessage: string | null = null

export async function GET() {
  return NextResponse.json({
    success: true,
    isRunning,
    lastSyncTime: lastSyncTime || new Date().toISOString(),
    lastSyncStatus: lastSyncStatus || 'IDLE',
    lastSyncMessage: lastSyncMessage || 'Scraper tidak aktif.',
  })
}

export async function POST() {
  if (isRunning) {
    return NextResponse.json({
      success: false,
      message: 'Proses sync sedang berjalan...',
    }, { status: 409 })
  }

  isRunning = true
  lastSyncStatus = null
  lastSyncMessage = 'Menjalankan sinkronisasi data alokasi...'

  ;(async () => {
    try {
      await syncAnnualTotalToDb()
      lastSyncTime = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) + ' WIB'
      lastSyncStatus = 'SUCCESS'
      lastSyncMessage = 'Sinkronisasi alokasi tahunan selesai.'
    } catch (err: any) {
      console.error('Sync error:', err)
      lastSyncStatus = 'FAILED'
      lastSyncMessage = `Gagal sinkronisasi: ${err.message || 'Error'}`
    } finally {
      isRunning = false
    }
  })()

  return NextResponse.json({
    success: true,
    message: 'Sinkronisasi sedang berjalan di background.',
    status: 'RUNNING',
  })
}
