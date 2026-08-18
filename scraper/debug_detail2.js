const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.fill('input[placeholder="Your Username"]', '1000001601');
  await page.fill('input[placeholder="Enter Password"]', 'A@makmur25');
  await page.click('button:has-text("Masuk")');
  await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  const prefix = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href]')];
    for (const l of links) {
      const m = l.getAttribute('href').match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
      if (m) return m[1];
    }
    return null;
  });
  console.log('Prefix OK:', prefix ? prefix.substring(0,30)+'...' : 'NOT FOUND');

  // Navigate list
  const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/contract-distributor-ppts`;
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  // Set show = 100
  const selects = await page.$$('select');
  for (const sel of selects) {
    const opts = await sel.evaluate(el => [...el.options].map(o=>({v:o.value,t:o.text})));
    const all = opts.find(o => parseInt(o.v) >= 100 || o.t.includes('100'));
    if (all) { await sel.selectOption(all.v); await new Promise(r => setTimeout(r, 1500)); break; }
  }

  // Get first row href
  const firstHref = await page.evaluate(() => {
    const row = document.querySelector('table tbody tr');
    if (!row) return null;
    const a = row.querySelector('a');
    return a ? a.getAttribute('href') : null;
  });
  console.log('First href:', firstHref);

  if (!firstHref) { console.log('NO HREF FOUND'); await browser.close(); return; }

  // Navigate to detail
  const detailUrl = firstHref.startsWith('/#/')
    ? `https://gowcm.pupuk-indonesia.com${firstHref}`
    : `https://gowcm.pupuk-indonesia.com/#${firstHref}`;
  
  console.log('Detail URL:', detailUrl);
  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Tunggu lebih lama
  await new Promise(r => setTimeout(r, 4000));
  console.log('Current URL:', page.url());

  // Screenshot
  await page.screenshot({ path: path.join(__dirname, 'debug_detail.png'), fullPage: true });
  console.log('Screenshot saved: debug_detail.png');

  // Dump semua tabel
  const tableInfo = await page.evaluate(() => {
    return [...document.querySelectorAll('table')].map((t, i) => {
      const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim());
      const rows = [...t.querySelectorAll('tbody tr')].map(tr =>
        [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
      ).filter(r => r.some(c => c));
      return { i, headers, rowCount: rows.length, sample: rows.slice(0,2) };
    });
  });
  console.log('\n=== TABLES ===');
  console.log('Count:', tableInfo.length);
  tableInfo.forEach(t => {
    console.log(`Table[${t.i}] headers: ${JSON.stringify(t.headers)}`);
    console.log(`Table[${t.i}] rows: ${t.rowCount}`);
    if (t.sample.length > 0) console.log(`Table[${t.i}] sample: ${JSON.stringify(t.sample[0])}`);
  });

  // Dump visible text (first 2000 chars)
  const bodyText = await page.evaluate(() => document.body.innerText.trim().substring(0, 3000));
  console.log('\n=== PAGE TEXT ===');
  console.log(bodyText);

  await browser.close();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
