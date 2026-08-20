import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const settingsPath = path.join(process.cwd(), 'scraper', 'schedule_settings.json')

function getSettings() {
  if (fs.existsSync(settingsPath)) {
    try {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      return JSON.parse(content)
    } catch (e) {
      console.error('Error reading schedule settings:', e)
    }
  }
  return {
    spjb_operasional: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
    spjb_ppts: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
    realisasi_stok_kios: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
    penyaluran_pengecer: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
  }
}

function saveSettings(settings: any) {
  const dir = path.dirname(settingsPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

export async function GET() {
  const settings = getSettings()
  return NextResponse.json({
    success: true,
    settings,
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const current = getSettings()

    const updated = {
      spjb_operasional: {
        ...current.spjb_operasional,
        ...(body.spjb_operasional || {}),
      },
      spjb_ppts: {
        ...current.spjb_ppts,
        ...(body.spjb_ppts || {}),
      },
      realisasi_stok_kios: {
        ...current.realisasi_stok_kios,
        ...(body.realisasi_stok_kios || {}),
      },
      penyaluran_pengecer: {
        ...current.penyaluran_pengecer,
        ...(body.penyaluran_pengecer || {}),
      },
    }

    saveSettings(updated)

    return NextResponse.json({
      success: true,
      message: 'Pengaturan jadwal scraper GOW CM berhasil disimpan.',
      settings: updated,
    })
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Gagal menyimpan pengaturan jadwal scraper', details: error.message },
      { status: 500 }
    )
  }
}
