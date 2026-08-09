---
name: gowcm-scraping
description: >
  Pola Playwright untuk scraping GOW CM Pupuk Indonesia (https://gowcm.pupuk-indonesia.com).
  Gunakan skill ini ketika bekerja dengan website GOW CM: login otomatis, navigasi menu
  Alokasi SPJB PPTS, ekstraksi data daftar dan detail, intercept API response.
---

# GOW CM Pupuk Indonesia — Playwright Scraping Skill

## Konteks Aplikasi
- **URL**: https://gowcm.pupuk-indonesia.com
- **Stack**: Laravel Sanctum + Vue.js SPA (hash routing `#/`)
- **Auth**: Form login, token di localStorage (CryptoJS AES encrypted)
- **Route**: `/#/{ENCRYPTED_PREFIX}/{menu}/{submenu}` — prefix berubah tiap sesi

## Kredensial Default
- Username: `1000001601`
- Password: `A@makmur25`
- PUD: CV. ANUGERAH MAKMUR (Kab. Semarang, Jawa Tengah)

---

## Pola Login & Ambil Prefix

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Login
await page.goto('https://gowcm.pupuk-indonesia.com/#/login', { waitUntil: 'networkidle' });
await page.fill('input[placeholder="Your Username"]', '1000001601');
await page.fill('input[placeholder="Enter Password"]', 'A@makmur25');
await page.click('button:has-text("Masuk")');

// Tunggu redirect dari /login
await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
await page.waitForTimeout(3000);

// Ambil encrypted prefix dari sidebar links (BUKAN dari page.url())
const prefix = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href], [href]')];
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
    if (match) return match[1];
  }
  return null;
});
// prefix contoh: "U2FsdGVkX1%252FBRJtNt..."
```

## Navigasi Menu Alokasi >> SPJB PPTS

```javascript
// URL daftar SPJB
const listUrl = `https://gowcm.pupuk-indonesia.com/#/${prefix}/alokasi/contract-distributor-ppts`;
await page.goto(listUrl, { waitUntil: 'networkidle' });
await page.waitForSelector('table tbody tr', { timeout: 10000 }).catch(() => {});
```

## Scraping Tabel List SPJB

> ⚠️ **PENTING**: Kolom 0 = Checkbox. Data dimulai dari `cells[1]`.

```javascript
const list = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('table tbody tr')];
  return rows.map(row => {
    const cells = [...row.querySelectorAll('td')].map(td => td.innerText.trim());
    const href = row.querySelector('td:nth-child(2) a')?.getAttribute('href') || '';
    return {
      nomorSpjb: cells[1],  // cells[0] = checkbox (SKIP)
      kodePpts:  cells[2],
      namaPpts:  cells[3],
      kodePud:   cells[4],
      namaPud:   cells[5],
      provinsi:  cells[6],
      kabupaten: cells[7],
      status:    cells[8],
      tanggalAwal:  cells[9],
      tanggalAkhir: cells[10],
      href,  // Gunakan untuk navigasi ke halaman detail
    };
  }).filter(r => r.nomorSpjb !== '');
});
```

## Navigasi ke Halaman Detail SPJB

```javascript
// SELALU gunakan href dari list — jangan rebuild URL manual
// Prefix bisa single/double encoded — href dari DOM sudah benar
async function getDetail(page, spjb, prefix) {
  let detailUrl;
  if (spjb.href && spjb.href.startsWith('/')) {
    detailUrl = `https://gowcm.pupuk-indonesia.com/#${spjb.href}`;
  } else {
    // Fallback: decode prefix dulu (dari %252F ke %2F)
    const decodedPrefix = decodeURIComponent(prefix);
    const spjbRoute = spjb.nomorSpjb.replace(/\//g, '*');
    detailUrl = `https://gowcm.pupuk-indonesia.com/#/${decodedPrefix}/alokasi/contract-distributor-ppts/${spjbRoute}/${spjb.kodePpts}`;
  }

  await page.goto(detailUrl, { waitUntil: 'networkidle', timeout: 30000 });

  // WAJIB tunggu tabel sebelum scrape (SPA lazy render)
  await page.waitForSelector('table', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Scrape tabel alokasi (tabel pertama) dan riwayat (tabel kedua)
  return await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    const parseTable = (t) => {
      if (!t) return { headers: [], rows: [] };
      const headers = [...t.querySelectorAll('thead th')].map(h => h.innerText.trim()).filter(Boolean);
      const rows = [...t.querySelectorAll('tbody tr')]
        .map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
        .filter(r => r.some(c => c !== ''));
      return { headers, rows };
    };
    return {
      alokasiTable: parseTable(tables[0]),  // Kecamatan, Produk, Alokasi, Realisasi, Sisa, Progress
      riwayatTable: parseTable(tables[1]),  // Nomor Dok, Jenis, Alasan, Tgl, Evidence PDF, Status
    };
  });
}
```

## Struktur Data yang Dihasilkan

### Daftar SPJB (per akun 1000001601)
- Total: 20–22 record
- Status: Active (17) | Rejected (3)
- Provinsi: JAWA TENGAH | Kabupaten: KAB. SEMARANG

### Detail per SPJB
1. **Tabel Alokasi**: Kecamatan → Produk (Urea/NPK) → Alokasi → Realisasi → Sisa → Progress %
2. **Tabel Riwayat**: Nomor Dokumen → Jenis → Alasan → Tanggal → Evidence PDF → Status

## Script Lengkap
Lihat: `d:\testGet\spjb_ppts.js`
Output: `d:\testGet\spjb_ppts_full.json`
