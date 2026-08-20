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

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
  jul: 6, ags: 7, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
};

/** Ambil opsi rentang scraping (today, 7days, 1month, all) dari args, env, atau schedule_settings.json */
function getScrapeRange() {
  const arg = process.argv.find(a => a.startsWith('--range='));
  if (arg) return arg.split('=')[1].trim().toLowerCase();

  if (process.env.SCRAPE_RANGE) return process.env.SCRAPE_RANGE.trim().toLowerCase();

  const settingsFile = path.join(__dirname, 'schedule_settings.json');
  if (fs.existsSync(settingsFile)) {
    try {
      const json = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
      if (json?.penyaluran_pengecer?.scrapeRange) {
        return json.penyaluran_pengecer.scrapeRange.toLowerCase();
      }
    } catch {}
  }
  return 'all';
}

function parseDateStr(str) {
  if (!str) return null;
  const parts = str.toLowerCase().split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0]) || 2026;
    const month = MONTH_MAP[parts[1]] !== undefined ? MONTH_MAP[parts[1]] : 0;
    const dayRest = parts[2].replace(',', '').trim();
    const day = parseInt(dayRest) || 1;
    return new Date(year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function getCutoffDate(range) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === 'today') return todayStart;
  if (range === '7days') {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === '1month') {
    const d = new Date(todayStart);
    d.setDate(d.getDate() - 30);
    return d;
  }
  return null; // 'all'
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
    const tables = [...document.querySelectorAll('table')];
    console.log('[DEBUG] Found tables count:', tables.length);

    let targetTable = null;
    let targetRows = [];

    for (const t of tables) {
      const trs = [...t.querySelectorAll('tbody tr')];
      if (trs.length > 0) {
        targetTable = t;
        targetRows = trs;
        break;
      }
    }

    if (!targetTable || targetRows.length === 0) {
      console.log('[DEBUG] No table with tbody tr found!');
      return [];
    }

    const headers = [...targetTable.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim());
    console.log('[DEBUG TABLE HEADERS]', JSON.stringify(headers));

    return targetRows.map((row, rIdx) => {
      const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
      const btn = row.querySelector('#detailList') || row.querySelector('button[data-uuid]') || row.querySelector('[data-uuid]');
      const uuid = btn ? btn.getAttribute('data-uuid') || '' : '';
      const aEl = row.querySelector('a');
      const href = aEl ? (aEl.getAttribute('href') || aEl.getAttribute('to') || '') : '';

      const isPemenuhanOrder = headers.some(h => h.includes('PUD') || h.includes('Pengambilan'));

      let noSuratJalan    = cells[0] || `SJ-${rIdx + 1}`;
      let kodeDistributor = '';
      let namaDistributor = '';
      let provinsi        = '';
      let kabupaten       = '';
      let kodeProdusen    = '';
      let namaProdusen    = '';
      let status          = 'Submited';
      let tglSuratJalan   = '';
      let tglDibuat       = '';
      let tglDiubah       = '';

      if (isPemenuhanOrder && cells.length >= 10) {
        kodeDistributor = cells[1] || '';
        namaDistributor = cells[2] || '';
        provinsi        = cells[3] || '';
        kabupaten       = cells[4] || '';
        kodeProdusen    = cells[5] || '';
        namaProdusen    = cells[6] || '';
        tglSuratJalan   = cells[7] || '';
        tglDibuat       = cells[8] || '';
        tglDiubah       = cells[9] || '';
      } else {
        kodeDistributor = cells[1] || '';
        namaDistributor = cells[2] || '';
        kabupaten       = cells[3] || '';
        kodeProdusen    = cells[4] || '';
        namaProdusen    = cells[5] || '';
        status          = cells[6] || 'Submited';
        tglSuratJalan   = cells[7] || '';
        tglDibuat       = cells[7] || '';
        tglDiubah       = cells[8] || '';
      }

      return {
        noSuratJalan,
        uuid,
        kodeDistributor,
        namaDistributor,
        provinsi,
        kabupaten,
        kodeProdusen,
        namaProdusen,
        status,
        tglSuratJalan,
        tglDibuat,
        tglDiubah,
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
    if (!item.uuid && !item.href) return null;

    // Coba klik tombol detail (modal) di list page
    if (item.uuid) {
      const btnSelector = `button[data-uuid="${item.uuid}"], #detailList[data-uuid="${item.uuid}"]`;
      const btn = await page.$(btnSelector);
      if (btn) {
        await btn.click();
        await page.waitForSelector('.modal.show, .modal-dialog, .modal-content', { timeout: 1000 }).catch(() => {});
        await sleep(300);

        const detailData = await page.evaluate(() => {
          const container = document.querySelector('.modal-dialog') ||
                            document.querySelector('.modal-content') ||
                            document.querySelector('.modal') ||
                            document.body;

          const tables = [...container.querySelectorAll('table')];
          const parseTable = (t) => {
            if (!t) return { headers: [], rows: [] };
            const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim()).filter(Boolean);
            const rows = [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())).filter(r => r.some(c => c !== ''));
            return { headers, rows };
          };

          const labelValues = {};
          container.querySelectorAll('tr, .row > div, dl dt, dl dd, p').forEach(el => {
            const text = el.innerText || '';
            if (text.includes(':') && text.length < 120) {
              const parts = text.split(':');
              if (parts.length === 2) {
                const k = parts[0].trim();
                const v = parts[1].trim();
                if (k && v && k.length < 40) labelValues[k] = v;
              }
            }
          });

          return {
            tables: tables.map(t => parseTable(t)).filter(t => t.rows.length > 0),
            labelValues,
          };
        });

        // Tutup modal jika ada
        await page.evaluate(() => {
          const closeBtn = document.querySelector('.modal .close, button[data-dismiss="modal"], .modal-header .close, button.close');
          if (closeBtn) closeBtn.click();
        }).catch(() => {});
        await sleep(100);

        if (detailData && (detailData.tables.length > 0 || Object.keys(detailData.labelValues).length > 0)) {
          return detailData;
        }
      }
    }

    // Fallback: buka URL detail via route
    let detailUrl;
    if (item.href && item.href.startsWith('/#/')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com${item.href}`;
    } else if (item.href && item.href.startsWith('/')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com/#${item.href}`;
    } else if (item.uuid) {
      const decodedPrefix = decodeURIComponent(prefix);
      detailUrl = `https://gowcm.pupuk-indonesia.com/#/${decodedPrefix}/laporan/surat-jalan/${item.uuid}`;
    } else {
      return null;
    }

    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForSelector('table', { timeout: 5000 }).catch(() => {});
    await sleep(800);

    return await page.evaluate(() => {
      const tables = [...document.querySelectorAll('table')];
      const parseTable = (t) => {
        if (!t) return { headers: [], rows: [] };
        const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim()).filter(Boolean);
        const rows = [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())).filter(r => r.some(c => c !== ''));
        return { headers, rows };
      };

      const labelValues = {};
      document.querySelectorAll('tr, dl dt, dl dd').forEach(el => {
        const text = el.innerText || '';
        if (text.includes(':') && text.length < 100) {
          const parts = text.split(':');
          if (parts.length === 2) {
            const k = parts[0].trim();
            const v = parts[1].trim();
            if (k && v && k.length < 40) labelValues[k] = v;
          }
        }
      });

      return {
        tables: tables.map(t => parseTable(t)).filter(t => t.rows.length > 0),
        labelValues,
      };
    });
  } catch (e) {
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
  page.on('console', msg => console.log('[PAGE]', msg.text()));

  try {
    const prefix = await loginAndGetPrefix(page);

    // Route persis Penyaluran Ke Pengecer >> Surat Jalan GOW CM:
    const possibleRoutes = [
      'pemenuhan-order-kios/surat-jalan',
      'laporan/surat-jalan',
      'laporan/penyaluran-do',
      'laporan/item-penyaluran',
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

    // Filter Tanggal Data
    const scrapeRange = getScrapeRange();
    const cutoffDate = getCutoffDate(scrapeRange);
    console.log(`\n[FILTER DATE] Opsi Rentang Scraping: ${scrapeRange.toUpperCase()}${cutoffDate ? ' (Cutoff: ' + cutoffDate.toISOString().split('T')[0] + ')' : ' (Semua Data)'}`);

    // Set filter Show = Lihat Semua
    await setFilterShowAll(page);
    await sleep(2000);

    // Scrape halaman list dengan penghentian dini jika lewat cutoff date
    const allList = [];
    let pageNum = 1;
    let stopEarly = false;

    while (!stopEarly) {
      console.log(`\n[LIST] Halaman ${pageNum}...`);
      const rows = await scrapeListPage(page);
      console.log(`  Ditemukan ${rows.length} baris`);

      for (const row of rows) {
        if (cutoffDate) {
          const itemDate = parseDateStr(row.tglSuratJalan || row.tglDibuat || row.tglDiubah);
          if (itemDate && itemDate < cutoffDate) {
            console.log(`  [FILTER DATE] Tanggal ${row.tglSuratJalan} < Cutoff (${cutoffDate.toISOString().split('T')[0]}). Menghentikan scraping.`);
            stopEarly = true;
            break;
          }
        }
        allList.push(row);
      }

      if (stopEarly || !(await hasNextPage(page))) {
        if (!stopEarly) console.log('  [PAGING] Tidak ada halaman berikutnya.');
        break;
      }
      await clickNextPage(page);
      pageNum++;
    }

    console.log(`\n[LIST] Total Surat Jalan: ${allList.length}`);

    // Load detail cache dari file output sebelumnya
    const detailCache = new Map();
    if (fs.existsSync(OUTPUT_FILE)) {
      try {
        const raw = fs.readFileSync(OUTPUT_FILE, 'utf-8');
        const prevJson = JSON.parse(raw);
        if (Array.isArray(prevJson.data)) {
          for (const prevItem of prevJson.data) {
            if (prevItem.noSuratJalan && prevItem.detail) {
              detailCache.set(prevItem.noSuratJalan, prevItem.detail);
            }
          }
        }
        console.log(`[CACHE] Loaded ${detailCache.size} detail Surat Jalan dari cache.`);
      } catch (err) {
        console.log('[CACHE] Gagal membaca cache file:', err.message);
      }
    }

    // Format data Surat Jalan & Scrape detail untuk setiap Surat Jalan
    const result = [];
    let cacheHits = 0;
    let detailScrapedCount = 0;

    for (let i = 0; i < allList.length; i++) {
      const item = allList[i];
      let detail = null;

      if (detailCache.has(item.noSuratJalan)) {
        detail = detailCache.get(item.noSuratJalan);
        cacheHits++;
      } else if (item.uuid || item.href) {
        detailScrapedCount++;
        console.log(`[DETAIL] (${detailScrapedCount}) Memproses ${i + 1}/${allList.length} — ${item.noSuratJalan} (uuid: ${item.uuid})`);
        detail = await scrapeDetail(page, item, prefix);
      }

      result.push({
        noSuratJalan:    item.noSuratJalan,
        uuid:            item.uuid,
        kodeDistributor: item.kodeDistributor,
        namaDistributor: item.namaDistributor,
        kabupaten:       item.kabupaten,
        kodeProdusen:    item.kodeProdusen,
        namaProdusen:    item.namaProdusen,
        status:          item.status,
        tglSuratJalan:   item.tglSuratJalan,
        tglDibuat:       item.tglDibuat,
        tglDiubah:       item.tglDiubah,
        href:            item.href,
        detail:          detail,
      });
    }

    const output = {
      scraped_at: new Date().toISOString(),
      source: `GOW CM — Penyaluran ke Pengecer (Surat Jalan) via /${usedRoute}`,
      filter: {
        show: 'Lihat Semua',
        scrapeRange: scrapeRange,
        cutoffDate: cutoffDate ? cutoffDate.toISOString().split('T')[0] : null,
      },
      total: result.length,
      data: result,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`[DETAIL STATS] Cache hits: ${cacheHits}/${allList.length}, Scraped baru: ${detailScrapedCount}`);

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
