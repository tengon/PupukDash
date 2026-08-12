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
  
  const testGetNodeModules = path.join('d:', 'testGet', 'node_modules')
  const nodePath = `${testGetNodeModules};${path.join(__dirname, 'node_modules')};${process.env.NODE_PATH || ''}`
  const execEnv = { ...process.env, NODE_PATH: nodePath }

  // 1. Run SPJB Operasional
  exec('node spjb_operasional.js', { cwd: __dirname, env: execEnv }, (error, stdout, stderr) => {
    if (error) {
      logMessage(`❌ Gagal eksekusi SPJB Operasional: ${error.message}`)
    } else {
      logMessage('✅ SPJB Operasional Scraper berhasil!')
    }

    // 2. Run SPJB PPTS Scraper
    exec('node spjb_ppts.js', { cwd: __dirname, env: execEnv }, (err2, stdout2, stderr2) => {
      if (err2) {
        logMessage(`❌ Gagal eksekusi SPJB PPTS: ${err2.message}`)
      } else {
        logMessage('✅ SPJB PPTS Scraper berhasil!')
      }

      // 3. Run Penyaluran Order Scraper
      exec('node penyaluran_monitoring_order_kios.js', { cwd: __dirname, env: execEnv }, (err3, stdout3, stderr3) => {
        if (err3) {
          logMessage(`❌ Gagal eksekusi Penyaluran Order: ${err3.message}`)
        } else {
          logMessage('✅ Penyaluran Order Scraper berhasil!')
        }

        // 4. Run Stok Kios iPuber Scraper
        exec('node stok_kios_ipuber.js', { cwd: __dirname, env: execEnv }, (err4, stdout4, stderr4) => {
          if (err4) {
            logMessage(`❌ Gagal eksekusi Stok Kios iPuber: ${err4.message}`)
          } else {
            logMessage('✅ Stok Kios iPuber Scraper berhasil!')
          }

          // 5. Run Monitoring Order Scraper
          exec('node monitoring_order.js', { cwd: __dirname, env: execEnv }, (err5) => {
            if (err5) {
              logMessage(`❌ Gagal eksekusi Monitoring Order: ${err5.message}`)
            } else {
              logMessage('✅ Monitoring Order Scraper berhasil!')
            }

            // 6. Run Monitoring DO Scraper
            exec('node monitoring_do.js', { cwd: __dirname, env: execEnv }, (err6) => {
              if (err6) {
                logMessage(`❌ Gagal eksekusi Monitoring DO: ${err6.message}`)
              } else {
                logMessage('✅ Monitoring DO Scraper berhasil!')
              }

              // 7. Run Gabung Order (Merge Order + DO)
              exec('node gabung_order.js', { cwd: __dirname, env: execEnv }, (err7) => {
                if (err7) {
                  logMessage(`❌ Gagal menggabungkan Order & DO: ${err7.message}`)
                } else {
                  logMessage('✅ Gabung Order & DO berhasil!')
                }

                // 8. Run Laporan Item Penyaluran PKP Scraper
                exec('node laporan_item_penyaluran_pkp.js', { cwd: __dirname, env: execEnv }, (err8) => {
                  if (err8) {
                    logMessage(`❌ Gagal eksekusi Laporan PKP: ${err8.message}`)
                  } else {
                    logMessage('✅ Laporan Item Penyaluran PKP Scraper berhasil!')
                  }
                  logMessage('🎉 Seluruh proses auto-sync scraper GOW CM selesai!')
                })
              })
            })
          })
        })
      })
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
