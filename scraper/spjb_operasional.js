/**
 * spjb_operasional.js — GOW CM Scraper: Alokasi >> SPJB Operasional
 *
 * Schema target (dari gambar):
 *   Alokasi → SPJB Operasional
 *     └── Nomor SPJB (key) → Detail:
 *           Kecamatan | Produk (NPK/UREA) | Total Alokasi | Total SO | Total SO Approve | Total Sisa
 *
 * Filter: Show = Lihat Semua
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CREDENTIALS = {
  username: '1000001601',
  password: 'A@makmur25',
};

const OUTPUT_FILE = path.join(__dirname, 'spjb_operasional_full.json');
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseNumber(str) {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  const s = String(str).trim();
  if (!s || s === '-') return 0;

  if (s.includes('.') && s.includes(',')) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (s.includes(',')) {
    return parseFloat(s.replace(',', '.')) || 0;
  }
  if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length === 2 && parts[1].length <= 2) {
      return parseFloat(s) || 0;
    }
    return parseFloat(s.replace(/\./g, '')) || 0;
  }
  return parseFloat(s) || 0;
}

/** Ekstrak prefix dari URL page yang sedang aktif */
function extractPrefixFromUrl(url) {
  const match = url.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
  if (match) return match[1];
  // Kadang URL berupa /#/<prefix> tanpa trailing slash
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
    // Klik link pertama yang ada di sidebar/nav
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

    // Coba lagi dari URL setelah navigasi
    prefix = extractPrefixFromUrl(page.url());
    if (prefix) {
      const decoded = decodeURIComponent(prefix);
      console.log('[LOGIN] Prefix via klik-menu OK:', decoded.substring(0, 30) + '...');
      return decoded;
    }

    // Atau dari href sidebar setelah navigasi
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

  // ── STRATEGI 4: Screenshot debug & scan semua href di DOM ──
  try {
    await page.screenshot({ path: path.join(__dirname, 'debug_login_vps.png') });
    console.log('[LOGIN] Screenshot disimpan: debug_login_vps.png');

    const allHrefs = await page.evaluate(() =>
      [...document.querySelectorAll('[href]')].map(el => el.getAttribute('href') || '').filter(Boolean)
    );
    console.log('[LOGIN] Semua href di DOM:', allHrefs.slice(0, 20));

    const currentUrl = page.url();
    console.log('[LOGIN] URL saat ini:', currentUrl);
  } catch (e) {
    console.warn('[LOGIN] Screenshot/debug error:', e.message);
  }

  throw new Error('Gagal mendapatkan encrypted prefix dari sidebar! (Semua strategi gagal)');
}

/** Set filter Show = Lihat Semua */
async function setFilterShowAll(page) {
  try {
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
        await sleep(1500);
        break;
      }
    }
  } catch (e) {
    console.warn('[FILTER] Warning set filter:', e.message);
  }
}

/** Scrape list halaman SPJB Operasional & Filter HANYA Tahun 2026 */
async function scrapeListPage(page) {
  await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});
  await sleep(1000);

  return await page.evaluate(() => {
    const table = document.querySelector('#tableSpjbOp') || document.querySelector('table');
    if (!table) return [];

    const rows = [...table.querySelectorAll('tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      if (cells.length < 3) return null;

      // Cari elemen link <a> untuk URL detail SPJB
      const aEl = row.querySelector('a');
      const href = aEl ? aEl.getAttribute('href') || '' : '';

      // Tentukan posisi kolom berdasarkan isi text (robust fallback)
      let nomorSpjb = '';
      let tahun = '';
      let namaPud = '';
      let produsen = '';
      let tanggalBuat = '';
      let status = 'Active';

      for (let i = 0; i < cells.length; i++) {
        const c = cells[i];
        if (!nomorSpjb && (c.includes('/SP/') || c.includes('/A/') || c.includes('SPJB') || c.includes('Pelaporan'))) {
          nomorSpjb = c;
        }
        if (!tahun && (c === '2026' || c === '2025' || c === '2024' || c === '2023' || c === '2022' || c === '2021' || c === '2020')) {
          tahun = c;
        }
        if (c.toLowerCase().includes('active') || c.toLowerCase().includes('aktif') || c.toLowerCase().includes('inactive')) {
          status = c;
        }
      }

      // Fallback index jika regex tidak kena
      if (!nomorSpjb) nomorSpjb = cells[1] || cells[2] || cells[0] || '';
      if (!tahun) tahun = cells[2] || '';

      return {
        nomorSpjb,
        tahun,
        namaPud: namaPud || 'CV. ANUGERAH MAKMUR',
        produsen: produsen || 'PT Pupuk Sriwidjaja',
        tanggalBuat,
        status,
        href,
        rawCells: cells,
      };
    })
    .filter(r => r && r.nomorSpjb && r.nomorSpjb !== '')
    // 🎯 FILTER EKSKLUSIF: HANYA SPJB TAHUN 2026
    .filter(r => {
      const is2026 = r.tahun === '2026' ||
                     r.nomorSpjb.includes('/2026') ||
                     r.nomorSpjb.includes('2026') ||
                     r.rawCells.some(c => c.includes('2026'));
      return is2026;
    });
  });
}

/** Scrape detail SPJB Operasional — tabel per Kecamatan & Produk */
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
      detailUrl = `https://gowcm.pupuk-indonesia.com/#/${decodedPrefix}/alokasi/spjb/operasional/${spjbRoute}`;
    }

    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => {});
    await sleep(500);

    // 🎯 KLIK SEMUA BUTTON COLLAPSE / FA-PLUS UNTUK MENG-EXPAND KECAMATAN
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
        const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim()).filter(Boolean);
        const rows = [...t.querySelectorAll('tbody tr')]
          .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
          .filter(r => r.some(c => c !== ''));
        return { headers, rows };
      };

      let targetTable = null;
      for (const t of tables) {
        const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim().toLowerCase());
        if (headers.some(h => h.includes('kecamatan') || h.includes('kacamatan') || h.includes('produk') || h.includes('alokasi'))) {
          targetTable = t;
          break;
        }
      }

      if (!targetTable && tables.length > 1) targetTable = tables[1];
      if (!targetTable && tables.length > 0) targetTable = tables[0];

      const parsed = parseTable(targetTable);
      const detailRows = [];

      const trElements = targetTable ? [...targetTable.querySelectorAll('tbody tr')] : [];
      let currentKecamatan = 'Kab. Semarang';
      let isTotalGroup = false;

      for (let i = 0; i < trElements.length; i++) {
        const tr = trElements[i];
        const isLastChild = tr.classList.contains('lastChild');
        const text = tr.innerText.replace(/\s+/g, ' ').trim();

        if (!text) continue;

        // Baris Parent (Non-lastChild): Header Provinsi / Kabupaten / Kecamatan / Total Produk
        if (!isLastChild) {
          const cleanText = text.replace(/-$/, '').trim();
          const cleanLower = cleanText.toLowerCase();

          if (cleanLower.includes('total produk') || cleanLower.includes('total')) {
            isTotalGroup = true;
          } else if (cleanLower.includes('jawa tengah') || cleanLower.includes('kab.')) {
            isTotalGroup = true;
          } else if (cleanText) {
            isTotalGroup = false;
            currentKecamatan = cleanText;
          }
          continue;
        }

        // Abaikan seluruh baris child di bawah grup Total Produk / Provinsi / Kabupaten
        if (isTotalGroup) continue;

        // Baris Child (lastChild): Baris Produk (UREA, NPK, ORGANIK, ZA, dsb.)
        const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
        if (cells.length < 5) continue;

        const cell0 = cells[0] || '';
        const cell1 = cells[1] || '';
        const produk = cell1 || cell0 || 'UREA';

        // Abaikan baris rekap total
        if (produk.toUpperCase().includes('TOTAL') || cell0.toUpperCase().includes('TOTAL')) continue;

        const totalAlokasi = cells[cells.length - 4] || '0';
        const totalSo = cells[cells.length - 3] || '0';
        const totalSoApprove = cells[cells.length - 2] || '0';
        const totalSisa = cells[cells.length - 1] || '0';

        detailRows.push({
          kecamatan: currentKecamatan,
          produk: produk,
          totalAlokasi,
          totalSo,
          totalSoApprove,
          totalSisa,
        });
      }

      return {
        headers: parsed.headers,
        rawRows: parsed.rows,
        detailRows,
      };
    });

    return detail;
  } catch (e) {
    console.warn(`  [DETAIL] Error untuk ${spjb.nomorSpjb}:`, e.message);
    return { headers: [], rawRows: [], detailRows: [] };
  }
}

/** Cek apakah ada halaman berikutnya */
async function hasNextPage(page) {
  return await page.evaluate(() => {
    const nextBtn = document.querySelector(
      'li.paginate_button.next:not(.disabled) a, ' +
      'button[aria-label="Next"]:not([disabled]), ' +
      '.pagination .next:not(.disabled) a'
    );
    return !!nextBtn;
  });
}

async function clickNextPage(page) {
  await page.evaluate(() => {
    const nextBtn = document.querySelector(
      'li.paginate_button.next:not(.disabled) a, ' +
      '.pagination .next:not(.disabled) a'
    );
    if (nextBtn) nextBtn.click();
  });
  await sleep(2000);
}

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('GOW CM Scraper: SPJB Operasional (Alokasi)');
  console.log('Filter: Show=Lihat Semua');
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

    // Navigasi ke daftar SPJB Operasional (route persis di DOM navigation)
    const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/spjb/operasional`;
    console.log('\n[NAVIGATE] Ke halaman list SPJB Operasional:', listUrl);
    await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);

    // Set filter Show = Lihat Semua
    await setFilterShowAll(page);
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

    console.log(`\n[LIST] Total SPJB Operasional: ${allList.length}`);

    // Scrape detail setiap SPJB
    const result = [];
    for (let i = 0; i < allList.length; i++) {
      const spjb = allList[i];
      console.log(`\n[DETAIL] ${i + 1}/${allList.length} — ${spjb.nomorSpjb}`);

      const detail = await scrapeDetail(page, spjb, prefix);
      console.log(`  Detail rows: ${detail.detailRows.length} | Headers: ${detail.headers.join(', ')}`);

      result.push({
        nomorSpjb:   spjb.nomorSpjb,
        kodePud:     spjb.kodePud,
        namaPud:     spjb.namaPud,
        provinsi:    spjb.provinsi,
        kabupaten:   spjb.kabupaten,
        tanggalAwal: spjb.tanggalAwal,
        tanggalAkhir:spjb.tanggalAkhir,
        status:      spjb.status,
        // Kolom sesuai skema gambar
        detailPerKecamatan: detail.detailRows.map(r => ({
          kecamatan:      r.kecamatan,
          produk:         r.produk,         // NPK / UREA
          totalAlokasi:   parseNumber(r.totalAlokasi),
          totalSo:        parseNumber(r.totalSo),
          totalSoApprove: parseNumber(r.totalSoApprove),
          totalSisa:      parseNumber(r.totalSisa),
        })),
        rawHeaders: detail.headers,
      });
    }

    const output = {
      scraped_at: new Date().toISOString(),
      source: 'GOW CM — Alokasi >> SPJB Operasional',
      filter: { show: 'Lihat Semua' },
      total: result.length,
      data: result,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Selesai! ${result.length} SPJB Operasional discrape dalam ${elapsed}s`);
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
