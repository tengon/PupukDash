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
  await new Promise(r => setTimeout(r, 2000));

  const firstHref = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('table tbody tr')];
    if (rows[1]) {
      const a = rows[1].querySelector('a');
      return a ? a.getAttribute('href') : null;
    }
    return null;
  });

  if (firstHref) {
    const detailUrl = `https://gowcm.pupuk-indonesia.com${firstHref}`;
    console.log('Navigating to detail:', detailUrl);
    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    const rowsDump = await page.evaluate(() => {
      const t = document.querySelectorAll('table')[1] || document.querySelectorAll('table')[0];
      if (!t) return [];
      return [...t.querySelectorAll('tbody tr')].slice(0, 5).map(tr =>
        [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
      );
    });
    console.log('Sample detail rows (first 5):');
    rowsDump.forEach((r, i) => console.log(`Row[${i}]:`, JSON.stringify(r.slice(0, 5))));
  }

  await browser.close();
}
main().catch(e => console.error(e.message));
