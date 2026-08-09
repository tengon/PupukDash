/**
 * GOW CM Pupuk Indonesia
 * Scraper: Realisasi >> Stok Kios iPuber (Monitoring Stock Kios Ipubers)
 *
 * URL List : /#/{prefix}/monitoring-stock-kios-ipubers
 *
 * Kolom tabel (col index 0..5):
 *   [0] Kode Kios     [1] Nama Kios      [2] Kode Product
 *   [3] Nama Product  [4] Stok (Kg)      [5] Syncn At
 *
 * Filter: Click "Reset Filter", set Show = Lihat Semua / Max entries
 * Output: stok_kios_ipuber_full.json
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl:    'https://gowcm.pupuk-indonesia.com',
  username:   '1000001601',
  password:   'A@makmur25',
  outputFile: 'stok_kios_ipuber_full.json',
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

  // Strategi 3: klik menu Realisasi untuk capture prefix
  if (!prefix) {
    console.log('  🖱️  Klik menu Realisasi untuk capture prefix...');
    await page.click('a:has-text("Realisasi"), li:has-text("Realisasi")').catch(() => {});
    await page.waitForTimeout(2000);
    const url = page.url();
    const hash = decodeURIComponent(url.split('#/')[1] || '');
    const parts = hash.split('/');
    if (parts[0] && parts[0].length > 20) prefix = encodeURIComponent(parts[0]);
  }

  console.log(`🔑 Prefix: ${prefix || '(tidak terdeteksi)'}`);
  return prefix;
}

// ─── Set Filter: Reset Filter + Show = Lihat Semua ─────────────────────────
async function setFilters(page) {
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

  // 1. Klik Reset Filter (supaya tidak ter-filter kata kunci tertentu)
  console.log('  🔄 Reset filter...');
  await page.click('#resetMonitoringStockKiosIPubers, button:has-text("Reset Filter")').catch(() => {});
  await page.waitForTimeout(1500);

  // 2. Set Show = Semua / Max entries
  console.log('  📋 Setting filter: Lihat Semua...');
  await page.evaluate(() => {
    const showSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.value);
      return opts.includes('-1') || opts.includes('100') || s.name?.includes('length') ||
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
      } else {
        const maxOpt = [...sel.options].reduce((a, b) => (+a.value > +b.value ? a : b));
        sel.value = maxOpt.value;
      }
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(2000);
}

// ─── Scrape Data Tabel Stok Kios ─────────────────────────────────────────────
async function scrapeCurrentPage(page) {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      return {
        kodeKios:    cells[0] || '', // col 0: Kode Kios
        namaKios:    cells[1] || '', // col 1: Nama Kios
        kodeProduct: cells[2] || '', // col 2: Kode Product
        namaProduct: cells[3] || '', // col 3: Nama Product
        stokKg:      cells[4] || '', // col 4: Stok (Kg)
        syncnAt:     cells[5] || '', // col 5: Syncn At
      };
    }).filter(r => r.kodeKios !== '' && r.kodeKios !== 'No data available in table');
  });
}

// ─── Paginasi Info & Next ───────────────────────────────────────────────────
async function getPageInfo(page) {
  return await page.evaluate(() => {
    const info = document.querySelector('.dataTables_info, [class*="pagination-info"], tfoot td')?.innerText?.trim() || '';
    const nextBtn = document.querySelector(
      '.pagination .next:not(.disabled), li.next:not(.disabled) a, [aria-label="Next"]'
    );
    const hasNext = !!nextBtn && !nextBtn.closest('.disabled');
    return { info, hasNext };
  });
}

async function clickNextPage(page) {
  await page.click(
    '.pagination .next:not(.disabled) a, li.next:not(.disabled) a, [aria-label="Next"]:not([disabled])'
  ).catch(() => {});
  await page.waitForTimeout(2000);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  try {
    const prefix = await login(page);

    console.log('\n📋 Navigasi ke Realisasi >> Stok Kios iPuber...');
    const listUrl = prefix
      ? `${CONFIG.baseUrl}/#/${prefix}/monitoring-stock-kios-ipubers`
      : null;

    if (listUrl) {
      console.log(`  URL: ${listUrl}`);
      await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    // Fallback klik menu Realisasi >> Stok Kios iPuber
    let rowCount = await page.$$eval('table tbody tr', r => r.length).catch(() => 0);
    if (rowCount === 0) {
      console.log('  ⚠️  Tabel kosong, klik menu...');
      await page.click('a:has-text("Realisasi"), .menu-item:has-text("Realisasi")').catch(() => {});
      await page.waitForTimeout(1000);
      await page.click('a:has-text("Stok Kios IPuber"), a:has-text("IPuber"), text=IPuber').catch(() => {});
      await page.waitForTimeout(3000);
      console.log(`  URL setelah klik: ${page.url()}`);
    }

    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

    // Set Filter: Reset + Show Max
    console.log('  🔧 Reset filter & set Show = Max entries...');
    await setFilters(page);

    const { info: initInfo } = await getPageInfo(page);
    console.log(`  Info Paginasi: ${initInfo}`);

    // Scrape data (loop halaman jika masih ada paginasi)
    const allData = [];
    let pageNum = 1;

    while (true) {
      console.log(`  📄 Scraping halaman ${pageNum}...`);
      const rows = await scrapeCurrentPage(page);
      allData.push(...rows);
      console.log(`     +${rows.length} record (total: ${allData.length})`);

      const { hasNext } = await getPageInfo(page);
      if (!hasNext) break;
      await clickNextPage(page);
      pageNum++;

      if (pageNum > 30) { // safety limit
        console.log('  ⚠️  Mencapai limit 30 halaman, berhenti.');
        break;
      }
    }

    // ── Print Ringkasan ────────────────────────────────────────────────────
    const line = '='.repeat(100);
    console.log(`\n${line}`);
    console.log('📊 HASIL SCRAPING: Realisasi >> Stok Kios iPuber');
    console.log(line);

    // Grouping statistik per Nama Kios
    const byKios = allData.reduce((acc, r) => {
      acc[r.namaKios] = (acc[r.namaKios] || 0) + 1;
      return acc;
    }, {});

    // Grouping statistik per Nama Product
    const byProduk = allData.reduce((acc, r) => {
      acc[r.namaProduct] = (acc[r.namaProduct] || 0) + 1;
      return acc;
    }, {});

    console.log('\nSampel 10 baris pertama:');
    allData.slice(0, 10).forEach((r, i) => {
      console.log(`\n  [${i+1}] Kios: ${r.namaKios} (${r.kodeKios})`);
      console.log(`       Produk   : ${r.namaProduct} (${r.kodeProduct})`);
      console.log(`       Stok     : ${r.stokKg} Kg`);
      console.log(`       Sync At  : ${r.syncnAt}`);
    });

    console.log(`\n${line}`);
    console.log(`TOTAL DATA STOK KIOS: ${allData.length} Record`);
    console.log(`Jumlah Kios Terdaftar : ${Object.keys(byKios).length} Kios`);
    console.log('\nPer Produk:');
    Object.entries(byProduk).forEach(([prod, n]) => console.log(`  - ${prod}: ${n} record`));
    console.log(line);

    // ── Merging dengan data eksisting jika ada data baru ─────────────────────
    let existingMap = new Map();
    let existingCount = 0;
    
    if (fs.existsSync(CONFIG.outputFile)) {
      try {
        const fileContent = fs.readFileSync(CONFIG.outputFile, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed.data)) {
          existingCount = parsed.data.length;
          parsed.data.forEach(item => {
            const key = `${item.kodeKios}_${item.kodeProduct}`;
            existingMap.set(key, item);
          });
          console.log(`\n📂 Ditemukan data eksisting: ${existingCount} record.`);
        }
      } catch (e) {
        console.log('⚠️ File eksisting tidak valid / gagal dibaca. Membuat file baru.');
      }
    }

    let addedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    allData.forEach(newItem => {
      const key = `${newItem.kodeKios}_${newItem.kodeProduct}`;
      if (existingMap.has(key)) {
        const oldItem = existingMap.get(key);
        if (oldItem.stokKg !== newItem.stokKg || oldItem.syncnAt !== newItem.syncnAt) {
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
    const finalKiosSet = new Set(finalMergedData.map(r => r.kodeKios));

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA:`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record (Kios: ${finalKiosSet.size})`);

    // Simpan ke JSON
    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - Realisasi >> Stok Kios iPuber",
      total_records: finalMergedData.length,
      total_kios: finalKiosSet.size,
      last_sync_summary: {
        scraped_records: allData.length,
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
