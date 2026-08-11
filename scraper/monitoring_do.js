/**
 * GOW CM Pupuk Indonesia
 * Scraper: ORDER >> Monitoring DO
 *
 * URL List : /#/{prefix}/transaksi/monitoring-do
 *
 * Kolom tabel (TIDAK ADA checkbox, col mulai index 0):
 *   [0] No Penebusan  [1] Nama Produsen     [2] Distributor
 *   [3] Kode Dist.    [4] Kode SO           [5] Tgl Order
 *   [6] Total Kuantitas [7] Nomor DO        [8] Nama Produk
 *   [9] QTY           [10] Tanggal DO
 *
 * Filter: Tahun 2026 + Show = Lihat Semua
 * Output: monitoring_do_full.json
 */

let chromium;
try {
  chromium = require('playwright').chromium;
} catch (e1) {
  try {
    chromium = require('d:/testGet/node_modules/playwright').chromium;
  } catch (e2) {
    try {
      chromium = require(require('path').join(process.cwd(), 'node_modules', 'playwright')).chromium;
    } catch (e3) {
      throw new Error("Cannot find module 'playwright'. Jalankan 'npm install playwright' terlebih dahulu.");
    }
  }
}
const fs = require('fs');

const CONFIG = {
  baseUrl:    'https://gowcm.pupuk-indonesia.com',
  username:   '1000001601',
  password:   'A@makmur25',
  outputFile: 'monitoring_do_full.json',
};

// ─── Login & ambil prefix dari sidebar ──────────────────────────────────────
async function login(page) {
  console.log('🔐 Login ke GOW CM...');
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

  // Strategi 1: prefix dari sidebar links
  let prefix = await page.evaluate(() => {
    for (const link of document.querySelectorAll('a[href], [href]')) {
      const href = link.href || link.getAttribute('href') || link.getAttribute('to') || '';
      const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (match) return match[1];
    }
    return null;
  });

  // Strategi 2: retry setelah 3 detik
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

  // Strategi 3: klik menu Order untuk capture prefix
  if (!prefix) {
    console.log('  🖱️  Klik menu Order untuk capture prefix...');
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

// ─── Set Filter: Tahun 2026 + Show = Lihat Semua ───────────────────────────
async function setFilters(page, tahun = '2026') {
  // Tutup modal backdrop jika ada
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

  // 1. Set filter Tahun
  console.log(`  📅 Setting filter Tahun: ${tahun}...`);
  const filled = await page.evaluate((tahun) => {
    const targets = [
      document.querySelector('#tahun'),
      document.querySelector('input[name="tahun"]'),
      document.querySelector('input[placeholder*="ahun"]'),
      [...document.querySelectorAll('input')].find(el =>
        el.closest('.form-group')?.querySelector('label')?.innerText?.toLowerCase().includes('tahun')
      ),
    ].filter(Boolean);

    for (const el of targets) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (nativeSetter) nativeSetter.call(el, tahun);
      else el.value = tahun;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, tahun);

  console.log(`     ${filled ? '✅' : '⚠️ '} Filter tahun: ${filled ? 'diterapkan' : 'tidak ditemukan'}`);
  if (filled) {
    await page.waitForTimeout(1500);
    await page.click(
      'button:has-text("Cari"), button:has-text("Filter"), button:has-text("Search"), button[type="submit"]'
    ).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // 2. Set Show = Semua
  console.log('  📋 Setting filter: Lihat Semua...');
  await page.evaluate(() => {
    const showSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.value);
      return opts.includes('-1') || s.name?.includes('length') ||
             [...s.options].some(o =>
               o.text.toLowerCase().includes('semua') || o.text.toLowerCase().includes('all')
             );
    });
    if (showSelects.length > 0) {
      const sel = showSelects[0];
      const allOpt = [...sel.options].find(o =>
        o.value === '-1' ||
        o.text.toLowerCase().includes('semua') ||
        o.text.toLowerCase().includes('all')
      );
      if (allOpt) {
        sel.value = allOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        const maxOpt = [...sel.options].reduce((a, b) => (+a.value > +b.value ? a : b));
        sel.value = maxOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(2000);
}

// ─── Scrape Data Tabel Monitoring DO ────────────────────────────────────────
async function scrapeDoTable(page) {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      return {
        noPenebusan:     cells[0] || '',  // col 0: No Penebusan (ORD...)
        namaProdusen:    cells[1] || '',  // col 1: Nama Produsen
        distributor:     cells[2] || '',  // col 2: Distributor
        kodeDistributor: cells[3] || '',  // col 3: Kode Distributor
        kodeSo:          cells[4] || '',  // col 4: Kode SO
        tglOrder:        cells[5] || '',  // col 5: Tgl Order
        totalKuantitas:  cells[6] || '',  // col 6: Total Kuantitas
        nomorDo:         cells[7] || '',  // col 7: Nomor DO
        namaProduk:      cells[8] || '',  // col 8: Nama Produk
        qty:             cells[9] || '',  // col 9: QTY
        tanggalDo:       cells[10] || '', // col 10: Tanggal DO
      };
    }).filter(r => r.noPenebusan !== '' && r.noPenebusan.startsWith('ORD'));
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  try {
    const prefix = await login(page);

    console.log('\n📋 Navigasi ke ORDER >> Monitoring DO...');
    const listUrl = prefix
      ? `${CONFIG.baseUrl}/#/${prefix}/transaksi/monitoring-do`
      : null;

    if (listUrl) {
      console.log(`  URL: ${listUrl}`);
      await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    // Fallback klik menu Order >> Monitoring DO
    let rowCount = await page.$$eval('table tbody tr', r => r.length).catch(() => 0);
    if (rowCount === 0) {
      console.log('  ⚠️  Tabel kosong, klik menu...');
      await page.click('a:has-text("Order"), .menu-item:has-text("Order")').catch(() => {});
      await page.waitForTimeout(1000);
      await page.click('a:has-text("Monitoring DO"), text=Monitoring DO').catch(() => {});
      await page.waitForTimeout(3000);
      console.log(`  URL setelah klik: ${page.url()}`);
    }

    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Apply Filter: Tahun 2026 + Show = Lihat Semua
    console.log('  🔧 Setting filter: Tahun 2026 + Lihat Semua...');
    await setFilters(page, '2026');

    // Scrape data
    console.log('  📄 Scraping data Monitoring DO...');
    const data = await scrapeDoTable(page);

    // ── Print Ringkasan ────────────────────────────────────────────────────
    const line = '='.repeat(100);
    console.log(`\n${line}`);
    console.log('📊 HASIL SCRAPING: ORDER >> Monitoring DO');
    console.log(line);

    // Grouping statistik berdasarkan Produk
    const byProduk = data.reduce((acc, r) => {
      acc[r.namaProduk] = (acc[r.namaProduk] || 0) + 1;
      return acc;
    }, {});

    // Grouping statistik berdasarkan Produsen
    const byProdusen = data.reduce((acc, r) => {
      acc[r.namaProdusen] = (acc[r.namaProdusen] || 0) + 1;
      return acc;
    }, {});

    console.log('\nSampel 10 baris pertama:');
    data.slice(0, 10).forEach((r, i) => {
      console.log(`\n  [${i+1}] DO: ${r.nomorDo || '(tanpa DO)'}  |  Order: ${r.noPenebusan}`);
      console.log(`       Produsen     : ${r.namaProdusen}`);
      console.log(`       Produk       : ${r.namaProduk}  |  QTY: ${r.qty} Ton`);
      console.log(`       Kode SO      : ${r.kodeSo}`);
      console.log(`       Tgl Order    : ${r.tglOrder}  |  Tgl DO: ${r.tanggalDo}`);
    });

    console.log(`\n${line}`);
    console.log(`TOTAL DATA DO: ${data.length} Record`);
    console.log('\nPer Produsen:');
    Object.entries(byProdusen).forEach(([p, n]) => console.log(`  - ${p}: ${n} DO`));
    console.log('\nPer Produk:');
    Object.entries(byProduk).forEach(([prod, n]) => console.log(`  - ${prod}: ${n} DO`));
    console.log(line);

    // Merging dengan data eksisting jika ada data baru
    let existingMap = new Map();
    let existingCount = 0;

    if (fs.existsSync(CONFIG.outputFile)) {
      try {
        const fileContent = fs.readFileSync(CONFIG.outputFile, 'utf8');
        const parsed = JSON.parse(fileContent);
        const listData = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        existingCount = listData.length;
        listData.forEach(item => {
          const key = `${item.nomorDo || ''}_${item.noPenebusan || ''}_${item.kodeSo || ''}`;
          existingMap.set(key, item);
        });
        console.log(`\n📂 Ditemukan data eksisting: ${existingCount} record.`);
      } catch (e) {
        console.log('⚠️ File eksisting tidak valid / gagal dibaca.');
      }
    }

    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    data.forEach(newItem => {
      const key = `${newItem.nomorDo || ''}_${newItem.noPenebusan || ''}_${newItem.kodeSo || ''}`;
      if (existingMap.has(key)) {
        const oldItem = existingMap.get(key);
        if (JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          existingMap.set(key, { ...newItem, updated_at: new Date().toISOString() });
          updatedCount++;
        } else {
          unchangedCount++;
        }
      } else {
        existingMap.set(key, { ...newItem, added_at: new Date().toISOString() });
        addedCount++;
      }
    });

    const finalMergedData = Array.from(existingMap.values());

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (Monitoring DO):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - ORDER >> Monitoring DO",
      total_records: finalMergedData.length,
      last_sync_summary: {
        scraped_records: data.length,
        added_new: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      },
      data: finalMergedData,
    };

    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(outputObj, null, 2), 'utf8');
    console.log(`\n💾 Disimpan ke: ${CONFIG.outputFile}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    try { await page.waitForTimeout(1000); } catch (_) {}
    try { await browser.close(); } catch (_) {}
  }
})();
