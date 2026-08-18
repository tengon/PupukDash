const { chromium } = require('playwright');

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

  const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/spjb/operasional`;
  await page.goto(listUrl, { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const listHeaderAndRows = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return { headers: [], rows: [] };
    const headers = [...table.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim());
    const rows = [...table.querySelectorAll('tbody tr')].map(tr =>
      [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
    );
    return { headers, rows };
  });

  console.log('List Table Headers:', JSON.stringify(listHeaderAndRows.headers));
  console.log('List Table Sample Rows (first 3):');
  listHeaderAndRows.rows.slice(0, 3).forEach((r, i) => console.log(`Row[${i}]:`, JSON.stringify(r)));

  await browser.close();
}
main().catch(e => console.error(e.message));
