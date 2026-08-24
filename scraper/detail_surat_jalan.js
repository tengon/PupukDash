/**
 * detail_surat_jalan.js — GOW CM Scraper: Detail Surat Jalan (Rincian Item Kios / Barang)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const CREDENTIALS = {
  username: '1000001601',
  password: 'A@makmur25',
};

const OUTPUT_FILE = path.join(__dirname, 'detail_surat_jalan_full.json');

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

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
  console.log('[LOGIN] Redirect berhasil');
  await sleep(4000);

  // Ekstrak encrypted prefix dari sidebar
  const prefix = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a[href], [href]')];
    for (const el of els) {
      const href = el.getAttribute('href') || '';
      const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (match) return match[1];
    }
    return null;
  });

  if (prefix) {
    return decodeURIComponent(prefix);
  }

  const urlMatch = page.url().match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
  if (urlMatch) return decodeURIComponent(urlMatch[1]);

  throw new Error('Gagal mendapatkan encrypted prefix dari sidebar');
}

const MONTH_MAP = {
  'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'mei': 4, 'may': 4, 'jun': 5,
  'jul': 6, 'ags': 7, 'aug': 7, 'sep': 8, 'okt': 9, 'oct': 9, 'nov': 10, 'des': 11, 'dec': 11
};

function parseDateStr(str) {
  if (!str) return null;
  const parts = str.toLowerCase().trim().split('-');
  if (parts.length >= 3) {
    const year = parseInt(parts[0]) || 2026;
    let month = 0;
    if (!isNaN(parseInt(parts[1]))) {
      month = Math.max(0, Math.min(11, parseInt(parts[1]) - 1));
    } else if (MONTH_MAP[parts[1]] !== undefined) {
      month = MONTH_MAP[parts[1]];
    }
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
    d.setMonth(d.getMonth() - 1);
    return d;
  }
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  let rangeArg = 'all';
  args.forEach(arg => {
    if (arg.startsWith('--range=')) {
      rangeArg = arg.split('=')[1];
    }
  });

  const cutoffDate = getCutoffDate(rangeArg);

  console.log('='.repeat(60));
  console.log(`GOW CM Scraper: Dedicated Detail Surat Jalan (Range: ${rangeArg.toUpperCase()})`);
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(30000);

  try {
    const prefix = await loginAndGetPrefix(page);

    const possibleRoutes = [
      'pemenuhan-order-kios/surat-jalan/detail-sj-pkp-order',
      'pemenuhan-order-kios/surat-jalan',
      'laporan/surat-jalan',
    ];

    let listLoaded = false;
    for (const route of possibleRoutes) {
      const url = `https://gowcm.pupuk-indonesia.com/#/${prefix}/${route}`;
      console.log(`[NAVIGATE] Mencoba ke halaman Surat Jalan: ${url}`);
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        await sleep(2000);

        const hasRows = await page.evaluate(() => !!document.querySelector('table tbody tr'));
        if (hasRows) {
          console.log(`[NAVIGATE] ✅ Route ditemukan: ${route}`);
          listLoaded = true;
          break;
        }
      } catch (e) {
        console.warn(`[NAVIGATE] Warning route ${route}:`, e.message);
      }
    }

    if (!listLoaded) {
      console.error('❌ Tidak dapat memuat tabel Surat Jalan dari route mana pun!');
      await browser.close();
      return;
    }

    // Set Show = Lihat Semua
    try {
      const showSelect = await page.$('select');
      if (showSelect) {
        const opts = await showSelect.evaluate(el => [...el.options].map(o => ({ value: o.value, text: o.text })));
        const allOpt = opts.find(o => o.text.toLowerCase().includes('semua') || parseInt(o.value) >= 100);
        if (allOpt) {
          await showSelect.selectOption(allOpt.value);
          console.log('[FILTER] Show set ke:', allOpt.text);
          await sleep(2500);
        }
      }
    } catch {}

    // Ambil daftar Surat Jalan di halaman
    await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});
    await sleep(1500);
    const rows = await page.evaluate(() => {
      const tables = [...document.querySelectorAll('table')];
      let targetTable = null;
      let trs = [];

      for (const t of tables) {
        const foundTrs = [...t.querySelectorAll('tbody tr')];
        if (foundTrs.length > 0) {
          targetTable = t;
          trs = foundTrs;
          break;
        }
      }

      if (!targetTable || trs.length === 0) return [];

      return trs.map((row, idx) => {
        const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
        const btn = row.querySelector('#detailList') || row.querySelector('button[data-uuid]') || row.querySelector('[data-uuid]');
        const uuid = btn ? btn.getAttribute('data-uuid') || '' : '';
        const aEl = row.querySelector('a');
        const href = aEl ? (aEl.getAttribute('href') || aEl.getAttribute('to') || '') : '';

        return {
          idx,
          noSuratJalan: cells[0] || '',
          nomorPkp: cells[1] || '',
          nomorOrder: cells[2] || '',
          kodeSo: cells[3] || '',
          provinsi: cells[4] || '',
          kabupaten: cells[5] || '',
          kecamatan: cells[6] || '',
          urea: cells[7] || '',
          npk: cells[8] || '',
          organik: cells[9] || '',
          za: cells[11] || '',
          sp36: cells[12] || '',
          tglSuratJalan: cells[13] || '',
          uuid,
          href,
        };
      }).filter(r => r.noSuratJalan !== '');
    });

    console.log(`[LIST] Ditemukan ${rows.length} Surat Jalan untuk diekstrak detailnya...`);

    const results = [];
    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      console.log(`[DETAIL] (${i + 1}/${rows.length}) Memproses ${item.noSuratJalan}...`);

      let detailItems = [];

      if (item.uuid) {
        const btnSelector = `button[data-uuid="${item.uuid}"], #detailList[data-uuid="${item.uuid}"]`;
        const btn = await page.$(btnSelector);
        if (btn) {
          await btn.click();
          await page.waitForSelector('.modal.show, .modal-dialog, .modal-content', { timeout: 1500 }).catch(() => {});
          await sleep(400);

          detailItems = await page.evaluate(() => {
            const container = document.querySelector('.modal-dialog') ||
                              document.querySelector('.modal-content') ||
                              document.querySelector('.modal') ||
                              document.body;

            const tables = [...container.querySelectorAll('table')];
            const parsedRows = [];

            tables.forEach(t => {
              const trs = [...t.querySelectorAll('tbody tr')];
              trs.forEach(tr => {
                const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
                if (cells.length >= 2 && cells.some(c => c !== '')) {
                  parsedRows.push({
                    kodeKios: cells[0] || '',
                    namaKios: cells[1] || '',
                    kecamatan: cells[2] || '',
                    desa: cells[3] || '',
                    namaProduk: cells[4] || '',
                    jumlah: parseFloat(cells[5]) || 0,
                    satuan: cells[6] || 'Ton',
                    rawCells: cells,
                  });
                }
              });
            });
            return parsedRows;
          });

          // Tutup modal
          await page.evaluate(() => {
            const closeBtn = document.querySelector('.modal .close, button[data-dismiss="modal"], .modal-header .close, button.close');
            if (closeBtn) closeBtn.click();
          }).catch(() => {});
          await sleep(150);
        }
      }

      // Jika tidak ada detail modal table, buat item detail dari summary row
      if (detailItems.length === 0) {
        const pupukTypes = [
          { name: 'Urea', val: item.urea },
          { name: 'NPK', val: item.npk },
          { name: 'Organik', val: item.organik },
          { name: 'ZA', val: item.za },
          { name: 'SP-36', val: item.sp36 },
        ];

        pupukTypes.forEach(p => {
          const qty = parseFloat(p.val);
          if (!isNaN(qty) && qty > 0) {
            detailItems.push({
              kodeKios: '',
              namaKios: item.nomorPkp ? `Kios PKP (${item.nomorPkp})` : 'Kios Pengecer',
              kecamatan: item.kecamatan || '',
              desa: item.kabupaten || '',
              namaProduk: p.name,
              jumlah: qty,
              satuan: 'Ton',
              rawCells: [p.name, p.val],
            });
          }
        });
      }

      results.push({
        noSuratJalan: item.noSuratJalan,
        nomorPkp: item.nomorPkp,
        nomorOrder: item.nomorOrder,
        tglSuratJalan: item.tglSuratJalan,
        details: detailItems,
      });
    }

    const output = {
      scraped_at: new Date().toISOString(),
      source: 'GOW CM — Dedicated Detail Surat Jalan Scraper',
      total_surat_jalan: results.length,
      total_detail_items: results.reduce((acc, r) => acc + r.details.length, 0),
      data: results,
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');

    console.log(`\n✅ Selesai! ${results.length} Surat Jalan (${output.total_detail_items} rincian item) berhasil discrape.`);
    console.log(`📁 Output disimpan di: ${OUTPUT_FILE}`);

  } catch (e) {
    console.error('\n❌ ERROR:', e.message);
  } finally {
    await browser.close();
  }
}

main();
