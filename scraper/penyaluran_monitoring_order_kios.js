/**
 * GOW CM Pupuk Indonesia
 * Scraper: Penyaluran ke Pengecer >> 1. Monitoring Order Kios
 *
 * URL List : /#/{prefix}/monitoring-order-kios
 *
 * Kolom tabel:
 *   [0] Status          [1] Nomor Order     [2] Provinsi
 *   [3] Kabupaten/Kota  [4] Kecamatan       [5] Kode Pengecer
 *   [6] Nama Pengecer   [7] Tanggal Order   [8] Durasi Order
 *   [9] Pembayaran      [10] Nilai Order / Total Qty
 *
 * Filter: Tahun 2026 + Show = Lihat Semua
 * Output: penyaluran_monitoring_order_kios_full.json
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl:    'https://gowcm.pupuk-indonesia.com',
  username:   '1000001601',
  password:   'A@makmur25',
  outputFile: 'penyaluran_monitoring_order_kios_full.json',
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

  // 1. Reset filter
  console.log('  🔄 Reset filter...');
  await page.click('#resettableMonitoringOrderKios, button:has-text("Reset Filter")').catch(() => {});
  await page.waitForTimeout(2000);

  // 2. Set Show = Semua
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
  await page.waitForTimeout(3000);
}

async function scrapeCurrentPage(page) {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    const map = new Map();

    rows.forEach(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      if (cells.length < 3) return;

      // Find cell starting with 'PSN'
      const orderIdx = cells.findIndex(c => c.startsWith('PSN'));
      if (orderIdx === -1) return;

      const nomorOrder = cells[orderIdx];
      if (map.has(nomorOrder)) return;

      map.set(nomorOrder, {
        noIndex:            cells[orderIdx - 2] || '',
        status:             cells[orderIdx - 1] || '',
        nomorOrder:         nomorOrder,
        provinsi:           cells[orderIdx + 1] || '',
        kabupatenKota:      cells[orderIdx + 2] || '',
        kecamatan:          cells[orderIdx + 3] || '',
        kodePengecer:       cells[orderIdx + 4] || '',
        namaPengecer:       cells[orderIdx + 5] || '',
        tanggalOrder:       cells[orderIdx + 6] || '',
        durasiOrder:        cells[orderIdx + 7] || '',
        pembayaran:         cells[orderIdx + 8] || '',
        nilaiOrderRupiah:   cells[orderIdx + 9] || '',
        totalQtyTon:        cells[orderIdx + 10] || '',
        terakhirDiperbarui: cells[orderIdx + 11] || '',
        kodeDistributor:    cells[orderIdx + 12] || '',
        namaDistributor:    cells[orderIdx + 13] || '',
      });
    });
    return Array.from(map.values());
  });
}

async function getSpjbList(page, prefix) {
  console.log('\n📋 Navigasi ke Penyaluran ke Pengecer >> 1. Monitoring Order Kios...');
  const listUrl = prefix
    ? `${CONFIG.baseUrl}/#/${prefix}/monitoring-order-kios`
    : `${CONFIG.baseUrl}/#/monitoring-order-kios`;

  console.log(`  URL: ${listUrl}`);
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000); // Tunggu 5s agar data XHR render ke tabel

  // Jika belum ada row, coba klik sidebar menu
  let rowsCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  if (rowsCount === 0) {
    console.log('  ⚠️  Tabel masih kosong, coba klik menu sidebar...');
    await page.click('a:has-text("Penyaluran ke Pengecer"), li:has-text("Penyaluran ke Pengecer")').catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('a[href*="monitoring-order-kios"], text=Monitoring Order Kios').catch(() => {});
    await page.waitForTimeout(5000);
  }

  console.log(`  URL aktif: ${page.url()}`);
  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});

  // Apply Filter
  await setFilters(page);
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
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
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
    console.log('📊 HASIL SCRAPING: Penyaluran ke Pengecer >> 1. Monitoring Order Kios');
    console.log(line);

    console.log('\nSampel 10 baris pertama:');
    allData.slice(0, 10).forEach((r, i) => {
      console.log(`\n  [${i+1}] Order: ${r.nomorOrder} | Status: ${r.status}`);
      console.log(`       Pengecer : ${r.namaPengecer} (${r.kodePengecer})`);
      console.log(`       Lokasi   : ${r.kecamatan}, ${r.kabupatenKota}, ${r.provinsi}`);
      console.log(`       Tgl Order: ${r.tanggalOrder} | Bayar: ${r.pembayaran} | Nilai: ${r.nilaiOrder}`);
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
          const key = item.nomorOrder || item.noOrder || JSON.stringify(item);
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
      const key = newItem.nomorOrder || newItem.noOrder || JSON.stringify(newItem);
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

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (Monitoring Order Kios):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - Penyaluran ke Pengecer >> 1. Monitoring Order Kios",
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
