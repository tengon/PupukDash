/**
 * spjb_ppts.js — GOW CM Scraper: Alokasi >> SPJB PPTS
 *
 * Schema target (dari gambar):
 *   Alokasi → SPJB PPTS
 *     ├── Nomor SPJB
 *     ├── Kode PPTS  (key)
 *     ├── Nama PPTS  (key)
 *     └── Detail per SPJB:
 *           Kecamatan | Alokasi SPJB | Realisasi | Sisa Alokasi
 *
 * Filter: Show = Lihat Semua, Status = Active
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Playwright dari d:\testGet\node_modules
const playwrightPath = path.join('d:', 'testGet', 'node_modules', 'playwright');

const CREDENTIALS = {
  username: '1000001601',
  password: 'A@makmur25',
};

const OUTPUT_FILE = path.join(__dirname, 'spjb_ppts_full.json');
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const str = String(val).trim();
  if (!str || str === '-') return 0;

  // Jika ada koma dan titik (misal "1.250,50")
  if (str.includes('.') && str.includes(',')) {
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
  }
  // Jika hanya ada koma (misal "82,5" atau "82,50")
  if (str.includes(',')) {
    return parseFloat(str.replace(',', '.')) || 0;
  }
  // Jika hanya ada titik (misal "82.5" atau "1.753")
  if (str.includes('.')) {
    const parts = str.split('.');
    // Jika bagian setelah titik bukan 3 digit (misal 82.5, 46.5, 82.50) -> itu desimal!
    if (parts.length === 2 && parts[1].length !== 3) {
      return parseFloat(str) || 0;
    }
  }
  return parseFloat(str) || 0;
}

/** Ekstrak prefix dari URL page yang sedang aktif */
function extractPrefixFromUrl(url) {
  const match = url.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
  if (match) return match[1];
  const match2 = url.match(/#\/([A-Za-z0-9+\/=%]{20,})$/);
  if (match2) return match2[1];
  return null;
}

/** Login dan ambil encrypted prefix dari sidebar — robust multi-fallback */
async function loginAndGetPrefix(page) {
  console.log('[LOGIN] Navigasi ke halaman login...');

  // Set user-agent agar tidak terdeteksi sebagai bot headless
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1000);

  await page.fill('input[placeholder="Your Username"]', CREDENTIALS.username);
  await page.fill('input[placeholder="Enter Password"]', CREDENTIALS.password);
  await page.click('button:has-text("Masuk")');

  // Tunggu redirect keluar dari /login
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 20000 });
  console.log('[LOGIN] Redirect berhasil, URL:', page.url().substring(0, 80));

  // Tunggu sidebar ter-render (lebih lama di VPS headless)
  await sleep(5000);

  // ── STRATEGI 1: Ambil prefix dari href sidebar/nav ──
  let prefix = await page.evaluate(() => {
    const els = [
      ...document.querySelectorAll('a[href]'),
      ...document.querySelectorAll('[href]'),
      ...document.querySelectorAll('li a'),
      ...document.querySelectorAll('nav a'),
      ...document.querySelectorAll('.sidebar a'),
      ...document.querySelectorAll('.menu a'),
    ];
    for (const el of els) {
      const href = el.getAttribute('href') || '';
      const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (match) return match[1];
    }
    return null;
  });

  if (prefix) {
    const decoded = decodeURIComponent(prefix);
    console.log('[LOGIN] Prefix via sidebar OK:', decoded.substring(0, 30) + '...');
    return decoded;
  }
  console.warn('[LOGIN] Strategi 1 gagal, coba strategi 2 (page URL)...');

  // ── STRATEGI 2: Ambil prefix dari URL saat ini ──
  prefix = extractPrefixFromUrl(page.url());
  if (prefix) {
    const decoded = decodeURIComponent(prefix);
    console.log('[LOGIN] Prefix via URL OK:', decoded.substring(0, 30) + '...');
    return decoded;
  }
  console.warn('[LOGIN] Strategi 2 gagal, coba strategi 3 (klik menu dulu)...');

  // ── STRATEGI 3: Klik salah satu menu agar navigasi terjadi & prefix muncul di URL ──
  try {
    const clicked = await page.evaluate(() => {
      const els = [
        ...document.querySelectorAll('a[href*="alokasi"]'),
        ...document.querySelectorAll('a[href*="#/"]'),
        ...document.querySelectorAll('nav a'),
        ...document.querySelectorAll('.sidebar a'),
      ];
      if (els.length > 0) {
        els[0].click();
        return els[0].getAttribute('href') || '';
      }
      return null;
    });
    console.log('[LOGIN] Klik menu:', clicked);
    await sleep(2000);

    prefix = extractPrefixFromUrl(page.url());
    if (prefix) {
      const decoded = decodeURIComponent(prefix);
      console.log('[LOGIN] Prefix via klik-menu OK:', decoded.substring(0, 30) + '...');
      return decoded;
    }

    prefix = await page.evaluate(() => {
      const els = [...document.querySelectorAll('a[href]')];
      for (const el of els) {
        const href = el.getAttribute('href') || '';
        const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
        if (match) return match[1];
      }
      return null;
    });
    if (prefix) {
      const decoded = decodeURIComponent(prefix);
      console.log('[LOGIN] Prefix via sidebar (post-click) OK:', decoded.substring(0, 30) + '...');
      return decoded;
    }
  } catch (e) {
    console.warn('[LOGIN] Strategi 3 error:', e.message);
  }

  // ── STRATEGI 4: Screenshot debug & scan semua href ──
  try {
    await page.screenshot({ path: path.join(__dirname, 'debug_login_vps.png') });
    console.log('[LOGIN] Screenshot disimpan: debug_login_vps.png');
    const allHrefs = await page.evaluate(() =>
      [...document.querySelectorAll('[href]')].map(el => el.getAttribute('href') || '').filter(Boolean)
    );
    console.log('[LOGIN] Semua href di DOM:', allHrefs.slice(0, 20));
    console.log('[LOGIN] URL saat ini:', page.url());
  } catch (e) {
    console.warn('[LOGIN] Screenshot/debug error:', e.message);
  }

  throw new Error('Gagal mendapatkan encrypted prefix dari sidebar! (Semua strategi gagal)');
}

/** Set filter Show = Lihat Semua dan Status = Active */
async function setFilters(page) {
  try {
    // Cari select "Show" (jumlah tampil) — set ke nilai terbesar / "All"
    const showSelects = await page.$$('select');
    for (const sel of showSelects) {
      const options = await sel.evaluate(el => [...el.options].map(o => ({ value: o.value, text: o.text })));
      const allOpt = options.find(o =>
        o.text.toLowerCase().includes('semua') ||
        o.text.toLowerCase().includes('all') ||
        o.value === '-1' || o.value === '0' || parseInt(o.value) >= 100
      );
      if (allOpt) {
        await sel.selectOption(allOpt.value);
        console.log('[FILTER] Show set ke:', allOpt.text);
        await sleep(1000);
        break;
      }
    }

    // Cari filter Status = Active
    // Biasanya berupa select dropdown atau filter pill
    const statusSelects = await page.$$('select');
    for (const sel of statusSelects) {
      const options = await sel.evaluate(el => [...el.options].map(o => ({ value: o.value, text: o.text })));
      const activeOpt = options.find(o =>
        o.text.toLowerCase().includes('active') ||
        o.text.toLowerCase().includes('aktif') ||
        o.value.toLowerCase() === 'active'
      );
      if (activeOpt) {
        await sel.selectOption(activeOpt.value);
        console.log('[FILTER] Status set ke:', activeOpt.text);
        await sleep(1000);
        break;
      }
    }

    await sleep(DELAY_MS);
  } catch (e) {
    console.warn('[FILTER] Warning set filter:', e.message);
  }
}

/** Scrape satu halaman tabel list SPJB PPTS */
async function scrapeListPage(page) {
  await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
  await sleep(500);

  return await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      // cells[0] = checkbox (SKIP)
      const href = row.querySelector('td a')?.getAttribute('href') ||
                   row.querySelector('a')?.getAttribute('href') || '';
      return {
        nomorSpjb:   cells[1] || '',
        kodePpts:    cells[2] || '',
        namaPpts:    cells[3] || '',
        kodePud:     cells[4] || '',
        namaPud:     cells[5] || '',
        provinsi:    cells[6] || '',
        kabupaten:   cells[7] || '',
        status:      cells[8] || '',
        tanggalAwal: cells[9] || '',
        tanggalAkhir:cells[10] || '',
        href,
      };
    }).filter(r => r.nomorSpjb && r.nomorSpjb !== '');
  });
}

/** Navigasi ke halaman detail SPJB dan scrape tabel alokasi */
async function scrapeDetail(page, spjb, prefix) {
  try {
    let detailUrl;
    if (spjb.href && spjb.href.startsWith('/#/')) {
      // href sudah berisi /#/ — jangan prepend # lagi
      detailUrl = `https://gowcm.pupuk-indonesia.com${spjb.href}`;
    } else if (spjb.href && spjb.href.startsWith('/')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com/#${spjb.href}`;
    } else {
      const decodedPrefix = decodeURIComponent(prefix);
      const spjbRoute = spjb.nomorSpjb.replace(/\//g, '*');
      detailUrl = `https://gowcm.pupuk-indonesia.com/#/${decodedPrefix}/alokasi/contract-distributor-ppts/${spjbRoute}/${spjb.kodePpts}`;
    }

    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => {});
    await sleep(500);

    // 🎯 KLIK SEMUA BUTTON COLLAPSE / FA-PLUS UNTUK MENG-EXPAND KECAMATAN / KIOS
    await page.evaluate(() => {
      const selectors = ['.buttonCollapse', '.fa-plus', 'i[class*="plus"]', '[class*="collapse"]', 'tr button'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          try { el.click(); } catch(e){}
        });
      });
    });
    await sleep(800);

    const detail = await page.evaluate(() => {
      const tables = [...document.querySelectorAll('table')];

      const parseTable = (t) => {
        if (!t) return { headers: [], rows: [] };
        const headers = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim()).filter(Boolean);
        const rows = [...t.querySelectorAll('tbody tr')]
          .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
          .filter(r => r.some(c => c !== ''));
        return { headers, rows };
      };

      // Cari tabel yang memiliki header "Alokasi SPJB" atau "Kacamatan"/"Kecamatan"
      let targetTable = null;
      for (const t of tables) {
        const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim().toLowerCase());
        if (headers.some(h => h.includes('alokasi') || h.includes('kacamatan') || h.includes('kecamatan'))) {
          targetTable = t;
          break;
        }
      }
      if (!targetTable && tables.length > 1) targetTable = tables[1];
      if (!targetTable && tables.length > 0) targetTable = tables[0];

      const alokasiTable = parseTable(targetTable);

      // Extract rows
      const alokasiRows = [];
      let currentKecamatan = '';

      for (const row of alokasiTable.rows) {
        // Cek jika row adalah row kecamatan (biasanya kolom 0/1 berisi nama kecamatan, misal "Pringapus")
        // Atau row produk (misal "Urea", "NPK")
        const col0 = row[0] || '';
        const col1 = row[1] || '';
        const firstColText = col0 || col1;

        if (!firstColText) continue;

        if (firstColText.toLowerCase() === 'urea' || firstColText.toLowerCase() === 'npk' || firstColText.toLowerCase().includes('organik')) {
          // Baris Produk
          alokasiRows.push({
            kecamatan: currentKecamatan,
            produk: firstColText,
            alokasiSpjb: row[2] || row[1] || '0',
            realisasi: row[3] || row[2] || '0',
            sisaAlokasi: row[4] || row[3] || '0',
            progress: row[5] || row[4] || '0%',
          });
        } else {
          // Baris Kecamatan / Main Row
          currentKecamatan = firstColText;
          // Jika di baris kecamatan ada total angka alokasi, opsional bisa disimpan jika tidak ada breakdown produk
          if (row.length >= 5 && (row[2] || row[3])) {
            alokasiRows.push({
              kecamatan: currentKecamatan,
              produk: 'TOTAL',
              alokasiSpjb: row[2] || '0',
              realisasi: row[3] || '0',
              sisaAlokasi: row[4] || '0',
              progress: row[5] || '0%',
            });
          }
        }
      }

      return {
        alokasiRows,
        rawHeaders: alokasiTable.headers,
        rawRows: alokasiTable.rows,
      };
    });

    return detail;
  } catch (e) {
    console.warn(`  [DETAIL] Error untuk ${spjb.nomorSpjb} (${spjb.kodePpts}):`, e.message);
    return { alokasiRows: [], rawHeaders: [], rawRows: [] };
  }
}

/** Cek apakah ada halaman berikutnya */
async function hasNextPage(page) {
  return await page.evaluate(() => {
    const nextBtn = document.querySelector('li.paginate_button.next:not(.disabled) a, button[aria-label="Next"]:not([disabled]), .pagination .next:not(.disabled)');
    return !!nextBtn;
  });
}

async function clickNextPage(page) {
  await page.evaluate(() => {
    const nextBtn = document.querySelector('li.paginate_button.next:not(.disabled) a, button[aria-label="Next"]:not([disabled]), .pagination .next:not(.disabled) a');
    if (nextBtn) nextBtn.click();
  });
  await sleep(2000);
}

async function main() {
  const startTime = Date.now();
  const args = process.argv.slice(2);
  let rangeArg = 'all';
  args.forEach(arg => {
    if (arg.startsWith('--range=')) {
      rangeArg = arg.split('=')[1];
    }
  });

  console.log('='.repeat(60));
  console.log(`GOW CM Scraper: SPJB PPTS (Range: ${rangeArg.toUpperCase()})`);
  console.log('Filter: Show=Lihat Semua | Status=Active');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: true,
    executablePath: undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    const prefix = await loginAndGetPrefix(page);

    // Navigasi ke daftar SPJB PPTS
    const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/contract-distributor-ppts`;
    console.log('\n[NAVIGATE] Ke halaman list SPJB PPTS...');
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Set filter
    await setFilters(page);
    await sleep(2000);

    // Scrape semua halaman list
    const allList = [];
    let pageNum = 1;

    while (true) {
      console.log(`\n[LIST] Halaman ${pageNum}...`);
      const rows = await scrapeListPage(page);
      console.log(`  Ditemukan ${rows.length} baris`);
      allList.push(...rows);

      if (!(await hasNextPage(page))) {
        console.log('  [PAGING] Tidak ada halaman berikutnya.');
        break;
      }
      await clickNextPage(page);
      pageNum++;
    }

    console.log(`\n[LIST] Total SPJB PPTS: ${allList.length}`);

    // Scrape detail untuk setiap SPJB
    const result = [];
    for (let i = 0; i < allList.length; i++) {
      const spjb = allList[i];
      console.log(`\n[DETAIL] ${i + 1}/${allList.length} — ${spjb.nomorSpjb} (${spjb.kodePpts}) ${spjb.namaPpts}`);

      const detail = await scrapeDetail(page, spjb, prefix);
      console.log(`  Alokasi rows: ${detail.alokasiRows.length}`);

      result.push({
        nomorSpjb:   spjb.nomorSpjb,
        kodePpts:    spjb.kodePpts,
        namaPpts:    spjb.namaPpts,
        kodePud:     spjb.kodePud,
        namaPud:     spjb.namaPud,
        provinsi:    spjb.provinsi,
        kabupaten:   spjb.kabupaten,
        status:      spjb.status,
        tanggalAwal: spjb.tanggalAwal,
        tanggalAkhir:spjb.tanggalAkhir,
        // Detail: array per kecamatan & produk
        alokasiDetail: detail.alokasiRows.map(r => ({
          kecamatan:   r.kecamatan,
          produk:      r.produk,
          alokasiSpjb: parseNumber(r.alokasiSpjb),
          realisasi:   parseNumber(r.realisasi),
          sisaAlokasi: parseNumber(r.sisaAlokasi),
          progress:    r.progress,
        })),
      });
    }

    const output = {
      scraped_at: new Date().toISOString(),
      source: 'GOW CM — Alokasi >> SPJB PPTS',
      filter: { show: 'Lihat Semua', status: 'Active' },
      total: result.length,
      data: result,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Selesai! ${result.length} SPJB PPTS discrape dalam ${elapsed}s`);
    console.log(`📁 Output: ${OUTPUT_FILE}`);
    console.log('='.repeat(60));

  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
