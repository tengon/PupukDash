/**
 * GOW CM Pupuk Indonesia
 * Scraper: ORDER >> Monitoring Order
 *
 * URL List : /#/{prefix}/transaksi/monitoring-order-light
 *
 * Kolom tabel (col[0] = checkbox, data mulai col[1]):
 *   [1] No. Penebusan  [2] Kode Referensi  [3] Nama Distributor
 *   [4] Nama Produsen  [5] Kode Booking    [6] Batas Akhir
 *   [7] Tgl Pengambilan [8] Tgl Rencana    [9] Tgl Order
 *   [10] Status         [11] Kode SO
 *
 * PENTING: Kode Booking dibaca dari .innerText (bukan download file).
 *   - Aktif  : <a id="downloadBookingCodeMO">8003547148</a>
 *   - Lainnya: teks biasa
 *
 * Filter: Show = Semua (semua halaman sekaligus)
 * Output: monitoring_order_full.json
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
  outputFile: 'monitoring_order_full.json',
};

// ─── Login & ambil prefix ────────────────────────────────────────────────────
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

  // Strategi 3: klik menu untuk trigger routing
  if (!prefix) {
    console.log('  🖱️  Klik menu untuk capture prefix...');
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

// ─── Set filter "Lihat Semua" + Tahun 2026 ──────────────────────────────────
async function setFilters(page, tahun = '2026') {
  // 0. Tutup modal jika ada (modal-backdrop menghalangi klik)
  const hasModal = await page.evaluate(() => !!document.querySelector('.modal-backdrop'));
  if (hasModal) {
    console.log('  🚭 Menutup modal yang terbuka...');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1000);
    // Jika Escape tidak cukup, klik tombol OK/Close modal
    await page.click(
      '.modal.show button:has-text("OK"), .modal.show button:has-text("Tutup"), .modal.show .btn-primary'
    ).catch(() => {});
    await page.waitForTimeout(1000);
    // Force remove backdrop via JS
    await page.evaluate(() => {
      document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
      document.querySelectorAll('.modal.show').forEach(el => {
        el.classList.remove('show');
        el.style.display = 'none';
      });
      document.body.classList.remove('modal-open');
    });
    await page.waitForTimeout(500);
  }

  // 1. Set filter Tahun via JavaScript langsung (tidak klik, lebih aman)
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
      // Set nilai via property + event agar Vue reactive
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set;
      if (nativeInputValueSetter) nativeInputValueSetter.call(el, tahun);
      else el.value = tahun;
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, tahun);

  console.log(`     ${filled ? '✅' : '⚠️ '} Filter tahun: ${filled ? 'diterapkan' : 'tidak ditemukan'}`);
  if (filled) {
    await page.waitForTimeout(2000);
    // Cari dan klik tombol "Cari/Filter/Search" jika ada
    await page.click(
      'button:has-text("Cari"), button:has-text("Filter"), button:has-text("Search"), button[type="submit"]'
    ).catch(() => {});
    await page.waitForTimeout(2000);
  }

  // 2. Set Show = Semua (load semua entri)
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

// ─── Scrape baris dari tabel yang sedang tampil ──────────────────────────────
async function scrapeCurrentPage(page) {
  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      // col[0] = checkbox, data mulai col[1]
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());

      // Kode Booking: baca .innerText dari elemen (link atau teks biasa)
      // JANGAN klik/download — hanya baca nilai teksnya
      const kodeBookingCell = row.querySelector('td:nth-child(6)');
      const kodeBookingEl   = kodeBookingCell?.querySelector('a, span, b') || kodeBookingCell;
      const kodeBooking     = kodeBookingEl?.innerText?.trim() || cells[5] || '';

      // Kode SO (kolom terakhir)
      const kodeSoCell = row.querySelector('td:last-child');
      const kodeSo     = kodeSoCell?.innerText?.trim() || cells[cells.length - 1] || '';

      // Link detail: ambil dari sel No. Penebusan (td:nth-child(2) a)
      const detailLink = row.querySelector('td:nth-child(2) a') ||
                         row.querySelector('a[href*="order/detail"], a[href*="transaksi"]');
      const detailHref = detailLink ? (detailLink.href || '') : '';

      return {
        noPenebusan:     cells[1] || '',
        kodeReferensi:   cells[2] || '',
        namaDistributor: cells[3] || '',
        namaProdusen:    cells[4] || '',
        kodeBooking,
        batasAkhir:      cells[6] || '',
        tglPengambilan:  cells[7] || '',
        tglRencana:      cells[8] || '',
        tglOrder:        cells[9] || '',
        status:          cells[10] || '',
        kodeSo,
        detailHref,
      };
    }).filter(r =>
      // Hanya ambil baris utama: No. Penebusan diawali 'ORD' dan status tidak kosong
      r.noPenebusan.startsWith('ORD') && r.status !== ''
    );
  });
}

// ─── Navigasi paginasi ───────────────────────────────────────────────────────
async function getPageInfo(page) {
  return await page.evaluate(() => {
    // "Showing X to Y of Z entries"
    const info = document.querySelector('.dataTables_info, [class*="pagination-info"], tfoot td')?.innerText?.trim() || '';
    // Tombol Next
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

// ─── Ambil detail setiap No. Penebusan ──────────────────────────────────────
async function getOrderDetail(page, order) {
  if (!order.detailHref || !order.detailHref.includes('http')) {
    return { ...order, detail: null };
  }

  console.log(`  🔍 Detail: ${order.noPenebusan} (${order.status})`);
  await page.goto(order.detailHref, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('.card, table, .form-group', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  const detail = await page.evaluate(() => {
    // ── Info Fields ──────────────────────────────────────────────────────────
    const infoFields = {};
    document.querySelectorAll('.form-group, .row > [class*="col"], .col-md-6, .col-sm-6').forEach(group => {
      const label = group.querySelector('label')?.innerText?.trim();
      const value = group.querySelector('input')?.value?.trim()
                  || group.querySelector('p, .form-control-plaintext, span:not(label span)')?.innerText?.trim() || '';
      if (label && value && value !== label && value.length < 300 && !value.includes('\n')) {
        infoFields[label.replace(/:$/,'')] = value;
      }
    });

    // ── Tabel produk (Kec/Pengecer | Urea | NPK | ...) ──────────────────────
    const tables = [...document.querySelectorAll('table')];
    const parseTable = (t) => {
      if (!t) return { headers: [], rows: [] };
      const headers = [...t.querySelectorAll('thead th, thead td')]
        .map(th => th.innerText.trim()).filter(Boolean);
      const rows = [...t.querySelectorAll('tbody tr')]
        .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
        .filter(r => r.some(c => c !== ''));
      return { headers, rows };
    };

    // Tabel produk: cari kolom Urea / NPK / Kec
    const produkTableEl = tables.find(t => {
      const hdrs = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim().toLowerCase());
      return hdrs.some(h => h.includes('urea') || h.includes('npk') || h.includes('kec') || h.includes('pengecer'));
    });

    // Semua tabel
    const allTables = tables.map(t => parseTable(t));

    return {
      infoFields,
      produkTable: parseTable(produkTableEl),
      allTables,
    };
  });

  return { ...order, detail };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page    = await context.newPage();

  try {
    const prefix = await login(page);

    // Navigasi ke Monitoring Order
    console.log('\n📋 Navigasi ke ORDER >> Monitoring Order...');
    const listUrl = prefix
      ? `${CONFIG.baseUrl}/#/${prefix}/transaksi/monitoring-order-light`
      : null;

    if (listUrl) {
      console.log(`  URL: ${listUrl}`);
      await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    // Fallback: klik menu
    let rowCount = await page.$$eval('table tbody tr', r => r.length).catch(() => 0);
    if (rowCount === 0) {
      console.log('  ⚠️  Tabel kosong, klik menu...');
      await page.click('a:has-text("Order"), .menu-item:has-text("Order")').catch(() => {});
      await page.waitForTimeout(1000);
      await page.click('a:has-text("Monitoring Order"), text=Monitoring Order').catch(() => {});
      await page.waitForTimeout(3000);
      console.log(`  URL setelah klik: ${page.url()}`);
    }

    await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
    rowCount = await page.$$eval('table tbody tr', r => r.length).catch(() => 0);
    console.log(`  Rows di DOM: ${rowCount}`);

    // Set filter: Tahun 2026 + Lihat Semua
    console.log('  🔧 Setting filter: Tahun 2026 + Lihat Semua...');
    await setFilters(page, '2026');

    rowCount = await page.$$eval('table tbody tr', r => r.length).catch(() => 0);
    const { info } = await getPageInfo(page);
    console.log(`  Rows setelah filter: ${rowCount} | ${info}`);

    // Scrape semua halaman jika masih pagination
    const allResults = [];
    let pageNum = 1;

    while (true) {
      console.log(`  📄 Scraping halaman ${pageNum}...`);
      const rows = await scrapeCurrentPage(page);
      allResults.push(...rows);
      console.log(`     +${rows.length} rows (total: ${allResults.length})`);

      const { hasNext } = await getPageInfo(page);
      if (!hasNext) break;
      await clickNextPage(page);
      pageNum++;

      if (pageNum > 50) { // safety limit
        console.log('  ⚠️  Mencapai limit 50 halaman, berhenti.');
        break;
      }
    }

    // ── Ambil detail setiap No. Penebusan ────────────────────────────────
    console.log(`\n🔍 Mengambil detail untuk ${allResults.length} order...`);
    const finalResults = [];
    for (const order of allResults) {
      const withDetail = await getOrderDetail(page, order);
      finalResults.push(withDetail);
    }

    // ── Print ringkasan ────────────────────────────────────────────────────
    const line = '='.repeat(100);
    console.log(`\n${line}`);
    console.log('📊 HASIL SCRAPING: ORDER >> Monitoring Order (dengan Detail)');
    console.log(line);

    const byStatus = finalResults.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    // Tampilkan 10 baris pertama sebagai sampel
    console.log('\nSampel 10 baris pertama:');
    finalResults.slice(0, 10).forEach((r, i) => {
      const d = r.detail;
      console.log(`\n  [${i+1}] ${r.noPenebusan}`);
      console.log(`       Produsen     : ${r.namaProdusen}`);
      console.log(`       Kode Booking : ${r.kodeBooking}`);
      console.log(`       Status       : ${r.status} | Tgl Order: ${r.tglOrder}`);
      if (d?.infoFields) {
        const spjb    = d.infoFields['SPJB'] || d.infoFields['Nomor SPJB'] || '';
        const provinsi= d.infoFields['Provinsi'] || '';
        const total   = d.infoFields['Jumlah Setelah Pajak'] || '';
        if (spjb)     console.log(`       SPJB         : ${spjb}`);
        if (provinsi) console.log(`       Provinsi     : ${provinsi}`);
        if (total)    console.log(`       Total        : ${total}`);
      }
      if (d?.produkTable?.rows?.length > 0) {
        console.log(`       Produk rows  : ${d.produkTable.rows.length}`);
        d.produkTable.rows.slice(0, 2).forEach(row =>
          console.log(`         →  ${row.slice(0,5).join(' | ')}`)
        );
      }
    });

    console.log(`\n${line}`);
    console.log(`TOTAL: ${finalResults.length} Order`);
    Object.entries(byStatus).forEach(([s, n]) => console.log(`  - ${s}: ${n}`));
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
          const key = item.noOrder || item.noPenebusan || item.nomorOrder || JSON.stringify(item);
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

    finalResults.forEach(newItem => {
      const key = newItem.noOrder || newItem.noPenebusan || newItem.nomorOrder || JSON.stringify(newItem);
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

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (Monitoring Order):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - ORDER >> Monitoring Order",
      total_records: finalMergedData.length,
      last_sync_summary: {
        scraped_records: finalResults.length,
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
