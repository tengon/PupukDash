/**
 * realisasi_stok_kios.js — GOW CM Scraper: Realisasi >> Stok Kios IPubers
 *
 * Schema output:
 *   Realisasi -> Stok Kios IPubers
 *     [
 *       {
 *         "kodeKios": string,
 *         "namaKios": string,
 *         "kodeProduk": string,
 *         "namaProduk": string,
 *         "stokKg": number,
 *         "syncAt": string
 *       }
 *     ]
 *
 * Filter: Show = Lihat Semua (-1)
 */

const path = require('path');
const fs = require('fs');

// Auto-add fallback node_modules paths if playwright is not in default search paths
const fallbackPaths = [
  path.join(__dirname, '..', 'node_modules'),
  path.join(process.cwd(), 'node_modules'),
  path.join(process.cwd(), '..', 'node_modules'),
  'D:\\testGet\\node_modules',
  'd:\\testGet\\node_modules',
  '/home/sipupuk/PupukDash/node_modules',
];
fallbackPaths.forEach(p => {
  if (fs.existsSync(p) && !module.paths.includes(p)) {
    module.paths.unshift(p);
  }
});

const { chromium } = require('playwright');

const CREDENTIALS = {
  username: '1000001601',
  password: 'A@makmur25',
};

const OUTPUT_FILE = path.join(__dirname, 'realisasi_stok_kios_full.json');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function parseNumberVal(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const s = String(val).trim();
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

async function scrapeRealisasiStokKios() {
  const args = process.argv.slice(2);
  let rangeArg = 'all';
  args.forEach(arg => {
    if (arg.startsWith('--range=')) {
      rangeArg = arg.split('=')[1];
    }
  });

  console.log('='.repeat(60));
  console.log(`GOW CM Scraper: Realisasi Stok Kios (Range: ${rangeArg.toUpperCase()})`);
  console.log('Filter: Show=Lihat Semua');
  console.log('='.repeat(60));

  console.log('[SCRAPER REALISASI] Memulai proses scraping Realisasi >> Stok Kios IPubers...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let capturedApiData = null;

  // Intercept API response DataTables
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/monitoring-stock-kios-ipubers')) {
      try {
        const json = await response.json();
        const rows = json.data || json.aaData || [];
        if (rows && rows.length > 0) {
          console.log(`[API INTERCEPT] Berhasil menangkap response data (${rows.length} baris)`);
          capturedApiData = rows;
        }
      } catch (e) {}
    }
  });

  try {
    // 1. Login
    console.log('[LOGIN] Navigasi ke login GOW CM...');
    await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[placeholder="Your Username"]', CREDENTIALS.username);
    await page.fill('input[placeholder="Enter Password"]', CREDENTIALS.password);
    await page.click('button:has-text("Masuk")');

    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
    await sleep(3000);

    // 2. Extrak link Stok Kios IPubers
    const stokKiosLink = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href], [href]')];
      const found = links.find(l => 
        (l.innerText || '').toLowerCase().includes('stok kios ipubers') || 
        (l.getAttribute('href') || '').includes('monitoring-stock-kios-ipubers')
      );
      return found ? found.getAttribute('href') || found.getAttribute('to') || '' : null;
    });

    if (!stokKiosLink) {
      throw new Error('Menu Realisasi >> Stok Kios IPubers tidak ditemukan pada sidebar!');
    }

    let decodedHref = decodeURIComponent(stokKiosLink);
    if (decodedHref.includes('%252F')) {
      decodedHref = decodeURIComponent(decodedHref);
    }
    const navUrl = 'https://gowcm.pupuk-indonesia.com/' + (decodedHref.startsWith('#/') ? decodedHref : '#/' + decodedHref);
    console.log('[NAVIGASI] Buka halaman Stok Kios IPubers:', navUrl);

    await page.goto(navUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(4000);

    // 3. Set Filter Show: Lihat Semua (-1)
    console.log('[FILTER] Memilih option Show: Lihat Semua (-1)...');
    await page.evaluate(() => {
      const selects = [...document.querySelectorAll('select')];
      for (const sel of selects) {
        const opts = [...sel.options].map(o => ({ value: o.value, text: o.text }));
        const allOpt = opts.find(o => 
          o.text.toLowerCase().includes('semua') || 
          o.text.toLowerCase().includes('all') || 
          o.value === '-1' || o.value === '0' || parseInt(o.value) >= 100
        );
        if (allOpt) {
          sel.value = allOpt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });

    await sleep(5000);

    // 4. Transformasi & Mapping Data Output
    let parsedItems = [];

    if (capturedApiData && capturedApiData.length > 0) {
      console.log(`[PARSING] Mengolah ${capturedApiData.length} baris dari API Intercept NATIVE...`);
      parsedItems = capturedApiData.map((item) => {
        if (Array.isArray(item)) {
          return {
            kodeKios: String(item[0] || '').trim(),
            namaKios: String(item[1] || '').trim(),
            kodeProduk: String(item[2] || '').trim(),
            namaProduk: String(item[3] || '').trim(),
            stokKg: parseNumberVal(item[4]),
            syncAt: String(item[5] || '').trim(),
          };
        }
        return {
          kodeKios: String(item.retail_code || item.kode_kios || item.kodeKios || '').trim(),
          namaKios: String(item.retail_name || item.nama_kios || item.namaKios || '').trim(),
          kodeProduk: String(item.product_code || item.kode_produk || item.kodeProduk || '').trim(),
          namaProduk: String(item.product_name || item.nama_produk || item.namaProduk || '').trim(),
          stokKg: parseNumberVal(item.stock || item.stok_kg || item.stok),
          syncAt: String(item.syncrn_at || item.sync_at || item.syncAt || '').trim(),
        };
      });
    } else {
      console.log('[PARSING] Fallback DOM table parsing...');
      const domData = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) return [];

        const rows = [...table.querySelectorAll('tbody tr')];
        return rows.map(r => {
          const cells = [...r.querySelectorAll('td')].map(td => td.innerText.trim());
          if (cells.length < 5) return null;
          return {
            kodeKios: cells[0] || '',
            namaKios: cells[1] || '',
            kodeProduk: cells[2] || '',
            namaProduk: cells[3] || '',
            stokKgRaw: cells[4] || '0',
            syncAt: cells[5] || '',
          };
        }).filter(Boolean);
      });

      parsedItems = domData.map(d => ({
        ...d,
        stokKg: parseNumberVal(d.stokKgRaw),
      }));
    }

    console.log(`✅ [SELESAI] Berhasil mengekstrak ${parsedItems.length} baris data Realisasi Stok Kios IPubers.`);

    const outputPayload = {
      success: true,
      total: parsedItems.length,
      scraped_at: new Date().toISOString(),
      data: parsedItems,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(outputPayload, null, 2), 'utf-8');
    console.log(`[FILE] Saved output payload to: ${OUTPUT_FILE}`);

    return outputPayload;

  } catch (err) {
    console.error('❌ [ERROR SCRAPER REALISASI]:', err.message);
    throw err;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  scrapeRealisasiStokKios()
    .then(res => console.log('[FINISHED] Scraped total items:', res.total))
    .catch(err => {
      console.error('[FAILED]:', err);
      process.exit(1);
    });
}

module.exports = { scrapeRealisasiStokKios };
