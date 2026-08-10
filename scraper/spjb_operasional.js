/**
 * GOW CM Pupuk Indonesia
 * Scraper: Alokasi >> SPJB Operasional + Detail setiap SPJB
 *
 * URL List  : /#/{prefix}/alokasi/spjb/operasional
 * URL Detail: via href link dari tabel list
 *
 * Kolom tabel list (col[0] = checkbox, data mulai col[1]):
 *   [1] Nomor SPJB  [2] Tahun  [3] Distributor  [4] Produsen
 *   [5] Tgl Buat    [6] Tgl Ganti  [7] Status
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'https://gowcm.pupuk-indonesia.com',
  username: '1000001601',
  password: 'A@makmur25',
  outputFile: 'spjb_operasional_full.json',
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
  ).catch(() => { });
  await page.waitForTimeout(4000); // tunggu lebih lama agar sidebar render

  const homeUrl = page.url();
  console.log(`✅ Login berhasil. URL: ${homeUrl}`);

  // Strategi 1: Ambil prefix dari href sidebar links
  let prefix = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href], [href], a[to], router-link')];
    for (const link of links) {
      const href = link.getAttribute('href') || link.getAttribute('to') || '';
      const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (match) return match[1];
    }
    return null;
  });

  // Strategi 2: Tunggu lebih lama, coba lagi
  if (!prefix) {
    console.log('  ⏳ Sidebar belum siap, tunggu 3 detik lagi...');
    await page.waitForTimeout(3000);
    prefix = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href], [href]')];
      for (const link of links) {
        const href = link.href || link.getAttribute('href') || link.getAttribute('to') || '';
        const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
        if (match) return match[1];
      }
      return null;
    });
  }

  // Strategi 3: Klik menu Alokasi dan capture prefix dari URL
  if (!prefix) {
    console.log('  🖱️  Klik menu Alokasi untuk capture prefix dari URL...');
    const clicked = await page.click(
      'a:has-text("Alokasi"), li:has-text("Alokasi"), .sidebar a[href*="alokasi"]'
    ).then(() => true).catch(() => false);

    if (clicked) {
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      console.log(`  URL setelah klik Alokasi: ${currentUrl}`);
      // Ekstrak prefix dari URL hash
      const hash = decodeURIComponent(currentUrl.split('#/')[1] || '');
      const parts = hash.split('/');
      if (parts[0] && parts[0].length > 20) {
        prefix = encodeURIComponent(parts[0]);
      }
    }
  }

  console.log(`🔑 Route Prefix: ${prefix || '(tidak terdeteksi)'}`);
  return prefix;
}

// ─── Navigasi ke list SPJB Operasional ──────────────────────────────────────
async function getSpjbList(page, prefix) {
  console.log('\n📋 Navigasi ke menu Alokasi >> SPJB Operasional...');

  if (prefix) {
    const listUrl = `${CONFIG.baseUrl}/#/${prefix}/alokasi/spjb/operasional`;
    console.log(`  URL: ${listUrl}`);
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Fallback klik menu
  let rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  if (rowCount === 0) {
    console.log('  ⚠️  Tabel kosong, coba klik menu...');
    await page.click('a:has-text("Alokasi"), li:has-text("Alokasi")')
      .catch(() => { });
    await page.waitForTimeout(1000);
    await page.click('a:has-text("SPJB Operasional"), li:has-text("SPJB Operasional"), text=SPJB Operasional')
      .catch(() => { });
    await page.waitForTimeout(3000);
    console.log(`  URL setelah klik menu: ${page.url()}`);
  }

  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => { });
  rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  console.log(`  Rows ditemukan di DOM: ${rowCount}`);

  // ── Filter: Show = Semua ────────────────────────────────────────────────
  console.log('  🔧 Setting filter: Lihat Semua + Status Active...');

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

  await page.waitForTimeout(1000);

  // ── Filter: Status = Active ─────────────────────────────────────────────
  await page.evaluate(() => {
    const statusSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.text.trim().toLowerCase());
      return opts.includes('active') || opts.includes('actived');
    });
    if (statusSelects.length > 0) {
      const sel = statusSelects[0];
      const activeOpt = [...sel.options].find(o =>
        o.text.trim().toLowerCase() === 'active' ||
        o.text.trim().toLowerCase() === 'actived'
      );
      if (activeOpt) {
        sel.value = activeOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    // Vue custom dropdown fallback
    const statusBtn = [...document.querySelectorAll('button, .dropdown-item, li')]
      .find(el => el.innerText?.trim()?.toLowerCase() === 'active' ||
        el.innerText?.trim()?.toLowerCase() === 'actived');
    if (statusBtn) statusBtn.click();
  });

  await page.waitForTimeout(1000);

  // ── Filter: Tahun yang berlaku sekarang (2026) ───────────────────────────
  const currentYear = String(new Date().getFullYear());
  console.log(`  🔧 Setting filter: Tahun ${currentYear}...`);

  await page.evaluate((targetYear) => {
    const yearSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.text.trim());
      return opts.includes(targetYear);
    });
    if (yearSelects.length > 0) {
      const sel = yearSelects[0];
      const targetOpt = [...sel.options].find(o => o.text.trim() === targetYear);
      if (targetOpt) {
        sel.value = targetOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }, currentYear);

  await page.waitForTimeout(2000);
  rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  console.log(`  Rows setelah filter: ${rowCount}`);

  // ── Scrape daftar ─────────────────────────────────────────────────────
  const rawList = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      // col[0] = checkbox (skip) → data mulai col[1]
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      const link = row.querySelector('td:nth-child(2) a') || row.querySelector('a');
      const href = link ? (link.href || link.getAttribute('href') || '') : '';
      return {
        nomorSpjb: cells[1] || '',
        tahun: cells[2] || '',
        distributor: cells[3] || '',
        produsen: cells[4] || '',
        tanggalBuat: cells[5] || '',
        tanggalGanti: cells[6] || '',
        status: cells[7] || '',
        href,
      };
    }).filter(r => r.nomorSpjb !== '');
  });

  // Filter hanya untuk tahun yang berlaku sekarang (2026) & status Active
  const list = rawList.filter(r =>
    (r.tahun === currentYear || r.tahun === '' || !r.tahun) &&
    (r.status.toLowerCase() === 'active' || r.status.toLowerCase() === 'actived')
  );
  console.log(`✅ Ditemukan ${list.length} SPJB Operasional (Tahun: ${currentYear} & Status: Active)`);
  return list;
}

// ─── Ambil detail setiap SPJB ──────────────────────────────────────────────
async function getSpjbDetail(page, spjb) {
  let detailUrl = '';
  if (spjb.href && spjb.href.includes('http')) {
    detailUrl = spjb.href;
  } else if (spjb.href && spjb.href.startsWith('/')) {
    detailUrl = `${CONFIG.baseUrl}/#${spjb.href}`;
  }

  if (!detailUrl) {
    console.log(`  ⚠️  [${spjb.status}] ${spjb.nomorSpjb} → tidak ada href, skip`);
    return { ...spjb, detail: null };
  }

  console.log(`  📄 [${spjb.status}] ${spjb.nomorSpjb} → ${spjb.distributor}`);

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('table, .card, .form-group', { timeout: 8000 }).catch(() => { });
  await page.waitForTimeout(1500);

  // Reload jika belum ada tabel
  const tableCount = await page.$$eval('table', t => t.length).catch(() => 0);
  if (tableCount === 0) {
    console.log(`    ⚠️  Tabel belum muncul, reload...`);
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('table, .card', { timeout: 8000 }).catch(() => { });
    await page.waitForTimeout(2000);
  }

  const detail = await page.evaluate(() => {
    const header = {
      judul: document.querySelector('h4, h3, h2, .page-title, .card-title')?.innerText?.trim() || '',
      status: document.querySelector('[class*="badge"], [class*="label-status"]')?.innerText?.trim() || '',
    };

    // Info fields
    const infoFields = {};
    document.querySelectorAll('.form-group, .row > [class*="col"]').forEach(group => {
      const label = group.querySelector('label')?.innerText?.trim();
      const value = group.querySelector('input')?.value?.trim()
        || group.querySelector('p, span:not(label span)')?.innerText?.trim() || '';
      if (label && value && value !== label && value.length < 300) {
        infoFields[label] = value;
      }
    });

    const tables = [...document.querySelectorAll('table')];
    const parseTable = (table) => {
      if (!table) return { headers: [], rows: [] };
      const headers = [...table.querySelectorAll('thead th, thead td')]
        .map(th => th.innerText.trim()).filter(Boolean);

      const trs = [...table.querySelectorAll('tbody tr')];
      const rows = [];
      let currentKecamatan = '';

      trs.forEach(tr => {
        const ths = [...tr.querySelectorAll('th')].map(th => th.innerText.trim()).filter(Boolean);
        const tds = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());

        // Identifikasi header kecamatan/wilayah (ada di tag <th>)
        if (ths.length > 0) {
          const kecName = ths.find(t => t !== '-' && t !== '#') || '';
          if (kecName) {
            currentKecamatan = kecName;
          }
        }

        if (tds.length > 0 && tds.some(c => c !== '')) {
          const rowCopy = [...tds];
          if (currentKecamatan && rowCopy[1]) {
            if (!rowCopy[1].toLowerCase().includes(currentKecamatan.toLowerCase())) {
              rowCopy[1] = `${currentKecamatan} - ${rowCopy[1]}`;
            }
          }

          // Perhitungan Ulang Sisa Bulan Ini = Sisa Bulan Lalu - SO Approve Bulan Ini
          const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
          const parseVal = (v) => {
            if (!v) return 0;
            const clean = String(v).replace(/\./g, '').replace(',', '.');
            return parseFloat(clean) || 0;
          };
          const fmtVal = (num) => num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

          let runningSisa = 0;
          months.forEach((m, mIdx) => {
            const alokIdx = headers.indexOf(`Alokasi ${m}`);
            const approveIdx = headers.indexOf(`SO Approve ${m}`);
            const sisaIdx = headers.indexOf(`Sisa ${m}`);

            if (sisaIdx !== -1) {
              const alok = alokIdx !== -1 ? parseVal(rowCopy[alokIdx]) : 0;
              const approve = approveIdx !== -1 ? parseVal(rowCopy[approveIdx]) : 0;

              if (mIdx === 0) {
                runningSisa = alok - approve;
              } else {
                runningSisa = (runningSisa + alok) - approve;
              }
              rowCopy[sisaIdx] = fmtVal(runningSisa);
            }
          });

          const totalSisaIdx = headers.indexOf('Total Sisa');
          if (totalSisaIdx !== -1) {
            rowCopy[totalSisaIdx] = fmtVal(runningSisa);
          }

          rows.push(rowCopy);
        }
      });

      return { headers, rows };
    };

    // Identifikasi tabel berdasarkan header
    const alokasiTableEl = tables.find(t => {
      const hdrs = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim().toLowerCase());
      return hdrs.some(h =>
        h.includes('alokasi') || h.includes('kacamatan') ||
        h.includes('urea') || h.includes('npk') || h.includes('realisasi')
      );
    });

    const riwayatTableEl = tables.find(t => {
      const hdrs = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim().toLowerCase());
      return hdrs.some(h =>
        h.includes('dokument') || h.includes('jenis') ||
        h.includes('alasan') || h.includes('riwayat')
      );
    });

    const allParsed = tables.map(t => parseTable(t));

    const fileLinks = [...document.querySelectorAll('a[href*=".pdf"], a[href*="storage"], a[download]')]
      .map(a => a.href).filter(Boolean);

    return {
      header,
      infoFields,
      alokasiTable: parseTable(alokasiTableEl),
      riwayatTable: parseTable(riwayatTableEl),
      allTables: allParsed,
      fileLinks,
    };
  });

  return { ...spjb, detailUrl, detail };
}

// ─── Print ringkasan ────────────────────────────────────────────────────────
function printSummary(results) {
  const line = '='.repeat(100);
  console.log(`\n${line}`);
  console.log('📊 HASIL SCRAPING: Alokasi >> SPJB Operasional');
  console.log(line);

  for (const r of results) {
    const alokasiRows = r.detail?.alokasiTable?.rows?.length || 0;
    const riwayatDocs = r.detail?.riwayatTable?.rows?.length || 0;
    const files = r.detail?.fileLinks?.length || 0;

    console.log(`\n  [${r.status.padEnd(8)}] ${r.nomorSpjb}`);
    console.log(`           Distributor: ${r.distributor} | Produsen: ${r.produsen}`);
    console.log(`           Tahun: ${r.tahun} | Tgl Buat: ${r.tanggalBuat}`);
    console.log(`           Alokasi rows: ${alokasiRows} | Riwayat: ${riwayatDocs} | Files: ${files}`);

    if (alokasiRows > 0) {
      const hdrs = r.detail.alokasiTable.headers.join(' | ');
      console.log(`           Kolom: ${hdrs}`);
      r.detail.alokasiTable.rows.slice(0, 4).forEach(row => {
        console.log(`             →  ${row.join(' | ')}`);
      });
    }
  }

  const byStatus = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  console.log(`\n${line}`);
  console.log(`TOTAL: ${results.length} SPJB Operasional`);
  Object.entries(byStatus).forEach(([s, n]) => console.log(`  - ${s}: ${n}`));
  console.log(line);
}

// ─── Main ────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    const prefix = await login(page);
    const list = await getSpjbList(page, prefix);

    if (list.length === 0) {
      console.error('❌ Tidak ada data SPJB Operasional ditemukan');
      return;
    }

    console.log(`\n🔍 Mengambil detail untuk ${list.length} SPJB...`);
    const results = [];
    for (const spjb of list) {
      const detail = await getSpjbDetail(page, spjb);
      results.push(detail);
    }

    printSummary(results);

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
          const key = item.nomorSpjb || item.spjbNo || JSON.stringify(item);
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

    results.forEach(newItem => {
      const key = newItem.nomorSpjb || newItem.spjbNo || JSON.stringify(newItem);
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

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (SPJB Operasional):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const outputObj = {
      scraped_at: new Date().toISOString(),
      source: "GOW CM - Alokasi >> SPJB Operasional",
      total_records: finalMergedData.length,
      last_sync_summary: {
        scraped_records: results.length,
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
    try { await page.waitForTimeout(1000); } catch (_) { }
    try { await browser.close(); } catch (_) { }
  }
})();
