/**
 * GOW CM Pupuk Indonesia
 * Scraper: Penyaluran ke Pengecer >> 2. Monitoring Pemenuhan Order Pengecer
 *
 * URL List : /#/{prefix}/monitoring-pemenuhan-order-pengecer
 *
 * Kolom tabel:
 *   [0] Monitoring Number  [1] Kode Produsen   [2] Nama Produsen
 *   [3] Kode Distributor   [4] Nama Distributor [5] Provinsi
 *   [6] Kabupaten          [7] Kecamatan        [8] Tgl. Dibuat
 *   [9] Tgl. Diubah        [10] Aksi
 *
 * Filter: Reset Filter + Show = Lihat Semua
 * Output: penyaluran_monitoring_pop_full.json
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl:    'https://gowcm.pupuk-indonesia.com',
  username:   '1000001601',
  password:   'A@makmur25',
  outputFile: 'penyaluran_monitoring_pop_full.json',
};

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
    console.log('  🖱️  Klik menu Penyaluran ke Pengecer untuk capture prefix...');
    await page.click('a:has-text("Penyaluran ke Pengecer"), li:has-text("Penyaluran ke Pengecer")').catch(() => {});
    await page.waitForTimeout(2000);
    const url = page.url();
    const hash = decodeURIComponent(url.split('#/')[1] || '');
    const parts = hash.split('/');
    if (parts[0] && parts[0].length > 20) prefix = encodeURIComponent(parts[0]);
  }

  console.log(`🔑 Prefix: ${prefix || '(tidak terdeteksi)'}`);
  return prefix;
}

async function setFilters(page) {
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

  // Reset filter
  console.log('  🔄 Reset filter...');
  await page.click('#resetFilterMonitoringPOP, button:has-text("Reset Filter")').catch(() => {});
  await page.waitForTimeout(1500);

  // Set Show = Semua
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
      if (allOpt) sel.value = allOpt.value;
      else {
        const maxOpt = [...sel.options].reduce((a, b) => (+a.value > +b.value ? a : b));
        sel.value = maxOpt.value;
      }
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      sel.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(2000);
}

async function scrapeCurrentPage(page) {
  return await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return [];

    const firstHeader = table.querySelector('thead th:first-child')?.innerText?.trim();
    const offset = (!firstHeader || firstHeader === '' || firstHeader === '#') ? 1 : 0;

    const rows = [...table.querySelectorAll('tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      if (cells.length < 3) return null;
      return {
        monitoringNumber: cells[0 + offset] || '',
        kodeProdusen:     cells[1 + offset] || '',
        namaProdusen:     cells[2 + offset] || '',
        kodeDistributor:  cells[3 + offset] || '',
        namaDistributor:  cells[4 + offset] || '',
        provinsi:         cells[5 + offset] || '',
        kabupaten:        cells[6 + offset] || '',
        kecamatan:        cells[7 + offset] || '',
        tglDibuat:        cells[8 + offset] || '',
        tglDiubah:        cells[9 + offset] || '',
      };
    }).filter(r => r && r.monitoringNumber !== '' && r.monitoringNumber !== 'No data available in table');
  });
}

async function getPageInfo(page) {
  return await page.evaluate(() => {
    const info = document.querySelector('.dataTables_info, [class*="pagination-info"], tfoot td')?.innerText?.trim() || '';
    const nextBtn = document.querySelector('.pagination .next:not(.disabled), li.next:not(.disabled) a, [aria-label="Next"]');
    const hasNext = !!nextBtn && !nextBtn.closest('.disabled');
    return { info, hasNext };
  });
}

async function clickNextPage(page) {
  await page.click('.pagination .next:not(.disabled) a, li.next:not(.disabled) a, [aria-label="Next"]:not([disabled])').catch(() => {});
  await page.waitForTimeout(2000);
}

async function getSpjbList(page, prefix) {
  console.log('\n📋 Navigasi ke Penyaluran ke Pengecer >> 2. Monitoring Pemenuhan Order Pengecer...');
  const listUrl = prefix
    ? `${CONFIG.baseUrl}/#/${prefix}/monitoring-pemenuhan-order-pengecer`
    : `${CONFIG.baseUrl}/#/monitoring-pemenuhan-order-pengecer`;

  console.log(`  URL: ${listUrl}`);
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  let rowsCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  if (rowsCount === 0) {
    console.log('  ⚠️  Tabel masih kosong, coba klik menu sidebar...');
    await page.click('a:has-text("Penyaluran ke Pengecer"), li:has-text("Penyaluran ke Pengecer")').catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('a[href*="monitoring-pemenuhan-order-pengecer"], text=Monitoring Pemenuhan Order Pengecer').catch(() => {});
    await page.waitForTimeout(5000);
  }

  console.log(`  URL aktif: ${page.url()}`);
  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

  await setFilters(page);
}

async function scrapeCurrentPage(page) {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    const map = new Map();

    rows.forEach(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      if (cells.length < 3) return;

      const popIdx = cells.findIndex(c => c.startsWith('POP'));
      if (popIdx === -1) return;

      const monitoringNumber = cells[popIdx];
      if (map.has(monitoringNumber)) return;

      map.set(monitoringNumber, {
        monitoringNumber: monitoringNumber,
        kodeProdusen:     cells[popIdx + 1] || '',
        namaProdusen:     cells[popIdx + 2] || '',
        kodeDistributor:  cells[popIdx + 3] || '',
        namaDistributor:  cells[popIdx + 4] || '',
        provinsi:         cells[popIdx + 5] || '',
        kabupaten:        cells[popIdx + 6] || '',
        kecamatan:        cells[popIdx + 7] || '',
        tglDibuat:        cells[popIdx + 8] || '',
        tglDiubah:        cells[popIdx + 9] || '',
      });
    });

    return Array.from(map.values());
  });
}

async function getPageInfo(page) {
  return await page.evaluate(() => {
    const info = document.querySelector('.dataTables_info, [class*="pagination-info"], tfoot td')?.innerText?.trim() || '';
    const nextBtn = document.querySelector('.pagination .next:not(.disabled), li.next:not(.disabled) a, [aria-label="Next"]');
    const hasNext = !!nextBtn && !nextBtn.closest('.disabled');
    return { info, hasNext };
  });
}

async function clickNextPage(page) {
  await page.click('.pagination .next:not(.disabled) a, li.next:not(.disabled) a, [aria-label="Next"]:not([disabled])').catch(() => {});
  await page.waitForTimeout(2500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  try {
    const prefix = await login(page);
    await getSpjbList(page, prefix);

    const allData = [];
    let pageNum = 1;

    while (true) {
      console.log(`  📄 Scraping halaman ${pageNum}...`);
      const rows = await scrapeCurrentPage(page);
      allData.push(...rows);
      console.log(`     +${rows.length} record unik (total: ${allData.length})`);

      const { hasNext } = await getPageInfo(page);
      if (!hasNext) break;
      await clickNextPage(page);
      pageNum++;
      if (pageNum > 30) break;
    }

    const line = '='.repeat(100);
    console.log(`\n${line}`);
    console.log('📊 HASIL SCRAPING: Penyaluran ke Pengecer >> 2. Monitoring Pemenuhan Order Pengecer');
    console.log(line);

    console.log('\nSampel 10 baris pertama:');
    allData.slice(0, 10).forEach((r, i) => {
      console.log(`\n  [${i+1}] Monitoring No: ${r.monitoringNumber}`);
      console.log(`       Produsen     : ${r.namaProdusen} (${r.kodeProdusen})`);
      console.log(`       Distributor  : ${r.namaDistributor} (${r.kodeDistributor})`);
      console.log(`       Lokasi       : ${r.kecamatan}, ${r.kabupaten}, ${r.provinsi}`);
      console.log(`       Tgl Dibuat   : ${r.tglDibuat} | Tgl Diubah: ${r.tglDiubah}`);
    });

    console.log(`\n${line}`);
    console.log(`TOTAL UNIK RECORD: ${allData.length}`);
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
          const key = item.monitoringNumber || item.noMonitoring || JSON.stringify(item);
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

    allData.forEach(newItem => {
      const key = newItem.monitoringNumber || newItem.noMonitoring || JSON.stringify(newItem);
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

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (Monitoring Pemenuhan Order Pengecer):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - Penyaluran ke Pengecer >> 2. Monitoring Pemenuhan Order Pengecer",
      total_records: finalMergedData.length,
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

    // Auto update penyaluran_full.json
    try {
      console.log('🔄 Memperbarui file penyaluran_full.json...');
      require('child_process').execSync('node gabung_penyaluran.js', { cwd: __dirname, stdio: 'inherit' });
    } catch (_) {}

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    try { await page.waitForTimeout(1000); } catch (_) {}
    try { await browser.close(); } catch (_) {}
  }
})();
