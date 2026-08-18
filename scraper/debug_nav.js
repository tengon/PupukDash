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

  // Dump all links on sidebar/nav
  const links = await page.evaluate(() => {
    return [...document.querySelectorAll('a[href]')].map(a => ({
      text: a.innerText.trim(),
      href: a.getAttribute('href')
    }));
  });

  console.log('Sidebar/Nav Links Found:');
  links.forEach(l => console.log(`- ${l.text} => ${l.href}`));

  await browser.close();
}
main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
