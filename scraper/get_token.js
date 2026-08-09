const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let capturedToken = null;

  // Intercept all API responses to find token
  page.on('response', async (response) => {
    const url = response.url();
    const contentType = response.headers()['content-type'] || '';

    if (contentType.includes('application/json')) {
      try {
        const body = await response.json();
        console.log(`[API] ${response.status()} ${url}`);

        // Look for token in various fields
        const token =
          body?.token ||
          body?.access_token ||
          body?.data?.token ||
          body?.data?.access_token ||
          body?.result?.token ||
          body?.result?.access_token;

        if (token) {
          capturedToken = token;
          console.log('\n✅ TOKEN DITEMUKAN!');
          console.log('Endpoint:', url);
          console.log('Token:', token);
          console.log('Full Response:', JSON.stringify(body, null, 2));
        }
      } catch (e) {
        // Not JSON
      }
    }
  });

  console.log('Membuka halaman login...');
  await page.goto('https://gowcm.pupuk-indonesia.com/#/login', {
    waitUntil: 'networkidle',
    timeout: 30000
  });

  console.log('Mengisi username...');
  await page.fill('input[placeholder="Your Username"]', '1000001601');

  console.log('Mengisi password...');
  await page.fill('input[placeholder="Enter Password"]', 'A@makmur25');

  console.log('Klik tombol Masuk...');
  await page.click('button:has-text("Masuk")');

  // Wait for navigation
  await page.waitForTimeout(5000);

  console.log('\nURL sekarang:', page.url());

  // Extract from localStorage
  const localStorage = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      data[key] = window.localStorage.getItem(key);
    }
    return data;
  });

  console.log('\n📦 localStorage:');
  console.log(JSON.stringify(localStorage, null, 2));

  // Extract from sessionStorage
  const sessionStorage = await page.evaluate(() => {
    const data = {};
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      data[key] = window.sessionStorage.getItem(key);
    }
    return data;
  });

  console.log('\n📦 sessionStorage:');
  console.log(JSON.stringify(sessionStorage, null, 2));

  // Extract cookies
  const cookies = await context.cookies();
  console.log('\n🍪 Cookies:');
  console.log(JSON.stringify(cookies, null, 2));

  if (capturedToken) {
    console.log('\n🎯 TOKEN FINAL:', capturedToken);
  } else {
    console.log('\n⚠️ Token tidak ditemukan di response API. Cek localStorage/sessionStorage di atas.');
  }

  await browser.close();
})();
