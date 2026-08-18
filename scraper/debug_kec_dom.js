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
  await page.waitForSelector('table tbody tr', { timeout: 15000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  const firstHref = await page.evaluate(() => {
    const a = document.querySelector('table tbody tr a');
    return a ? a.getAttribute('href') : null;
  });

  if (firstHref) {
    const detailUrl = `https://gowcm.pupuk-indonesia.com${firstHref}`;
    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Dump all TR texts and HTML in table
    const trDumps = await page.evaluate(() => {
      const table = document.querySelectorAll('table')[1] || document.querySelectorAll('table')[0];
      if (!table) return [];
      return [...table.querySelectorAll('tbody tr')].map((tr, i) => ({
        i,
        className: tr.className,
        text: tr.innerText.replace(/\s+/g, ' ').substring(0, 150),
        html: tr.innerHTML.substring(0, 200)
      }));
    });

    console.log('TR Dumps (first 10):');
    trDumps.slice(0, 10).forEach(t => console.log(`TR[${t.i}] class="${t.className}": text="${t.text}"`));
  }

  await browser.close();
}
main().catch(e => console.error(e.message));
