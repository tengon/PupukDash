/**
 * GOW CM Pupuk Indonesia
 * Scraper: Penyaluran ke Pengecer >> 4. Surat Jalan
 *
 * URL List : /#/{prefix}/pemenuhan-order-kios/surat-jalan
 *
 * Kolom tabel:
 *   [0] No. Surat Jalan  [1] Kode PUD         [2] Nama PUD
 *   [3] Provinsi         [4] Kabupaten        [5] Kode Produsen
 *   [6] Nama Produsen    [7] Tgl. Surat Jalan [8] Tgl. Dibuat
 *   [9] Tgl. Diubah      [10] Aksi
 *
 * Filter: Reset Filter + Show = Lihat Semua
 * Output: penyaluran_surat_jalan_full.json
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl:    'https://gowcm.pupuk-indonesia.com',
  username:   '1000001601',
  password:   'A@makmur25',
  outputFile: 'penyaluran_surat_jalan_full.json',
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
  await page.click('#resetFilterSuratJalanPemenuhanOrderKios, button:has-text("Reset Filter")').catch(() => {});
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
        noSuratJalan:  cells[0 + offset] || '',
        kodePud:       cells[1 + offset] || '',
        namaPud:       cells[2 + offset] || '',
        provinsi:      cells[3 + offset] || '',
        kabupaten:     cells[4 + offset] || '',
        kodeProdusen:  cells[5 + offset] || '',
        namaProdusen:  cells[6 + offset] || '',
        tglSuratJalan: cells[7 + offset] || '',
        tglDibuat:     cells[8 + offset] || '',
        tglDiubah:     cells[9 + offset] || '',
      };
    }).filter(r => r && r.noSuratJalan !== '' && r.noSuratJalan !== 'No data available in table');
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
  console.log('\n📋 Navigasi ke Penyaluran ke Pengecer >> 4. Surat Jalan...');
  const listUrl = prefix
    ? `${CONFIG.baseUrl}/#/${prefix}/pemenuhan-order-kios/surat-jalan`
    : `${CONFIG.baseUrl}/#/pemenuhan-order-kios/surat-jalan`;

  console.log(`  URL: ${listUrl}`);
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(5000);

  let rowsCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  if (rowsCount === 0) {
    console.log('  ⚠️  Tabel masih kosong, coba klik menu sidebar...');
    await page.click('a:has-text("Penyaluran ke Pengecer"), li:has-text("Penyaluran ke Pengecer")').catch(() => {});
    await page.waitForTimeout(1000);
    await page.click('a[href*="surat-jalan"], text=Surat Jalan').catch(() => {});
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

      const noSuratJalan = cells[0];
      if (!noSuratJalan || noSuratJalan === 'No data available in table' || map.has(noSuratJalan)) return;

      map.set(noSuratJalan, {
        noSuratJalan:  noSuratJalan,
        kodePud:       cells[1] || '',
        namaPud:       cells[2] || '',
        provinsi:      cells[3] || '',
        kabupaten:     cells[4] || '',
        kodeProdusen:  cells[5] || '',
        namaProdusen:  cells[6] || '',
        tglSuratJalan: cells[7] || '',
        tglDibuat:     cells[8] || '',
        tglDiubah:     cells[9] || '',
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
    console.log('📊 HASIL SCRAPING: Penyaluran ke Pengecer >> 4. Surat Jalan');
    console.log(line);

    console.log('\nSampel 10 baris pertama:');
    allData.slice(0, 10).forEach((r, i) => {
      console.log(`\n  [${i+1}] Surat Jalan: ${r.noSuratJalan}`);
      console.log(`       PUD        : ${r.namaPud} (${r.kodePud})`);
      console.log(`       Produsen   : ${r.namaProdusen} (${r.kodeProdusen})`);
      console.log(`       Lokasi     : ${r.kabupaten}, ${r.provinsi}`);
      console.log(`       Tgl Surat  : ${r.tglSuratJalan} | Tgl Dibuat: ${r.tglDibuat}`);
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
          const key = item.noSuratJalan || item.nomorSuratJalan || JSON.stringify(item);
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
      const key = newItem.noSuratJalan || newItem.nomorSuratJalan || JSON.stringify(newItem);
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

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (Surat Jalan):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - Penyaluran ke Pengecer >> 4. Surat Jalan",
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
