const { chromium } = require('playwright');
const path = require('path');

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
  console.log('Prefix:', prefix ? prefix.substring(0,30)+'...' : 'NOT FOUND');

  // Navigate to list SPJB Operasional
  const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/contract-distributor`;
  console.log('Navigating to:', listUrl);
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // Dump menu / links available to confirm route
  const pageInfo = await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')].map((t, i) => {
      const headers = [...t.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim());
      const rows = [...t.querySelectorAll('tbody tr')].map(tr =>
        [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
      );
      return { i, headers, rowCount: rows.length, sample: rows.slice(0,3) };
    });
    return {
      title: document.title,
      url: window.location.href,
      tables,
      bodyPreview: document.body.innerText.substring(0, 1500)
    };
  });

  console.log('URL:', pageInfo.url);
  console.log('Tables Count:', pageInfo.tables.length);
  pageInfo.tables.forEach(t => {
    console.log(`Table[${t.i}] headers:`, JSON.stringify(t.headers));
    console.log(`Table[${t.i}] rowCount:`, t.rowCount);
    console.log(`Table[${t.i}] sample:`, JSON.stringify(t.sample));
  });
  console.log('\nBody preview:\n', pageInfo.bodyPreview);

  await browser.close();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
