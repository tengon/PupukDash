/**
 * cron-runner.js — Automated Cron Runner for GOW CM Scrapers
 * Reads schedule_settings.json for all 5 scrapers:
 * 1. SPJB Operasional
 * 2. SPJB PPTS
 * 3. Realisasi Stok Kios
 * 4. Penyaluran ke Pengecer (Master SJ)
 * 5. Detail Surat Jalan (Detail PKP Order)
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const settingsPath = path.join(__dirname, 'schedule_settings.json');
const testGetNodeModules = path.join('d:', 'testGet', 'node_modules');
const nodePath = `${testGetNodeModules};${process.env.NODE_PATH || ''}`;
const execEnv = { ...process.env, NODE_PATH: nodePath };
const projectRoot = path.join(__dirname, '..');

function getSettings() {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch (e) {
      console.error('[CRON] Error reading settings:', e.message);
    }
  }
  return {
    spjb_operasional: { enabled: true, startTime: '06:00', intervalHours: 6, scrapeRange: 'all', lastRun: null },
    spjb_ppts: { enabled: true, startTime: '06:00', intervalHours: 6, scrapeRange: 'all', lastRun: null },
    realisasi_stok_kios: { enabled: true, startTime: '06:00', intervalHours: 6, scrapeRange: 'all', lastRun: null },
    penyaluran_pengecer: { enabled: true, startTime: '06:00', intervalHours: 6, scrapeRange: 'today', lastRun: null },
    detail_surat_jalan: { enabled: true, startTime: '06:00', intervalHours: 6, scrapeRange: 'today', lastRun: null },
  };
}

function updateLastRun(target, isoString) {
  const current = getSettings();
  if (!current[target]) current[target] = {};
  current[target].lastRun = isoString;
  fs.writeFileSync(settingsPath, JSON.stringify(current, null, 2), 'utf-8');
}

function shouldRunNow(config) {
  if (!config || !config.enabled) return false;

  const now = new Date();
  const lastRun = config.lastRun ? new Date(config.lastRun) : null;
  const intervalMs = (config.intervalHours || 6) * 3600 * 1000;

  if (!lastRun) return true;

  const diffMs = now.getTime() - lastRun.getTime();
  return diffMs >= intervalMs;
}

let isRunningOp = false;
let isRunningPpts = false;
let isRunningRealisasi = false;
let isRunningPenyaluran = false;
let isRunningDetailSj = false;

async function runOpScraper(config) {
  if (isRunningOp) return;
  isRunningOp = true;
  const rangeArg = config?.scrapeRange ? `--range=${config.scrapeRange}` : '';
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper SPJB Operasional (${rangeArg || 'all'})...`);

  try {
    const { stdout, stderr } = await execAsync(`node spjb_operasional.js ${rangeArg}`.trim(), { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Sync database
    await execAsync('npx tsx -e "import { syncSpjbOperasionalToDb } from \'./src/lib/sync-spjb-operasional-to-db\'; syncSpjbOperasionalToDb();"', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('spjb_operasional', new Date().toISOString());
    console.log('[CRON] ✅ SPJB Operasional Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error SPJB Operasional:', err.message);
  } finally {
    isRunningOp = false;
  }
}

async function runPptsScraper(config) {
  if (isRunningPpts) return;
  isRunningPpts = true;
  const rangeArg = config?.scrapeRange ? `--range=${config.scrapeRange}` : '';
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper SPJB PPTS (${rangeArg || 'all'})...`);

  try {
    const { stdout, stderr } = await execAsync(`node spjb_ppts.js ${rangeArg}`.trim(), { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Sync database
    await execAsync('npx tsx -e "import { syncSpjbPptsToDb } from \'./src/lib/sync-spjb-ppts-to-db\'; syncSpjbPptsToDb();"', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('spjb_ppts', new Date().toISOString());
    console.log('[CRON] ✅ SPJB PPTS Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error SPJB PPTS:', err.message);
  } finally {
    isRunningPpts = false;
  }
}

async function runRealisasiScraper(config) {
  if (isRunningRealisasi) return;
  isRunningRealisasi = true;
  const rangeArg = config?.scrapeRange ? `--range=${config.scrapeRange}` : '';
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper Realisasi Stok Kios (${rangeArg || 'all'})...`);

  try {
    const { stdout, stderr } = await execAsync(`node realisasi_stok_kios.js ${rangeArg}`.trim(), { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Sync database
    await execAsync('npx tsx -e "import { syncRealisasiStokKiosToDb } from \'./src/lib/sync-realisasi-stok-kios-to-db\'; syncRealisasiStokKiosToDb();"', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('realisasi_stok_kios', new Date().toISOString());
    console.log('[CRON] ✅ Realisasi Stok Kios Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error Realisasi Stok Kios:', err.message);
  } finally {
    isRunningRealisasi = false;
  }
}

async function runPenyaluranScraper(config) {
  if (isRunningPenyaluran) return;
  isRunningPenyaluran = true;
  const rangeArg = config?.scrapeRange ? `--range=${config.scrapeRange}` : '';
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper Penyaluran ke Pengecer (${rangeArg || 'today'})...`);

  try {
    const { stdout, stderr } = await execAsync(`node penyaluran_pengecer.js ${rangeArg}`.trim(), { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Sync database
    await execAsync('npx tsx import_surat_jalan.ts', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('penyaluran_pengecer', new Date().toISOString());
    console.log('[CRON] ✅ Penyaluran ke Pengecer Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error Penyaluran Pengecer:', err.message);
  } finally {
    isRunningPenyaluran = false;
  }
}

async function runDetailSjScraper(config) {
  if (isRunningDetailSj) return;
  isRunningDetailSj = true;
  const rangeArg = config?.scrapeRange ? `--range=${config.scrapeRange}` : '';
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper Detail Surat Jalan (${rangeArg || 'today'})...`);

  try {
    const { stdout, stderr } = await execAsync(`node detail_surat_jalan.js ${rangeArg}`.trim(), { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    // Sync database
    await execAsync('npx tsx import_detail_surat_jalan.ts', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('detail_surat_jalan', new Date().toISOString());
    console.log('[CRON] ✅ Detail Surat Jalan Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error Detail Surat Jalan:', err.message);
  } finally {
    isRunningDetailSj = false;
  }
}

async function checkAndRun() {
  const settings = getSettings();

  if (shouldRunNow(settings.spjb_operasional)) {
    console.log('[CRON] Executing SPJB Operasional...');
    await runOpScraper(settings.spjb_operasional);
  }

  if (shouldRunNow(settings.spjb_ppts)) {
    console.log('[CRON] Executing SPJB PPTS...');
    await runPptsScraper(settings.spjb_ppts);
  }

  if (shouldRunNow(settings.realisasi_stok_kios)) {
    console.log('[CRON] Executing Realisasi Stok Kios...');
    await runRealisasiScraper(settings.realisasi_stok_kios);
  }

  if (shouldRunNow(settings.penyaluran_pengecer)) {
    console.log('[CRON] Executing Penyaluran ke Pengecer...');
    await runPenyaluranScraper(settings.penyaluran_pengecer);
  }

  if (shouldRunNow(settings.detail_surat_jalan)) {
    console.log('[CRON] Executing Detail Surat Jalan...');
    await runDetailSjScraper(settings.detail_surat_jalan);
  }
}

console.log('🚀 [CRON RUNNER] Service Cron Scraper GOW CM Aktif...');
checkAndRun();
setInterval(checkAndRun, 5 * 60 * 1000);
