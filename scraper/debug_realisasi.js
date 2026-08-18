const { chromium } = require('playwright');

const CREDENTIALS = {
  username: '1000001601',
  password: 'A@makmur25',
};

async function main() {
  console.log('[DEBUG REALISASI] Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const apiResponses = [];

  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/') || url.includes('monitoring') || url.includes('stock') || url.includes('kios') || url.includes('realisasi')) {
      try {
        const status = response.status();
        const bodyText = await response.text();
        console.log(`[API RESPONSE] [${status}] ${url.substring(0, 100)}...`);
        apiResponses.push({ url, status, bodyLength: bodyText.length, sample: bodyText.substring(0, 300) });
      } catch (e) {}
    }
  });

  try {
    console.log('[LOGIN] Navigasi ke login...');
    await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.fill('input[placeholder="Your Username"]', CREDENTIALS.username);
    await page.fill('input[placeholder="Enter Password"]', CREDENTIALS.password);
    await page.click('button:has-text("Masuk")');

    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
    await page.waitForTimeout(3000);

    const stokKiosLink = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href], [href]')];
      const found = links.find(l => (l.innerText || '').toLowerCase().includes('stok kios ipubers') || (l.getAttribute('href') || '').includes('monitoring-stock-kios-ipubers'));
      return found ? found.getAttribute('href') || found.getAttribute('to') || '' : null;
    });

    let decodedHref = decodeURIComponent(stokKiosLink);
    if (decodedHref.includes('%252F')) {
      decodedHref = decodeURIComponent(decodedHref);
    }
    const navUrl = 'https://gowcm.pupuk-indonesia.com/' + (decodedHref.startsWith('#/') ? decodedHref : '#/' + decodedHref);
    console.log('[NAVIGATING TO]:', navUrl);
    
    await page.goto(navUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(6000);

    // Set filter Show All (-1) & trigger DataTables redraw
    await page.evaluate(() => {
      const sel = document.querySelector('select[name*="length"]');
      if (sel) {
        sel.value = '-1';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await page.waitForTimeout(5000);

    const resultData = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return { headers: [], totalRows: 0, rows: [] };

      const headers = [...table.querySelectorAll('thead th, thead td')].map(th => th.innerText.trim()).filter(h => h);
      const rows = [...table.querySelectorAll('tbody tr')].map(tr => 
        [...tr.querySelectorAll('td')].map(td => td.innerText.trim())
      ).filter(r => r.length > 0 && r.some(c => c !== ''));

      return { headers, totalRows: rows.length, sampleRows: rows.slice(0, 10) };
    });

    console.log('[API RESPONSES CAPTURED]:', JSON.stringify(apiResponses, null, 2));
    console.log('[TABLE DATA]:', JSON.stringify(resultData, null, 2));

  } catch (err) {
    console.error('[ERROR]:', err);
  } finally {
    await browser.close();
  }
}

main();
