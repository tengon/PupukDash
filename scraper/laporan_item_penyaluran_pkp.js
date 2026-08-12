/**
 * GOW CM Pupuk Indonesia
 * Scraper: LAPORAN >> Item Penyaluran (No. PKP)
 *
 * URL List : /#/{prefix}/laporan/item-penyaluran
 *
 * Filter: Tahun 2026 + Show = Lihat Semua
 * Output: laporan_item_penyaluran_pkp_full.json
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
const path = require('path');

const CONFIG = {
  baseUrl:    'https://gowcm.pupuk-indonesia.com',
  username:   '1000001601',
  password:   'A@makmur25',
  outputFile: path.join(__dirname, 'laporan_item_penyaluran_pkp_full.json'),
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

  let prefix = await page.evaluate(() => {
    for (const link of document.querySelectorAll('a[href], [href]')) {
      const href = link.href || link.getAttribute('href') || link.getAttribute('to') || '';
      const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (match) return match[1];
    }
    return null;
  });

  if (!prefix) prefix = 'U2FsdGVkX1%252Bb%252FJgVXJ8zT9mFF3Urz9v3htjW1bJuP98%253D';
  console.log(`✅ Login berhasil. Prefix: ${prefix}`);
  return prefix;
}

async function setFilters(page, tahun = '2026') {
  // 1. Reset filter jika ada
  const btnReset = await page.$('#resetFilterItemPenyaluran, button:has-text("Reset Filter")');
  if (btnReset) {
    console.log('  🔄 Reset filter...');
    await btnReset.click().catch(() => {});
    await page.waitForTimeout(2000);
  }

  // 2. Set filter Tahun 2026 jika ada input tahun
  console.log(`  📅 Setting filter Tahun: ${tahun}...`);
  await page.evaluate((tahun) => {
    const inputs = [...document.querySelectorAll('input, select')];
    inputs.forEach(el => {
      const labelText = el.closest('.form-group, td, tr, div')?.innerText?.toLowerCase() || '';
      if (labelText.includes('tahun')) {
        if (el.tagName === 'SELECT') {
          const opt = [...el.options].find(o => o.value === tahun || o.text.trim() === tahun);
          if (opt) {
            el.value = opt.value;
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        } else {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
          if (nativeSetter) nativeSetter.call(el, tahun);
          else el.value = tahun;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    });
  }, tahun);

  // Klik button Cari jika ada
  await page.click('button:has-text("Cari"), button:has-text("Filter"), button#check_list').catch(() => {});
  await page.waitForTimeout(2000);

  // 3. Set Show = Lihat Semua
  console.log('  📋 Setting filter length: Lihat Semua...');
  await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')];
    for (const sel of selects) {
      const opts = [...sel.options];
      const allOpt = opts.find(o =>
        o.text.toLowerCase().includes('semua') ||
        o.text.toLowerCase().includes('all') ||
        o.value === '-1' ||
        o.value === '100'
      );
      if (allOpt) {
        sel.value = allOpt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.jQuery) {
          window.jQuery(sel).val(allOpt.value).trigger('change');
        }
      }
    }
  });
  await page.waitForTimeout(3000);
}

async function scrapeLaporanPkp() {
  console.log('🚀 === SCRAPER LAPORAN ITEM PENYALURAN PKP GOW CM (Tahun 2026 + Show Semua) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    const prefix = await login(page);
    const targetUrl = `${CONFIG.baseUrl}/#/${prefix}/laporan/item-penyaluran`;
    console.log(`📋 Navigasi ke ${targetUrl}...`);

    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Apply Filter Tahun 2026 + Show Semua
    await setFilters(page, '2026');

    // Scrape data per halaman dengan Duplicate Check
    let allRecords = [];
    let pageNum = 1;
    let lastFirstRowKey = '';
    const MAX_PAGES = 300;

    while (pageNum <= MAX_PAGES) {
      const pageData = await page.evaluate(() => {
        const trs = [...document.querySelectorAll('table tbody tr')];
        const results = [];

        trs.forEach(tr => {
          const tds = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
          if (tds.length < 15) return;

          const noPkp = tds[0] || '';
          if (!noPkp || noPkp === 'No Data' || noPkp.includes('Tidak ada data')) return;

          results.push({
            noPkp: tds[0] || '',
            produsen: tds[1] || '',
            distributor: tds[2] || '',
            kodeDistributor: tds[3] || '',
            tipePenyaluran: tds[4] || '',
            noPenebusan: tds[5] || '',
            kodeSo: tds[6] || '',
            tahun: tds[7] || '',
            bulan: tds[8] || '',
            tglPenyaluran: tds[9] || '',
            provinsi: tds[10] || '',
            kabupaten: tds[11] || '',
            kecamatan: tds[12] || '',
            kodePengecer: tds[13] || '',
            pengecer: tds[14] || '',
            produk: tds[15] || '',
            qtyTon: tds[16] || '0',
            status: tds[17] || '',
            schema: tds[18] || '',
            statusIpubers: tds[19] || '',
          });
        });

        return results;
      });

      if (pageData.length === 0) {
        console.log('  ℹ️ Tidak ada data pada halaman ini.');
        break;
      }

      const currentFirstKey = `${pageData[0].noPkp}_${pageData[0].noPenebusan}_${pageData[0].kodePengecer}`;
      if (currentFirstKey === lastFirstRowKey) {
        console.log(`  🏁 Halaman ${pageNum}: Halaman terakhir dicapai (data sama dengan halaman sebelumnya).`);
        break;
      }
      lastFirstRowKey = currentFirstKey;

      allRecords.push(...pageData);
      console.log(`  📄 Hal. ${pageNum} (+${pageData.length} baris) | Total akumulasi: ${allRecords.length} record`);

      // Cek apakah tombol Next aktif
      const hasNext = await page.evaluate(() => {
        const nextBtn = document.querySelector('.paginate_button.next:not(.disabled), li.next:not(.disabled) a');
        return !!nextBtn;
      });

      if (hasNext) {
        pageNum++;
        await page.click('.paginate_button.next:not(.disabled), li.next:not(.disabled) a').catch(() => {});
        await page.waitForTimeout(1000);
      } else {
        console.log('  🏁 Tombol Next tidak aktif / disabled.');
        break;
      }
    }

    // Deduplicate by (noPkp + noPenebusan + kodePengecer + produk)
    const uniqueMap = new Map();
    allRecords.forEach(r => {
      const key = `${r.noPkp}_${r.noPenebusan}_${r.kodePengecer}_${r.produk}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, r);
      }
    });

    const finalRecords = Array.from(uniqueMap.values());
    console.log(`📊 TOTAL UNIK AKHIR: ${finalRecords.length} record Laporan Item Penyaluran PKP (Tahun 2026).`);

    const outputData = {
      scraped_at: new Date().toISOString(),
      source: 'GOW CM - Laporan >> Item Penyaluran (Tahun 2026)',
      total_records: finalRecords.length,
      data: finalRecords,
    };

    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(outputData, null, 2));
    console.log(`💾 Saved ${finalRecords.length} records -> ${CONFIG.outputFile}`);

    // Trigger Database Population automatically
    console.log('🔄 Menjalankan populate_laporan_pkp.js untuk memperbarui database SQLite (table_pkp)...');
    try {
      const { execSync } = require('child_process');
      execSync('node scraper/populate_laporan_pkp.js', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
      console.log('✅ Auto-populate table_pkp selesai!');
    } catch (e) {
      console.log('  ℹ️ Database sync error/manual:', e.message);
    }

    await browser.close();
    return outputData;
  } catch (err) {
    console.error('❌ Error during scrapeLaporanPkp:', err.message);
    await browser.close();
    throw err;
  }
}

if (require.main === module) {
  scrapeLaporanPkp().catch(console.error);
}

module.exports = { scrapeLaporanPkp };
