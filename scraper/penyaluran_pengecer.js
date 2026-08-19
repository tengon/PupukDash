/**
 * penyaluran_pengecer.js — GOW CM Scraper: Penyaluran ke Pengecer (Surat Jalan)
 *
 * Schema target:
 *   Penyaluran ke Pengecer → Surat Jalan
 *     ├── No. Surat Jalan
 *     ├── Kode Produsen
 *     ├── Tgl Surat Jalan
 *     ├── Tgl Dibuat
 *     ├── Tgl Diubah
 *     └── Detail (per baris)
 *
 * Parameter Filter: Show = Lihat Semua
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CREDENTIALS = {
  username: '1000001601',
  password: 'A@makmur25',
};

const OUTPUT_FILE = path.join(__dirname, 'penyaluran_pengecer_full.json');
const DELAY_MS = 1500;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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

  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(1000);

  await page.fill('input[placeholder="Your Username"]', CREDENTIALS.username);
  await page.fill('input[placeholder="Enter Password"]', CREDENTIALS.password);
  await page.click('button:has-text("Masuk")');

  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 20000 });
  console.log('[LOGIN] Redirect berhasil, URL:', page.url().substring(0, 80));
  await sleep(5000);

  // STRATEGI 1: Ambil prefix dari href sidebar/nav
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

  // STRATEGI 2: Ambil prefix dari URL saat ini
  prefix = extractPrefixFromUrl(page.url());
  if (prefix) {
    const decoded = decodeURIComponent(prefix);
    console.log('[LOGIN] Prefix via URL OK:', decoded.substring(0, 30) + '...');
    return decoded;
  }
  console.warn('[LOGIN] Strategi 2 gagal, coba strategi 3 (klik menu dulu)...');

  // STRATEGI 3: Klik salah satu menu agar navigasi terjadi
  try {
    const clicked = await page.evaluate(() => {
      const els = [
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

  // STRATEGI 4: Screenshot debug
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

/** Scrape list halaman Surat Jalan */
async function scrapeListPage(page) {
  await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});
  await sleep(1000);

  return await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return [];

    // Cek apakah kolom pertama adalah checkbox (kosong)
    const firstHeader = table.querySelector('thead th:first-child')?.innerText?.trim() || '';
    const offset = (!firstHeader || firstHeader === '' || firstHeader === '#') ? 1 : 0;

    const headerCells = [...table.querySelectorAll('thead th')].map(h => h.innerText.trim());
    console.log('[DEBUG] Headers:', headerCells.join(' | '));

    const rows = [...table.querySelectorAll('tbody tr')];
    return rows.map(row => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      if (cells.length < 3) return null;

      // Ambil href dari link detail
      const aEl = row.querySelector('a');
      const href = aEl ? aEl.getAttribute('href') || '' : '';

      return {
        noSuratJalan:  cells[0 + offset] || '',
        kodeProdusen:  cells[1 + offset] || '',
        tglSuratJalan: cells[2 + offset] || '',
        tglDibuat:     cells[3 + offset] || '',
        tglDiubah:     cells[4 + offset] || '',
        rawCells: cells,
        href,
      };
    }).filter(r => r && r.noSuratJalan && r.noSuratJalan !== '');
  });
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

/** Scrape detail Surat Jalan */
async function scrapeDetail(page, item, prefix) {
  try {
    let detailUrl;
    if (item.href && item.href.startsWith('/#/')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com${item.href}`;
    } else if (item.href && item.href.startsWith('/')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com/#${item.href}`;
    } else {
      return null; // Tidak ada href, skip detail
    }

    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 8000 }).catch(() => {});
    await sleep(1000);

    const detail = await page.evaluate(() => {
      const tables = [...document.querySelectorAll('table')];
      const parseTable = (t) => {
        if (!t) return { headers: [], rows: [] };
        const headers = [...t.querySelectorAll('thead th, thead td')]
          .map(h => h.innerText.trim()).filter(Boolean);
        const rows = [...t.querySelectorAll('tbody tr')]
          .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
          .filter(r => r.some(c => c !== ''));
        return { headers, rows };
      };

      // Ambil info header halaman (nama pengecer, status, dll)
      const headerInfo = {};
      document.querySelectorAll('.card-body dl dt, .card-body dl dd, .info-box, .detail-header').forEach(el => {
        headerInfo[el.tagName + '_' + el.className] = el.innerText?.trim();
      });

      // Coba ambil semua label-value pairs
      const labelValues: Record<string, string> = {};
      document.querySelectorAll('tr').forEach(tr => {
        const tds = [...tr.querySelectorAll('td, th')];
        if (tds.length === 2) {
          const key = tds[0].innerText.trim().replace(':', '');
          const val = tds[1].innerText.trim();
          if (key && val) labelValues[key] = val;
        }
      });

      return {
        tables: tables.slice(0, 3).map(t => parseTable(t)),
        labelValues,
      };
    });

    return detail;
  } catch (e) {
    console.warn('[DETAIL] Error:', e.message);
    return null;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('='.repeat(60));
  console.log('GOW CM Scraper: Penyaluran ke Pengecer (Surat Jalan)');
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

    // Coba beberapa route yang mungkin digunakan GOW CM untuk Penyaluran ke Pengecer
    const possibleRoutes = [
      'penyaluran/surat-jalan',
      'penyaluran/pengecer',
      'penyaluran-pengecer',
      'distribution/surat-jalan',
      'distribusi/surat-jalan',
      'monitoring/penyaluran-pengecer',
    ];

    let listLoaded = false;
    let usedRoute = '';

    for (const route of possibleRoutes) {
      const url = `https://gowcm.pupuk-indonesia.com/#/${prefix}/${route}`;
      console.log(`\n[NAVIGATE] Mencoba route: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await sleep(2000);

        // Cek apakah ada tabel data
        const hasTable = await page.evaluate(() => {
          const tbl = document.querySelector('table tbody tr');
          return !!tbl;
        });

        if (hasTable) {
          console.log(`[NAVIGATE] ✅ Route ditemukan: ${route}`);
          listLoaded = true;
          usedRoute = route;
          break;
        } else {
          console.log(`[NAVIGATE] ❌ Route ${route} tidak ada data tabel`);
        }
      } catch (e) {
        console.warn(`[NAVIGATE] Route ${route} error:`, e.message);
      }
    }

    if (!listLoaded) {
      // Coba intercept API untuk mendapatkan data
      console.log('\n[API INTERCEPT] Mencoba intercept API response...');

      let interceptedData = null;
      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('surat-jalan') || url.includes('penyaluran') || url.includes('distribution')) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              const json = await response.json();
              if (json && (json.data || Array.isArray(json))) {
                interceptedData = json;
                console.log('[API INTERCEPT] Berhasil intercept:', url);
              }
            }
          } catch {}
        }
      });

      // Navigasi ke halaman utama dan explore menu
      await page.goto(`https://gowcm.pupuk-indonesia.com/#/${prefix}/`, { waitUntil: 'networkidle', timeout: 15000 });
      await sleep(3000);

      // Screenshot untuk debug
      await page.screenshot({ path: path.join(__dirname, 'debug_penyaluran.png') });
      console.log('[DEBUG] Screenshot disimpan: debug_penyaluran.png');

      // Ambil semua link untuk analisis
      const allLinks = await page.evaluate(() =>
        [...document.querySelectorAll('a[href]')].map(a => ({
          text: a.innerText.trim(),
          href: a.getAttribute('href'),
        })).filter(l => l.href && l.href.includes('#/'))
      );
      console.log('[DEBUG] Semua link di halaman:');
      allLinks.forEach(l => console.log(`  ${l.text} → ${l.href}`));

      // Simpan output kosong dengan info debug
      const output = {
        scraped_at: new Date().toISOString(),
        source: 'GOW CM — Penyaluran ke Pengecer (Surat Jalan)',
        total: 0,
        data: [],
        debug: {
          message: 'Route tidak ditemukan. Cek debug_penyaluran.png untuk melihat halaman.',
          tried_routes: possibleRoutes,
          available_links: allLinks.slice(0, 20),
        },
      };

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
      console.log('\n⚠️  Data kosong — route belum ditemukan. Lihat debug_penyaluran.png');
      console.log(`📁 Output debug: ${OUTPUT_FILE}`);
      await browser.close();
      return;
    }

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

    console.log(`\n[LIST] Total Surat Jalan: ${allList.length}`);

    // Scrape detail setiap Surat Jalan
    const result = [];
    for (let i = 0; i < allList.length; i++) {
      const item = allList[i];
      console.log(`\n[DETAIL] ${i + 1}/${allList.length} — ${item.noSuratJalan}`);

      let detail = null;
      if (item.href) {
        detail = await scrapeDetail(page, item, prefix);
        await sleep(DELAY_MS);
      }

      result.push({
        noSuratJalan:  item.noSuratJalan,
        kodeProdusen:  item.kodeProdusen,
        tglSuratJalan: item.tglSuratJalan,
        tglDibuat:     item.tglDibuat,
        tglDiubah:     item.tglDiubah,
        href:          item.href,
        detail:        detail,
      });
    }

    const output = {
      scraped_at: new Date().toISOString(),
      source: `GOW CM — Penyaluran ke Pengecer (Surat Jalan) via /${usedRoute}`,
      filter: { show: 'Lihat Semua' },
      total: result.length,
      data: result,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Selesai! ${result.length} Surat Jalan discrape dalam ${elapsed}s`);
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
