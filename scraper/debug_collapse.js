const { chromium } = require('playwright');
const fs = require('fs');
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

    // Inspect elements with class containing 'collapse', 'plus', 'fa', or buttons inside table
    const collapseInfo = await page.evaluate(() => {
      const buttons = [...document.querySelectorAll('.buttonCollapse, [class*="collapse"], [class*="plus"], .fa-plus, i.fa')];
      const buttonDetails = buttons.map((b, idx) => ({
        idx,
        tagName: b.tagName,
        className: b.className,
        innerText: b.innerText,
        parentText: b.parentElement ? b.parentElement.innerText.substring(0, 100) : '',
        trText: b.closest('tr') ? b.closest('tr').innerText.substring(0, 150) : '',
      }));

      // Juga dump struktur tr dan td dari tabel
      const table = document.querySelectorAll('table')[1] || document.querySelectorAll('table')[0];
      const rows = table ? [...table.querySelectorAll('tbody tr')].map(tr => ({
        className: tr.className,
        id: tr.id,
        cells: [...tr.querySelectorAll('td')].map(td => ({
          text: td.innerText.trim(),
          html: td.innerHTML.substring(0, 100)
        }))
      })) : [];

      return { buttonDetails, rows: rows.slice(0, 10) };
    });

    console.log('\n=== COLLAPSE / PLUS BUTTONS FOUND ===');
    console.log(JSON.stringify(collapseInfo.buttonDetails, null, 2));

    console.log('\n=== TABLE ROWS STRUCTURE (first 10) ===');
    collapseInfo.rows.forEach((r, i) => {
      console.log(`Row[${i}] class="${r.className}" id="${r.id}":`);
      r.cells.forEach((c, ci) => console.log(`   cell[${ci}]: text="${c.text}" | html="${c.html}"`));
    });
  }

  await browser.close();
}
main().catch(e => console.error(e.message));
