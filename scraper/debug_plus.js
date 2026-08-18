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
    console.log('Navigating to detail:', detailUrl);
    await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Klik semua buttonCollapse / fa-plus untuk expand baris kecamatan
    const expandedCount = await page.evaluate(() => {
      const selectors = ['.buttonCollapse', '.fa-plus', 'i[class*="plus"]', '[class*="collapse"]', 'tr button'];
      let count = 0;
      selectors.forEach(sel => {
        const els = document.querySelectorAll(sel);
        els.forEach(el => {
          try {
            el.click();
            count++;
          } catch(e){}
        });
      });
      return count;
    });

    console.log('Expanded plus buttons count:', expandedCount);
    await new Promise(r => setTimeout(r, 2000));

    // Dump semua baris tabel setelah expand
    const rowsDump = await page.evaluate(() => {
      const table = document.querySelectorAll('table')[1] || document.querySelectorAll('table')[0];
      if (!table) return [];

      let currentKecamatan = '';
      return [...table.querySelectorAll('tbody tr')].map((tr, idx) => {
        const cells = [...tr.querySelectorAll('td')].map(td => td.innerText.trim());
        const hasPlus = !!tr.querySelector('.buttonCollapse, .fa-plus, i[class*="plus"]');
        const text = tr.innerText.trim();

        // Jika baris adalah header/parent kecamatan
        if (hasPlus || (cells[0] && cells[0] !== '-' && cells[0] !== '')) {
          currentKecamatan = cells[0] || cells[1] || '';
        }

        return {
          idx,
          className: tr.className,
          currentKecamatan,
          cells: cells.slice(0, 4),
          totalAlokasi: cells[cells.length - 4] || '0',
          totalSisa: cells[cells.length - 1] || '0',
        };
      });
    });

    console.log('\n=== ROWS AFTER EXPANDING PLUS BUTTONS ===');
    rowsDump.forEach(r => {
      console.log(`Row[${r.idx}] Class: "${r.className}" | Kec: "${r.currentKecamatan}" | Cells: ${JSON.stringify(r.cells)} | Alok: ${r.totalAlokasi} | Sisa: ${r.totalSisa}`);
    });
  }

  await browser.close();
}
main().catch(e => console.error(e.message));
