import fs from 'fs'
import path from 'path'

export function updateScraperLastRun(targetKey: string) {
  try {
    const settingsPath = path.join(process.cwd(), 'scraper', 'schedule_settings.json')
    let settings: Record<string, any> = {}

    if (fs.existsSync(settingsPath)) {
      const content = fs.readFileSync(settingsPath, 'utf-8')
      settings = JSON.parse(content)
    }

    if (!settings[targetKey]) {
      settings[targetKey] = {
        enabled: true,
        startTime: '06:00',
        intervalHours: 6,
        scrapeRange: 'today',
      }
    }

    settings[targetKey].lastRun = new Date().toISOString()

    const dir = path.dirname(settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    console.log(`[SCHEDULE SETTINGS] Updated lastRun for ${targetKey} -> ${settings[targetKey].lastRun}`)
  } catch (err: any) {
    console.warn(`[SCHEDULE SETTINGS] Gagal memperbarui lastRun untuk ${targetKey}:`, err.message)
  }
}
