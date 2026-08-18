/**
 * cron-runner.js — Automated Cron Runner for GOW CM Scrapers
 * Reads schedule_settings.json for SPJB Operasional, SPJB PPTS & Realisasi Stok Kios
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

function getSettings() {
  if (fs.existsSync(settingsPath)) {
    try {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch (e) {
      console.error('[CRON] Error reading settings:', e.message);
    }
  }
  return {
    spjb_operasional: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
    spjb_ppts: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
    realisasi_stok_kios: { enabled: true, startTime: '06:00', intervalHours: 6, lastRun: null },
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

async function runOpScraper() {
  if (isRunningOp) return;
  isRunningOp = true;
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper SPJB Operasional...`);

  try {
    const { stdout, stderr } = await execAsync('node spjb_operasional.js', { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    const projectRoot = path.join(__dirname, '..');
    await execAsync('npx tsx -e "import { syncSpjbOperasionalToDb } from \'./src/lib/sync-spjb-operasional-to-db\'; syncSpjbOperasionalToDb();"', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('spjb_operasional', new Date().toISOString());
    console.log('[CRON] SPJB Operasional Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error SPJB Operasional:', err.message);
  } finally {
    isRunningOp = false;
  }
}

async function runPptsScraper() {
  if (isRunningPpts) return;
  isRunningPpts = true;
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper SPJB PPTS...`);

  try {
    const { stdout, stderr } = await execAsync('node spjb_ppts.js', { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    const projectRoot = path.join(__dirname, '..');
    await execAsync('npx tsx -e "import { syncSpjbPptsToDb } from \'./src/lib/sync-spjb-ppts-to-db\'; syncSpjbPptsToDb();"', { cwd: projectRoot, env: execEnv, timeout: 120000 });

    updateLastRun('spjb_ppts', new Date().toISOString());
    console.log('[CRON] SPJB PPTS Selesai & Database Ter-sync!');
  } catch (err) {
    console.error('[CRON] Error SPJB PPTS:', err.message);
  } finally {
    isRunningPpts = false;
  }
}

async function runRealisasiScraper() {
  if (isRunningRealisasi) return;
  isRunningRealisasi = true;
  console.log(`\n[CRON] ${new Date().toLocaleString('id-ID')} — Memulai scraper Realisasi Stok Kios...`);

  try {
    const { stdout, stderr } = await execAsync('node realisasi_stok_kios.js', { cwd: __dirname, env: execEnv, timeout: 300000 });
    console.log(stdout);
    if (stderr) console.error(stderr);

    updateLastRun('realisasi_stok_kios', new Date().toISOString());
    console.log('[CRON] Realisasi Stok Kios Selesai!');
  } catch (err) {
    console.error('[CRON] Error Realisasi Stok Kios:', err.message);
  } finally {
    isRunningRealisasi = false;
  }
}

async function checkAndRun() {
  const settings = getSettings();

  if (shouldRunNow(settings.spjb_operasional)) {
    console.log('[CRON] Executing SPJB Operasional...');
    await runOpScraper();
  }

  if (shouldRunNow(settings.spjb_ppts)) {
    console.log('[CRON] Executing SPJB PPTS...');
    await runPptsScraper();
  }

  if (shouldRunNow(settings.realisasi_stok_kios)) {
    console.log('[CRON] Executing Realisasi Stok Kios...');
    await runRealisasiScraper();
  }
}

console.log('🚀 [CRON RUNNER] Service Cron Scraper GOW CM Aktif...');
checkAndRun();
setInterval(checkAndRun, 5 * 60 * 1000);
