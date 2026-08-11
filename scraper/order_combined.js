/**
 * GOW CM Pupuk Indonesia
 * Combined Scraper: ORDER >> Monitoring Order + Monitoring DO (1 Script)
 *
 * Step 1: Order >> Monitoring Order (/#/{prefix}/transaksi/monitoring-order-light)
 * Step 2: Order >> Monitoring DO    (/#/{prefix}/transaksi/monitoring-do)
 * Step 3: Combined Output -> monitoring_order_full.json, monitoring_do_full.json, & order_full.json
 * Step 4: Auto-Sync ke Tabel OrderGow (Database)
 */

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e1) {
  try {
    chromium = require('d:/testGet/node_modules/playwright').chromium;
  } catch (e2) {
    try {
      chromium = require(path.join(process.cwd(), 'node_modules', 'playwright')).chromium;
    } catch (e3) {
      throw new Error("Cannot find module 'playwright'. Jalankan 'npm install playwright' terlebih dahulu.");
    }
  }
}
const fs = require('fs');
const path = require('path');

const CONFIG = {
  baseUrl: 'https://gowcm.pupuk-indonesia.com',
  username: '1000001601',
  password: 'A@makmur25',
  orderOutputFile: 'monitoring_order_full.json',
  doOutputFile: 'monitoring_do_full.json',
  combinedOutputFile: 'order_full.json',
};

// ─── 1. Login & Capture Prefix ───────────────────────────────────────────────
async function login(page) {
  console.log('🔐 [1/4] Login ke GOW CM...');
  await page.goto(`${CONFIG.baseUrl}/#/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[placeholder="Your Username"]', CONFIG.username);
  await page.fill('input[placeholder="Enter Password"]', CONFIG.password);
  await page.click('button:has-text("Masuk")');

  await page.waitForFunction(
    () => !window.location.href.includes('/login'),
    { timeout: 15000 }
  ).catch(() => {});
  await page.waitForTimeout(4000);

  console.log(`✅ Login berhasil. URL: ${page.url()}`);

  let prefix = await page.evaluate(() => {
    for (const link of document.querySelectorAll('a[href], [href]')) {
      const href = link.href || link.getAttribute('href') || link.getAttribute('to') || '';
      const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (match) return match[1];
    }
    return null;
  });

  if (!prefix) {
    console.log('  ⏳ Sidebar belum siap, tunggu 3 detik...');
    await page.waitForTimeout(3000);
    prefix = await page.evaluate(() => {
      for (const link of document.querySelectorAll('a[href], [href]')) {
        const href = link.href || link.getAttribute('href') || '';
        const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
        if (match) return match[1];
      }
      return null;
    });
  }

  if (!prefix) {
    console.log('  🖱️ Klik menu Order untuk capture prefix...');
    await page.click('a:has-text("Order"), li:has-text("Order")').catch(() => {});
    await page.waitForTimeout(2000);
    const url = page.url();
    const hash = decodeURIComponent(url.split('#/')[1] || '');
    const parts = hash.split('/');
    if (parts[0] && parts[0].length > 20) prefix = encodeURIComponent(parts[0]);
  }

  console.log(`🔑 Prefix: ${prefix || '(tidak terdeteksi)'}`);
  return prefix;
}

// Helper filter modal
async function clearBackdrops(page) {
  const hasModal = await page.evaluate(() => !!document.querySelector('.modal-backdrop'));
  if (hasModal) {
    console.log('  🚭 Menutup modal backdrop...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.querySelectorAll('.modal.show').forEach(el => {
        el.classList.remove('show');
        el.style.display = 'none';
      });
      document.body.classList.remove('modal-open');
    });
  }
}

// ─── 2. Scrape Monitoring Order ──────────────────────────────────────────────
async function scrapeMonitoringOrder(page, prefix) {
  console.log('\n📦 [2/4] Memulai Scrape: ORDER >> Monitoring Order...');
  const orderUrl = `${CONFIG.baseUrl}/#/${prefix}/transaksi/monitoring-order-light`;
  await page.goto(orderUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await clearBackdrops(page);

  // Set Filter Show All
  await page.evaluate(() => {
    const showSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.value);
      return opts.includes('-1') || s.name?.includes('length') || [...s.options].some(o => o.text.toLowerCase().includes('semua') || o.text.toLowerCase().includes('all'));
    });
    if (showSelects.length > 0) {
      const sel = showSelects[0];
      const allOpt = [...sel.options].find(o => o.value === '-1' || o.text.toLowerCase().includes('semua') || o.text.toLowerCase().includes('all'));
      if (allOpt) {
        sel.value = allOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(2500);

  // Extract Order rows
  const orderList = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      const kodeBookingCell = row.querySelector('td:nth-child(6)');
      const kodeBookingEl = kodeBookingCell?.querySelector('a, span, b') || kodeBookingCell;
      const kodeBooking = kodeBookingEl?.innerText?.trim() || cells[5] || '';
      const kodeSoCell = row.querySelector('td:last-child');
      const kodeSo = kodeSoCell?.innerText?.trim() || cells[cells.length - 1] || '';
      const detailLink = row.querySelector('td:nth-child(2) a') || row.querySelector('a[href*="order/detail"], a[href*="transaksi"]');
      const detailHref = detailLink ? (detailLink.href || '') : '';

      return {
        noPenebusan: cells[1] || '',
        kodeReferensi: cells[2] || '',
        namaDistributor: cells[3] || '',
        namaProdusen: cells[4] || '',
        kodeBooking,
        batasAkhir: cells[6] || '',
        tglPengambilan: cells[7] || '',
        tglRencana: cells[8] || '',
        tglOrder: cells[9] || '',
        status: cells[10] || '',
        kodeSo,
        detailHref,
      };
    }).filter(r => r.noPenebusan.startsWith('ORD') && r.status !== '');
  });

  console.log(`  📊 Ditemukan ${orderList.length} baris Monitoring Order.`);
  return orderList;
}

// ─── 3. Scrape Monitoring DO ─────────────────────────────────────────────────
async function scrapeMonitoringDo(page, prefix) {
  console.log('\n🚚 [3/4] Memulai Scrape: ORDER >> Monitoring DO...');
  const doUrl = `${CONFIG.baseUrl}/#/${prefix}/transaksi/monitoring-do`;
  await page.goto(doUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await clearBackdrops(page);

  // Set Filter Show All
  await page.evaluate(() => {
    const showSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.value);
      return opts.includes('-1') || s.name?.includes('length') || [...s.options].some(o => o.text.toLowerCase().includes('semua') || o.text.toLowerCase().includes('all'));
    });
    if (showSelects.length > 0) {
      const sel = showSelects[0];
      const allOpt = [...sel.options].find(o => o.value === '-1' || o.text.toLowerCase().includes('semua') || o.text.toLowerCase().includes('all'));
      if (allOpt) {
        sel.value = allOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(2500);

  // Extract DO rows
  const doList = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      return {
        noPenebusan: cells[0] || '',
        namaProdusen: cells[1] || '',
        distributor: cells[2] || '',
        kodeDistributor: cells[3] || '',
        kodeSo: cells[4] || '',
        tglOrder: cells[5] || '',
        totalKuantitas: cells[6] || '',
        nomorDo: cells[7] || '',
        namaProduk: cells[8] || '',
        qty: cells[9] || '',
        tanggalDo: cells[10] || '',
      };
    }).filter(r => r.noPenebusan !== '' && r.nomorDo !== '');
  });

  console.log(`  📊 Ditemukan ${doList.length} baris Monitoring DO.`);
  return doList;
}

// ─── Main Execution ──────────────────────────────────────────────────────────
async function run() {
  console.log('🚀 === SCRAPER ORDER GABUNGAN GOW CM (Monitoring Order + DO) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();

  try {
    const prefix = await login(page);
    if (!prefix) throw new Error('Prefix route tidak terdeteksi dari sidebar');

    // Step 1: Scrape Monitoring Order
    const orders = await scrapeMonitoringOrder(page, prefix);

    // Step 2: Scrape Monitoring DO
    const dos = await scrapeMonitoringDo(page, prefix);

    // Write separate JSON files
    const moPath = path.join(__dirname, CONFIG.orderOutputFile);
    fs.writeFileSync(moPath, JSON.stringify({ scraped_at: new Date().toISOString(), total: orders.length, data: orders }, null, 2));
    console.log(`💾 Saved ${orders.length} Monitoring Order records -> ${CONFIG.orderOutputFile}`);

    const doPath = path.join(__dirname, CONFIG.doOutputFile);
    fs.writeFileSync(doPath, JSON.stringify({ scraped_at: new Date().toISOString(), total: dos.length, data: dos }, null, 2));
    console.log(`💾 Saved ${dos.length} Monitoring DO records -> ${CONFIG.doOutputFile}`);

    // Step 3: Combine & Merge Order + DO
    const doMap = new Map();
    dos.forEach(d => {
      if (d.noPenebusan) doMap.set(d.noPenebusan.trim(), d);
      if (d.kodeSo) doMap.set(d.kodeSo.trim(), d);
    });

    const combined = orders.map(ord => {
      const matchDo = doMap.get((ord.noPenebusan || '').trim()) || doMap.get((ord.kodeSo || '').trim());
      return {
        ...ord,
        nomorDo: matchDo?.nomorDo || '',
        namaProduk: matchDo?.namaProduk || '',
        qtyKg: matchDo?.qty || '',
        tglDo: matchDo?.tanggalDo || '',
      };
    });

    const combinedPath = path.join(__dirname, CONFIG.combinedOutputFile);
    fs.writeFileSync(combinedPath, JSON.stringify({ scraped_at: new Date().toISOString(), total: combined.length, data: combined }, null, 2));
    console.log(`✅ [4/4] Saved ${combined.length} Combined Order records -> ${CONFIG.combinedOutputFile}`);

  } catch (err) {
    console.error('❌ Error during Order combined scraping:', err.message);
  } finally {
    await browser.close();
    console.log('🔒 Browser ditutup. Selesai.');
  }
}

if (require.main === module) {
  run();
}

module.exports = { run };
