/**
 * GOW CM Pupuk Indonesia
 * Scraper: Alokasi >> SPJB PPTS + Detail setiap SPJB
 *
 * Fix v2:
 *  - routePrefix diambil DINAMIS dari URL setelah login
 *  - Daftar SPJB diambil via API (credential dari cookies sesi)
 *  - Detail setiap SPJB diambil via navigasi ke halaman detail
 */

const { chromium } = require('playwright');
const fs = require('fs');

const CONFIG = {
  baseUrl: 'https://gowcm.pupuk-indonesia.com',
  username: '1000001601',
  password: 'A@makmur25',
};

// Konversi nomor SPJB ke format URL (ganti "/" dengan "*")
function spjbToRoute(nomorSpjb) {
  return nomorSpjb.replace(/\//g, '*');
}

// Ekstrak encrypted prefix dari URL hash
// Contoh: /#/U2FsdGVk.../alokasi/...  →  "U2FsdGVk..."
function extractPrefix(url) {
  const hash = decodeURIComponent(url.split('#/')[1] || '');
  const parts = hash.split('/');
  // Prefix adalah segmen pertama yang panjangnya > 20 karakter (base64 encrypted)
  return parts[0] && parts[0].length > 20 ? encodeURIComponent(parts[0]) : null;
}

async function login(page) {
  console.log('🔐 Login ke GOW CM...');
  await page.goto(`${CONFIG.baseUrl}/#/login`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[placeholder="Your Username"]', CONFIG.username);
  await page.fill('input[placeholder="Enter Password"]', CONFIG.password);
  await page.click('button:has-text("Masuk")');

  // Tunggu sampai URL berubah dari /login
  await page.waitForFunction(
    () => !window.location.href.includes('/login'),
    { timeout: 15000 }
  ).catch(() => { });

  await page.waitForTimeout(4000);
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

  // Strategi 2: Tunggu lebih lama jika sidebar belum render
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
      const hash = decodeURIComponent(currentUrl.split('#/')[1] || '');
      const parts = hash.split('/');
      if (parts[0] && parts[0].length > 20) {
        prefix = encodeURIComponent(parts[0]);
      }
    }
  }

  if (prefix && prefix.includes('%25')) {
    prefix = decodeURIComponent(prefix);
  }

  console.log(`🔑 Route Prefix: ${prefix || '(tidak terdeteksi)'}`);
  return prefix;
}

async function getSpjbListViaMenu(page, prefix) {
  console.log('\n📋 Navigasi ke menu Alokasi >> SPJB PPTS...');

  // Coba navigasi langsung dengan prefix dari URL sesi ini
  if (prefix) {
    const listUrl = `${CONFIG.baseUrl}/#/${prefix}/alokasi/contract-distributor-ppts`;
    console.log(`  URL: ${listUrl}`);
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);
  }

  // Jika tabel kosong, coba via klik menu
  let rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);

  if (rowCount === 0) {
    console.log('  ⚠️  Tabel kosong via URL langsung, coba via klik menu...');

    // Klik menu Alokasi
    await page.click('a:has-text("Alokasi"), li:has-text("Alokasi"), .menu-item:has-text("Alokasi")')
      .catch(() => page.click('[class*="sidebar"] >> text=Alokasi').catch(() => { }));
    await page.waitForTimeout(1000);

    // Klik submenu SPJB PPTS
    await page.click('a:has-text("SPJB PPTS"), li:has-text("SPJB PPTS")')
      .catch(() => page.click('text=SPJB PPTS').catch(() => { }));
    await page.waitForTimeout(3000);

    console.log(`  URL setelah klik menu: ${page.url()}`);
  }

  // Tunggu tabel muncul
  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => { });
  rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  console.log(`  Rows ditemukan di DOM: ${rowCount}`);

  // ============================
  // Set Filter: Show = Semua & Status = Active
  // ============================
  console.log('  🔧 Setting filter: Lihat Semua + Status Active...');

  await page.evaluate(() => {
    // 1. Set "Show entries" ke nilai terbesar / semua
    // DataTables biasanya punya select[name="...length"] atau select dengan option -1 / "All"
    const showSelects = [...document.querySelectorAll('select')].filter(s => {
      const opts = [...s.options].map(o => o.value);
      return opts.includes('-1') || opts.includes('all') || opts.includes('All') || s.name?.includes('length');
    });

    if (showSelects.length > 0) {
      const sel = showSelects[0];
      // Pilih opsi -1 (All/Semua) atau nilai terbesar
      const allOpt = [...sel.options].find(o => o.value === '-1' || o.text.toLowerCase().includes('semua') || o.text.toLowerCase().includes('all'));
      if (allOpt) {
        sel.value = allOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        // Pilih option dengan value terbesar
        const maxOpt = [...sel.options].reduce((a, b) => (+a.value > +b.value ? a : b));
        sel.value = maxOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  });

  await page.waitForTimeout(1000);

  // Set Status filter ke "Active" jika ada
  await page.evaluate(() => {
    // Cari select yang punya options "Active" dan "Rejected"
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
        sel.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Juga coba klik tombol filter jika ada dropdown Vue custom
    const statusBtn = [...document.querySelectorAll('button, .dropdown-item, li')]
      .find(el => el.innerText?.trim()?.toLowerCase() === 'active' ||
        el.innerText?.trim()?.toLowerCase() === 'actived');
    if (statusBtn) statusBtn.click();
  });

  await page.waitForTimeout(2000);

  // Hitung ulang row setelah filter
  rowCount = await page.$$eval('table tbody tr', rows => rows.length).catch(() => 0);
  console.log(`  Rows setelah filter: ${rowCount}`);

  // Scrape daftar dari tabel
  const list = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      // Kolom 0 = Checkbox (skip), data mulai dari kolom 1
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      const link = row.querySelector('td:nth-child(2) a');
      // Gunakan link.href (absolute URL) bukan getAttribute (relative)
      const href = link ? (link.href || link.getAttribute('href') || '') : '';
      return {
        nomorSpjb: cells[1] || '',  // col 1: Nomor SPJB (col 0 = checkbox)
        kodePpts: cells[2] || '',  // col 2: Kode PPTS
        namaPpts: cells[3] || '',  // col 3: Nama PPTS
        kodePud: cells[4] || '',  // col 4: Kode PUD
        namaPud: cells[5] || '',  // col 5: Nama PUD
        provinsi: cells[6] || '',  // col 6: Provinsi
        kabupaten: cells[7] || '',  // col 7: Kabupaten
        status: cells[8] || '',  // col 8: Status
        tanggalAwal: cells[9] || '', // col 9: Tgl Awal
        tanggalAkhir: cells[10] || '', // col 10: Tgl Akhir
        href,
      };
    }).filter(r => r.nomorSpjb !== '');
  });

  console.log(`✅ Ditemukan ${list.length} SPJB dari tabel`);
  return list;
}

async function getSpjbListViaApi(page) {
  console.log('\n📡 Fallback: Mengambil daftar via API...');

  const result = await page.evaluate(async (baseUrl) => {
    const endpoints = [
      '/api/alokasi/contract-distributor-ppts',
      '/api/alokasi/spjb-ppts',
      '/api/distributor/spjb',
    ];

    for (const ep of endpoints) {
      try {
        const res = await fetch(`${baseUrl}${ep}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          },
        });
        const text = await res.text();
        if (res.ok && text.startsWith('[') || text.includes('"data"')) {
          return { endpoint: ep, status: res.status, body: text };
        }
      } catch (_) { }
    }
    return null;
  }, CONFIG.baseUrl);

  if (!result) return [];

  console.log(`  API: ${result.endpoint} [${result.status}]`);
  try {
    const json = JSON.parse(result.body);
    const rows = Array.isArray(json) ? json
      : Array.isArray(json.data) ? json.data
        : Array.isArray(json.result) ? json.result : [];

    return rows.map(r => ({
      nomorSpjb: r.no_spjb || r.nomorSpjb || r.contract_number || '',
      kodePpts: r.kode_ppts || r.kodePpts || r.ppts_code || '',
      namaPpts: r.nama_ppts || r.namaPpts || r.ppts_name || '',
      kodePud: r.kode_pud || r.kodePud || r.pud_code || '',
      namaPud: r.nama_pud || r.namaPud || r.pud_name || '',
      provinsi: r.provinsi || r.province || '',
      kabupaten: r.kabupaten || r.city || '',
      status: r.status || '',
      tanggalAwal: r.tanggal_awal || r.start_date || '',
      tanggalAkhir: r.tanggal_akhir || r.end_date || '',
    }));
  } catch (_) {
    console.log('  Raw:', result.body.substring(0, 300));
    return [];
  }
}

async function getSpjbDetail(page, spjb, prefix) {
  // Gunakan href langsung dari list (sudah encode dengan benar)
  // Fallback: rebuild URL dengan prefix yang di-decode
  let detailUrl;
  if (spjb.href && spjb.href.startsWith('/')) {
    detailUrl = `${CONFIG.baseUrl}/#${spjb.href}`;
  } else if (spjb.href && spjb.href.includes('http')) {
    detailUrl = spjb.href;
  } else {
    const spjbRoute = spjbToRoute(spjb.nomorSpjb);
    // Decode prefix (dari %252F menjadi %2F)
    const decodedPrefix = decodeURIComponent(prefix);
    detailUrl = `${CONFIG.baseUrl}/#/${decodedPrefix}/alokasi/contract-distributor-ppts/${spjbRoute}/${spjb.kodePpts}`;
  }

  console.log(`  📄 [${spjb.status}] ${spjb.nomorSpjb} → ${spjb.namaPpts}`);

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // Tunggu tabel muncul (max 8 detik)
  await page.waitForSelector('table', { timeout: 8000 }).catch(() => { });
  await page.waitForTimeout(1500);

  // Cek apakah tabel sudah ada; jika belum, reload sekali
  const tableCount = await page.$$eval('table', t => t.length).catch(() => 0);
  if (tableCount === 0) {
    console.log(`    ⚠️  Tabel belum muncul, reload...`);
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => { });
    await page.waitForTimeout(2000);
  }

  // Scrape dari DOM
  const domDetail = await page.evaluate(() => {
    // Info header
    const allText = document.body.innerText;
    const statusMatch = allText.match(/Status[:\s]+(Active|Rejected|Ditolak|Pending)/i);

    const header = {
      judul: document.querySelector('h4, h3, h2, .page-title, .card-title')?.innerText?.trim() || '',
      status: statusMatch ? statusMatch[1] : '',
    };

    // Key-value info fields — dari semua elemen dengan label
    const infoFields = {};
    const formRows = document.querySelectorAll('.form-group, .row > [class*="col"]');
    formRows.forEach(group => {
      const label = group.querySelector('label')?.innerText?.trim();
      const value = group.querySelector('input')?.value?.trim()
        || group.querySelector('p, span:not(label span)')?.innerText?.trim() || '';
      if (label && value && value !== label && value.length < 200) {
        infoFields[label] = value;
      }
    });

    // Tabel Alokasi SPJB & Riwayat — identifikasi berdasarkan header content
    const tables = [...document.querySelectorAll('table')];

    const parseTable = (table) => {
      if (!table) return { headers: [], rows: [], structured: [] };
      const headers = [...table.querySelectorAll('thead th, thead td')]
        .map(th => th.innerText.trim())
        .filter(h => h !== '');

      const rows = [...table.querySelectorAll('tbody tr')].map(tr => {
        return [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
      }).filter(r => r.some(c => c !== ''));

      // Pasangkan sub-row ke parent (untuk Urea/NPK per Kecamatan)
      const structured = [];
      let lastParent = null;
      rows.forEach(row => {
        const isEmpty = !row[0] || row[0].trim() === '' || row[0].trim() === '-';
        if (!isEmpty) {
          lastParent = { kecamatan: row[1] || row[0], data: row, subRows: [] };
          structured.push(lastParent);
        } else if (lastParent) {
          lastParent.subRows.push(row.filter((_, i) => i > 0));
        }
      });

      return { headers, rows, structured };
    };

    // Cari tabel alokasi: punya header "Kacamatan" atau "Alokasi SPJB"
    const alokasiTableEl = tables.find(t => {
      const hdrs = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim());
      return hdrs.some(h => h.toLowerCase().includes('kacamatan') || h.toLowerCase().includes('alokasi spjb'));
    });

    // Cari tabel riwayat: punya header "Dokument" atau "Jenis" atau "Riwayat"
    const riwayatTableEl = tables.find(t => {
      const hdrs = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim());
      return hdrs.some(h => h.toLowerCase().includes('dokument') || h.toLowerCase().includes('jenis') || h.toLowerCase().includes('alasan'));
    });

    const alokasiTable = parseTable(alokasiTableEl);
    const riwayatTable = parseTable(riwayatTableEl);

    console.log('Tables found:', tables.length,
      '| Alokasi:', !!alokasiTableEl,
      '| Riwayat:', !!riwayatTableEl,
      '| Alokasi rows:', alokasiTable.rows.length);

    // PDF links
    const pdfLinks = [...document.querySelectorAll('a[href*=".pdf"], a[href*="storage"], button[class*="evidence"]')]
      .map(a => a.href || a.getAttribute('onclick') || '');

    return { header, infoFields, alokasiTable, riwayatTable, pdfLinks };
  });

  return {
    ...spjb,
    detailUrl,
    detail: domDetail,
  };
}


function printSummary(results) {
  const divider = '='.repeat(110);
  console.log('\n' + divider);
  console.log('📊 HASIL SCRAPING: Alokasi >> SPJB PPTS');
  console.log(divider);

  const byStatus = {};
  results.forEach((r) => {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    const alokasi = r.detail?.alokasiTable?.rows?.length || 0;
    const riwayat = r.detail?.riwayatTable?.rows?.length || 0;
    console.log(`\n  [${r.status?.padEnd(8)}] ${r.nomorSpjb}`);
    console.log(`           PPTS: ${r.kodePpts} - ${r.namaPpts}`);
    console.log(`           Berlaku: ${r.tanggalAwal} s/d ${r.tanggalAkhir}`);
    console.log(`           Alokasi rows: ${alokasi}  |  Riwayat docs: ${riwayat}`);

    if (r.detail?.alokasiTable?.rows?.length > 0) {
      console.log(`           Kolom: ${r.detail.alokasiTable.headers.join(' | ')}`);
      r.detail.alokasiTable.rows.slice(0, 2).forEach(row => {
        console.log(`             → ${row.join(' | ')}`);
      });
    }
    if (r.error) console.log(`           ⚠️  Error: ${r.error}`);
  });

  console.log('\n' + divider);
  console.log(`TOTAL: ${results.length} SPJB`);
  Object.entries(byStatus).forEach(([s, c]) => console.log(`  - ${s}: ${c}`));
  console.log(divider);
}

// =====================
// MAIN
// =====================
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  });

  const page = await context.newPage();

  try {
    // Step 1: Login — ambil prefix dari URL sesi
    const prefix = await login(page);

    // Step 2: Ambil daftar SPJB (via menu → fallback API)
    let spjbList = prefix ? await getSpjbListViaMenu(page, prefix) : [];
    if (spjbList.length === 0) {
      spjbList = await getSpjbListViaApi(page);
    }

    if (spjbList.length === 0) {
      console.log('❌ Tidak ada data SPJB ditemukan');
      await browser.close();
      return;
    }

    console.log(`\n🔍 Mengambil detail untuk ${spjbList.length} SPJB...`);
    const results = [];

    for (const spjb of spjbList) {
      try {
        const r = await getSpjbDetail(page, spjb, prefix);
        results.push(r);
        await page.waitForTimeout(800);
      } catch (err) {
        console.log(`  ⚠️  Gagal: ${spjb.nomorSpjb} — ${err.message}`);
        results.push({ ...spjb, detail: null, error: err.message });
      }
    }

    // Step 4: Ringkasan
    printSummary(results);

    // Step 5: Incremental Merge dengan data eksisting
    const outputFile = path.join(__dirname, 'spjb_ppts_full.json');
    let existingMap = new Map();
    let existingCount = 0;

    if (fs.existsSync(outputFile)) {
      try {
        const fileContent = fs.readFileSync(outputFile, 'utf8');
        const parsed = JSON.parse(fileContent);
        const list = Array.isArray(parsed.data) ? parsed.data : (Array.isArray(parsed) ? parsed : []);
        existingCount = list.length;
        list.forEach(item => {
          const key = `${item.nomorSpjb || ''}_${item.kodePpts || ''}`;
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
      const key = `${newItem.nomorSpjb || ''}_${newItem.kodePpts || ''}`;
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

    console.log(`\n📈 RINGKASAN PERUBAHAN DATA (SPJB PPTS):`);
    console.log(`  ✨ Data Baru (Added)     : ${addedCount} record`);
    console.log(`  🔄 Data Diubah (Updated)  : ${updatedCount} record`);
    console.log(`  ✅ Data Tetap (Unchanged) : ${unchangedCount} record`);
    console.log(`  📊 Total Akhir Record    : ${finalMergedData.length} record`);

    const output = {
      scraped_at: new Date().toISOString(),
      source: 'GOW CM - Alokasi >> SPJB PPTS',
      total: finalMergedData.length,
      last_sync_summary: {
        scraped_records: results.length,
        added_new: addedCount,
        updated: updatedCount,
        unchanged: unchangedCount
      },
      data: finalMergedData,
    };
    fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
    console.log(`\n💾 Disimpan ke: ${outputFile}`);

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    try { await page.waitForTimeout(1000); } catch (_) { }
    try { await browser.close(); } catch (_) { }
  }
})();
