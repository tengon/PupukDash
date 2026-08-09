const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
  const fileData = JSON.parse(fs.readFileSync('spjb_operasional_full.json', 'utf8'));
  const firstItem = fileData.data[0];
  if (!firstItem || !firstItem.detailUrl) {
    console.log('No detailUrl found');
    return;
  }

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

  const trDetails = await page.evaluate(() => {
    const trs = [...document.querySelectorAll('table tbody tr')];
    return trs.map((tr, i) => {
      const tds = [...tr.querySelectorAll('td')].map(td => ({
        text: td.innerText.trim(),
        html: td.innerHTML.trim(),
        title: td.getAttribute('title') || '',
        class: td.className || '',
      }));
      return { rowIdx: i, tds };
    });
  });

  console.log('Extracted Rows Count:', trDetails.length);
  console.log(JSON.stringify(trDetails.slice(0, 5), null, 2));

  await browser.close();
}

main().catch(console.error);
