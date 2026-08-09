# Workspace Rules — d:\testGet

## Playwright Scraping: SPA dengan Encrypted Route Prefix

Ketika scraping SPA (misal Laravel Sanctum + Vue Router) yang menggunakan encrypted route prefix:

**JANGAN** ekstrak prefix dari `page.url()` setelah login — URL bisa berupa `/#/home` (tanpa prefix).

**LAKUKAN** ekstrak prefix dari `href` attribute link di sidebar/nav yang sudah di-render di DOM:

```javascript
const prefix = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href], [href]')];
  for (const link of links) {
    const href = link.getAttribute('href') || link.getAttribute('to') || '';
    // Encrypted prefix = base64 string panjang (>20 char) sebelum segment menu
    const match = href.match(/#\/([A-Za-z0-9+\/=%]{20,})\//);
    if (match) return match[1];
  }
  return null;
});
```

Jika prefix dari sidebar masih double-encoded (`%252F`), gunakan `decodeURIComponent(prefix)` saat membangun URL navigasi.

---

## Playwright Scraping: Offset Kolom pada Tabel dengan Leading Checkbox

Tabel HTML sering punya kolom checkbox di posisi pertama (`cells[0]`). Ini menyebabkan `cells[0]` selalu kosong dan filter `r.fieldName !== ''` menghasilkan 0 baris.

**Selalu periksa** apakah kolom pertama adalah checkbox sebelum memetakan data:

```javascript
// Periksa apakah kolom 0 adalah checkbox
const firstHeader = table.querySelector('thead th:first-child')?.innerText?.trim();
const offset = (!firstHeader || firstHeader === '' || firstHeader === '#') ? 1 : 0;

// Gunakan offset saat memetakan kolom
nomorSpjb: cells[0 + offset] || '',
kodePpts:  cells[1 + offset] || '',
// dst.
```

Atau: scrape header dan map data by header name, bukan by index.
