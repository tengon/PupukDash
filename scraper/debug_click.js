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

  // Klik menu "Alokasi" lalu "SPJB Operasional"
  const clicked = await page.evaluate(async () => {
    const links = [...document.querySelectorAll('a')];
    const opLink = links.find(l => l.innerText.includes('SPJB Operasional'));
    if (opLink) {
      opLink.click();
      return true;
    }
    return false;
  });
  console.log('Clicked SPJB Operasional link:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  const listData = await page.evaluate(() => {
    const table = document.querySelector('table');
    if (!table) return { headers: [], rows: [] };
    const headers = [...table.querySelectorAll('thead th, thead td')].map(h => h.innerText.trim());
    const rows = [...table.querySelectorAll('tbody tr')].map(tr =>
      [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
    );
    return { headers, rows };
  });

  console.log('Headers:', JSON.stringify(listData.headers));
  console.log(`Rows count: ${listData.rows.length}`);
  listData.rows.forEach((r, i) => console.log(`Row[${i}]:`, JSON.stringify(r)));

  await browser.close();
}
main().catch(e => console.error(e.message));
