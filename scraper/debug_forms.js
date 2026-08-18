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

  await page.evaluate(() => {
    const l = [...document.querySelectorAll('a')].find(a => a.innerText.includes('SPJB Operasional'));
    if (l) l.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Inspect all select elements and buttons
  const formInfo = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select')].map((s, i) => ({
      i,
      name: s.name,
      id: s.id,
      options: [...s.options].map(o => ({ value: o.value, text: o.text, selected: o.selected }))
    }));
    const buttons = [...document.querySelectorAll('button')].map(b => b.innerText.trim());
    const inputs = [...document.querySelectorAll('input')].map(i => ({ type: i.type, placeholder: i.placeholder, value: i.value }));
    return { selects, buttons, inputs };
  });

  console.log('Selects:', JSON.stringify(formInfo.selects, null, 2));
  console.log('Buttons:', JSON.stringify(formInfo.buttons));
  console.log('Inputs:', JSON.stringify(formInfo.inputs));

  await browser.close();
}
main().catch(e => console.error(e.message));
