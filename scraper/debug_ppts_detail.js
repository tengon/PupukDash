const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Login
  await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[placeholder="Your Username"]', '1000001601');
  await page.fill('input[placeholder="Enter Password"]', 'A@makmur25');
  await page.click('button:has-text("Masuk")');
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Get prefix
  const prefix = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')];
    for (const l of links) {
      const m = l.getAttribute('href').match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (m) return m[1];
    }
    return null;
  });
  console.log('Prefix:', prefix ? prefix.substring(0,30)+'...' : 'NOT FOUND');

  // Navigate to list and get FIRST href
  const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/contract-distributor-ppts`;
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Set show semua
  const selects = await page.$$('select');
  for (const sel of selects) {
    const opts = await sel.evaluate(el => [...el.options].map(o=>({v:o.value,t:o.text})));
    const all = opts.find(o => o.t.includes('100') || o.v === '-1' || parseInt(o.v) >= 100);
    if (all) { await sel.selectOption(all.v); break; }
  }
  await new Promise(r => setTimeout(r, 2000));

  // Ambil data baris pertama + href
  const firstRow = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    if (!rows[0]) return null;
    const cells = [...rows[0].querySelectorAll('td')].map(td => td.innerText.trim());
    const allAs = [...rows[0].querySelectorAll('a')].map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href'),
    }));
    return { cells, allAs };
  });
  console.log('\nFirst row cells:', JSON.stringify(firstRow.cells));
  console.log('Links found:', JSON.stringify(firstRow.allAs));

  if (firstRow.allAs.length > 0) {
    // Navigate ke detail via href
    const href = firstRow.allAs[0].href;
    let detailUrl;
    if (href && href.startsWith('/')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com/#${href}`;
    } else if (href && href.startsWith('#')) {
      detailUrl = `https://gowcm.pupuk-indonesia.com/${href}`;
    }
    console.log('\nNavigasi ke detail:', detailUrl);
    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Dump semua tabel
    const tables = await page.evaluate(() => {
      return [...document.querySelectorAll('table')].map((t, i) => {
        const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim());
        const rows = [...t.querySelectorAll('tbody tr')].map(tr =>
          [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
        ).filter(r => r.some(c => c));
        return { tableIndex: i, headers, rowCount: rows.length, sampleRows: rows.slice(0, 3) };
      });
    });
    console.log('\nTables found:', tables.length);
    tables.forEach(t => {
      console.log(`  Table[${t.tableIndex}] headers:`, t.headers);
      console.log(`  Table[${t.tableIndex}] rows:`, t.rowCount);
      console.log(`  Table[${t.tableIndex}] sample:`, JSON.stringify(t.sampleRows));
    });

    // Dump current URL
    console.log('\nURL sekarang:', page.url());
    
    // Juga dump semua card/div yang mungkin berisi data
    const cards = await page.evaluate(() => {
      const cardEls = [...document.querySelectorAll('.card, .panel, [class*="card"]')];
      return cardEls.slice(0,5).map(c => c.innerText.trim().substring(0, 200));
    });
    console.log('\nCards/panels:', JSON.stringify(cards.slice(0,3)));
  }

  await browser.close();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
