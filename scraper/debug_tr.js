const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const fileData = JSON.parse(fs.readFileSync('spjb_operasional_full.json', 'utf8'));
  const firstItem = fileData.data[0];

  console.log('🔐 Logging in...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder="Your Username"]', '1000001601');
  await page.fill('input[placeholder="Enter Password"]', 'A@makmur25');
  await page.click('button:has-text("Masuk")');
  await page.waitForTimeout(5000);

  console.log('📄 Navigating to detail URL:', firstItem.detailUrl);
  await page.goto(firstItem.detailUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  const trsInfo = await page.evaluate(() => {
    const allTrs = [...document.querySelectorAll('table tr')];
    return allTrs.map((tr, i) => {
      const isHeaderRow = tr.parentElement?.tagName === 'THEAD';
      const cells = [...tr.querySelectorAll('td, th')].map(c => ({
        tag: c.tagName,
        text: c.innerText.trim(),
        colspan: c.getAttribute('colspan') || '1',
      }));
      return { rowIdx: i, isHeaderRow, cellCount: cells.length, cells };
    });
  });

  console.log('Extracted TRs count:', trsInfo.length);
  trsInfo.forEach(r => {
    const txts = r.cells.map(c => `[${c.tag}] ${c.text}`).join(' | ');
    console.log(`Row ${r.rowIdx} (${r.isHeaderRow ? 'THEAD' : 'TBODY'}): ${txts.slice(0, 150)}`);
  });

  await browser.close();
}

main().catch(console.error);
