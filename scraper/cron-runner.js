/**
 * Auto-Sync Cron Runner untuk GOW CM Scraper
 * Berjalan otomatis setiap 6 jam: 06:00, 12:00, 18:00, 00:00 WIB
 */

const { exec } = require('child_process')
const path = require('path')
const fs = require('fs')

function logMessage(msg) {
  const time = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  const text = `[${time} WIB] ${msg}\n`
  console.log(text.trim())
  try {
    fs.appendFileSync(path.join(__dirname, 'cron-runner.log'), text)
  } catch (e) {}
}

function runScrapers() {
  logMessage('🚀 Memulai eksekusi scraper otomatis GOW CM...')
  
  exec('node spjb_operasional.js', { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      logMessage(`❌ Gagal eksekusi SPJB Operasional: ${error.message}`)
    } else {
      logMessage('✅ SPJB Operasional Scraper berhasil!')
    }

    // Run Penyaluran scraper after SPJB Operasional
    exec('node penyaluran_monitoring_order_kios.js', { cwd: __dirname }, (err2, stdout2, stderr2) => {
      if (err2) {
        logMessage(`❌ Gagal eksekusi Penyaluran Order: ${err2.message}`)
      } else {
        logMessage('✅ Penyaluran Order Scraper berhasil!')
      }
      logMessage('🎉 Seluruh proses auto-sync scraper GOW CM selesai!')
    })
  })
}

function getMsUntilNextSchedule() {
  const now = new Date()
  const currentHour = now.getHours()
  
  // Schedule hours: 0, 6, 12, 18
  const scheduleHours = [0, 6, 12, 18]
  let nextHour = scheduleHours.find(h => h > currentHour)
  
  const nextDate = new Date(now)
  if (nextHour === undefined) {
    nextHour = 0
    nextDate.setDate(nextDate.getDate() + 1)
  }
  
  nextDate.setHours(nextHour, 0, 0, 0)
  return nextDate.getTime() - now.getTime()
}

function scheduleNextRun() {
  const ms = getMsUntilNextSchedule()
  const minutes = Math.round(ms / 60000)
  logMessage(`⏰ Auto-Sync berikutnya dijadwalkan dalam ${minutes} menit (Pukul 06:00 / 12:00 / 18:00 / 00:00 WIB).`)

  setTimeout(() => {
    runScrapers()
    scheduleNextRun()
  }, ms)
}

logMessage('🟢 GOW CM Scraper Background Service Diaktifkan!')
scheduleNextRun()
